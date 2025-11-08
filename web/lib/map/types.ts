export type LatLng = { lat: number; lng: number };
export interface MapProvider {
  mount(el: HTMLElement, center: LatLng, zoom: number): Promise<void>;
  setRoute(
    origin: string,
    destination: string,
    polyline?: LatLng[],
  ): Promise<void>;
  setMarkers(points: LatLng[]): void;
  setTraffic?(enabled: boolean): void; // solo Google
  fitBounds(sw: LatLng, ne: LatLng): void;
  destroy(): void;
}
