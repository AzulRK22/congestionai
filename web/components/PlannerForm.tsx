"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ArrowUpDown } from "lucide-react";
import { AutocompleteInput } from "@/components/AutocompleteInput";

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
  const valid = origin.trim().length > 2 && dest.trim().length > 2;

  function swap() {
    const o = origin;
    setOrigin(dest);
    setDest(o);
  }

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(origin.trim(), dest.trim());
      }}
    >
      <AutocompleteInput
        placeholder="Origen"
        value={origin}
        onChange={setOrigin}
        allowMyLocation
      />
      <AutocompleteInput
        placeholder="Destino"
        value={dest}
        onChange={setDest}
      />

      <div className="flex items-center gap-2">
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
        Tip: presiona <kbd>Enter</kbd> para planear.
      </p>
    </form>
  );
}
