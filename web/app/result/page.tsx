// app/result/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SectionCard } from "@/components/ui/SectionCard";
import { PlannerForm } from "@/components/PlannerForm";
import { Heatmap } from "@/components/Heatmap";
import { ResultCard } from "@/components/ResultCard";
import { MapContainer } from "@/components/MapContainer";
import { StickyActions } from "@/components/StickyActions";
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

  // Lee provider guardado en Settings
  useEffect(() => {
    const p =
      (localStorage.getItem("provider") as "google" | "apple") || "google";
    setProvider(p);
  }, []);

  const valid = useMemo(
    () => origin.trim().length > 2 && destination.trim().length > 2,
    [origin, destination],
  );

  // Llama a /api/analyze para mejores horarios + heatmap
  useEffect(() => {
    if (!valid) return;
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ origin, destination, window: "next120" }), // 120m = demo ágil
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

  // Helpers para acciones 1-clic
  const handleAddCalendar = () => {
    if (!data?.best) return;
    const start = new Date(data.best.departAtISO);
    const end = new Date(start.getTime() + data.best.etaMin * 60000);
    const stamp = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `DTSTART:${stamp(start)}`,
      `DTEND:${stamp(end)}`,
      "SUMMARY:Salida óptima (CongestionAI)",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "congestionai.ics";
    a.click();
  };

  const handleShare = () => {
    if (!data?.best) return;
    const tStr = new Date(data.best.departAtISO).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const msg = `Salgo ${tStr}. ETA ~${data.best.etaMin} min (ahorro ${(data.best.savingVsNow * 100) | 0}%) – CongestionAI`;
    if (navigator.share)
      navigator
        .share({ text: msg })
        .catch(() => navigator.clipboard.writeText(msg));
    else navigator.clipboard.writeText(msg);
  };

  return (
    <section className="py-6 space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Resultado</h1>

      {/* Form para replanear rápido */}
      <SectionCard>
        <PlannerForm
          initialOrigin={origin}
          initialDestination={destination}
          onSubmit={(o, d) =>
            router.replace(
              `/result?origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(d)}`,
            )
          }
        />
      </SectionCard>

      {/* Mapa (card estática para evitar IntersectionObserver issues) */}
      <SectionCard staticCard>
        <h3 className="font-semibold mb-3">Mapa</h3>
        {valid ? (
          <MapContainer
            provider={provider}
            origin={origin}
            destination={destination}
          />
        ) : (
          <div className="h-72 rounded-2xl border bg-slate-50 grid place-items-center text-sm text-slate-500">
            Escribe origen y destino para ver la ruta.
          </div>
        )}
      </SectionCard>

      {/* Estados de carga/errores */}
      {loading && (
        <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
      )}
      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {err}
        </div>
      )}

      {/* Datos listos: tarjeta + heatmap + acciones sticky */}
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
            <h3 className="font-semibold mb-3">Heatmap próximas 2h</h3>
            <Heatmap data={data.heatmap} />
          </SectionCard>

          <StickyActions onCalendar={handleAddCalendar} onShare={handleShare} />
        </>
      )}
    </section>
  );
}
