"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ArrowUpDown } from "lucide-react";
import {
  AutocompleteInput,
  AutocompleteInputRef,
} from "@/components/AutocompleteInput";

export function PlannerForm({
  initialOrigin = "",
  initialDestination = "",
  onSubmit,
}: {
  initialOrigin?: string;
  initialDestination?: string;
  onSubmit: (o: string, d: string) => void;
}) {
  const [origin, setOrigin] = useState(initialOrigin);
  const [dest, setDest] = useState(initialDestination);
  const [activeId, setActiveId] = useState<string | null>(null);

  const originRef = useRef<AutocompleteInputRef | null>(null);
  const destRef = useRef<AutocompleteInputRef | null>(null);

  const valid = origin.trim().length > 2 && dest.trim().length > 2;

  function swap() {
    const o = origin;
    setOrigin(dest);
    setDest(o);
    setActiveId("origin");
    originRef.current?.focus?.();
  }

  return (
    <form
      className="grid gap-3"
      // 👇 mata cualquier dropdown ANTES de que el click llegue al botón
      onPointerDownCapture={() => activeId && setActiveId(null)}
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(origin.trim(), dest.trim());
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
          destRef.current?.focus?.();
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
      </div>

      <p className="mt-1 text-xs text-slate-500">
        Tip: puedes pegar <code>@19.4326,-99.1332</code> o{" "}
        <code>19.4326,-99.1332</code>.
      </p>
    </form>
  );
}
