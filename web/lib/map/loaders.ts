// web/lib/map/loaders.ts
// Loader dual: usa importLibrary si existe; si no, cae a constructores globales.
// Tipado estricto sin `any` y compatible con SSR.

let scriptPromise: Promise<void> | null = null;
type GLib = "core" | "maps" | "places" | "routes";

type CoreLib = {
  LatLngBounds: new () => {
    extend: (pt: { lat: number; lng: number }) => void;
    isEmpty?: () => boolean;
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
const GOOGLE_SCRIPT_ID = "gmaps-js-sdk";

// Inyecta el <script> de Google Maps JS SDK de forma idempotente
function injectGoogleScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  if (typeof window === "undefined") {
    // SSR: no insertar nada
    scriptPromise = Promise.resolve();
    return scriptPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
  if (!apiKey) throw new Error("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");

  const g = (window as unknown as { google?: { maps?: unknown } }).google;
  if (g?.maps) {
    scriptPromise = Promise.resolve();
    return scriptPromise;
  }

  const qs = new URLSearchParams({
    key: apiKey,
    v: "weekly",
    loading: "async",
    // Para el fallback de globals; importLibrary ignora este parámetro, pero no estorba.
    libraries: "maps,places,routes",
  });

  scriptPromise = new Promise((resolve, reject) => {
    // Evita insertar múltiples veces
    const existing = document.getElementById(
      GOOGLE_SCRIPT_ID,
    ) as HTMLScriptElement | null;
    if (existing && (window as typeof window & { google?: unknown }).google) {
      resolve();
      return;
    }
    const s = existing ?? document.createElement("script");
    s.id = GOOGLE_SCRIPT_ID;
    s.src = `https://maps.googleapis.com/maps/api/js?${qs.toString()}`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar Google Maps JS SDK"));
    if (!existing) document.head.appendChild(s);
  });

  return scriptPromise;
}

/**
 * Asegura la disponibilidad de las libs pedidas.
 * Intenta usar `google.maps.importLibrary`, si no, cae a constructores globales.
 */
export async function ensureGoogleMaps(
  libs: GLib[] = ["core", "maps"],
): Promise<LibShape> {
  await injectGoogleScript();

  const gmaps = (
    window as unknown as {
      google?: { maps?: { importLibrary?: (n: string) => Promise<unknown> } };
    }
  ).google?.maps;

  if (!gmaps) throw new Error("Google Maps no está disponible");

  const out: LibShape = {};

  // Camino preferente: importLibrary + caché
  if (typeof gmaps.importLibrary === "function") {
    for (const L of libs) {
      if (!libCache[L]) {
        libCache[L] = await gmaps.importLibrary(L);
      }
      const v = libCache[L];
      if (L === "core") out.core = v as CoreLib;
      else if (L === "maps") out.maps = v as MapsLib;
      else if (L === "places") out.places = v as PlacesLib;
      else if (L === "routes") out.routes = v as RoutesLib;
    }
    return out;
  }

  // Fallback: constructores globales clásicos
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
    out.routes = {}; // no hay constructores globales específicos
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

/* -----------------------
 * Apple MapKit (idempotente)
 * ---------------------- */
let aPromise: Promise<void> | null = null;

export function loadMapKit(token: string): Promise<void> {
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
        reject(e instanceof Error ? e : new Error("MapKit init error"));
      }
    };

    if (!document.getElementById("apple-mapkit")) {
      const s = document.createElement("script");
      s.id = "apple-mapkit";
      s.src = "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js";
      s.async = true;
      s.defer = true;
      s.onload = onReady;
      s.onerror = () => reject(new Error("No se pudo cargar Apple MapKit"));
      document.head.appendChild(s);
    } else {
      onReady();
    }
  });

  return aPromise;
}
