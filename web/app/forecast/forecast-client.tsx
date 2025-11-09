"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SectionCard } from "@/components/ui/SectionCard";
import { Heatmap } from "@/components/Heatmap";
import { Button } from "@/components/ui/Button";
import { isHolidayISO } from "@/lib/events/holidays";
import { loadSettings, type AppSettings } from "@/lib/settings";
import type { ForecastResponse } from "@/types/forecast";

// Convierte minutos desde un baseMs → ISO
function isoAt(baseMs: number, tMin: number) {
  return new Date(baseMs + tMin * 60_000).toISOString();
}

export default function ForecastClient() {
  const sp = useSearchParams();
  const router = useRouter();

  // --- URL params (defaults)
  const originQ = sp.get("origin") ?? "";
  const destinationQ = sp.get("destination") ?? "";
  const horizonQ = Number(sp.get("h") ?? 72); // horas
  const stepQ = Number(sp.get("step") ?? 60); // minutos

  // --- Form state
  const [origin, setOrigin] = useState(originQ);
  const [destination, setDestination] = useState(destinationQ);
  const [horizon, setHorizon] = useState(
    Number.isFinite(horizonQ) ? horizonQ : 72,
  );
  const [step, setStep] = useState(Number.isFinite(stepQ) ? stepQ : 60);

  // Settings (cliente)
  const [settings, setSettings] = useState<AppSettings | null>(null);
  useEffect(() => setSettings(loadSettings()), []);
  const country = (settings?.country ?? "mx") as "mx" | "us" | "de";

  const valid = originQ.trim().length > 2 && destinationQ.trim().length > 2;

  // Data
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // --- Fetch forecast al cambiar URL params
  useEffect(() => {
    if (!valid) {
      setData(null);
      setErr(null);
      return;
    }
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
            origin: originQ,
            destination: destinationQ,
            horizonHours: Number.isFinite(horizonQ) ? horizonQ : 72,
            stepMins: Number.isFinite(stepQ) ? stepQ : 60,
            country,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ForecastResponse;
        setData(json);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setErr((e as Error).message || "Error");
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [originQ, destinationQ, horizonQ, stepQ, country, valid]);

  // arriba ya importas useState y useEffect
  const [hmBaseMs, setHmBaseMs] = useState(() => Date.now());

  useEffect(() => {
    setHmBaseMs(Date.now());
  }, [originQ, destinationQ, horizonQ, stepQ]);

  // --- Datos para Heatmap
  const heatmapPoints = useMemo(() => {
    if (!data?.samples?.length) return [];
    const maxEta = Math.max(...data.samples.map((s) => s.etaMin));
    return data.samples.map((s) => ({
      timeISO: isoAt(hmBaseMs, s.tMin),
      etaMin: s.etaMin,
      risk: s.etaMin / Math.max(1, maxEta), // normalizado 0..1 para tintar fondo
    }));
  }, [data, hmBaseMs]);

  const heatmapNowISO = useMemo(() => isoAt(hmBaseMs, 0), [hmBaseMs]);

  // Chips de contexto
  const heatmapChips = useMemo(() => {
    const chips: string[] = ["Forecast (beta)"];
    if (!heatmapPoints.length) return chips;
    const hasWeekend = heatmapPoints.some((p) => {
      const d = new Date(p.timeISO).getDay();
      return d === 0 || d === 6;
    });
    const hasHoliday = heatmapPoints.some((p) =>
      isHolidayISO(p.timeISO, country),
    );
    if (hasWeekend) chips.push("Weekend");
    if (hasHoliday) chips.push("Holiday");
    return chips;
  }, [heatmapPoints, country]);

  // --- Submit: sincroniza URL (deep link) y dispara efecto
  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = new URLSearchParams({
      origin,
      destination,
      h: String(Math.max(24, Math.min(168, horizon))),
      step: String(Math.max(15, Math.min(180, step))),
    });
    router.replace(`/forecast?${q.toString()}`);
  }

  return (
    <section className="space-y-6">
      {/* FORM */}
      <SectionCard>
        <h3 className="font-semibold mb-3">72h Forecast</h3>
        <form
          onSubmit={onSubmit}
          className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto_auto] md:items-end"
        >
          <div>
            <label className="text-sm block mb-1">Origin</label>
            <input
              className="input"
              placeholder="e.g., Mexico City or @19.43,-99.13"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              aria-label="Origin"
              required
            />
          </div>
          <div>
            <label className="text-sm block mb-1">Destination</label>
            <input
              className="input"
              placeholder="e.g., Puebla"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              aria-label="Destination"
              required
            />
          </div>
          <div>
            <label className="text-sm block mb-1">Horizon (hours)</label>
            <select
              className="input"
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              aria-label="Horizon hours"
            >
              <option value={24}>24</option>
              <option value={48}>48</option>
              <option value={72}>72</option>
            </select>
          </div>
          <div>
            <label className="text-sm block mb-1">Step (mins)</label>
            <select
              className="input"
              value={step}
              onChange={(e) => setStep(Number(e.target.value))}
              aria-label="Step minutes"
            >
              <option value={30}>30</option>
              <option value={60}>60</option>
              <option value={90}>90</option>
            </select>
          </div>
          <div className="md:justify-self-end">
            <Button type="submit">Get forecast</Button>
          </div>
        </form>
        <p className="mt-2 text-xs text-slate-500">
          Country: <span className="font-medium uppercase">{country}</span>{" "}
          (holiday-aware).
        </p>
      </SectionCard>

      {/* HEATMAP */}
      <SectionCard staticCard>
        <h3 className="font-semibold mb-3">Heatmap (ETA & risk)</h3>
        {loading && (
          <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
        )}
        {err && (
          <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
            {err}
          </div>
        )}
        {!loading && data && (
          <Heatmap
            points={heatmapPoints}
            nowISO={heatmapNowISO}
            chips={heatmapChips}
          />
        )}
        {!loading && !data && (
          <div className="rounded-xl border bg-slate-50 p-3 text-sm text-slate-600">
            Enter origin & destination to see the 72h forecast.
          </div>
        )}
      </SectionCard>

      {/* TOP WINDOWS */}
      {data && (
        <SectionCard>
          <h3 className="font-semibold mb-3">Top windows</h3>
          <ul className="grid gap-2">
            {data.bestWindows.map((w, i) => {
              const t = new Date(w.startISO).toLocaleString([], {
                weekday: "short",
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <li
                  key={`${w.startISO}-${w.tMin}-${i}`}
                  className="flex items-center justify-between rounded-xl border bg-white p-3"
                >
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
                        origin: originQ || origin,
                        destination: destinationQ || destination,
                        offset: String(Math.max(1, w.tMin)), // salta a Result en esa ventana
                        window: "120",
                        step: "10",
                      });
                      router.push(`/result?${q.toString()}`);
                    }}
                    aria-label="Plan this window"
                  >
                    Plan this window
                  </button>
                </li>
              );
            })}
          </ul>
          {!!data.notes?.length && (
            <p className="mt-2 text-xs text-slate-500">
              {data.notes.join(" · ")}
            </p>
          )}
        </SectionCard>
      )}
    </section>
  );
}
