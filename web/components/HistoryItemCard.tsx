"use client";

import {
  ExternalLink,
  MapPin,
  Clock,
  ArrowRight,
  Repeat,
  Trash2,
  Star,
} from "lucide-react";
import type { HistoryItem } from "@/lib/storage";

type Props = {
  item: HistoryItem;
  onOpenResult: (it: HistoryItem) => void;
  onReplan: (it: HistoryItem) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  /** row = fila compacta (default). card = versión anterior en tarjeta. */
  variant?: "row" | "card";
};

function fmtTime(iso?: string) {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDate(ts?: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryItemCard({
  item,
  onOpenResult,
  onReplan,
  onDelete,
  onTogglePin,
  variant = "row",
}: Props) {
  const bestT = fmtTime(item.bestISO);
  const savedAt = fmtDate(item.savedAt);
  const eta = typeof item.eta === "number" ? `${item.eta} min` : "—";

  // calcula % si no viene
  const savingPct =
    typeof item.savingPct === "number"
      ? Math.max(0, Math.min(100, Math.round(item.savingPct)))
      : typeof item.baselineEta === "number" && item.baselineEta > 0
        ? Math.max(
            0,
            Math.round(
              ((item.baselineEta - (item.eta ?? 0)) / item.baselineEta) * 100,
            ),
          )
        : undefined;

  // ===== Fila compacta =====
  if (variant === "row") {
    return (
      <li className="flex items-center gap-3 p-3">
        {/* Pin */}
        <button
          type="button"
          title={item.pinned ? "Unpin" : "Pin"}
          onClick={() => onTogglePin(item.id)}
          className={`shrink-0 w-7 h-7 grid place-items-center rounded-full border
            ${item.pinned ? "bg-yellow-50 border-yellow-200 text-yellow-600" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
          aria-label={item.pinned ? "Unpin" : "Pin"}
        >
          <Star size={14} className={item.pinned ? "fill-yellow-500" : ""} />
        </button>

        {/* Contenido */}
        <div className="min-w-0 flex-1">
          {/* Línea 1: origen → destino */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin size={14} className="text-slate-400 shrink-0" />
            <div className="min-w-0 flex-1 truncate">
              <span className="truncate">{item.origin}</span>
              <span className="mx-1 text-slate-400">→</span>
              <span className="truncate">{item.destination}</span>
            </div>
          </div>

          {/* Línea 2: meta */}
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> Best {bestT}
            </span>
            <span className="text-slate-400">•</span>
            <span>ETA {eta}</span>
            {typeof savingPct === "number" && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs font-medium
                ${savingPct >= 10 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-700 border-slate-200"}`}
              >
                Saves {savingPct}%
              </span>
            )}
            <span className="ml-auto text-slate-500">Saved {savedAt}</span>
          </div>
        </div>

        {/* Acciones (icon buttons) */}
        <div className="ml-3 flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onOpenResult(item)}
            className="rounded-lg px-2 py-1 hover:bg-slate-50 text-slate-600"
            aria-label="Open result"
            title="Open result"
          >
            <ExternalLink size={16} />
          </button>
          <button
            type="button"
            onClick={() => onReplan(item)}
            className="rounded-lg px-2 py-1 hover:bg-slate-50 text-slate-600"
            aria-label="Replan"
            title="Replan"
          >
            <Repeat size={16} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(item.id)}
            className="rounded-lg px-2 py-1 hover:bg-red-50 text-red-600"
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </li>
    );
  }

  // ===== (opcional) versión tarjeta =====
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center text-sm text-slate-600 gap-2">
            <MapPin size={14} />
            <span className="truncate">{item.origin}</span>
            <ArrowRight size={14} className="shrink-0" />
            <span className="truncate">{item.destination}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1">
              <Clock size={14} /> Best {bestT}
            </span>
            <span>ETA {eta}</span>
            {typeof savingPct === "number" && (
              <span className="inline-flex text-xs px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                Saves {savingPct}%
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">Saved {savedAt}</div>
        </div>
        <div className="flex flex-wrap gap-2 justify-end shrink-0">
          <button
            className="btn btn-outline"
            onClick={() => onOpenResult(item)}
          >
            <ExternalLink size={14} className="mr-2" /> Open
          </button>
          <button className="btn btn-outline" onClick={() => onReplan(item)}>
            <Clock size={14} className="mr-2" /> Replan
          </button>
          <button
            className="btn btn-outline"
            onClick={() => onTogglePin(item.id)}
          >
            <Star size={14} className="mr-2" /> {item.pinned ? "Unpin" : "Pin"}
          </button>
          <button className="btn btn-outline" onClick={() => onDelete(item.id)}>
            <Trash2 size={14} className="mr-2" /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default HistoryItemCard;
