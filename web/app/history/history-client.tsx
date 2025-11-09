"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";
import {
  getHistory,
  removeHistoryItem,
  clearHistory,
  togglePinHistory,
  exportHistory,
  importHistory,
  type HistoryItem,
} from "@/lib/storage";
import { HistoryItemCard } from "@/components/HistoryItemCard";
import { HistoryMetrics } from "@/components/HistoryMetrics";
import { Download, Upload, Search } from "lucide-react";

export default function HistoryClient() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [q, setQ] = useState("");
  const [range, setRange] = useState<"all" | "week" | "month">("all");

  // cargar al montar y escuchar cambios cross-tab
  useEffect(() => {
    setItems(getHistory());
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.includes("congestion_history_v1")) {
        setItems(getHistory());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // filtros
  const filtered = useMemo(() => {
    const tnow = Date.now();
    const after =
      range === "week"
        ? tnow - 7 * 864e5
        : range === "month"
          ? tnow - 30 * 864e5
          : 0;
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (after && it.savedAt < after) return false;
      if (!needle) return true;
      return (
        it.origin.toLowerCase().includes(needle) ||
        it.destination.toLowerCase().includes(needle)
      );
    });
  }, [items, q, range]);

  function replan(it: HistoryItem) {
    const params = new URLSearchParams({
      origin: it.origin,
      destination: it.destination,
      offset: "1",
      window: "120",
      step: "10",
    });
    router.push(`/result?${params.toString()}`);
  }

  function openResult(it: HistoryItem) {
    const params = new URLSearchParams({
      origin: it.origin,
      destination: it.destination,
      offset: "1",
    });
    router.push(`/result?${params.toString()}`);
  }

  function onDelete(id: string) {
    removeHistoryItem(id);
    setItems(getHistory());
  }

  function onTogglePin(id: string) {
    togglePinHistory(id);
    setItems(getHistory());
  }

  function onClearAll() {
    if (!confirm("¿Borrar todo el historial?")) return;
    clearHistory();
    setItems([]);
  }

  function onExport() {
    const json = exportHistory();
    const blob = new Blob([json], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "congestionai-history.json";
    a.click();
  }

  function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as HistoryItem[];
        importHistory(data);
        setItems(getHistory());
        alert("Historial importado ✅");
      } catch {
        alert("Archivo inválido");
      }
    };
    reader.readAsText(file);
    e.currentTarget.value = "";
  }

  return (
    <div className="space-y-4">
      <SectionCard>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div>
            <label className="text-sm block mb-1">Buscar</label>
            <div className="relative">
              <input
                className="input w-full pl-9"
                placeholder="Origen o destino…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="text-sm block mb-1">Rango</label>
            <select
              className="input"
              value={range}
              onChange={(e) =>
                setRange(e.target.value as "all" | "week" | "month")
              }
            >
              <option value="all">Todo</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button onClick={onExport}>
              <Download size={16} className="mr-2" /> Exportar
            </Button>
            <label className="btn btn-outline cursor-pointer">
              <Upload size={16} className="mr-2" />
              Importar
              <input
                type="file"
                accept="application/json"
                className="hidden"
                onChange={onImport}
              />
            </label>
          </div>
        </div>
      </SectionCard>

      {/* MÉTRICAS con los elementos filtrados */}
      <HistoryMetrics items={filtered} />

      {filtered.length === 0 ? (
        <SectionCard>
          <div className="text-sm text-slate-600">
            No hay elementos en tu historial. Planea una ruta y guárdala desde
            el resultado.
          </div>
        </SectionCard>
      ) : (
        <div className="grid gap-3">
          {filtered.map((it) => (
            <HistoryItemCard
              key={it.id}
              item={it}
              onOpenResult={openResult}
              onReplan={replan}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
            />
          ))}
        </div>
      )}

      {items.length > 0 && (
        <div className="flex justify-end">
          <button className="btn btn-outline" onClick={onClearAll}>
            Limpiar historial
          </button>
        </div>
      )}
    </div>
  );
}
