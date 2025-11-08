// web/lib/map/loaders.ts
import { Loader } from "@googlemaps/js-api-loader";

/** -----------------------
 * Google Maps JS API (importLibrary)
 * --------------------- */
let gLoader: Loader | null = null;
let gInitPromise: Promise<void> | null = null;

export async function loadGoogleMaps(
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
) {
  if (typeof window === "undefined") return;

  // Ya disponible
  if ((window as any).google?.maps?.Map) return;

  if (!apiKey)
    throw new Error("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en .env.local");

  if (!gLoader) {
    gLoader = new Loader({
      apiKey,
      version: "weekly",
      language: "es",
      region: "MX",
    });
  }

  if (!gInitPromise) {
    gInitPromise = (async () => {
      // Carga librerías necesarias; Directions está en 'routes'
      // @ts-ignore - importLibrary tipos nuevos
      await gLoader!.importLibrary("maps");
      // @ts-ignore
      await gLoader!.importLibrary("routes");
      // @ts-ignore
      await gLoader!.importLibrary("places");
      // geometry queda disponible cuando cargas 'maps' en versiones recientes,
      // si la necesitas estricta, puedes agregar:
      // // @ts-ignore
      // await gLoader!.importLibrary("geometry");
    })();
  }

  await gInitPromise;
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
