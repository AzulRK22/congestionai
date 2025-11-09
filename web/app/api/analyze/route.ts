import { NextRequest, NextResponse } from "next/server";

/** Runtime Node (por uso de fetch server-side) */
export const runtime = "nodejs";

const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

/** FieldMask mínimo: duración, duración estática, polyline y segmentos con velocidad */
const FM = [
  "routes.duration",
  "routes.staticDuration",
  "routes.polyline.encodedPolyline",
  "routes.travelAdvisory.speedReadingIntervals",
].join(",");

/** -------- IA ligera: features + scorer logístico explicable ---------- */
type Features = {
  hourOfWeek: number; // 0..167
  isPeak: number; // 0/1
  isWeekend: number; // 0/1
  holiday: number; // 0/1 (mock)
  rainMm: number; // 0..10 (mock 0 por ahora)
  etaRatio: number; // ETA / ETA_sin_trafico (>=1)
};
const W = {
  bias: -2.2,
  hourOfWeek: 0.004,
  isPeak: 0.85,
  isWeekend: 0.25,
  holiday: 0.35,
  rainMm: 0.08,
  etaRatio: 1.4,
};
const σ = (z: number) => 1 / (1 + Math.exp(-z));

function buildFeatures(args: {
  departISO: string;
  rainMm?: number;
  etaMin: number;
  staticEtaMin: number;
  holiday?: boolean;
}): Features {
  const d = new Date(args.departISO);
  const dow = d.getDay(),
    h = d.getHours();
  return {
    hourOfWeek: dow * 24 + h,
    isPeak: (h >= 7 && h <= 9) || (h >= 17 && h <= 19) ? 1 : 0,
    isWeekend: dow === 0 || dow === 6 ? 1 : 0,
    holiday: args.holiday ? 1 : 0,
    rainMm: Math.min(10, Math.max(0, args.rainMm ?? 0)),
    etaRatio: Math.max(
      1,
      (args.etaMin || 1) / Math.max(1, args.staticEtaMin || args.etaMin || 1),
    ),
  };
}
function predictRisk(f: Features) {
  const z =
    W.bias +
    W.hourOfWeek * f.hourOfWeek +
    W.isPeak * f.isPeak +
    W.isWeekend * f.isWeekend +
    W.holiday * f.holiday +
    W.rainMm * f.rainMm +
    W.etaRatio * (f.etaRatio - 1);
  const risk = σ(z);
  const contribs = [
    { name: "Hora pico", v: W.isPeak * f.isPeak },
    { name: "Fin de semana", v: W.isWeekend * f.isWeekend },
    { name: "Feriado", v: W.holiday * f.holiday },
    { name: "Lluvia", v: W.rainMm * f.rainMm },
    { name: "Tráfico relativo", v: W.etaRatio * (f.etaRatio - 1) },
  ]
    .filter((p) => Math.abs(p.v) > 0.01)
    .map((p) => ({ name: p.name, delta: Math.round(σ(p.v) * 100) }));
  return { risk, contribs };
}
/** --------------------------------------------------------------------- */

/** Soporta string | {lat,lng} | {placeId} */
function toWaypoint(v: any) {
  if (!v) return { address: "" };
  if (typeof v === "string") return { address: v };
  if (v.placeId) return { placeId: v.placeId };
  if (typeof v.lat === "number" && typeof v.lng === "number") {
    return { location: { latLng: { latitude: v.lat, longitude: v.lng } } };
  }
  return { address: String(v) };
}

export async function POST(req: NextRequest) {
  const {
    origin,
    destination,
    windowMins = 120,
    stepMins = 10,
    offset = 0,
  } = await req.json();

  if (!origin || !destination) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  // Solo server key
  const apiKey = process.env.GOOGLE_MAPS_API_KEY_SERVER;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing GOOGLE_MAPS_API_KEY_SERVER" },
      { status: 500 },
    );
  }

  const startTs = Date.now() + offset * 60_000;
  const samples: any[] = [];

  for (let m = 0; m <= windowMins; m += stepMins) {
    const departAtISO = new Date(startTs + m * 60_000).toISOString();

    const body = {
      origin: toWaypoint(origin),
      destination: toWaypoint(destination),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE_OPTIMAL",
      departureTime: departAtISO,
    };

    const res = await fetch(ROUTES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FM, // ← usa SOLO header
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      // log útil en server para debugs locales
      const text = await res.text().catch(() => "");
      console.error("Routes API error:", res.status, text);
      continue;
    }

    const json = await res.json();
    const r = json.routes?.[0];
    if (!r) continue;

    const etaSec = toSec(r.duration || "0s");
    const etaMin = Math.round(etaSec / 60);
    const staticMin =
      Math.round(toSec(r.staticDuration || "0s") / 60) || etaMin;

    // IA: riesgo explicable
    const f = buildFeatures({
      departISO: departAtISO,
      rainMm: 0,
      etaMin,
      staticEtaMin: staticMin,
      holiday: false,
    });
    const ai = predictRisk(f);

    samples.push({
      m,
      departAtISO,
      etaMin,
      risk: ai.risk,
      contribs: ai.contribs,
      polyline: r.polyline?.encodedPolyline || null,
      sri: r.travelAdvisory?.speedReadingIntervals || [],
    });
  }

  if (samples.length === 0) {
    return NextResponse.json({ error: "no routes" }, { status: 502 });
  }

  const alpha = 0.7;
  const J = (s: any) => alpha * s.etaMin + (1 - alpha) * (s.risk * 100);
  const best = samples.reduce((a, b) => (J(b) < J(a) ? b : a));

  const nowEta = samples[0]?.etaMin ?? best.etaMin;
  const savingVsNow = Math.max(0, (nowEta - best.etaMin) / Math.max(1, nowEta));

  const maxEta = Math.max(...samples.map((s) => s.etaMin));
  const heatmap = samples.map((s, i) => ({
    hourOfWeek: i,
    risk: s.etaMin / Math.max(1, maxEta),
  }));

  return NextResponse.json({
    best: {
      departAtISO: best.departAtISO,
      etaMin: best.etaMin,
      savingVsNow,
      risk: best.risk,
      explain: best.contribs.map((c: any) => `${c.name} +${c.delta}%`),
      polyline: best.polyline,
      sri: best.sri,
    },
    alternatives: samples.slice(0, 6),
    heatmap,
    notes: [
      "Routes API traffic-aware v2",
      "IA scorer tabular (explicable)",
      `alpha=${alpha}`,
      `window=${windowMins}m step=${stepMins}m offset=${offset}m`,
    ],
  });
}

function toSec(str: string) {
  const m = /(\d+)s/.exec(str);
  return m ? parseInt(m[1], 10) : 0;
}
