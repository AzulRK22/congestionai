// types/forecast.ts
export type ForecastSample = {
  tMin: number; // minutos desde ahora
  departAtISO: string; // salida
  etaMin: number; // ETA estimado
  risk: number; // 0..1
};

export type ForecastResponse = {
  samples: ForecastSample[];
  bestWindows: Array<{
    startISO: string;
    tMin: number;
    etaMin: number;
    risk: number;
  }>;
  notes: string[];
};
