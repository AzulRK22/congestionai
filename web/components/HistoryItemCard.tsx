"use client";

import { Pin, PinOff, Trash2, CornerUpRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { HistoryItem } from "@/lib/storage";

export function HistoryItemCard({
  item,
  onOpenResult,
  onReplan,
  onDelete,
  onTogglePin,
}: {
  item: HistoryItem;
  onOpenResult: (it: HistoryItem) => void;
  onReplan: (it: HistoryItem) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}) {
  const t = new Date(item.bestISO);
  const tStr = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const day = t.toLocaleDateString();

  return (
    <div className="card p-4 grid gap-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">
            {day} · {tStr}
          </div>
          <div className="font-medium">
            {item.origin} → {item.destination}
          </div>
          <div className="text-xs text-slate-600">ETA {item.eta} min</div>
        </div>
        <button
          className="btn btn-ghost"
          aria-label={item.pinned ? "Quitar pin" : "Fijar"}
          title={item.pinned ? "Quitar pin" : "Fijar"}
          onClick={() => onTogglePin(item.id)}
        >
          {item.pinned ? <PinOff size={16} /> : <Pin size={16} />}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onReplan(item)}>
          <CornerUpRight size={16} className="mr-2" /> Replanear
        </Button>
        <button
          className="btn btn-outline"
          onClick={() => onOpenResult(item)}
          title="Abrir resultado"
        >
          <ExternalLink size={16} className="mr-2" /> Ver detalle
        </button>
        <button
          className="btn btn-outline"
          onClick={() => onDelete(item.id)}
          title="Eliminar"
        >
          <Trash2 size={16} className="mr-2" /> Eliminar
        </button>
      </div>
    </div>
  );
}
