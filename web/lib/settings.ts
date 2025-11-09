// web/lib/settings.ts
export type Provider = "google" | "apple";
export type Units = "metric" | "imperial";
export type CountryCode = "mx" | "us" | "de";

export type AppSettings = {
  provider: Provider;
  units: Units;
  city: string;
  locale: string;
  country: CountryCode;

  // Ahorro / sostenibilidad
  fuelPricePerL: number; // moneda local por litro (demo)
  carLper100km: number; // L/100km
  defaultTripKm: number; // distancia típica del trayecto

  // Planner defaults
  budgetModeDefault: boolean;
  windowMinsDefault: number;
  stepMinsDefault: number;
  avoidTollsDefault: boolean;
  avoidHighwaysDefault: boolean;
};

const KEY = "app_settings_v1";

export const defaultSettings: AppSettings = {
  provider: "google",
  units: "metric",
  city: "CDMX",
  locale: "es-MX",
  country: "mx",

  fuelPricePerL: 25,
  carLper100km: 8.5,
  defaultTripKm: 12,

  budgetModeDefault: true,
  windowMinsDefault: 120,
  stepMinsDefault: 20,
  avoidTollsDefault: false,
  avoidHighwaysDefault: false,
};

function safeParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export function loadSettings(): AppSettings {
  const saved = safeParse<AppSettings>(
    typeof window !== "undefined" ? localStorage.getItem(KEY) : null,
  );
  return { ...defaultSettings, ...(saved ?? {}) };
}

export function saveSettings(s: AppSettings) {
  if (typeof window !== "undefined") {
    localStorage.setItem(KEY, JSON.stringify(s));
  }
}

/** Sincroniza defaults del planner a las claves que usa PlannerForm */
export function syncPlannerDefaultsToLocalStorage(s: AppSettings) {
  if (typeof window === "undefined") return;
  const planOpts = {
    departOffsetMin: 0,
    windowMins: s.windowMinsDefault,
    stepMins: s.stepMinsDefault,
    refine: s.budgetModeDefault, // cuando budget-mode => refine on
    avoidTolls: s.avoidTollsDefault,
    avoidHighways: s.avoidHighwaysDefault,
    budgetMode: s.budgetModeDefault,
  };
  localStorage.setItem("plan_opts", JSON.stringify(planOpts));
  localStorage.setItem("provider", s.provider);
  localStorage.setItem("city", s.city);
  localStorage.setItem("units", s.units);
  localStorage.setItem("country", s.country);
}

export function resetSettings() {
  saveSettings(defaultSettings);
  syncPlannerDefaultsToLocalStorage(defaultSettings);
}

/** Estado de llaves públicas (las privadas van en .env del server) */
export function apiStatus() {
  const hasGmaps = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  const hasMapKit = Boolean(process.env.NEXT_PUBLIC_MAPKIT_TOKEN);
  return { hasGmaps, hasMapKit };
}
