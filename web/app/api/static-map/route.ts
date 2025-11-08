// app/api/static-map/route.ts
import { NextRequest } from "next/server";

// Opcional: fuerza edge y cache público
export const runtime = "edge"; // usa tipos DOM (sin Buffer)
export const revalidate = 300; // 5 min

export async function GET(req: NextRequest) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
  if (!apiKey) return new Response("missing api key", { status: 500 });

  const url = new URL(req.url);
  const origin = url.searchParams.get("o");
  const destination = url.searchParams.get("d");
  const enc = url.searchParams.get("enc") || "";

  if (!origin || !destination) {
    return new Response("missing params", { status: 400 });
  }

  // Construye Static Maps request
  const params = new URLSearchParams({
    size: "640x360",
    scale: "2",
    key: apiKey,
  });

  // marca origen y destino (dos markers)
  params.append("markers", `size:mid|${origin}`);
  params.append("markers", `size:mid|${destination}`);

  // ruta opcional por polyline
  if (enc) {
    params.set("path", `color:0x111111ff|weight:4|enc:${enc}`);
  }

  const staticUrl = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  const upstream = await fetch(staticUrl, { cache: "no-store" });
  if (!upstream.ok) return new Response("upstream error", { status: 502 });

  // ✅ Usa ArrayBuffer (válido en Edge/DOM)
  const ab = await upstream.arrayBuffer();
  return new Response(ab, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=300",
    },
  });
}
