"use client";

import { useEffect, useRef } from "react";
import { ensureGoogleMaps, loadMapKit } from "@/lib/map/loaders";

type Provider = "google" | "apple";

export type SpeedReadingInterval = {
  startPolylinePointIndex: number;
  endPolylinePointIndex: number;
  speed: "SLOW" | "NORMAL" | "FAST" | "UNKNOWN_SPEED";
};

type Props = {
  provider: Provider;
  origin: string; // público (no se usa para dibujar)
  destination: string; // público (no se usa para dibujar)
  polylineEnc?: string;
  sri?: SpeedReadingInterval[];
};

/* ===== Tipos mínimos para Google Maps (evitar any) ===== */
type GLatLng = { lat: number; lng: number };

type GMapOptions = {
  center: GLatLng;
  zoom?: number;
  disableDefaultUI?: boolean;
};

type GLatLngBounds = {
  extend: (pt: GLatLng) => void;
  isEmpty?: () => boolean;
};

type GMap = {
  fitBounds: (b: GLatLngBounds, padding?: number) => void;
};

type GPolylineOptions = {
  path: GLatLng[];
  strokeColor?: string;
  strokeOpacity?: number;
  strokeWeight?: number;
  map?: GMap;
};

type GPolyline = { setMap: (m: GMap | null) => void };

type MapConstructor = new (el: HTMLElement, opts?: GMapOptions) => GMap;
type PolylineConstructor = new (opts: GPolylineOptions) => GPolyline;
type BoundsConstructor = new () => GLatLngBounds;

/* ======================================================= */

function decodePolyline(encoded: string): GLatLng[] {
  const coords: GLatLng[] = [];
  let index = 0,
    lat = 0,
    lng = 0;
  while (index < encoded.length) {
    let b: number,
      shift = 0,
      result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;
    coords.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return coords;
}

const SPEED_COLOR: Record<SpeedReadingInterval["speed"], string> = {
  FAST: "#16a34a",
  NORMAL: "#f59e0b",
  SLOW: "#dc2626",
  UNKNOWN_SPEED: "#64748b",
};

export function MapContainer({ provider, polylineEnc, sri }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const path = polylineEnc ? decodePolyline(polylineEnc) : [];
    const hasPath = path.length > 0;
    const center = hasPath
      ? path[Math.floor(path.length / 2)]
      : { lat: 19.432608, lng: -99.133209 }; // CDMX

    let dispose: (() => void) | undefined;

    (async () => {
      if (provider === "google") {
        const libs = await ensureGoogleMaps(["core", "maps"]);
        const MapCtor = libs.maps?.Map as unknown as MapConstructor | undefined;
        const PolylineCtor = libs.maps?.Polyline as unknown as
          | PolylineConstructor
          | undefined;
        const BoundsCtor = libs.core?.LatLngBounds as unknown as
          | BoundsConstructor
          | undefined;

        if (!MapCtor || !PolylineCtor || !BoundsCtor) {
          console.error("[Map] Google Maps libs not available");
          return;
        }

        const map = new MapCtor(el, {
          center,
          zoom: hasPath ? 12 : 11,
          disableDefaultUI: true,
        });

        const lines: GPolyline[] = [];

        if (hasPath) {
          if (sri?.length) {
            sri.forEach((seg) => {
              const start = Math.max(0, seg.startPolylinePointIndex);
              const end = Math.min(path.length - 1, seg.endPolylinePointIndex);
              if (end <= start) return;
              const segPath = path.slice(start, end + 1);
              const line = new PolylineCtor({
                path: segPath,
                strokeColor: SPEED_COLOR[seg.speed] ?? "#2563eb",
                strokeOpacity: 0.9,
                strokeWeight: 5,
                map,
              });
              lines.push(line);
            });
          } else {
            const line = new PolylineCtor({
              path,
              strokeColor: "#2563eb",
              strokeOpacity: 0.9,
              strokeWeight: 5,
              map,
            });
            lines.push(line);
          }

          try {
            const bounds = new BoundsCtor();
            path.forEach((p) => bounds.extend(p));
            map.fitBounds(bounds, 40); // padding numérico
          } catch {
            /* noop */
          }
        }

        dispose = () => {
          lines.forEach((l) => l.setMap(null));
        };
      } else {
        // Apple MapKit
        const token = process.env.NEXT_PUBLIC_MAPKIT_TOKEN as string;
        if (!token) return;

        await loadMapKit(token);
        const mk = (window as unknown as { mapkit: typeof mapkit }).mapkit;

        const map = new mk.Map(el);
        map.showsZoomControl = false;
        map.showsMapTypeControl = false;
        map.language = "es";
        map.region = new mk.CoordinateRegion(
          new mk.Coordinate(center.lat, center.lng),
          new mk.CoordinateSpan(0.2, 0.2),
        );

        const overlays: mapkit.PolylineOverlay[] = [];

        if (hasPath) {
          const coords = path.map((p) => new mk.Coordinate(p.lat, p.lng));
          if (sri?.length) {
            sri.forEach((seg) => {
              const start = Math.max(0, seg.startPolylinePointIndex);
              const end = Math.min(
                coords.length - 1,
                seg.endPolylinePointIndex,
              );
              if (end <= start) return;
              const segCoords = coords.slice(start, end + 1);
              const overlay = new mk.PolylineOverlay(segCoords, {
                style: new mk.Style({
                  lineWidth: 5,
                  strokeColor: SPEED_COLOR[seg.speed] ?? "#2563eb",
                }),
              });
              map.addOverlay(overlay);
              overlays.push(overlay);
            });
          } else {
            const overlay = new mk.PolylineOverlay(coords, {
              style: new mk.Style({ lineWidth: 5, strokeColor: "#2563eb" }),
            });
            map.addOverlay(overlay);
            overlays.push(overlay);
          }
        }

        dispose = () => {
          try {
            overlays.forEach((o) => map.removeOverlay(o));
          } catch {
            /* noop */
          }
        };
      }
    })();

    return () => dispose?.();
  }, [provider, polylineEnc, sri]);

  return (
    <div
      ref={ref}
      className="w-full h-72 rounded-2xl border overflow-hidden"
      aria-label="Mapa de ruta"
    />
  );
}
