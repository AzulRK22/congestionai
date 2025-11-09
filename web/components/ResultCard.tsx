"use client";

import { CalendarPlus, Share2, Bookmark, Activity } from "lucide-react";
import type { AnalyzeResponse } from "@/types/analyze";

export function ResultCard({
  result,
  savings,
  onSave,
  onCompareAdd,
  onExploreForecast,
}: {
  result: AnalyzeResponse;
  savings?: { pesos: number; liters: number; kgCO2: number };
  onSave: () => void;
  onCompareAdd?: (slot: {
    label: string;
    departAtISO: string;
    etaMin: number;
  }) => void;
  onExploreForecast?: () => void;
}) {
  const t = new Date(result.best?.departAtISO);
  const tStr = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const savingPct = Math.round((result.best?.savingVsNow ?? 0) * 100);

  function addICS() {
    const start = new Date(result.best.departAtISO);
    const end = new Date(start.getTime() + result.best.etaMin * 60000);
    const stamp = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      "SUMMARY:Salida óptima (CongestionAI)",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "congestionai.ics";
    a.click();
  }

  function share() {
    const msg = `Salgo ${tStr}. ETA ~${result.best.etaMin} min (ahorro ${savingPct}%) – CongestionAI`;
    if (navigator.share)
      navigator
        .share({ text: msg })
        .catch(() => navigator.clipboard.writeText(msg));
    else navigator.clipboard.writeText(msg);
  }

  const explain = (result.best?.explain ?? []).slice(0, 5);

  return (
    <div className="grid gap-3">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-sm text-slate-500">Mejor salida</div>
          <div className="text-4xl font-semibold leading-none">{tStr}</div>
          {!!explain.length && (
            <div className="mt-2 flex flex-wrap gap-2">
              {explain.map((tag, i) => (
                <span key={i} className="badge">
                  {tag}
                </span>
              ))}
            </div>
          )}
          {savings && (
            <div className="mt-2 text-xs text-slate-600">
              Ahorro estimado: ${savings.pesos} MXN · {savings.liters} L ·{" "}
              {savings.kgCO2} kg CO₂
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="badge badge-ok">Ahorro {savingPct}%</div>
          <div className="text-sm text-slate-600 mt-1">
            ETA {result.best?.etaMin} min
          </div>
        </div>
      </div>

      <div className="mt-2 flex gap-2 flex-wrap">
        <button onClick={addICS} className="btn btn-outline">
          <CalendarPlus size={16} className="mr-2" /> Calendar
        </button>
        <button onClick={share} className="btn btn-outline">
          <Share2 size={16} className="mr-2" /> Compartir
        </button>
        <button onClick={onSave} className="btn btn-outline">
          <Bookmark size={16} className="mr-2" /> Guardar
        </button>
        {onExploreForecast && (
          <button onClick={onExploreForecast} className="btn btn-outline">
            <Activity size={16} className="mr-2" /> Explorar 72 h
          </button>
        )}
        {onCompareAdd && (
          <button
            onClick={() =>
              onCompareAdd({
                label: "Mejor",
                departAtISO: result.best.departAtISO,
                etaMin: result.best.etaMin,
              })
            }
            className="btn btn-outline"
          >
            + Comparar
          </button>
        )}
      </div>

      {result.alternatives?.length > 0 && (
        <div className="mt-1">
          <div className="text-sm font-medium">Alternativas cercanas</div>
          <ul className="mt-1 grid gap-1 text-sm text-slate-600">
            {result.alternatives.slice(0, 5).map((a, i) => (
              <li key={i} className="flex items-center justify-between">
                <span>
                  {new Date(a.departAtISO).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span className="ml-2">ETA {a.etaMin} min</span>
                {onCompareAdd && (
                  <button
                    className="btn btn-xxs btn-outline ml-2"
                    onClick={() =>
                      onCompareAdd({
                        label: `Alt ${i + 1}`,
                        departAtISO: a.departAtISO,
                        etaMin: a.etaMin,
                      })
                    }
                  >
                    + Comparar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-1 text-xs text-slate-500">{result.notes?.join(" · ")}</p>
    </div>
  );
}
