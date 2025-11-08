import { NextRequest, NextResponse } from "next/server";
import { PlanRequest, PlanResponse } from "@/lib/schema";

// Simple 168-hour speed index (0..1). Weekday rush hours slower.
const SPEED: number[] = Array.from({length:168}, (_,h)=>{
  const dow = Math.floor(h/24), hod = h%24;
  const rush = (hod>=7&&hod<=9)||(hod>=17&&hod<=19);
  const weekend = (dow===5||dow===6);
  let base = weekend ? 0.85 : 0.7;
  if (rush && !weekend) base -= 0.28;
  if (hod>=22||hod<=5) base += 0.15;
  return Math.max(0.35, Math.min(0.95, base));
});

function distanceKmMock() { return 12.0; } // demo constant

function etaMinutes(distanceKm:number, speedIndex:number) {
  const freeflow = 60; // km/h
  const kmh = Math.max(15, freeflow * speedIndex);
  return Math.round((distanceKm / kmh) * 60);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parse = PlanRequest.safeParse(body);
  if (!parse.success) return NextResponse.json({error:"bad_request"}, {status:400});
  const distanceKm = distanceKmMock();
  const now = new Date();
  const hourOfWeek = now.getDay()*24 + now.getHours();
  const etaNow = etaMinutes(distanceKm, SPEED[hourOfWeek]);

  // scan next 72h in 15-min steps
  const cand: {t:Date, eta:number, how:number}[] = [];
  const stepMin = 15;
  for (let i=0;i<=72*60;i+=stepMin) {
    const t = new Date(now.getTime()+i*60*1000);
    const how = t.getDay()*24 + t.getHours();
    cand.push({ t, eta: etaMinutes(distanceKm, SPEED[how]), how });
  }
  cand.sort((a,b)=>a.eta-b.eta);
  const top = cand.slice(0,3);

  const mk = (c:{t:Date,eta:number}) => ({
    departAtISO: c.t.toISOString(),
    etaMin: c.eta,
    savingVsNow: Math.max(0, (etaNow - c.eta)/etaNow),
    riskBand: [Math.max(0, c.eta-4), c.eta+4] as [number,number]
  });

  const heatmap = Array.from({length:168}, (_,h)=>({ hourOfWeek: h, risk: 1 - SPEED[h] }));

  const resp: PlanResponse = {
    best: mk(top[0]),
    alternatives: top.slice(1).map(mk),
    etaNow, distanceKm,
    heatmap,
    notes: [
      "Modelo horario con promedios; eventos locales pueden variar.",
      "Sugerencias recalculadas por horas; rango ±4m de confianza."
    ]
  };

  return NextResponse.json(resp);
}
