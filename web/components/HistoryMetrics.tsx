// web/components/HistoryMetrics.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import type { HistoryItem } from "@/lib/storage";
import { loadSettings, type AppSettings } from "@/lib/settings";

type Props = { items: HistoryItem[] };

const KG_CO2_PER_LITER = 2.31;
const LITERS_PER_GALLON = 3.78541;

function mmToHhmm(mins: number) {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h === 0 ? `${r} min` : `${h} h ${r} min`;
}

function guessCurrency(locale?: string) {
  const l = (locale || "es-MX").toLowerCase();
  if (l.includes("mx")) return "MXN";
  if (l.includes("us")) return "USD";
  if (l.includes("de")) return "EUR";
  // fallbacks razonables
  if (l.includes("es")) return "EUR";
  if (l.includes("en")) return "USD";
  return "USD";
}

export function HistoryMetrics({ items }: Props) {
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const totals = useMemo(() => {
    if (!settings || items.length === 0) {
      return {
        trips: items.length,
        savedMin: 0,
        savedLiters: 0,
        savedMoney: 0,
        savedKgCO2: 0,
      };
    }

    const litersPerTrip =
      (settings.carLper100km / 100) * settings.defaultTripKm;

    let savedMin = 0;
    let savedLiters = 0;

    for (const it of items) {
      const eta = it.eta ?? 0;

      // Reconstruct baseline if only % is present
      let baselineEta = it.baselineEta;
      if ((baselineEta == null || baselineEta <= 0) && it.savingPct != null) {
        const f = Math.max(0, Math.min(100, it.savingPct)) / 100;
        baselineEta = Math.round(eta / Math.max(0.05, 1 - f));
      }
      if (!baselineEta || baselineEta <= 0) continue;

      const saved = Math.max(0, baselineEta - eta);
      savedMin += saved;

      const timeFactor = saved / baselineEta; // proporcional al tiempo evitado
      savedLiters += litersPerTrip * timeFactor;
    }

    const savedMoney = savedLiters * settings.fuelPricePerL;
    const savedKgCO2 = savedLiters * KG_CO2_PER_LITER;

    const r2 = (x: number) => Math.round(x * 100) / 100;
    return {
      trips: items.length,
      savedMin: Math.round(savedMin),
      savedLiters: r2(savedLiters),
      savedMoney: r2(savedMoney),
      savedKgCO2: r2(savedKgCO2),
    };
  }, [items, settings]);

  // Loading skeleton
  if (!settings) {
    return (
      <div className="grid gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border bg-slate-50 h-20 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const currency = guessCurrency(settings.locale);
  const moneyFmt = new Intl.NumberFormat(settings.locale || "es-MX", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });

  // Mostrar combustible según unidades
  const fuelIsImperial = settings.units === "imperial";
  const fuelValue = fuelIsImperial
    ? Math.round((totals.savedLiters / LITERS_PER_GALLON) * 100) / 100
    : totals.savedLiters;
  const fuelUnit = fuelIsImperial ? "gal" : "L";

  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <div className="rounded-xl border bg-white p-3 text-center">
        <div className="text-xs text-slate-500">Trips</div>
        <div className="text-lg font-semibold">{totals.trips}</div>
      </div>

      <div className="rounded-xl border bg-white p-3 text-center">
        <div className="text-xs text-slate-500">Time saved</div>
        <div className="text-lg font-semibold">{mmToHhmm(totals.savedMin)}</div>
      </div>

      <div className="rounded-xl border bg-white p-3 text-center">
        <div className="text-xs text-slate-500">Fuel saved</div>
        <div className="text-lg font-semibold">
          {fuelValue} {fuelUnit}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-3 text-center">
        <div className="text-xs text-slate-500">CO₂ / Money</div>
        <div className="text-lg font-semibold">
          {totals.savedKgCO2} kg · {moneyFmt.format(totals.savedMoney)}
        </div>
      </div>

      <div className="sm:col-span-4 text-xs text-slate-500 mt-1 text-center">
        Based on Settings: {settings.carLper100km} L/100 km ·{" "}
        {settings.defaultTripKm} km/trip · fuel price&nbsp;
        {moneyFmt.format(settings.fuelPricePerL).replace(/\s/g, "")}
        {fuelIsImperial ? " per liter (display shown in gal)" : " per liter"}.
      </div>
    </div>
  );
}
