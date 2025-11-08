"use client";
import { useEffect, useRef } from "react";
import type { MapProvider } from "@/lib/map/types";
import { GoogleMapProvider } from "@/lib/map/google";
import { AppleMapProvider } from "@/lib/map/apple";

export function MapContainer({
  provider,
  origin,
  destination,
  polyline,
}: {
  provider: "google" | "apple";
  origin: string;
  destination: string;
  polyline?: { lat: number; lng: number }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inst = useRef<MapProvider>();

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current as HTMLDivElement;
    const center = { lat: 19.4326, lng: -99.1332 },
      zoom = 12;

    let disposed = false;
    inst.current =
      provider === "google" ? new GoogleMapProvider() : new AppleMapProvider();

    const tick = requestAnimationFrame(async () => {
      if (disposed) return;
      await inst.current!.mount(el, center, zoom);
      await inst.current!.setRoute(origin, destination, polyline);
      (inst.current as any).setTraffic?.(provider === "google");
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(tick);
      inst.current?.destroy();
    };
  }, [provider, origin, destination]);

  return <div ref={ref} className="w-full h-72 rounded-2xl border bg-white" />;
}
