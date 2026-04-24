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

async function copyTextSafe(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}

  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
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

  async function share() {
    if (!best) return;
    const msg = `Leave at ${tStr}. ETA ~${best.etaMin} min (saves ${savingPct}%) – CongestionAI`;
    try {
      if (navigator.share) {
        await navigator.share({ text: msg });
        return;
      }
    } catch {}
    await copyTextSafe(msg);
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 rounded-[28px] border border-white/70 bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 p-5 text-white shadow-xl shadow-teal-950/10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-100/80">
            Recommended departure
          </div>
          <div className="mt-3 text-5xl font-semibold leading-none [font-family:var(--font-display)]">
            {tStr}
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-teal-50/80">
            This is the strongest tradeoff between ETA and congestion risk in
            the current search window.
          </p>
        </div>
        <div className="rounded-[24px] border border-white/12 bg-white/10 p-4 text-left md:min-w-44">
          <div className="text-xs uppercase tracking-[0.18em] text-teal-50/70">
            Expected trip
          </div>
          <div className="mt-2 text-2xl font-semibold">ETA {best?.etaMin} min</div>
          <div className="mt-2 text-sm text-teal-50/75">Saves {savingPct}% vs leaving now</div>
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.slice(0, 5).map((c, i) => (
            <span
              key={i}
              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs ${c.className}`}
              title="Factor impact"
            >
              <Info size={12} className="mr-1" />
              {c.label} · +{c.pct}%
            </span>
          ))}
        </div>
      )}

      {savings && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-[24px] border border-slate-200/70 bg-white/80 p-4 text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Money
            </div>
            <div className="mt-2 text-lg font-semibold">${savings.pesos}</div>
          </div>
          <div className="rounded-[24px] border border-slate-200/70 bg-white/80 p-4 text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Fuel
            </div>
            <div className="mt-2 text-lg font-semibold">{savings.liters} L</div>
          </div>
          <div className="rounded-[24px] border border-slate-200/70 bg-white/80 p-4 text-center">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              CO2
            </div>
            <div className="mt-2 text-lg font-semibold">{savings.kgCO2} kg</div>
          </div>
        </div>
      )}

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

      {result.alternatives?.length > 0 && (
        <div className="mt-1 rounded-[24px] border border-slate-200/70 bg-white/70 p-4">
          <div className="text-sm font-medium text-slate-900">
            Nearby alternatives
          </div>
          <ul className="mt-3 grid gap-2 text-sm text-slate-600">
            {result.alternatives
              .slice(0, 5)
              .map((a: { departAtISO: string; etaMin: number }, i: number) => (
                <li
                  key={i}
                  className="flex justify-between rounded-2xl border border-slate-100 bg-white px-3 py-2"
                >
                  <span>{formatTime(a.departAtISO)}</span>
                  <span>ETA {a.etaMin} min</span>
                </li>
              ))}
          </ul>
        </div>
      )}

      {result.notes?.length ? (
        <p className="mt-1 text-xs text-slate-500">
          {result.notes.join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
