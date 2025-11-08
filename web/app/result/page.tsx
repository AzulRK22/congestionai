"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SectionCard } from "@/components/ui/SectionCard";
import { PlannerForm } from "@/components/PlannerForm";
import { Heatmap } from "@/components/Heatmap";
import { ResultCard } from "@/components/ResultCard";
import { MapContainer } from "@/components/MapContainer";
import { saveHistoryItem } from "@/lib/storage";

export default function ResultPage() {
  const sp = useSearchParams();
  const router = useRouter();

  const origin = sp.get("origin") ?? "";
  const destination = sp.get("destination") ?? "";

  const [provider, setProvider] = useState<"google" | "apple">("google");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // lee provider de Settings
  useEffect(() => {
    const p =
      (localStorage.getItem("provider") as "google" | "apple") || "google";
    setProvider(p);
  }, []);

  const valid = useMemo(
    () => origin.length > 2 && destination.length > 2,
    [origin, destination],
  );

  useEffect(() => {
    if (!valid) return;
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin, destination, window: "next72" }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setErr(e?.message || "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [origin, destination, valid]);

  return (
    <section className="py-6 space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Resultado</h1>

      <SectionCard staticCard>
        <h3 className="font-semibold mb-3">Mapa</h3>
        <MapContainer
          provider={provider}
          origin={origin}
          destination={destination}
        />
      </SectionCard>

      {loading && (
        <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
      )}
      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {err}
        </div>
      )}

      {data && !loading && !err && (
        <>
          <SectionCard>
            <ResultCard
              result={data}
              onSave={() => {
                saveHistoryItem({
                  origin,
                  destination,
                  bestISO: data.best?.departAtISO,
                  eta: data.best?.etaMin || 0,
                  savedAt: Date.now(),
                });
                alert("Guardado en History ✅");
              }}
            />
          </SectionCard>

          <SectionCard>
            <h3 className="font-semibold mb-3">Mapa</h3>
            <MapContainer
              provider={provider}
              origin={origin}
              destination={destination}
            />
          </SectionCard>

          <SectionCard>
            <h3 className="font-semibold mb-3">Heatmap próximas 72h</h3>
            <Heatmap data={data.heatmap} />
          </SectionCard>
        </>
      )}
    </section>
  );
}
