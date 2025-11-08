"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/ui/SectionCard";
import { HistoryItem, loadHistory } from "@/lib/storage";

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  useEffect(() => setItems(loadHistory()), []);

  return (
    <section className="py-6 space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">History</h1>

      <SectionCard>
        <div className="grid gap-3">
          {items.length === 0 && (
            <p className="text-sm text-slate-500">Aún no guardas búsquedas.</p>
          )}
          {items.map((it, i) => (
            <Link
              key={i}
              href={`/result?origin=${encodeURIComponent(it.origin)}&destination=${encodeURIComponent(it.destination)}`}
              className="rounded-lg border bg-white p-3 shadow-sm hover:bg-slate-50"
            >
              <div className="font-medium">
                {it.origin} → {it.destination}
              </div>
              <div className="text-xs text-slate-500">
                Mejor:{" "}
                {new Date(it.bestISO).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {" · "}ETA {it.eta} min
              </div>
            </Link>
          ))}
        </div>
      </SectionCard>
    </section>
  );
}
