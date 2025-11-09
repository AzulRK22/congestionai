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
import { Download, Upload, Search } from "lucide-react";
import { HistoryMetrics } from "@/components/HistoryMetrics";

export default function HistoryClient() {
  const router = useRouter();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [q, setQ] = useState("");
  const [range, setRange] = useState<"all" | "week" | "month">("all");

  useEffect(() => {
    setItems(getHistory());
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !e.key.includes("congestion_history_v1")) return;
      setItems(getHistory());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

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
    if (!confirm("Clear all history?")) return;
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
        alert("History imported ✅");
      } catch {
        alert("Invalid file");
      }
    };
    reader.readAsText(file);
    e.currentTarget.value = "";
  }

  return (
    <div className="space-y-4">
      {/* Metrics */}
      <SectionCard>
        <HistoryMetrics items={filtered} />
      </SectionCard>

      {/* Filters */}
      <SectionCard>
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div>
            <label className="text-sm block mb-1">Search</label>
            <div className="relative">
              <input
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 pl-9 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="Origin or destination…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search history"
              />
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm block mb-1">Range</label>
            <select
              className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-200"
              value={range}
              onChange={(e) =>
                setRange(e.target.value as "all" | "week" | "month")
              }
            >
              <option value="all">All</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button onClick={onExport}>
              <Download size={16} className="mr-2" /> Export
            </Button>
            <label className="btn btn-outline cursor-pointer">
              <Upload size={16} className="mr-2" />
              Import
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

      {/* List / Empty */}
      {filtered.length === 0 ? (
        <SectionCard>
          <div className="text-sm text-slate-600">
            No history yet. Plan a route and click <em>Save to history</em> in
            the result.
          </div>
        </SectionCard>
      ) : (
        <SectionCard>
          <ul className="divide-y">
            {filtered.map((it, idx) => (
              <HistoryItemCard
                key={
                  it.id ?? `${it.origin}-${it.destination}-${it.savedAt}-${idx}`
                }
                item={it}
                onOpenResult={openResult}
                onReplan={replan}
                onDelete={onDelete}
                onTogglePin={onTogglePin}
                variant="row" // 👈 forzamos fila compacta
              />
            ))}
          </ul>
        </SectionCard>
      )}
      {items.length > 0 && (
        <div className="flex justify-end">
          <button className="btn btn-outline" onClick={onClearAll}>
            Clear history
          </button>
        </div>
      )}
    </div>
  );
}
