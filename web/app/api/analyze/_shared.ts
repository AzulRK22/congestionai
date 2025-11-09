// web/app/api/analyze/_shared.ts
import type {
  SpeedReadingInterval,
  ComputeRoutesResponse,
  WaypointInput,
} from "@/types/analyze";
import { isHolidayISO } from "@/lib/events/holidays";

const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

const FIELD_MASK = [
  "routes.duration",
  "routes.staticDuration",
  "routes.polyline.encodedPolyline",
  "routes.travelAdvisory.speedReadingIntervals",
].join(",");

// ====== Mini modelo explicable ======
type Features = {
  hourOfWeek: number; // 0..167
  isPeak: number; // 0/1
  isWeekend: number; // 0/1
  holiday: number; // 0/1
  rainMm: number; // 0..10
  etaRatio: number; // ETA / ETA_static (>=1)
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
  etaMin: number;
  staticEtaMin: number;
  rainMm?: number;
  holiday?: boolean;
}): Features {
  const d = new Date(args.departISO);
  const dow = d.getDay();
  const h = d.getHours();
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

function explainRisk(f: Features) {
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

function toSec(str: string | undefined) {
  const m = /(\d+)s/.exec(str || "");
  return m ? parseInt(m[1], 10) : 0;
}

type WaypointPayload =
  | { address: string }
  | { placeId: string }
  | { location: { latLng: { latitude: number; longitude: number } } };

function toWaypoint(v: WaypointInput): WaypointPayload {
  if (typeof v === "string") return { address: v };
  if ("placeId" in v) return { placeId: v.placeId };
  return { location: { latLng: { latitude: v.lat, longitude: v.lng } } };
}

type ComputeRoutesRequest = {
  origin: WaypointPayload;
  destination: WaypointPayload;
  travelMode: "DRIVE";
  routingPreference: "TRAFFIC_AWARE_OPTIMAL";
  departureTime: string; // ISO
  routeModifiers: {
    avoidTolls: boolean;
    avoidHighways: boolean;
  };
};

export type ComputeSampleOptions = {
  origin: WaypointInput;
  destination: WaypointInput;
  departISO: string;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  country?: "mx" | "us" | "de";
};

export type SampleOut = {
  departAtISO: string;
  etaMin: number;
  risk: number;
  contribs: { name: string; delta: number }[];
  polyline: string | null;
  sri: SpeedReadingInterval[];
};

export async function computeSample(
  opts: ComputeSampleOptions,
): Promise<SampleOut | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY_SERVER;
  if (!apiKey) throw new Error("Missing GOOGLE_MAPS_API_KEY_SERVER");

  const body: ComputeRoutesRequest = {
    origin: toWaypoint(opts.origin),
    destination: toWaypoint(opts.destination),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE_OPTIMAL",
    departureTime: opts.departISO,
    routeModifiers: {
      avoidTolls: !!opts.avoidTolls,
      avoidHighways: !!opts.avoidHighways,
    },
  };

  const res = await fetch(ROUTES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("Routes API error:", res.status, text);
    return null;
  }

  const json = (await res.json()) as ComputeRoutesResponse;
  const r = json.routes?.[0];
  if (!r) return null;

  const etaMin = Math.round(toSec(r.duration) / 60);
  const staticMin = Math.round(toSec(r.staticDuration) / 60) || etaMin;

  const country = opts.country ?? "mx";
  const holiday = isHolidayISO(opts.departISO, country);

  const f = buildFeatures({
    departISO: opts.departISO,
    etaMin,
    staticEtaMin: staticMin,
    rainMm: 0,
    holiday,
  });
  const ai = explainRisk(f);

  return {
    departAtISO: opts.departISO,
    etaMin,
    risk: ai.risk,
    contribs: ai.contribs,
    polyline: r.polyline?.encodedPolyline ?? null,
    sri: (r.travelAdvisory?.speedReadingIntervals ??
      []) as SpeedReadingInterval[],
  };
}
