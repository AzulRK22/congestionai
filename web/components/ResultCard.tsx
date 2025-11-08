"use client";

export function ResultCard({
  result,
  onSave,
}: {
  result: any;
  onSave: () => void;
}) {
  const t = new Date(result.best?.departAtISO);
  const tStr = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

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
    const msg = `Salgo ${tStr}. ETA ~${result.best.etaMin} min (ahorro ${(result.best.savingVsNow * 100) | 0}%) – CongestionAI`;
    if (navigator.share)
      navigator
        .share({ text: msg })
        .catch(() => navigator.clipboard.writeText(msg));
    else navigator.clipboard.writeText(msg);
  }

  return (
    <div>
      <div className="text-xl font-semibold">
        Sal {tStr} · ETA {result.best?.etaMin} min · Ahorro{" "}
        {(result.best?.savingVsNow * 100) | 0}%
      </div>
      <div className="mt-3 flex gap-2 flex-wrap">
        <button onClick={addICS} className="btn btn-outline">
          Add to Calendar
        </button>
        <button onClick={share} className="btn btn-outline">
          Compartir
        </button>
        <button onClick={onSave} className="btn btn-outline">
          Guardar en History
        </button>
      </div>
      <div className="mt-4 text-sm text-slate-600">
        Alternativas:
        <ul className="list-disc pl-5">
          {result.alternatives?.map((a: any, i: number) => (
            <li key={i}>
              {new Date(a.departAtISO).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · ETA {a.etaMin} min (±4m)
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-2 text-xs text-slate-500">{result.notes?.join(" · ")}</p>
    </div>
  );
}
