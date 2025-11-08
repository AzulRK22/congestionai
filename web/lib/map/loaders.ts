let gPromise: Promise<void> | null = null;
export function loadGoogleMaps(
  apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
) {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).google?.maps) return Promise.resolve();
  if (gPromise) return gPromise;

  gPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    // 👉 incluye loading=async para evitar el warning de performance
    const params = new URLSearchParams({
      key: apiKey,
      libraries: "geometry,places",
      loading: "async",
    });
    s.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });

  return gPromise;
}

let aPromise: Promise<void> | null = null;
export function loadMapKit(token: string) {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as any).mapkit?.init) return Promise.resolve();
  if (aPromise) return aPromise;
  aPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js";
    s.async = true;
    s.defer = true;
    s.onload = () => {
      (window as any).mapkit.init({
        authorizationCallback: (done: (t: string) => void) => done(token),
        language: "es",
      });
      resolve();
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return aPromise;
}
