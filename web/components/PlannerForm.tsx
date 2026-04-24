"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { ArrowUpDown, ChevronDown, Info } from "lucide-react";
import {
  AutocompleteInput,
  AutocompleteInputRef,
} from "@/components/AutocompleteInput";
import { Button } from "@/components/ui/Button";

export type PlanOptions = {
  departOffsetMin: number; // 0 = depart now
  windowMins: number; // e.g., 120
  stepMins: number; // e.g., 10 or 20
  refine: boolean; // server fine-tune around best time
  avoidTolls: boolean;
  avoidHighways: boolean;
  budgetMode: boolean; // UI label: Credit saver
};

export function PlannerForm({
  initialOrigin = "",
  initialDestination = "",
  initialOptions,
  onSubmit,
}: {
  initialOrigin?: string;
  initialDestination?: string;
  initialOptions?: Partial<PlanOptions>;
  onSubmit: (o: string, d: string, opts: PlanOptions) => void;
}) {
  const [origin, setOrigin] = useState(initialOrigin);
  const [dest, setDest] = useState(initialDestination);

  const [opts, setOpts] = useState<PlanOptions>(() => {
    const base: PlanOptions = {
      departOffsetMin: 0,
      windowMins: 120,
      stepMins: 20,
      refine: true,
      avoidTolls: false,
      avoidHighways: false,
      budgetMode: true,
    };
    return { ...base, ...initialOptions };
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const originRef = useRef<AutocompleteInputRef>(null);
  const destRef = useRef<AutocompleteInputRef>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("plan_opts");
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<PlanOptions>;
      setOpts((current) => ({ ...current, ...parsed, ...initialOptions }));
    } catch {}
  }, [initialOptions]);

  // --- fix “[object Event]”: coercers aceptan string o event ---
  const handleOriginChange = (
    v: string | React.ChangeEvent<HTMLInputElement>,
  ) => {
    setOrigin(typeof v === "string" ? v : (v?.target?.value ?? ""));
  };
  const handleDestChange = (
    v: string | React.ChangeEvent<HTMLInputElement>,
  ) => {
    setDest(typeof v === "string" ? v : (v?.target?.value ?? ""));
  };

  useEffect(() => {
    window.localStorage.setItem("plan_opts", JSON.stringify(opts));
  }, [opts]);

  const valid = useMemo(
    () => origin.trim().length > 2 && dest.trim().length > 2,
    [origin, dest],
  );

  function swap() {
    setOrigin(dest);
    setDest(origin);
    setActiveId("origin");
    originRef.current?.focus?.();
  }

  // Credit saver toggle applies presets
  function toggleCreditSaver(v: boolean) {
    setOpts((o) => {
      const next = { ...o, budgetMode: v };
      if (v) {
        next.windowMins = 120;
        next.stepMins = 20;
        next.refine = true;
      } else {
        next.windowMins = 120;
        next.stepMins = 10;
        next.refine = false;
      }
      return next;
    });
  }

  // quick presets (rename to avoid global setInterval)
  const setWindow = (m: number) => setOpts((o) => ({ ...o, windowMins: m }));
  const setIntervalMin = (m: number) => setOpts((o) => ({ ...o, stepMins: m }));

  const coarseCalls =
    Math.floor(opts.windowMins / Math.max(1, opts.stepMins)) + 1;
  const refineCalls = opts.refine ? 5 : 0;
  const estCalls = coarseCalls + refineCalls;

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit(origin.trim(), dest.trim(), opts);
      }}
    >
      <div className="grid gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          Route
        </div>
        <p className="text-sm text-slate-600">
          Use addresses, place IDs, or coordinates like{" "}
          <code>@19.4326,-99.1332</code>.
        </p>
      </div>

      <AutocompleteInput
        ref={originRef}
        selfId="origin"
        activeId={activeId}
        setActiveId={setActiveId}
        placeholder="Origin"
        aria-label="Origin"
        value={origin}
        onChange={handleOriginChange}
        allowMyLocation
        onPicked={() => {
          setActiveId("dest");
          destRef.current?.focus?.();
        }}
      />

      <AutocompleteInput
        ref={destRef}
        selfId="dest"
        activeId={activeId}
        setActiveId={setActiveId}
        placeholder="Destination"
        aria-label="Destination"
        value={dest}
        onChange={handleDestChange}
        onPicked={() => setActiveId(null)}
      />

      <div className="rounded-[24px] border border-slate-200/70 bg-white/60 p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Search window
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Balance precision and API usage before running the analysis.
            </div>
          </div>
          <span
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600"
            title="Estimated Google Routes API calls"
            aria-label="Estimated API calls"
          >
            Approx. {estCalls} calls
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-600">
            Planning window
          </span>
          {[60, 120, 180].map((m) => {
            const active = opts.windowMins === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setWindow(m)}
                aria-label={`Set planning window to ${m} minutes`}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  active
                    ? "border-teal-700 bg-teal-700 text-white shadow-lg shadow-teal-900/15"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {m} min
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-600">Interval</span>
          {[5, 10, 20].map((m) => {
            const active = opts.stepMins === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setIntervalMin(m)}
                aria-label={`Set interval to ${m} minutes`}
                className={`rounded-full border px-3 py-1.5 text-xs transition ${
                  active
                    ? "border-teal-700 bg-teal-700 text-white shadow-lg shadow-teal-900/15"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {m} min
              </button>
            );
          })}
        </div>
      </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button type="submit" disabled={!valid} aria-label="Plan">
          Analyze trip
        </Button>

        <button
          type="button"
          onClick={swap}
          className="btn btn-outline"
          aria-label="Swap origin and destination"
          title="Swap origin and destination"
        >
          <ArrowUpDown size={16} className="mr-2" /> Swap
        </button>
      </div>

      {/* More options */}
      <div className="mt-1">
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="inline-flex items-center text-sm font-medium text-slate-700 hover:underline"
          aria-expanded={showAdvanced}
          aria-controls="advanced-options"
        >
          More options and route preferences
          <ChevronDown
            size={14}
            className={`ml-1 transition ${showAdvanced ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {showAdvanced && (
        <div
          id="advanced-options"
          className="grid gap-4 rounded-[24px] border border-slate-200 bg-white/80 p-4"
        >
          {/* Credit saver */}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={opts.budgetMode}
              onChange={(e) => toggleCreditSaver(e.target.checked)}
            />
            Credit saver
            <span
              className="inline-flex items-center text-xs text-slate-500 ml-1"
              title="Fewer API calls + local fine-tune"
            >
              <Info size={14} className="mr-1" />
              Fewer API calls + fine-tune
            </span>
          </label>

          {/* Exact controls */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm block mb-1">
                Planning window (min)
              </label>
              <input
                className="input"
                inputMode="numeric"
                type="number"
                min={20}
                max={240}
                step={10}
                value={opts.windowMins}
                onChange={(e) =>
                  setOpts((o) => ({
                    ...o,
                    windowMins: Math.max(20, Number(e.target.value) || 120),
                  }))
                }
              />
            </div>
            <div>
              <label className="text-sm block mb-1">Interval (min)</label>
              <input
                className="input"
                inputMode="numeric"
                type="number"
                min={5}
                max={60}
                step={5}
                value={opts.stepMins}
                onChange={(e) =>
                  setOpts((o) => ({
                    ...o,
                    stepMins: Math.max(5, Number(e.target.value) || 10),
                  }))
                }
              />
            </div>
          </div>

          {/* Fine tune */}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={opts.refine}
              onChange={(e) =>
                setOpts((o) => ({ ...o, refine: e.target.checked }))
              }
            />
            Fine-tune around best time (±20 min, 5-min interval)
          </label>

          {/* Depart in */}
          <div>
            <label className="text-sm block mb-1">Depart in (min)</label>
            <input
              className="input"
              inputMode="numeric"
              type="number"
              min={0}
              max={10080}
              step={5}
              value={opts.departOffsetMin}
              onChange={(e) =>
                setOpts((o) => ({
                  ...o,
                  departOffsetMin: Math.max(0, Number(e.target.value) || 0),
                }))
              }
            />
            <p className="text-xs text-slate-500 mt-1">0 = depart now</p>
          </div>

          {/* Route modifiers */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={opts.avoidTolls}
                onChange={(e) =>
                  setOpts((o) => ({ ...o, avoidTolls: e.target.checked }))
                }
              />
              Avoid tolls
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={opts.avoidHighways}
                onChange={(e) =>
                  setOpts((o) => ({ ...o, avoidHighways: e.target.checked }))
                }
              />
              Avoid highways (motorways)
            </label>
          </div>
        </div>
      )}

      <p className="mt-1 text-xs leading-6 text-slate-500">
        Tip: if you are comparing several options, keep the interval at{" "}
        <strong>10-20 min</strong> for a reliable signal without overspending
        API calls.
      </p>
    </form>
  );
}
