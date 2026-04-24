import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    hasBrowserMapsKey: Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
    hasServerRoutesKey: Boolean(process.env.GOOGLE_MAPS_API_KEY_SERVER),
    hasMapKitToken: Boolean(process.env.NEXT_PUBLIC_MAPKIT_TOKEN),
  });
}
