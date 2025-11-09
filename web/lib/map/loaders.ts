// web/lib/map/loaders.ts
// Loader dual: usa importLibrary si existe; si no, cae a constructores globales.
// También expone ensureGooglePlaces.

let scriptPromise: Promise<void> | null = null;
type GLib = "core" | "maps" | "places" | "routes";
const libCache: Partial<Record<GLib, any>> = {};

function injectGoogleScript() {
  if (scriptPromise) return scriptPromise;
  if (typeof window === "undefined") {
    scriptPromise = Promise.resolve();
    return scriptPromise;
  }
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!;
  if (!apiKey) throw new Error("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");

  // Cargamos con libraries=... para compatibilidad con modo clásico
  scriptPromise = new Promise((resolve, reject) => {
    // si ya hay script cargado, resolvemos
    if ((window as any).google?.maps) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    const qs = new URLSearchParams({
      key: apiKey,
      v: "weekly",
      libraries: "maps,places,routes",
      loading: "async",
      language: "es",
      region: "MX",
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

export async function ensureGoogleMaps(libs: GLib[] = ["core", "maps"]) {
  await injectGoogleScript();
  const g = (window as any).google?.maps;
  if (!g) throw new Error("Google Maps no está disponible");

  // Si existe importLibrary, úsalo con caché
  if (typeof g.importLibrary === "function") {
    const out: any = {};
    for (const L of libs) {
      if (!libCache[L]) {
        libCache[L] = await g.importLibrary(L);
      }
      out[L] = libCache[L];
    }
    return out as Record<GLib, any>;
  }

  // Fallback: regresamos wrappers con constructores globales
  const out: any = {};
  if (libs.includes("maps")) {
    out.maps = {
      Map: g.Map,
      Polyline: g.Polyline,
      Marker: g.Marker,
    };
  }
  if (libs.includes("core")) {
    out.core = {
      LatLngBounds: g.LatLngBounds,
    };
  }
  if (libs.includes("places")) {
    out.places = (g as any).places ?? {};
  }
  if (libs.includes("routes")) {
    out.routes = {}; // usamos REST para rutas; aquí no necesitas nada
  }
  return out as Record<GLib, any>;
}

export async function ensureGooglePlaces() {
  await injectGoogleScript();
  const g = (window as any).google?.maps;
  if (!g?.places) throw new Error("Google Places no disponible");
  return g.places;
}

/** -----------------------
 * Apple MapKit (idempotente)
 * --------------------- */
let aPromise: Promise<void> | null = null;
export function loadMapKit(token: string) {
  if (typeof window === "undefined") return Promise.resolve();
  const w = window as any;
  if (w.mapkit && w.__MAPKIT_INITED__) return Promise.resolve();
  if (aPromise) return aPromise;
  if (!token)
    return Promise.reject(new Error("Falta NEXT_PUBLIC_MAPKIT_TOKEN"));

  aPromise = new Promise((resolve, reject) => {
    const onReady = () => {
      try {
        if (!w.__MAPKIT_INITED__) {
          w.mapkit.init({
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
