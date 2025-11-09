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
    const saved =
      typeof window !== "undefined"
        ? window.localStorage.getItem("plan_opts")
        : null;
    const base: PlanOptions = {
      departOffsetMin: 0,
      windowMins: 120,
      stepMins: 20,
      refine: true, // on with credit-saver by default
      avoidTolls: false,
      avoidHighways: false,
      budgetMode: true,
    };
    return { ...base, ...(saved ? JSON.parse(saved) : {}), ...initialOptions };
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const originRef = useRef<AutocompleteInputRef>(null);
  const destRef = useRef<AutocompleteInputRef>(null);

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
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!valid) return;
        onSubmit(origin.trim(), dest.trim(), opts);
      }}
    >
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

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={!valid} aria-label="Plan">
          Plan
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

        <span
          className="ml-auto text-xs px-2 py-1 rounded-full border bg-white text-slate-600 inline-flex items-center gap-1"
          title="Estimated Google Routes API calls"
          aria-label="Estimated API calls"
        >
          ≈ {estCalls} API calls
        </span>
      </div>

      {/* Quick presets without custom 'chip' class */}
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-600">Planning window</span>
          {[60, 120, 180].map((m) => {
            const active = opts.windowMins === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setWindow(m)}
                aria-label={`Set planning window to ${m} minutes`}
                className={`text-xs px-2 py-1 rounded-full border ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {m} min
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-600">Interval</span>
          {[5, 10, 20].map((m) => {
            const active = opts.stepMins === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setIntervalMin(m)}
                aria-label={`Set interval to ${m} minutes`}
                className={`text-xs px-2 py-1 rounded-full border ${
                  active
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                {m} min
              </button>
            );
          })}
        </div>
      </div>

      {/* More options */}
      <div className="mt-1">
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="inline-flex items-center text-sm text-slate-700 hover:underline"
          aria-expanded={showAdvanced}
          aria-controls="advanced-options"
        >
          More options
          <ChevronDown
            size={14}
            className={`ml-1 transition ${showAdvanced ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {showAdvanced && (
        <div
          id="advanced-options"
          className="rounded-xl border p-3 grid gap-3 bg-white"
        >
          {/* Credit saver */}
          <label className="flex items-center gap-2 text-sm">
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
          <div className="grid grid-cols-2 gap-3">
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
          <label className="flex items-center gap-2 text-sm">
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
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={opts.avoidTolls}
                onChange={(e) =>
                  setOpts((o) => ({ ...o, avoidTolls: e.target.checked }))
                }
              />
              Avoid tolls
            </label>
            <label className="flex items-center gap-2 text-sm">
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

      <p className="mt-1 text-xs text-slate-500">
        Tip: you can paste <code>@19.4326,-99.1332</code> or{" "}
        <code>19.4326,-99.1332</code>.
      </p>
    </form>
  );
}
