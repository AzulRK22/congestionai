// web/types/forecast.ts
export type ForecastSample = {
  tMin: number; // minutos desde "ahora"
  departAtISO: string; // ISO real de salida (lo manda la API)
  etaMin: number; // ETA en minutos
  risk: number; // 0..1
};

export type ForecastWindow = {
  startISO: string;
  tMin: number;
  etaMin: number;
  risk: number;
};

export type ForecastResponse = {
  samples: ForecastSample[];
  bestWindows: ForecastWindow[];
  notes?: string[];
};
