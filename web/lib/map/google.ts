// web/lib/map/google.ts
// Utilidades mínimas para pintar rutas en Google Maps sin `any` y con guards.

import { ensureGoogleMaps } from "@/lib/map/loaders";

/** Tipado mínimo de SRI (Routes v2) */
export type SpeedReadingInterval = {
  startPolylinePointIndex: number;
  endPolylinePointIndex: number;
  speed: "SLOW" | "NORMAL" | "FAST" | "UNKNOWN_SPEED";
};

const SPEED_COLOR: Record<SpeedReadingInterval["speed"], string> = {
  FAST: "#16a34a",
  NORMAL: "#f59e0b",
  SLOW: "#dc2626",
  UNKNOWN_SPEED: "#64748b",
};

/** Decodificador de polyline codificada (lat/lng) */
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

/** Interfaces mínimas para trabajar con `unknown` de forma segura */
type GoogleBoundsLike = {
  extend: (pt: { lat: number; lng: number }) => void;
  isEmpty: () => boolean;
};
type GoogleMapLike = {
  fitBounds?: (bounds: GoogleBoundsLike, padding?: number) => void;
};
type MapsLib = {
  Map: new (el: HTMLElement, opts?: unknown) => unknown;
  Polyline: new (opts: unknown) => unknown;
};
type CoreLib = {
  LatLngBounds: new () => GoogleBoundsLike;
};

/** Crea un mapa con guards + cast seguro */
export async function makeGoogleMap(opts: {
  el: HTMLDivElement;
  center: { lat: number; lng: number };
  zoom?: number;
}): Promise<{ map: GoogleMapLike; libs: { maps: MapsLib; core: CoreLib } }> {
  const libsAll = await ensureGoogleMaps(["maps", "core"]);
  if (!libsAll.maps || !libsAll.core) {
    throw new Error("Google Maps libs missing (maps/core)");
  }
  const maps = libsAll.maps as MapsLib;
  const core = libsAll.core as CoreLib;

  // Cast del instance para evitar TS18046 (unknown)
  const map = new maps.Map(opts.el, {
    center: opts.center,
    zoom: opts.zoom ?? 12,
    disableDefaultUI: true,
  }) as unknown as GoogleMapLike;

  return { map, libs: { maps, core } };
}

/** Dibuja una ruta (polyline) con SRI opcional y hace fitBounds */
export async function drawRouteOnGoogle(opts: {
  el: HTMLDivElement;
  polyline?: string;
  sri?: SpeedReadingInterval[];
}): Promise<void> {
  const { el, polyline, sri } = opts;
  const path = polyline ? decodePolyline(polyline) : [];
  const center = path.length
    ? path[Math.floor(path.length / 2)]
    : { lat: 19.432608, lng: -99.133209 }; // CDMX fallback

  const { map, libs } = await makeGoogleMap({
    el,
    center,
    zoom: path.length ? 12 : 10,
  });
  const { maps, core } = libs;

  if (!path.length) return;

  if (sri && sri.length > 0) {
    // Segmentar por velocidad
    sri.forEach((seg) => {
      const start = Math.max(0, seg.startPolylinePointIndex);
      const end = Math.min(path.length - 1, seg.endPolylinePointIndex);
      if (end <= start) return;
      const segPath = path.slice(start, end + 1);
      // instancia Polyline
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      new maps.Polyline({
        path: segPath,
        strokeColor: SPEED_COLOR[seg.speed] ?? "#2563eb",
        strokeOpacity: 0.9,
        strokeWeight: 5,
        map,
      } as unknown);
    });
  } else {
    // línea completa
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    new maps.Polyline({
      path,
      strokeColor: "#2563eb",
      strokeOpacity: 0.9,
      strokeWeight: 5,
      map,
    } as unknown);
  }

  // fitBounds con tipos mínimos
  const bounds = new core.LatLngBounds();
  path.forEach((p) => bounds.extend(p));
  if (map.fitBounds && !bounds.isEmpty()) {
    map.fitBounds(bounds, 40);
  }
}
