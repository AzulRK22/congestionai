/* eslint-disable @typescript-eslint/no-explicit-any */
import type { LatLng } from "../polyline";
import type { MapProvider } from "./types";
import { loadGoogleMaps } from "./loaders";

export class GoogleMapProvider implements MapProvider {
  private map!: google.maps.Map;
  private traffic?: google.maps.TrafficLayer;
  private routeLine?: google.maps.Polyline;

  async mount(el: HTMLElement, center: LatLng, zoom: number) {
    await loadGoogleMaps(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!);
    this.map = new google.maps.Map(el, {
      center,
      zoom,
      disableDefaultUI: true,
      mapId: undefined, // usa default
    });
    this.traffic = new google.maps.TrafficLayer();
  }

  /** Dibuja la ruta si llega un polyline (array de puntos). Si no, no hace nada. */
  async setRoute(_origin: string, _destination: string, polyline?: LatLng[]) {
    if (this.routeLine) this.routeLine.setMap(null);
    if (!polyline?.length) return;

    this.routeLine = new google.maps.Polyline({
      path: polyline,
      strokeColor: "#111",
      strokeOpacity: 0.9,
      strokeWeight: 4,
    });
    this.routeLine.setMap(this.map);

    const bounds = new google.maps.LatLngBounds();
    polyline.forEach((p) =>
      bounds.extend(new google.maps.LatLng(p.lat, p.lng)),
    );
    this.map.fitBounds(bounds, 48);
  }

  setTraffic(enabled: boolean) {
    enabled ? this.traffic?.setMap(this.map) : this.traffic?.setMap(null);
  }
  setMarkers(_points: LatLng[]) {
    /* opcional */
  }
  fitBounds(sw: LatLng, ne: LatLng) {
    this.map.fitBounds(new google.maps.LatLngBounds(sw as any, ne as any), 48);
  }
  destroy() {
    /* noop */
  }
}
