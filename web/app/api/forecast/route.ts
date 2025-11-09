// app/api/forecast/route.ts
import { NextResponse } from "next/server";
import { computeSample } from "../analyze/_shared";

export const runtime = "nodejs";
// Subir si tu plataforma lo permite (Vercel/Node)
export const maxDuration = 60;
// Evita caching no deseado
export const dynamic = "force-dynamic";

type Ctry = "mx" | "us" | "de";
type SampleDTO = {
  tMin: number;
  departAtISO: string;
  etaMin: number;
  risk: number;
};

function clamp(n: unknown, def: number, min: number, max: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return def;
  return Math.max(min, Math.min(max, v));
}

async function runWithLimit<T>(
  concurrency: number,
  items: number[],
  worker: (item: number, idx: number) => Promise<T | null>,
) {
  const out: Array<T | null> = new Array(items.length).fill(null);
  let i = 0;
  const workers = Array.from({
    length: Math.min(concurrency, items.length),
  }).map(async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) break;
      try {
        out[idx] = await worker(items[idx], idx);
      } catch {
        out[idx] = null;
      }
    }
  });
  await Promise.all(workers);
  return out;
}

export async function POST(req: Request) {
  const {
    origin,
    destination,
    horizonHours,
    stepMins,
    avoidTolls = false,
    avoidHighways = false,
    country = "mx",
  } = await req.json();

  if (!origin || !destination) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  const H = clamp(horizonHours, 72, 1, 168); // 1h..168h
  const STEP = clamp(stepMins, 60, 15, 180); // 15..180 min
  const now = Date.now();
  const ctry = (country as Ctry) ?? "mx";

  // Genera offsets, pero limita a 96 muestras para que sea estable en serverless.
  const total = Math.floor((H * 60) / STEP);
  const capped = Math.min(total, 96);
  const offsets: number[] = [];
  for (let i = 0; i <= capped; i++) offsets.push(i * STEP);

  // Worker con reintento y “futuro garantizado”
  const results = await runWithLimit<SampleDTO>(
    4, // concurrencia
    offsets,
    async (m) => {
      // Siempre al menos +60s desde "ahora"
      const baseMs = Math.max(60_000, m * 60_000);
      const depart1 = new Date(now + baseMs).toISOString();

      const s1 = await computeSample({
        origin,
        destination,
        departISO: depart1,
        avoidTolls,
        avoidHighways,
        country: ctry,
      });
      if (s1) {
        return {
          tMin: m,
          departAtISO: s1.departAtISO,
          etaMin: s1.etaMin,
          risk: s1.risk,
        };
      }

      // Reintento moviendo +120s
      const depart2 = new Date(now + baseMs + 120_000).toISOString();
      const s2 = await computeSample({
        origin,
        destination,
        departISO: depart2,
        avoidTolls,
        avoidHighways,
        country: ctry,
      });
      if (s2) {
        // Ajusta tMin reportado por ese pequeño corrimiento
        return {
          tMin: m + 2,
          departAtISO: s2.departAtISO,
          etaMin: s2.etaMin,
          risk: s2.risk,
        };
      }

      return null;
    },
  );

  const samples = (results.filter(Boolean) as SampleDTO[]).sort(
    (a, b) => a.tMin - b.tMin,
  );

  if (!samples.length) {
    // Nota: computeSample ya hace console.error en el server log (status/text del fallo)
    return NextResponse.json(
      { error: "no forecast", requested: offsets.length },
      { status: 502 },
    );
  }

  const top = [...samples].sort((a, b) => a.etaMin - b.etaMin).slice(0, 3);
  const bestWindows = top.map((s) => ({
    startISO: s.departAtISO,
    tMin: s.tMin,
    etaMin: s.etaMin,
    risk: s.risk,
  }));

  return NextResponse.json({
    samples,
    bestWindows,
    notes: [
      `forecast horizon=${H}h step=${STEP}m`,
      `requests=${samples.length}/${offsets.length}`,
      "Routes v2 traffic-aware",
    ],
  });
}
