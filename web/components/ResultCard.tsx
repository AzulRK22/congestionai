"use client";
import { CalendarPlus, Share2, Bookmark } from "lucide-react";

export function ResultCard({
  result,
  onSave,
}: {
  result: any;
  onSave: () => void;
}) {
  const t = new Date(result.best?.departAtISO);
  const tStr = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const savingPct = (result.best?.savingVsNow * 100) | 0;

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
            ETA {result.best?.etaMin} min
          </div>
        </div>
      </div>

      <div className="mt-2 flex gap-2 flex-wrap">
        <button onClick={addICS} className="btn btn-outline">
          <CalendarPlus size={16} className="mr-2" /> Add to Calendar
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
            {result.alternatives.slice(0, 5).map((a: any, i: number) => (
              <li key={i} className="flex justify-between">
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

      <p className="mt-1 text-xs text-slate-500">{result.notes?.join(" · ")}</p>
    </div>
  );
}
