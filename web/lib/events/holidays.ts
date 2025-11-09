// web/lib/events/holidays.ts
import type { CountryCode } from "@/lib/settings";

// Minimal demo lists — extend as needed (YYYY-MM-DD, UTC)
const HOLIDAYS: Record<CountryCode, Set<string>> = {
  mx: new Set(["2025-11-20", "2025-12-25", "2026-01-01"]),
  us: new Set([
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
  ]),
  de: new Set([
    "2025-01-01",
    "2025-04-18",
    "2025-04-21",
    "2025-05-01",
    "2025-05-29",
    "2025-10-03",
    "2025-12-25",
    "2025-12-26",
  ]),
};

/** True if ISO date falls on a holiday for the given country. */
export function isHolidayISO(iso: string, country: CountryCode): boolean {
  if (!iso) return false;
  const day = safeIsoDay(iso);
  const set = HOLIDAYS[country];
  return !!day && !!set && set.has(day);
}

/** Optional helper for UI/debug */
export function listHolidays(country: CountryCode): string[] {
  return Array.from(HOLIDAYS[country] ?? []);
}

/** Normalize ISO → "YYYY-MM-DD" (UTC), tolerant to local strings. */
function safeIsoDay(iso: string): string | null {
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}
