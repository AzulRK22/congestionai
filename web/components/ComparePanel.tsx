"use client";
import { X } from "lucide-react";
import { estimateSavings } from "@/lib/sustainability";

type Sel = { label: string; departAtISO: string; etaMin: number };

export function ComparePanel({
  selections,
  onClear,
}: {
  selections: Sel[];
  onClear: () => void;
}) {
  if (!selections.length) return null;

  const sorted = [...selections].sort((a, b) => a.etaMin - b.etaMin);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  const savingVsWorst = Math.max(
    0,
    (worst.etaMin - best.etaMin) / Math.max(1, worst.etaMin),
  );
  const sav = estimateSavings({
    etaMin: best.etaMin,
    savingVsNow: savingVsWorst,
    fuelPricePerL: 25,
    carLper100km: 8.5,
    tripKm: 12,
  });

  return (
    <div className="rounded-2xl border p-3 bg-white">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Comparador</h4>
        <button className="btn btn-xxs btn-outline" onClick={onClear}>
          <X size={14} className="mr-1" /> Limpiar
        </button>
      </div>

      <div className="mt-2 grid gap-2">
        {sorted.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div>
              <span className="badge mr-2">{s.label}</span>
              {new Date(s.departAtISO).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div>ETA {s.etaMin} min</div>
          </div>
        ))}
      </div>

      {sorted.length >= 2 && (
        <div className="mt-3 text-sm">
          <div>
            <b>Diferencia:</b> {worst.etaMin - best.etaMin} min (≈{" "}
            {Math.round(savingVsWorst * 100)}%)
          </div>
          <div className="text-slate-600">
            Ahorro estimado: ${sav.pesos} MXN · {sav.liters} L · {sav.kgCO2} kg
            CO₂
          </div>
        </div>
      )}
    </div>
  );
}
