// web/lib/map/apple.ts
import { loadMapKit } from "@/lib/map/loaders";

export type AppleSpeedReadingInterval = {
  startPolylinePointIndex: number;
  endPolylinePointIndex: number;
  speed: "SLOW" | "NORMAL" | "FAST" | "UNKNOWN_SPEED";
};

const SPEED_COLOR: Record<AppleSpeedReadingInterval["speed"], string> = {
  FAST: "#16a34a",
  NORMAL: "#f59e0b",
  SLOW: "#dc2626",
  UNKNOWN_SPEED: "#64748b",
};

export function decodePolyline(
  encoded: string,
): Array<{ lat: number; lng: number }> {
  const coords: Array<{ lat: number; lng: number }> = [];
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

export async function drawAppleRoute(opts: {
  el: HTMLDivElement;
  polyline?: string;
  sri?: AppleSpeedReadingInterval[];
}) {
  const { el, polyline, sri } = opts;
  const token = process.env.NEXT_PUBLIC_MAPKIT_TOKEN!;
  await loadMapKit(token);

  // Tipado mínimo sin `any`
  const mkGlobal = (window as unknown as { mapkit?: unknown }).mapkit;
  if (!mkGlobal) throw new Error("MapKit no disponible");

  const mk = mkGlobal as {
    Map: new (el: HTMLElement) => {
      showsZoomControl: boolean;
      showsMapTypeControl: boolean;
      language: string;
      region: unknown;
      addOverlay: (ov: unknown) => void;
      removeOverlays?: (ov: unknown[]) => void;
      overlays?: unknown[];
    };
    Coordinate: new (lat: number, lng: number) => unknown;
    CoordinateRegion: new (center: unknown, span: unknown) => unknown;
    CoordinateSpan: new (latDelta: number, lngDelta: number) => unknown;
    PolylineOverlay: new (
      coords: unknown[],
      options: { style: unknown },
    ) => unknown;
    Style: new (opts: { lineWidth?: number; strokeColor?: string }) => unknown;
  };

  const map = new mk.Map(el);
  map.showsZoomControl = false;
  map.showsMapTypeControl = false;
  map.language = "es";

  const path = polyline ? decodePolyline(polyline) : [];
  const hasPath = path.length > 0;

  const center = hasPath
    ? path[Math.floor(path.length / 2)]
    : { lat: 19.432608, lng: -99.133209 };

  map.region = new mk.CoordinateRegion(
    new mk.Coordinate(center.lat, center.lng),
    new mk.CoordinateSpan(0.2, 0.2),
  );

  if (!hasPath) return;

  const coords = path.map((p) => new mk.Coordinate(p.lat, p.lng));
  if (sri && sri.length > 0) {
    sri.forEach((seg) => {
      const start = Math.max(0, seg.startPolylinePointIndex);
      const end = Math.min(coords.length - 1, seg.endPolylinePointIndex);
      if (end <= start) return;
      const segCoords = coords.slice(start, end + 1);
      const overlay = new mk.PolylineOverlay(segCoords, {
        style: new mk.Style({
          lineWidth: 5,
          strokeColor: SPEED_COLOR[seg.speed] ?? "#2563eb",
        }),
      });
      map.addOverlay(overlay);
    });
  } else {
    const overlay = new mk.PolylineOverlay(coords, {
      style: new mk.Style({ lineWidth: 5, strokeColor: "#2563eb" }),
    });
    map.addOverlay(overlay);
  }
}
