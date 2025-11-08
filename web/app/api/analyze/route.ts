// app/api/analyze/route.ts
import { NextRequest, NextResponse } from "next/server";

const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
// Field mask: solo lo necesario para abaratar
const FM =
  "routes.duration,routes.staticDuration,routes.travelAdvisory,routes.polyline.encodedPolyline";

export async function POST(req: NextRequest) {
  const { origin, destination, window = "next120" } = await req.json();
  if (!origin || !destination)
    return NextResponse.json({ error: "missing params" }, { status: 400 });

  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY_SERVER ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey)
    return NextResponse.json({ error: "no api key" }, { status: 500 });

  // muestreamos cada 10 min (ajusta si quieres más fino)
  const minutes = 120;
  const step = 10;
  const now = Date.now();
  const samples: any[] = [];

  for (let m = 0; m <= minutes; m += step) {
    const departAt = new Date(now + m * 60_000).toISOString();
    const body = {
      origin: { address: origin },
      destination: { address: destination },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE_OPTIMAL",
      departureTime: departAt,
    };

    const res = await fetch(ROUTES_URL + `?fields=${encodeURIComponent(FM)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey!,
        "X-Goog-FieldMask": FM,
      },
      body: JSON.stringify(body),
    });

    // si falla, sigue (no rompemos demo)
    if (!res.ok) continue;
    const json = await res.json();

    const r = json.routes?.[0];
    if (!r) continue;

    const etaSec = toSec(r.duration || "0s");
    const etaMin = Math.round(etaSec / 60);
    samples.push({
      m,
      departAtISO: departAt,
      etaMin,
      polyline: r.polyline?.encodedPolyline || null,
    });
  }

  if (samples.length === 0)
    return NextResponse.json({ error: "no routes" }, { status: 502 });

  // mejor salida por ETA mínima
  const best = samples.reduce((a, b) => (b.etaMin < a.etaMin ? b : a));
  const nowEta = samples[0]?.etaMin ?? best.etaMin;
  const savingVsNow = Math.max(0, (nowEta - best.etaMin) / Math.max(1, nowEta));

  // heatmap sintético (0..1) a partir del ETA relativo
  const maxEta = Math.max(...samples.map((s) => s.etaMin));
  const heatmap = samples.map((s, i) => ({
    hourOfWeek: i, // simplificado para demo
    risk: s.etaMin / Math.max(1, maxEta),
  }));

  return NextResponse.json({
    best: {
      departAtISO: best.departAtISO,
      etaMin: best.etaMin,
      savingVsNow,
      polyline: best.polyline,
    },
    alternatives: samples.slice(0, 6), // primeras 6 muestras a modo de ejemplo
    heatmap,
    notes: [
      "Routes API traffic-aware",
      "Muestreo cada 10m",
      "FieldMask aplicado",
    ],
  });
}

function toSec(str: string) {
  // "3600s" → 3600
  const m = /(\d+)s/.exec(str);
  return m ? parseInt(m[1]) : 0;
}
