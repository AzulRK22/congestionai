"use client";

import { useRef, useState, useEffect } from "react";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { AutocompleteInput } from "@/components/AutocompleteInput";
import { Button } from "@/components/ui/Button";

export type PlanOptions = {
  departOffsetMin: number; // 0 = salir ahora
  windowMins: number; // p. ej., 120
  stepMins: number; // p. ej., 10 o 20
  refine: boolean; // refinamiento fino en server
  avoidTolls: boolean;
  avoidHighways: boolean;
  budgetMode: boolean; // bandera solo para UI
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

  // Preferencias (defaults + localStorage + props iniciales)
  const [opts, setOpts] = useState<PlanOptions>(() => {
    const base: PlanOptions = {
      departOffsetMin: 0,
      windowMins: 120,
      stepMins: 20,
      refine: true, // menos llamadas por defecto
      avoidTolls: false,
      avoidHighways: false,
      budgetMode: true,
    };
    if (typeof window === "undefined") return { ...base, ...initialOptions };
    try {
      const raw = window.localStorage.getItem("plan_opts");
      const saved = raw ? (JSON.parse(raw) as Partial<PlanOptions>) : {};
      return { ...base, ...saved, ...initialOptions };
    } catch {
      return { ...base, ...initialOptions };
    }
  });

  // Avanzado colapsable y control de dropdown activo entre inputs
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Refs (HTMLInputElement | null) compatibles con el forwardRef del input
  const originRef = useRef<HTMLInputElement | null>(null);
  const destRef = useRef<HTMLInputElement | null>(null);

  // Persistencia de opciones
  useEffect(() => {
    try {
      window.localStorage.setItem("plan_opts", JSON.stringify(opts));
    } catch {}
  }, [opts]);

  const valid = origin.trim().length > 2 && dest.trim().length > 2;

  function swap() {
    const o = origin;
    setOrigin(dest);
    setDest(o);
    setActiveId("origin");
    originRef.current?.focus();
  }

  // Presets de budget-mode
  function toggleBudgetMode(v: boolean) {
    setOpts((o) => {
      const next = { ...o, budgetMode: v };
      if (v) {
        next.windowMins = 120; // 2h
        next.stepMins = 20; // ~7 llamadas
        next.refine = true; // +refinamiento local
      } else {
        next.windowMins = 120;
        next.stepMins = 10; // ~13 llamadas
        next.refine = false;
      }
      return next;
    });
  }

  // Estimador de llamadas a Routes v2
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
        placeholder="Origen"
        value={origin}
        onChange={setOrigin}
        allowMyLocation
        onPicked={() => {
          setActiveId("dest");
          destRef.current?.focus();
        }}
      />

      <AutocompleteInput
        ref={destRef}
        selfId="dest"
        activeId={activeId}
        setActiveId={setActiveId}
        placeholder="Destino"
        value={dest}
        onChange={setDest}
        onPicked={() => setActiveId(null)}
      />

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={!valid}>
          Planear
        </Button>

        <button
          type="button"
          onClick={swap}
          className="btn btn-outline"
          aria-label="Intercambiar"
        >
          <ArrowUpDown size={16} className="mr-2" /> Intercambiar
        </button>

        {/* Estimador de llamadas */}
        <span
          className="ml-auto text-xs px-2 py-1 rounded-full border bg-white text-slate-600"
          title="Estimación de llamadas a Routes v2 (cuida tus créditos)"
        >
          ≈ {estCalls} llamadas
        </span>
      </div>

      {/* Avanzado */}
      <div className="mt-1">
        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="inline-flex items-center text-sm text-slate-700 hover:underline"
        >
          Opciones avanzadas
          <ChevronDown
            size={14}
            className={`ml-1 transition ${showAdvanced ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {showAdvanced && (
        <div className="rounded-xl border p-3 grid gap-3 bg-white">
          {/* Budget mode */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={opts.budgetMode}
              onChange={(e) => toggleBudgetMode(e.target.checked)}
            />
            Budget-mode (menos llamadas + refinamiento local)
          </label>

          {/* Ventana y paso */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm block mb-1">Ventana (min)</label>
              <input
                className="input"
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
              <label className="text-sm block mb-1">Paso (min)</label>
              <input
                className="input"
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

          {/* Refinamiento */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={opts.refine}
              onChange={(e) =>
                setOpts((o) => ({ ...o, refine: e.target.checked }))
              }
            />
            Refinar alrededor del mínimo (±20 min con step=5 min)
          </label>

          {/* Offset de salida */}
          <div>
            <label className="text-sm block mb-1">Salir en (min)</label>
            <input
              className="input"
              type="number"
              min={0}
              max={360}
              step={5}
              value={opts.departOffsetMin}
              onChange={(e) =>
                setOpts((o) => ({
                  ...o,
                  departOffsetMin: Math.max(0, Number(e.target.value) || 0),
                }))
              }
            />
            <p className="text-xs text-slate-500 mt-1">0 = salir ahora</p>
          </div>

          {/* Modificadores de ruta */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={opts.avoidTolls}
                onChange={(e) =>
                  setOpts((o) => ({ ...o, avoidTolls: e.target.checked }))
                }
              />
              Evitar cuotas/peajes
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={opts.avoidHighways}
                onChange={(e) =>
                  setOpts((o) => ({ ...o, avoidHighways: e.target.checked }))
                }
              />
              Evitar autopistas
            </label>
          </div>
        </div>
      )}

      <p className="mt-1 text-xs text-slate-500">
        Tip: puedes pegar <code>@19.4326,-99.1332</code> o{" "}
        <code>19.4326,-99.1332</code>.
      </p>
    </form>
  );
}
