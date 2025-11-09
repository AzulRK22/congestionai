// web/lib/map/loaders.ts
// Loader dual: usa importLibrary si existe; si no, cae a constructores globales.
// Tipado sin `any` usando unknown + tipos mínimos.

let scriptPromise: Promise<void> | null = null;
type GLib = "core" | "maps" | "places" | "routes";

type CoreLib = {
  LatLngBounds: new () => {
    extend: (pt: { lat: number; lng: number }) => void;
    isEmpty: () => boolean;
  };
};

type MapsLib = {
  Map: new (el: HTMLElement, opts?: unknown) => unknown;
  Polyline: new (opts: unknown) => unknown;
  Marker: new (opts: unknown) => unknown;
};

type PlacesLib = Record<string, unknown>;
type RoutesLib = Record<string, unknown>;

type LibShape = Partial<{
  core: CoreLib;
  maps: MapsLib;
  places: PlacesLib;
  routes: RoutesLib;
}>;

const libCache: Partial<Record<GLib, unknown>> = {};

function injectGoogleScript() {
  if (scriptPromise) return scriptPromise;
  if (typeof window === "undefined") {
    scriptPromise = Promise.resolve();
    return scriptPromise;
  }
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
  if (!apiKey) throw new Error("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");

  scriptPromise = new Promise((resolve, reject) => {
    const g = (window as unknown as { google?: { maps?: unknown } }).google;
    if (g?.maps) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    const qs = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      libraries: "maps,places,routes",
      loading: "async",
    });
    s.src = `https://maps.googleapis.com/maps/api/js?${qs.toString()}`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export async function ensureGoogleMaps(
  libs: GLib[] = ["core", "maps"],
): Promise<LibShape> {
  await injectGoogleScript();
  const g = (
    window as unknown as {
      google?: { maps?: { importLibrary?: (n: string) => Promise<unknown> } };
    }
  ).google?.maps;
  if (!g) throw new Error("Google Maps no está disponible");

  const out: LibShape = {};

  // Si existe importLibrary, úsalo con caché
  if (typeof g.importLibrary === "function") {
    for (const L of libs) {
      if (!libCache[L]) {
        libCache[L] = await g.importLibrary(L);
      }
      const v = libCache[L];
      if (L === "core") out.core = v as CoreLib;
      else if (L === "maps") out.maps = v as MapsLib;
      else if (L === "places") out.places = v as PlacesLib;
      else if (L === "routes") out.routes = v as RoutesLib;
    }
    return out;
  }

  // Fallback clásico: tomar constructores globales
  const gg = (
    window as unknown as {
      google?: {
        maps?: {
          Map: MapsLib["Map"];
          Polyline: MapsLib["Polyline"];
          Marker: MapsLib["Marker"];
          LatLngBounds: CoreLib["LatLngBounds"];
          places?: PlacesLib;
        };
      };
    }
  ).google?.maps;

  if (libs.includes("maps") && gg?.Map && gg.Polyline && gg.Marker) {
    out.maps = {
      Map: gg.Map,
      Polyline: gg.Polyline,
      Marker: gg.Marker,
    };
  }
  if (libs.includes("core") && gg?.LatLngBounds) {
    out.core = {
      LatLngBounds: gg.LatLngBounds,
    };
  }
  if (libs.includes("places") && gg?.places) {
    out.places = gg.places;
  }
  if (libs.includes("routes")) {
    out.routes = {};
  }
  return out;
}

export async function ensureGooglePlaces(): Promise<PlacesLib> {
  await injectGoogleScript();
  const places = (
    window as unknown as {
      google?: { maps?: { places?: PlacesLib } };
    }
  ).google?.maps?.places;
  if (!places) throw new Error("Google Places no disponible");
  return places;
}

/** -----------------------
 * Apple MapKit (idempotente)
 * --------------------- */
let aPromise: Promise<void> | null = null;

export function loadMapKit(token: string) {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as unknown as {
    mapkit?: unknown;
    __MAPKIT_INITED__?: boolean;
  };
  if (w.mapkit && w.__MAPKIT_INITED__) return Promise.resolve();
  if (aPromise) return aPromise;
  if (!token)
    return Promise.reject(new Error("Falta NEXT_PUBLIC_MAPKIT_TOKEN"));

  aPromise = new Promise((resolve, reject) => {
    const onReady = () => {
      try {
        if (!w.__MAPKIT_INITED__) {
          const mk = w.mapkit as {
            init: (opts: {
              authorizationCallback: (cb: (t: string) => void) => void;
              language?: string;
            }) => void;
          };
          mk.init({
            authorizationCallback: (done: (t: string) => void) => done(token),
            language: "es",
          });
          w.__MAPKIT_INITED__ = true;
        }
        resolve();
      } catch (e) {
        reject(e);
      }
    };

    if (!document.getElementById("apple-mapkit")) {
      const s = document.createElement("script");
      s.id = "apple-mapkit";
      s.src = "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js";
      s.async = true;
      s.defer = true;
      s.onload = onReady;
      s.onerror = reject;
      document.head.appendChild(s);
    } else {
      onReady();
    }
  });

  return aPromise;
}
