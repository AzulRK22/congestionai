// app/api/forecast/route.ts
import { NextResponse } from "next/server";
import { computeSample } from "../analyze/_shared";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const {
    origin,
    destination,
    horizonHours = 72,
    stepMins = 60,
    avoidTolls = false,
    avoidHighways = false,
    country = "mx",
  } = await req.json();

  if (!origin || !destination) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  const H = Math.max(1, Number(horizonHours));
  const STEP = Math.max(15, Number(stepMins));
  const now = Date.now();

  const samples: Array<{
    tMin: number;
    departAtISO: string;
    etaMin: number;
    risk: number;
  }> = [];

  for (let m = 0; m <= H * 60; m += STEP) {
    const departISO = new Date(now + m * 60_000).toISOString();
    const s = await computeSample({
      origin,
      destination,
      departISO,
      avoidTolls,
      avoidHighways,
      country,
    });
    if (s) {
      samples.push({
        tMin: m,
        departAtISO: s.departAtISO,
        etaMin: s.etaMin,
        risk: s.risk,
      });
    }
  }

  if (!samples.length) {
    return NextResponse.json({ error: "no forecast" }, { status: 502 });
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
      "Routes v2 traffic-aware",
      "features: peak/weekend/holiday/etaRatio",
    ],
  });
}
