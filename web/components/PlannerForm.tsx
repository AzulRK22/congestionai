"use client";
import { useState } from "react";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";

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

  return (
    <form
      className="grid gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(origin.trim(), dest.trim());
      }}
    >
      <TextField
        placeholder="Origen"
        value={origin}
        onChange={(e) => setOrigin(e.target.value)}
      />
      <TextField
        placeholder="Destino"
        value={dest}
        onChange={(e) => setDest(e.target.value)}
      />
      <div>
        <Button disabled={!valid}>Planear</Button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        Tip: presiona <kbd>Enter</kbd> para planear.
      </p>
    </form>
  );
}
