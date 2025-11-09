// web/app/forecast/forecast-client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SectionCard } from "@/components/ui/SectionCard";
import { Heatmap } from "@/components/Heatmap";
import type { ForecastResponse } from "@/types/forecast";

export default function ForecastClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const origin = sp.get("origin") ?? "";
  const destination = sp.get("destination") ?? "";
  const horizon = Number(sp.get("h") ?? 72);
  const step = Number(sp.get("step") ?? 60);

  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const valid = origin.trim().length > 2 && destination.trim().length > 2;

  useEffect(() => {
    if (!valid) return;
    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch("/api/forecast", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            origin,
            destination,
            horizonHours: Number.isFinite(horizon) ? horizon : 72,
            stepMins: Number.isFinite(step) ? step : 60,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ForecastResponse;
        setData(json);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr((e as Error).message || "Error");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [origin, destination, horizon, step, valid]);

  // Adaptador → Heatmap {points, nowISO, chips}
  const { points, nowISO } = useMemo(() => {
    if (!data?.samples?.length)
      return {
        points: [] as { timeISO: string; etaMin: number; risk: number }[],
        nowISO: undefined as string | undefined,
      };
    const t0 = Date.now(); // “ahora” como base para convertir tMin→ISO
    const maxEta = Math.max(...data.samples.map((s) => s.etaMin));
    const pts = data.samples.map((s) => ({
      timeISO: new Date(t0 + s.tMin * 60_000).toISOString(),
      etaMin: s.etaMin,
      // riesgo relativo: mayor ETA == mayor “congestión”
      risk: s.etaMin / Math.max(1, maxEta),
    }));
    return { points: pts, nowISO: pts[0]?.timeISO };
  }, [data]);

  return (
    <section className="space-y-6">
      <SectionCard staticCard>
        <h3 className="font-semibold mb-3">72h Forecast</h3>
        {loading && (
          <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
        )}
        {err && (
          <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
            {err}
          </div>
        )}
        {!loading && data && (
          <Heatmap points={points} nowISO={nowISO} chips={["72h forecast"]} />
        )}
      </SectionCard>

      {data && (
        <SectionCard>
          <h3 className="font-semibold mb-3">Top 3 windows</h3>
          <ul className="grid gap-2">
            {data.bestWindows.map((w, i) => {
              const t = new Date(w.startISO).toLocaleString([], {
                weekday: "short",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <li key={i} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t}</div>
                    <div className="text-sm text-slate-600">
                      ETA ~{w.etaMin} min
                    </div>
                  </div>
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      const q = new URLSearchParams({
                        origin,
                        destination,
                        // usa offset desde ahora para llevar al Result directo
                        offset: String(Math.max(1, w.tMin)),
                        window: "120",
                        step: "10",
                      });
                      router.push(`/result?${q.toString()}`);
                    }}
                  >
                    Plan this window
                  </button>
                </li>
              );
            })}
          </ul>
          {data.notes?.length ? (
            <p className="mt-2 text-xs text-slate-500">
              {data.notes.join(" · ")}
            </p>
          ) : null}
        </SectionCard>
      )}
    </section>
  );
}
