import { NextRequest, NextResponse } from "next/server";
import { computeSample, getLastRoutesError, type SampleOut } from "./_shared";
import type { AnalyzeResponse, WaypointInput } from "@/types/analyze";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RankedSample = SampleOut & { offsetMin: number };

type AnalyzeBody = {
  origin: WaypointInput;
  destination: WaypointInput;
  windowMins?: number;
  stepMins?: number;
  offset?: number;
  refine?: boolean;
  avoidTolls?: boolean;
  avoidHighways?: boolean;
  country?: "mx" | "us" | "de";
};

function clamp(n: unknown, def: number, min: number, max: number) {
  const v = Number(n);
  if (!Number.isFinite(v)) return def;
  return Math.max(min, Math.min(max, v));
}

function scoreSample(sample: { etaMin: number; risk: number }) {
  const alpha = 0.72;
  return alpha * sample.etaMin + (1 - alpha) * (sample.risk * 100);
}

async function readJsonBody(req: NextRequest): Promise<AnalyzeBody | null> {
  const text = await req.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as AnalyzeBody;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body) {
    return NextResponse.json(
      { error: "invalid or empty JSON body" },
      { status: 400 },
    );
  }

  const {
    origin,
    destination,
    windowMins,
    stepMins,
    offset,
    refine = true,
    avoidTolls = false,
    avoidHighways = false,
    country = "mx",
  } = body;

  if (!origin || !destination) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  const window = clamp(windowMins, 120, 20, 240);
  const step = clamp(stepMins, 10, 5, 60);
  const startOffset = Math.max(1, clamp(offset, 1, 0, 10_080));
  const ctry = country ?? "mx";
  const now = Date.now();

  const coarseOffsets: number[] = [];
  for (let m = 0; m <= window; m += step) coarseOffsets.push(startOffset + m);

  const samples: RankedSample[] = [];
  for (const minuteOffset of coarseOffsets) {
    const sample = await computeSample({
      origin,
      destination,
      departISO: new Date(now + minuteOffset * 60_000).toISOString(),
      avoidTolls,
      avoidHighways,
      country: ctry,
    });
    if (sample) {
      samples.push({
        offsetMin: minuteOffset,
        ...sample,
      });
    }
  }

  if (!samples.length) {
    const upstream = getLastRoutesError();
    return NextResponse.json(
      {
        error: "no routes",
        upstream,
      },
      { status: 502 },
    );
  }

  let ranked: RankedSample[] = [...samples];
  ranked.sort((a, b) => scoreSample(a) - scoreSample(b));

  if (refine && ranked.length > 0) {
    const center = ranked[0].offsetMin;
    const refineOffsets = [-10, -5, 5, 10]
      .map((delta) => center + delta)
      .filter((m) => m > 0);

    for (const minuteOffset of refineOffsets) {
      if (samples.some((s) => s.offsetMin === minuteOffset)) continue;
      const sample = await computeSample({
        origin,
        destination,
        departISO: new Date(now + minuteOffset * 60_000).toISOString(),
        avoidTolls,
        avoidHighways,
        country: ctry,
      });
      if (sample) {
        samples.push({
          offsetMin: minuteOffset,
          ...sample,
        });
      }
    }
    ranked = [...samples].sort((a, b) => scoreSample(a) - scoreSample(b));
  }

  const best = ranked[0]!;
  const nowSample =
    samples.find((s) => s.offsetMin === startOffset) ??
    samples.slice().sort((a, b) => a.offsetMin - b.offsetMin)[0] ??
    best;
  const savingVsNow = Math.max(
    0,
    (nowSample.etaMin - best.etaMin) / Math.max(1, nowSample.etaMin),
  );

  const maxEta = Math.max(...samples.map((s) => s.etaMin));
  const alternatives = [...samples]
    .sort((a, b) => a.offsetMin - b.offsetMin)
    .map(({ offsetMin, ...sample }) => ({ m: offsetMin - startOffset, ...sample }));
  const notes = [
    `window=${window}m step=${step}m`,
    refine ? "refine=on" : "refine=off",
    avoidTolls ? "avoids tolls" : "tolls allowed",
    avoidHighways ? "avoids highways" : "highways allowed",
  ];

  const payload: AnalyzeResponse = {
    best: {
      departAtISO: best.departAtISO,
      etaMin: best.etaMin,
      savingVsNow,
      risk: best.risk,
      explain: best.contribs.map((c) => `${c.name} +${c.delta}%`),
      polyline: best.polyline,
      sri: best.sri,
    },
    alternatives,
    heatmap: alternatives.map((s, i) => ({
      hourOfWeek: i,
      risk: s.etaMin / Math.max(1, maxEta),
    })),
    notes,
  };

  return NextResponse.json(payload);
}
