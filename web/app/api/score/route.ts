import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest){
  const { metrics } = await req.json();
  const score = Math.round(
    0.3*(metrics?.market??0)+0.3*(metrics?.clarity??0)+0.3*(metrics?.feasibility??0)+0.1*(metrics?.monetization??0)
  );
  return NextResponse.json({ score, breakdown: Object.entries(metrics||{}).map(([k,v])=>({k,v})) });
}
