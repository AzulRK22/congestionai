"use client";
import { CalendarPlus, Share2, Bookmark } from "lucide-react";
import type { AnalyzeResponse } from "@/types/analyze";

type Props = {
  result: AnalyzeResponse;
  onSave: () => void;
};

export function ResultCard({ result, onSave }: Props) {
  const best = result.best;

  // Si algo raro pasó y no hay "best", evitamos crashear el render
  if (!best) {
    return (
      <div className="text-sm text-red-600">
        No se encontró una opción óptima de salida.
      </div>
    );
  }

  const t = new Date(best.departAtISO);
  const tStr = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const savingPct = Math.round(best.savingVsNow * 100);

  function addICS() {
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
    const msg = `Salgo ${tStr}. ETA ~${best.etaMin} min (ahorro ${savingPct}%) – CongestionAI`;
    if (navigator.share) {
      navigator.share({ text: msg }).catch(() => {
        void navigator.clipboard.writeText(msg);
      });
    } else {
      void navigator.clipboard.writeText(msg);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-end justify-between">
        <div>
          <div className="text-sm text-slate-500">Mejor salida</div>
          <div className="text-4xl font-semibold leading-none">{tStr}</div>
        </div>
        <div className="text-right">
          <div className="badge badge-ok">Ahorro {savingPct}%</div>
          <div className="text-sm text-slate-600 mt-1">
            ETA {best.etaMin} min
          </div>
        </div>
      </div>

      <div className="mt-2 flex gap-2 flex-wrap">
        <button onClick={addICS} className="btn btn-outline">
          <CalendarPlus size={16} className="mr-2" /> Añadir al calendario
        </button>
        <button onClick={share} className="btn btn-outline">
          <Share2 size={16} className="mr-2" /> Compartir
        </button>
        <button onClick={onSave} className="btn btn-outline">
          <Bookmark size={16} className="mr-2" /> Guardar en History
        </button>
      </div>

      {result.alternatives?.length > 0 && (
        <div className="mt-1">
          <div className="text-sm font-medium">Alternativas cercanas</div>
          <ul className="mt-1 grid gap-1 text-sm text-slate-600">
            {result.alternatives.slice(0, 5).map((a, i) => (
              <li key={a.departAtISO ?? i} className="flex justify-between">
                <span>
                  {new Date(a.departAtISO).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span>ETA {a.etaMin} min</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!result.notes?.length && (
        <p className="mt-1 text-xs text-slate-500">
          {result.notes.join(" · ")}
        </p>
      )}
    </div>
  );
}
