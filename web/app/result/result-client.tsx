"use client";

import { useEffect, useMemo, useState, useRef } from "react";
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
import { estimateSavings } from "@/lib/sustainability";
import { loadSettings, type AppSettings } from "@/lib/settings";

// --- helpers ---
function parseWaypointParam(s: string | null): WaypointInput | "" {
  if (!s) return "";
  const t = s.trim().replace(/^geo:/, "");
  const clean = t.startsWith("@") ? t.slice(1) : t;
  const re = /^-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/;
  if (re.test(clean)) {
    const [latStr, lngStr] = clean.split(",");
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return t;
}

function isWaypoint(v: WaypointInput | ""): v is WaypointInput {
  if (typeof v === "string") return v.trim().length > 2;
  if (v && typeof v === "object") {
    const o = v as { lat?: unknown; lng?: unknown; placeId?: unknown };
    if (typeof o.lat === "number" && typeof o.lng === "number") return true;
    if (typeof o.placeId === "string" && o.placeId.length > 0) return true;
  }
  return false;
}

type Provider = "google" | "apple";
type CacheEntry = { at: number; data: AnalyzeResponse };
const CACHE_KEY = "an_cache_v1";
const CACHE_TTL_MS = 3 * 60_000; // 3 min

function cacheGet(key: string): AnalyzeResponse | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as Record<string, CacheEntry>;
    const hit = obj[key];
    if (!hit) return null;
    if (Date.now() - hit.at > CACHE_TTL_MS) return null;
    return hit.data;
  } catch {
    return null;
  }
}
function cacheSet(key: string, data: AnalyzeResponse) {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    const obj = raw ? (JSON.parse(raw) as Record<string, CacheEntry>) : {};
    obj[key] = { at: Date.now(), data };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {}
}
function cacheClear() {
  try {
    sessionStorage.removeItem(CACHE_KEY);
  } catch {}
}

