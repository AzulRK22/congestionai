// web/lib/map/loaders.ts

/** -----------------------
 * Google Maps JS API (script tag)
 * --------------------- */
let gPromise: Promise<void> | null = null;

export async function loadGoogleMaps(
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
) {
  if (typeof window === "undefined") return;
  // ya cargado
  if ((window as any).google?.maps?.Map) return;
  if (!apiKey)
    throw new Error("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en .env.local");
  if (gPromise) return gPromise;

  gPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    // Librerías que usamos: maps (mapa), routes (Directions) y places (Autocomplete)
    const params = new URLSearchParams({
      key: apiKey,
      libraries: "maps,routes,places",
      v: "weekly",
      loading: "async",
      // optional: language/region si quieres
      // language: "es",
      // region: "MX",
    });
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });

  await gPromise;
}

/** -----------------------
 * Apple MapKit JS (idempotente)
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
