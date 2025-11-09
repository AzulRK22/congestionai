// web/types/analyze.ts
export type SpeedReadingInterval = {
  startPolylinePointIndex: number;
  endPolylinePointIndex: number;
  speed: "SLOW" | "NORMAL" | "FAST" | "UNKNOWN_SPEED";
};

export type RouteSample = {
  m: number;
  departAtISO: string;
  etaMin: number;
  risk: number;
  contribs: { name: string; delta: number }[];
  polyline: string | null;
  sri: SpeedReadingInterval[];
};

export type AnalyzeResponse = {
  best: {
    departAtISO: string;
    etaMin: number;
    savingVsNow: number;
    risk: number;
    explain: string[];
    polyline?: string | null;
    sri?: SpeedReadingInterval[];
  };
  alternatives: RouteSample[];
  heatmap: { hourOfWeek: number; risk: number }[];
  notes: string[];
};

// 👇 faltaba este tipo
export type WaypointInput =
  | string
  | { placeId: string }
  | { lat: number; lng: number };

// Forma mínima de la respuesta de Routes v2 que usamos
export type ComputeRoutesResponse = {
  routes?: Array<{
    duration?: string;
    staticDuration?: string;
    polyline?: { encodedPolyline?: string };
    travelAdvisory?: { speedReadingIntervals?: SpeedReadingInterval[] };
  }>;
};
