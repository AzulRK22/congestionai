"use client";
import { CalendarPlus, Share2, Bookmark, Info } from "lucide-react";
import type { AnalyzeResponse } from "@/types/analyze";

export type SavingsUI = { pesos: number; liters: number; kgCO2: number };

function formatTime(iso?: string) {
  if (!iso) return "--:--";
  const t = new Date(iso);
  return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function parseExplainChips(explain: string[] | undefined) {
  // Server manda (en español) p.ej: "Hora pico +23%"
  // Normalizamos a inglés y extraemos % para dar énfasis.
  const map: Record<string, string> = {
    "Hora pico": "Rush hour",
    "Fin de semana": "Weekend",
    Feriado: "Holiday",
    Lluvia: "Rain",
    "Tráfico relativo": "Traffic level",
  };
  const colorFor = (label: string) =>
    label === "Rush hour"
      ? "bg-rose-100 text-rose-700 border-rose-200"
      : label === "Holiday"
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : label === "Rain"
          ? "bg-sky-100 text-sky-700 border-sky-200"
          : label === "Traffic level"
            ? "bg-violet-100 text-violet-700 border-violet-200"
            : "bg-slate-100 text-slate-700 border-slate-200";

  const out =
    (explain ?? []).map((s) => {
      // "Nombre +12%" -> {label, pct}
      const m = s.match(/^(.+?)\s*\+?(-?\d+)%$/);
      const raw = m ? m[1] : s;
      const pct = m ? Number(m[2]) : 0;
      const label = map[raw] ?? raw;
      return { label, pct, className: colorFor(label) };
    }) ?? [];
  // Prioriza lo más relevante al frente
  return out.sort((a, b) => b.pct - a.pct);
}

export function ResultCard({
  result,
  savings,
  onSave,
}: {
  result: AnalyzeResponse;
  savings?: SavingsUI;
  onSave: () => void;
}) {
  const best = result.best;
  const tStr = formatTime(best?.departAtISO);
  const savingPct = Math.max(0, Math.round((best?.savingVsNow ?? 0) * 100));

  const chips = parseExplainChips(best?.explain);

  function addICS() {
    if (!best) return;
    const start = new Date(best.departAtISO);
    const end = new Date(start.getTime() + best.etaMin * 60000);
    const stamp = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      "SUMMARY:Optimal departure (CongestionAI)",
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
    if (!best) return;
    const msg = `Leave at ${tStr}. ETA ~${best.etaMin} min (saves ${savingPct}%) – CongestionAI`;
    if (navigator.share)
      navigator
        .share({ text: msg })
        .catch(() => navigator.clipboard.writeText(msg));
    else navigator.clipboard.writeText(msg);
  }

  return (
    <div className="grid gap-3">
      {/* Header: time + quick gain */}
      <div className="flex items-end justify-between">
        <div>
          <div className="text-sm text-slate-500">Best departure</div>
          <div className="text-4xl font-semibold leading-none">{tStr}</div>
        </div>
        <div className="text-right">
          <span
            className="inline-flex items-center text-xs px-2 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200"
            title="Estimated time saved vs leaving now"
          >
            Saves {savingPct}%
          </span>
          <div className="text-sm text-slate-600 mt-1">
            ETA {best?.etaMin} min
          </div>
        </div>
      </div>

      {/* Explainability chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.slice(0, 5).map((c, i) => (
            <span
              key={i}
              className={`inline-flex items-center text-xs px-2 py-1 rounded-full border ${c.className}`}
              title="Factor impact"
            >
              <Info size={12} className="mr-1" />
              {c.label} · +{c.pct}%
            </span>
          ))}
        </div>
      )}

      {/* Savings tiles (money, fuel, CO2) */}
      {savings && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border bg-white p-3 text-center">
            <div className="text-xs text-slate-500">Money saved</div>
            <div className="text-lg font-semibold">${savings.pesos}</div>
          </div>
          <div className="rounded-xl border bg-white p-3 text-center">
            <div className="text-xs text-slate-500">Fuel saved</div>
            <div className="text-lg font-semibold">{savings.liters} L</div>
          </div>
          <div className="rounded-xl border bg-white p-3 text-center">
            <div className="text-xs text-slate-500">CO₂ avoided</div>
            <div className="text-lg font-semibold">{savings.kgCO2} kg</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mt-2 flex gap-2 flex-wrap">
        <button
          onClick={addICS}
          className="btn btn-outline"
          aria-label="Add to calendar"
        >
          <CalendarPlus size={16} className="mr-2" /> Add to calendar
        </button>
        <button onClick={share} className="btn btn-outline" aria-label="Share">
          <Share2 size={16} className="mr-2" /> Share
        </button>
        <button
          onClick={onSave}
          className="btn btn-outline"
          aria-label="Save to history"
        >
          <Bookmark size={16} className="mr-2" /> Save to history
        </button>
      </div>

      {/* Alternatives */}
      {result.alternatives?.length > 0 && (
        <div className="mt-1">
          <div className="text-sm font-medium">Nearby alternatives</div>
          <ul className="mt-1 grid gap-1 text-sm text-slate-600">
            {result.alternatives
              .slice(0, 5)
              .map((a: { departAtISO: string; etaMin: number }, i: number) => (
                <li key={i} className="flex justify-between">
                  <span>{formatTime(a.departAtISO)}</span>
                  <span>ETA {a.etaMin} min</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Notes */}
      {result.notes?.length ? (
        <p className="mt-1 text-xs text-slate-500">
          {result.notes.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
