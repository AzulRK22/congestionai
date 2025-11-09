// web/lib/events/holidays.ts
import type { CountryCode } from "@/lib/settings";

// Listas mínimas de demo — extiéndelas según necesites
const mxHolidays = [
  "2025-11-20", // Revolución Mexicana (ejemplo)
  "2025-12-25",
  "2026-01-01",
];

const usHolidays = [
  "2025-01-01",
  "2025-01-20",
  "2025-02-17",
  "2025-05-26",
  "2025-07-04",
  "2025-09-01",
  "2025-10-13",
  "2025-11-11",
  "2025-11-27",
  "2025-12-25",
];

const deHolidays = [
  "2025-01-01",
  "2025-04-18",
  "2025-04-21",
  "2025-05-01",
  "2025-05-29",
  "2025-10-03",
  "2025-12-25",
  "2025-12-26",
];

export function isHolidayISO(iso: string, country: CountryCode): boolean {
  const d = iso.slice(0, 10);
  switch (country) {
    case "mx":
      return mxHolidays.includes(d);
    case "us":
      return usHolidays.includes(d);
    case "de":
      return deHolidays.includes(d);
    default:
      return false;
  }
}