export default function ResultClient() {
  const sp = useSearchParams();
  const router = useRouter();

  // -------- URL params --------
  const originQ = sp.get("origin");
  const destinationQ = sp.get("destination");

  const hasWindowQ = sp.has("window");
  const hasStepQ = sp.has("step");
  const hasRefineQ = sp.has("refine");
  const hasAvoidTollsQ = sp.has("avoidTolls");
  const hasAvoidHighwaysQ = sp.has("avoidHighways");

  const windowQ = Number(sp.get("window") ?? 120);
  const stepQ = Number(sp.get("step") ?? 10);
  const offsetQ = Number(sp.get("offset") ?? 0);
  const refineQ = sp.get("refine") === "1";
  const avoidTollsQ = sp.get("avoidTolls") === "1";
  const avoidHighwaysQ = sp.get("avoidHighways") === "1";

  // -------- Settings (client-only) --------
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const prevCountryRef = useRef<string | null>(null);

  useEffect(() => {
    const s = loadSettings();
    setSettings(s);
    prevCountryRef.current = s.country;
  }, []);

  // si cambian settings en otra pestaña, nos actualizamos y limpiamos la cache
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "app_settings_v1") {
        const s = loadSettings();
        const prev = prevCountryRef.current;
        setSettings(s);
        if (prev && prev !== s.country) {
          cacheClear(); // invalida resultados de otro país
        }
        prevCountryRef.current = s.country;
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const country = useMemo(
    () => (settings?.country ?? "mx") as "mx" | "us" | "de",
    [settings?.country],
  );

  const originPayload = useMemo<WaypointInput | "">(
    () => parseWaypointParam(originQ),
    [originQ],
  );
  const destinationPayload = useMemo<WaypointInput | "">(
    () => parseWaypointParam(destinationQ),
    [destinationQ],
  );

  const [provider, setProvider] = useState<Provider>("google");
  const [data, setData] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // provider desde settings/localStorage
  useEffect(() => {
    const p = (localStorage.getItem("provider") as Provider) || "google";
    setProvider(p);
  }, []);

  const valid = useMemo(
    () => isWaypoint(originPayload) && isWaypoint(destinationPayload),
    [originPayload, destinationPayload],
  );

  // fetch + cache + protección de timestamp (offset mínimo 1 min)
  useEffect(() => {
    if (!valid) {
      setData(null);
      setErr(null);
      return;
    }
    const key = JSON.stringify({
      o: originPayload,
      d: destinationPayload,
      w: windowQ,
      s: stepQ,
      r: refineQ,
      ot: avoidTollsQ,
      oh: avoidHighwaysQ,
      off: Math.max(offsetQ, 1),
      ctry: country, // ← país en la clave de caché
    });

    const cached = cacheGet(key);
    if (cached) {
      setData(cached);
      setErr(null);
      return;
    }

    const ctrl = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const body = {
          origin: originPayload,
          destination: destinationPayload,
          windowMins: Number.isFinite(windowQ) ? windowQ : 120,
          stepMins: Number.isFinite(stepQ) ? stepQ : 10,
          offset: Math.max(offsetQ, 1),
          refine: refineQ,
          avoidTolls: avoidTollsQ,
          avoidHighways: avoidHighwaysQ,
          country, // ← se manda al backend
        };

        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          if (txt.includes("Timestamp must be set to a future time")) {
            const res2 = await fetch("/api/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: ctrl.signal,
              body: JSON.stringify({
                ...body,
                offset: Math.max(offsetQ + 2, 2),
              }),
            });
            if (!res2.ok) throw new Error(`HTTP ${res2.status}`);
            const json2 = (await res2.json()) as AnalyzeResponse;
            cacheSet(key, json2);
            setData(json2);
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }

        const json = (await res.json()) as AnalyzeResponse;
        cacheSet(key, json);
        setData(json);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        setErr((e as Error).message || "Error");
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [
    valid,
    originPayload,
    destinationPayload,
    windowQ,
    stepQ,
    refineQ,
    avoidTollsQ,
    avoidHighwaysQ,
    offsetQ,
    country, // ← depende del país
  ]);

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
    const pct = Math.round((data.best.savingVsNow || 0) * 100);
    const msg = `Salgo ${tStr}. ETA ~${data.best.etaMin} min (ahorro ${pct}%) – CongestionAI`;
    if (navigator.share)
      navigator
        .share({ text: msg })
        .catch(() => navigator.clipboard.writeText(msg));
    else navigator.clipboard.writeText(msg);
  };

  // ---- Savings model tomando Settings ----
  const savings =
    data?.best && settings
      ? estimateSavings({
          etaMin: data.best.etaMin,
          savingVsNow: data.best.savingVsNow ?? 0,
          fuelPricePerL: settings.fuelPricePerL,
          carLper100km: settings.carLper100km,
          tripKm: settings.defaultTripKm,
        })
      : undefined;

  // ---- initialOptions del Planner respetando Settings si la URL no trae overrides ----
  const initialPlannerOptions = useMemo(() => {
    const s = settings;
    return {
      departOffsetMin: Math.max(offsetQ, 0),
      windowMins: hasWindowQ ? windowQ : (s?.windowMinsDefault ?? 120),
      stepMins: hasStepQ ? stepQ : (s?.stepMinsDefault ?? 10),
      refine: hasRefineQ ? refineQ : (s?.budgetModeDefault ?? true),
      avoidTolls: hasAvoidTollsQ
        ? avoidTollsQ
        : (s?.avoidTollsDefault ?? false),
      avoidHighways: hasAvoidHighwaysQ
        ? avoidHighwaysQ
        : (s?.avoidHighwaysDefault ?? false),
      budgetMode: s?.budgetModeDefault ?? true,
    };
  }, [
    settings,
    offsetQ,
    windowQ,
    stepQ,
    refineQ,
    avoidTollsQ,
    avoidHighwaysQ,
    hasWindowQ,
    hasStepQ,
    hasRefineQ,
    hasAvoidTollsQ,
    hasAvoidHighwaysQ,
  ]);

  return (
    <section className="space-y-6">
      <SectionCard>
        <PlannerForm
          initialOrigin={originQ ?? ""}
          initialDestination={destinationQ ?? ""}
          initialOptions={initialPlannerOptions}
          onSubmit={(o, d, opts) => {
            const q = new URLSearchParams({
              origin: o,
              destination: d,
              window: String(opts.windowMins),
              step: String(opts.stepMins),
              refine: opts.refine ? "1" : "0",
              offset: String(Math.max(opts.departOffsetMin, 1)),
              avoidTolls: opts.avoidTolls ? "1" : "0",
              avoidHighways: opts.avoidHighways ? "1" : "0",
            });
            router.replace(`/result?${q.toString()}`);
          }}
        />
      </SectionCard>

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

      {loading && (
        <div className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
      )}
      <div aria-live="polite" className="sr-only">
        {loading ? "Calculando ruta…" : "Listo"}
      </div>

      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {err.includes("HTTP 403") &&
            "403 – revisa tu server key/billing de Google."}
          {err.includes("HTTP 429") &&
            "429 – rate limit. Baja step/ventana o activa budget-mode."}
          {!err.includes("HTTP") && err}
        </div>
      )}

      {data && !loading && !err && (
        <>
          <SectionCard>
            <ResultCard
              result={data}
              savings={savings}
              onSave={() => {
                saveHistoryItem({
                  origin: originQ ?? "",
                  destination: destinationQ ?? "",
                  bestISO: data.best?.departAtISO,
                  eta: data.best?.etaMin || 0,
                  savedAt: Date.now(),
                  baselineEta:
                    data.best?.savingVsNow != null
                      ? Math.round(
                          data.best.etaMin /
                            Math.max(0.05, 1 - (data.best.savingVsNow || 0)),
                        )
                      : undefined,
                  savingPct:
                    data.best?.savingVsNow != null
                      ? Math.round((data.best.savingVsNow || 0) * 100)
                      : undefined,
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
