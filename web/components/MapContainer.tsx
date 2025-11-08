"use client";
import { useEffect, useRef } from "react";
import type { MapProvider } from "@/lib/map/types";
import { GoogleMapProvider } from "@/lib/map/google";
import { AppleMapProvider } from "@/lib/map/apple";
import { decodePolyline } from "@/lib/polyline";

export function MapContainer({
  provider,
  origin,
  destination,
  polylineEnc,
}: {
  provider: "google" | "apple";
  origin: string;
  destination: string;
  /** polyline codificado (encoded polyline) para dibujar ruta */
  polylineEnc?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<MapProvider>();

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const center = { lat: 19.4326, lng: -99.1332 },
      zoom = 12;
    let disposed = false;

    inst.current =
      provider === "google" ? new GoogleMapProvider() : new AppleMapProvider();

    const tick = requestAnimationFrame(async () => {
      if (disposed) return;
      try {
        await inst.current!.mount(el, center, zoom);
        // tráfico (en Google)
        (inst.current as any).setTraffic?.(provider === "google");

        // pinta la ruta sólo si hay polyline (evita Directions legacy)
        const path = polylineEnc ? decodePolyline(polylineEnc) : undefined;
        await inst.current!.setRoute(origin, destination, path);
      } catch (e) {
        console.warn("Map mount failed:", e);
      }
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(tick);
      inst.current?.destroy();
    };
  }, [provider, origin, destination, polylineEnc]);

  return <div ref={ref} className="w-full h-72 rounded-2xl border bg-white" />;
}
