/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MapProvider, LatLng } from "./types";
import { loadGoogleMaps } from "./loaders";

export class GoogleMapProvider implements MapProvider {
  private map!: google.maps.Map;
  private traffic?: google.maps.TrafficLayer;
  private routeLine?: google.maps.Polyline;
  private directions?: google.maps.DirectionsService;

  async mount(el: HTMLElement, center: LatLng, zoom: number) {
    await loadGoogleMaps(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!);
    this.map = new google.maps.Map(el, {
      center,
      zoom,
      disableDefaultUI: true,
    });
    this.traffic = new google.maps.TrafficLayer();
    this.directions = new google.maps.DirectionsService();
  }

  async setRoute(origin: string, destination: string, polyline?: LatLng[]) {
    if (this.routeLine) this.routeLine.setMap(null);

    if (polyline?.length) {
      this.routeLine = new google.maps.Polyline({
        path: polyline,
        strokeColor: "#111",
        strokeOpacity: 0.9,
        strokeWeight: 4,
      });
      this.routeLine.setMap(this.map);
      const bounds = new google.maps.LatLngBounds();
      polyline.forEach((p) => bounds.extend(p as any));
      this.map.fitBounds(bounds, 48);
      return;
    }

    if (!this.directions) return;

    this.directions.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(),
          trafficModel: google.maps.TrafficModel.BEST_GUESS,
        },
      },
      (result, status) => {
        if (
          status !== google.maps.DirectionsStatus.OK ||
          !result?.routes?.[0]
        ) {
          // No dibujes nada si falla (evita crash)
          return;
        }
        const route = result.routes[0];
        const path = route.overview_path;

        this.routeLine = new google.maps.Polyline({
          path,
          strokeColor: "#111",
          strokeOpacity: 0.9,
          strokeWeight: 4,
        });
        this.routeLine.setMap(this.map);

        const bounds = new google.maps.LatLngBounds();
        path.forEach((p: any) => bounds.extend(p));
        this.map.fitBounds(bounds, 48);
      },
    );
  }

  setMarkers(_points: LatLng[]) {
    /* opcional */
  }
  setTraffic(enabled: boolean) {
    enabled ? this.traffic?.setMap(this.map) : this.traffic?.setMap(null);
  }
  fitBounds(sw: LatLng, ne: LatLng) {
    this.map.fitBounds(new google.maps.LatLngBounds(sw as any, ne as any), 48);
  }
  destroy() {
    /* noop */
  }
}
