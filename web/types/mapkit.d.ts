// types/mapkit.d.ts
declare namespace mapkit {
  class Map {
    constructor(element: HTMLElement);
    showsZoomControl: boolean;
    showsMapTypeControl: boolean;
    language: string;
    region: CoordinateRegion;
    addOverlay(overlay: Overlay): void;
    removeOverlay(overlay: Overlay): void;
  }

  type Overlay = PolylineOverlay;

  class Coordinate {
    constructor(latitude: number, longitude: number);
  }

  class CoordinateSpan {
    constructor(latitudeDelta: number, longitudeDelta: number);
  }

  class CoordinateRegion {
    constructor(center: Coordinate, span: CoordinateSpan);
  }

  class Style {
    constructor(options: { lineWidth?: number; strokeColor?: string });
  }

  class PolylineOverlay {
    constructor(points: Coordinate[], options?: { style?: Style });
  }
}

interface Window {
  mapkit: typeof mapkit;
}
