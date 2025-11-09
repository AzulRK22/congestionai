// web/lib/settings.ts
export type Provider = "google" | "apple";
export type Units = "metric" | "imperial";
export type CountryCode = "mx" | "us" | "de";

export type AppSettings = {
  provider: Provider;
  units: Units;
  country: CountryCode;
  city: string;
  locale: string;

  fuelPricePerL: number; // per liter
  carLper100km: number; // L/100km
  defaultTripKm: number;

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
  country: "mx",
  city: "Mexico City",
  locale: "en-US",

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

function hasLS(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadSettings(): AppSettings {
  if (!hasLS()) return { ...defaultSettings }; // SSR: devuelve defaults
  const saved = safeParse<AppSettings>(window.localStorage.getItem(KEY));
  return { ...defaultSettings, ...(saved ?? {}) };
}

export function saveSettings(s: AppSettings) {
  if (!hasLS()) return; // SSR no-op
  window.localStorage.setItem(KEY, JSON.stringify(s));
}

/** Keep PlannerForm defaults in sync with Settings */
export function syncPlannerDefaultsToLocalStorage(s: AppSettings) {
  if (!hasLS()) return; // SSR no-op
  const planOpts = {
    departOffsetMin: 0,
    windowMins: s.windowMinsDefault,
    stepMins: s.stepMinsDefault,
    refine: s.budgetModeDefault,
    avoidTolls: s.avoidTollsDefault,
    avoidHighways: s.avoidHighwaysDefault,
    budgetMode: s.budgetModeDefault,
  };
  window.localStorage.setItem("plan_opts", JSON.stringify(planOpts));
  window.localStorage.setItem("provider", s.provider);
  window.localStorage.setItem("city", s.city);
  window.localStorage.setItem("units", s.units);
  window.localStorage.setItem("country", s.country);
}

export function resetSettings() {
  saveSettings(defaultSettings);
  syncPlannerDefaultsToLocalStorage(defaultSettings);
}

/** Public API flags (client). Server keys live in .env */
export function apiStatus() {
  const hasGmaps = Boolean(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  const hasMapKit = Boolean(process.env.NEXT_PUBLIC_MAPKIT_TOKEN);
  return { hasGmaps, hasMapKit };
}
