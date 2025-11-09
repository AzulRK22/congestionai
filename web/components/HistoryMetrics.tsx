"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/ui/SectionCard";
import type { HistoryItem } from "@/lib/storage";
import { loadSettings, type AppSettings } from "@/lib/settings";

type Props = {
  items: HistoryItem[];
};

const KG_CO2_PER_LITER = 2.31;

function mmToHhmm(mins: number) {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return `${h} h ${r} min`;
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
        savedPesos: 0,
        savedKgCO2: 0,
      };
    }

    const litersPerTrip =
      (settings.carLper100km / 100) * settings.defaultTripKm;

    let savedMin = 0;
    let savedLiters = 0;

    for (const it of items) {
      const eta = it.eta ?? 0;

      // reconstruye baseline si hace falta
      let baselineEta = it.baselineEta;
      if ((baselineEta == null || baselineEta <= 0) && it.savingPct != null) {
        const f = Math.max(0, Math.min(100, it.savingPct)) / 100;
        baselineEta = Math.round(eta / Math.max(0.05, 1 - f));
      }

      if (!baselineEta || baselineEta <= 0) continue;

      const saved = Math.max(0, baselineEta - eta);
      savedMin += saved;

      const timeFactor = saved / baselineEta;
      savedLiters += litersPerTrip * timeFactor;
    }

    const savedPesos = savedLiters * settings.fuelPricePerL;
    const savedKgCO2 = savedLiters * KG_CO2_PER_LITER;

    // redondeo amable
    const r2 = (x: number) => Math.round(x * 100) / 100;

    return {
      trips: items.length,
      savedMin: Math.round(savedMin),
      savedLiters: r2(savedLiters),
      savedPesos: r2(savedPesos),
      savedKgCO2: r2(savedKgCO2),
    };
  }, [items, settings]);

  return (
    <SectionCard>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold">Impacto acumulado</h3>
        <span className="text-xs text-slate-500">
          {totals.trips} rutas guardadas
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-3">
          <div className="text-xs text-slate-500">Tiempo ahorrado</div>
          <div className="text-xl font-semibold">
            {mmToHhmm(totals.savedMin)}
          </div>
        </div>

        <div className="card p-3">
          <div className="text-xs text-slate-500">Litros ahorrados</div>
          <div className="text-xl font-semibold">{totals.savedLiters} L</div>
        </div>

        <div className="card p-3">
          <div className="text-xs text-slate-500">CO₂ evitado</div>
          <div className="text-xl font-semibold">{totals.savedKgCO2} kg</div>
        </div>

        <div className="card p-3">
          <div className="text-xs text-slate-500">Dinero ahorrado</div>
          <div className="text-xl font-semibold">${totals.savedPesos} MXN</div>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Basado en Settings: {settings?.carLper100km ?? "—"} L/100km,{" "}
        {settings?.defaultTripKm ?? "—"} km/traslado, $
        {settings?.fuelPricePerL ?? "—"} MXN/L.
      </p>
    </SectionCard>
  );
}
