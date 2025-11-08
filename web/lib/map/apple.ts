/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MapProvider, LatLng } from "./types";
import { loadMapKit } from "./loaders";

function spanFromZoom(zoom: number) {
  // Heurístico simple para "acercamiento ciudad"
  const clamp = (x: number, min: number, max: number) =>
    Math.max(min, Math.min(max, x));
  const z = clamp(zoom, 3, 18);
  const latDelta = clamp(4 / Math.pow(2, z - 5), 0.01, 1.5);
  const mk = (window as any).mapkit;
  return new mk.CoordinateSpan(latDelta, latDelta);
}

export class AppleMapProvider implements MapProvider {
  private map!: any;
  private routeOverlay?: any;
  private directions?: any;

  async mount(el: HTMLElement, center: LatLng, zoom: number) {
    const token = process.env.NEXT_PUBLIC_MAPKIT_TOKEN || "";
    await loadMapKit(token);
    const mk = (window as any).mapkit;

    const centerCoord = new mk.Coordinate(center.lat, center.lng);

    // ⚠️ Sin zoomLevel: usa region (center + span)
    this.map = new mk.Map(el, {
      showsUserLocation: false,
      center: centerCoord,
    });

    const span = spanFromZoom(zoom);
    this.map.region = new mk.CoordinateRegion(centerCoord, span);

    this.directions = new mk.Directions();
  }

  async setRoute(origin: string, destination: string) {
    const mk = (window as any).mapkit;
    this.directions.route({ origin, destination }, (_err: any, data: any) => {
      const route = data?.routes?.[0];
      if (!route) return;

      if (this.routeOverlay) this.map.removeOverlay(this.routeOverlay);
      this.routeOverlay = new mk.PolylineOverlay(route.path, {
        style: { lineWidth: 4, strokeColor: "#111" },
      });
      this.map.addOverlay(this.routeOverlay);

      // Padding como objeto (más compatible que new mk.Padding)
      this.map.showItems([this.routeOverlay], {
        padding: { top: 48, right: 48, bottom: 48, left: 48 },
      });
    });
  }

  setMarkers(_points: LatLng[]) {
    /* opcional */
  }
  fitBounds(_sw: LatLng, _ne: LatLng) {
    /* opcional */
  }
  destroy() {
    /* noop */
  }
}
