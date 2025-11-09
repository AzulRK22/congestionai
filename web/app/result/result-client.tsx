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
import type {
  AnalyzeResponse,
  WaypointInput,
  SpeedReadingInterval,
} from "@/types/analyze";

/** ---------- Helpers de tipos (sin any) ---------- */
function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null;
}
function isNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}
function isNonEmptyString(s: unknown): s is string {
  return typeof s === "string" && s.trim().length > 0;
}

/** Convierte query (?origin=..., ?destination=...) a WaypointInput o "" */
function parseWaypointParam(s: string | null): WaypointInput | "" {
  if (!s) return "";
  const t = s.trim().replace(/^geo:/, "");
  const clean = t.startsWith("@") ? t.slice(1) : t;
  const re = /^-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/;
  if (re.test(clean)) {
    const [latStr, lngStr] = clean.split(",");
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (isNumber(lat) && isNumber(lng)) return { lat, lng };
  }
  return t; // dirección/lugar
}

/** Type guard para validar WaypointInput */
function isWaypoint(v: WaypointInput | ""): v is WaypointInput {
  if (typeof v === "string") return v.trim().length > 2;

  if (isRecord(v)) {
    // proyectamos a un shape flexible para poder leer propiedades
    const o = v as { lat?: unknown; lng?: unknown; placeId?: unknown };

    const hasCoords = isNumber(o.lat) && isNumber(o.lng);
    const hasPlaceId = isNonEmptyString(o.placeId);

    return hasCoords || hasPlaceId;
  }
  return false;
}

/** ---------- Componente principal (cliente) ---------- */
export default function ResultClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const originQ = sp.get("origin");
  const destinationQ = sp.get("destination");

  const originPayload = useMemo<WaypointInput | "">(
    () => parseWaypointParam(originQ),
    [originQ],
  );
  const destinationPayload = useMemo<WaypointInput | "">(
    () => parseWaypointParam(destinationQ),
    [destinationQ],
  );

  const [provider, setProvider] = useState<"google" | "apple">("google");
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Provider desde Settings (localStorage)
  useEffect(() => {
    const p = localStorage.getItem("provider");
    if (p === "google" || p === "apple") setProvider(p);
  }, []);

  const valid = useMemo(
    () => isWaypoint(originPayload) && isWaypoint(destinationPayload),
    [originPayload, destinationPayload],
  );

  // Llama a /api/analyze con cancelación si cambian los params
  useEffect(() => {
    if (!valid) {
      setData(null);
      setErr(null);
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            origin: originPayload, // string | {lat,lng} | {placeId}
            destination: destinationPayload,
            windowMins: 120,
            stepMins: 10,
          }),
        });
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const j = (await res.json()) as {
              error?: string;
              detail?: unknown;
            };
            if (typeof j?.error === "string") msg = j.error;
          } catch {
            /* noop */
          }
          throw new Error(msg);
        }
        const json = (await res.json()) as AnalyzeResponse;
        setData(json);
      } catch (e: unknown) {
        if (e instanceof Error) setErr(e.message);
        else setErr("Error");
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [originPayload, destinationPayload, valid]);

  // Acciones 1-clic
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
    const pct = Math.round(data.best.savingVsNow * 100);
    const msg = `Salgo ${tStr}. ETA ~${data.best.etaMin} min (ahorro ${pct}%) – CongestionAI`;
    if (navigator.share) {
      navigator.share({ text: msg }).catch(() => {
        void navigator.clipboard.writeText(msg);
      });
    } else {
      void navigator.clipboard.writeText(msg);
    }
  };

  return (
    <section className="py-6 space-y-6">
      <h1 className="text-3xl font-semibold tracking-tight">Resultado</h1>

      {/* Form para replanear rápido */}
      <SectionCard>
        <PlannerForm
          initialOrigin={originQ ?? ""}
          initialDestination={destinationQ ?? ""}
          onSubmit={(o, d) =>
            router.replace(
              `/result?origin=${encodeURIComponent(o)}&destination=${encodeURIComponent(d)}`,
            )
          }
        />
      </SectionCard>

      {/* Mapa */}
      <SectionCard staticCard>
        <h3 className="font-semibold mb-3">Mapa</h3>
        {valid ? (
          <MapContainer
            provider={provider}
            origin={originQ ?? ""}
            destination={destinationQ ?? ""}
            polylineEnc={data?.best?.polyline ?? undefined}
            sri={data?.best?.sri as SpeedReadingInterval[] | undefined}
          />
        ) : (
          <div className="h-72 rounded-2xl border bg-slate-50 grid place-items-center text-sm text-slate-500">
            Escribe origen y destino para ver la ruta.
          </div>
        )}
      </SectionCard>

      {/* Estados */}
      {loading && (
        <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
      )}
      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {err}
        </div>
      )}

      {/* Resultado + heatmap + acciones */}
      {data && !loading && !err && (
        <>
          <SectionCard>
            <ResultCard
              result={data}
              onSave={() => {
                saveHistoryItem({
                  origin: originQ ?? "",
                  destination: destinationQ ?? "",
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
