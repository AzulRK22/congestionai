"use client";

type Props = {
  status: "ok" | "wait";
  bestAtISO?: string;
  waitMin?: number;
  savedMin?: number;
  savingPct?: number; // 0..100
  locale?: string;
};

export function GoNowBadge({
  status,
  bestAtISO,
  waitMin = 0,
  savedMin,
  savingPct,
  locale,
}: Props) {
  const t =
    bestAtISO &&
    new Date(bestAtISO).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });

  const isOK = status === "ok";

  return (
    <div
      className={`rounded-xl border p-3 ${
        isOK
          ? "bg-emerald-50 border-emerald-200 text-emerald-900"
          : "bg-amber-50 border-amber-200 text-amber-900"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              isOK ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          <span className="font-semibold">{isOK ? "OK to go" : "Not yet"}</span>
        </div>

        {/* dato rápido a la derecha */}
        {t && (
          <span className="text-xs opacity-80">
            Best {isOK ? "≈" : "at"} {t}
          </span>
        )}
      </div>

      {/* leyenda secundaria */}
      <p className="mt-1 text-sm opacity-90">
        {isOK
          ? `La diferencia vs esperar es baja${
              savingPct != null ? ` (~${savingPct}%).` : "."
            }`
          : `Espera ~${Math.max(waitMin, 0)} min para ahorrar${
              savedMin && savedMin > 0 ? ` ~${savedMin} min` : ""
            }${savingPct != null ? ` (~${savingPct}%).` : "."}`}
      </p>
    </div>
  );
}

export default GoNowBadge;
