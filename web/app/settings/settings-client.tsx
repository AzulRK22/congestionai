// web/app/settings/settings-client.tsx (solo dif respecto a tu versión: campo País + guardado)
"use client";

import { useEffect, useMemo, useState } from "react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";
import {
  type AppSettings,
  defaultSettings,
  loadSettings,
  saveSettings,
  resetSettings,
  syncPlannerDefaultsToLocalStorage,
  apiStatus,
} from "@/lib/settings";

type Profile = { name: string; l100: number };
const PROFILES: Profile[] = [
  { name: "Moto/Hybrid", l100: 4.5 },
  { name: "Sedán urbano", l100: 7.5 },
  { name: "SUV", l100: 10.5 },
  { name: "Pickup", l100: 13.0 },
];

export default function SettingsClient() {
  const [s, setS] = useState<AppSettings>(defaultSettings);
  const { hasGmaps, hasMapKit } = apiStatus();

  useEffect(() => {
    setS(loadSettings());
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(s) !== JSON.stringify(loadSettings()),
    [s],
  );

  function onSave() {
    const next: AppSettings = {
      ...s,
      fuelPricePerL: Math.max(
        0,
        Number(s.fuelPricePerL) || defaultSettings.fuelPricePerL,
      ),
      carLper100km: Math.max(
        1,
        Number(s.carLper100km) || defaultSettings.carLper100km,
      ),
      defaultTripKm: Math.max(
        1,
        Number(s.defaultTripKm) || defaultSettings.defaultTripKm,
      ),
      windowMinsDefault: Math.min(
        240,
        Math.max(20, Number(s.windowMinsDefault) || 120),
      ),
      stepMinsDefault: Math.min(
        60,
        Math.max(5, Number(s.stepMinsDefault) || 10),
      ),
    };
    saveSettings(next);
    syncPlannerDefaultsToLocalStorage(next);
    alert("Settings guardados y sincronizados con el Planner ✅");
  }

  function onReset() {
    if (!confirm("¿Restablecer configuración por defecto?")) return;
    resetSettings();
    setS(loadSettings());
    alert("Settings restablecidos ✅");
  }

  function onExport() {
    const blob = new Blob([JSON.stringify(s, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "congestionai-settings.json";
    a.click();
  }

  function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result)) as Partial<AppSettings>;
        const merged: AppSettings = { ...defaultSettings, ...obj };
        saveSettings(merged);
        syncPlannerDefaultsToLocalStorage(merged);
        setS(merged);
        alert("Settings importados ✅");
      } catch {
        alert("Archivo inválido");
      }
    };
    reader.readAsText(f);
    e.currentTarget.value = "";
  }

  return (
    <div className="space-y-4">
      {/* Estado APIs (igual que ya tienes) */}
      <SectionCard>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border p-3 bg-white">
            <div className="text-xs text-slate-500">Google Maps (cliente)</div>
            <div
              className={`text-sm mt-1 ${hasGmaps ? "text-emerald-600" : "text-red-600"}`}
            >
              {hasGmaps
                ? "OK – NEXT_PUBLIC_GOOGLE_MAPS_API_KEY presente"
                : "Falta configurar NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"}
            </div>
          </div>
          <div className="rounded-xl border p-3 bg-white">
            <div className="text-xs text-slate-500">Apple MapKit (cliente)</div>
            <div
              className={`text-sm mt-1 ${hasMapKit ? "text-emerald-600" : "text-amber-600"}`}
            >
              {hasMapKit
                ? "OK – NEXT_PUBLIC_MAPKIT_TOKEN presente"
                : "Opcional – añade NEXT_PUBLIC_MAPKIT_TOKEN si usas Apple Maps"}
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Las llaves privadas del servidor (Routes v2) van en <code>.env</code>.
        </p>
      </SectionCard>

      {/* Preferencias generales */}
      <SectionCard>
        <h3 className="font-semibold mb-3">Preferencias generales</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm block mb-1">Mapa por defecto</label>
            <select
              className="input"
              value={s.provider}
              onChange={(e) =>
                setS({
                  ...s,
                  provider: e.target.value as AppSettings["provider"],
                })
              }
            >
              <option value="google">Google Maps</option>
              <option value="apple">Apple MapKit</option>
            </select>
          </div>

          <div>
            <label className="text-sm block mb-1">Unidades</label>
            <select
              className="input"
              value={s.units}
              onChange={(e) =>
                setS({ ...s, units: e.target.value as AppSettings["units"] })
              }
            >
              <option value="metric">Métrico</option>
              <option value="imperial">Imperial</option>
            </select>
          </div>

          <div>
            <label className="text-sm block mb-1">País</label>
            <select
              className="input"
              value={s.country}
              onChange={(e) =>
                setS({
                  ...s,
                  country: e.target.value as AppSettings["country"],
                })
              }
            >
              <option value="mx">México 🇲🇽</option>
              <option value="us">Estados Unidos 🇺🇸</option>
              <option value="de">Alemania 🇩🇪</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Afecta feriados y el riesgo.
            </p>
          </div>

          <div>
            <label className="text-sm block mb-1">Ciudad</label>
            <input
              className="input"
              value={s.city}
              onChange={(e) => setS({ ...s, city: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm block mb-1">Locale</label>
            <input
              className="input"
              value={s.locale}
              onChange={(e) => setS({ ...s, locale: e.target.value })}
              placeholder="es-MX"
            />
          </div>
        </div>
      </SectionCard>

      {/* Sostenibilidad / ahorro (igual que ya tienes con perfiles) */}
      <SectionCard>
        <h3 className="font-semibold mb-3">
          Modelo de ahorro y CO₂ (defaults)
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-sm block mb-1">
              Precio combustible (por L)
            </label>
            <input
              className="input"
              type="number"
              step="0.01"
              min={0}
              value={s.fuelPricePerL}
              onChange={(e) =>
                setS({ ...s, fuelPricePerL: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="text-sm block mb-1">Consumo (L/100 km)</label>
            <input
              className="input"
              type="number"
              step="0.1"
              min={1}
              value={s.carLper100km}
              onChange={(e) =>
                setS({ ...s, carLper100km: Number(e.target.value) })
              }
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {PROFILES.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className="btn btn-outline text-xs"
                  onClick={() => setS({ ...s, carLper100km: p.l100 })}
                >
                  {p.name} • {p.l100}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm block mb-1">
              Distancia típica del viaje (km)
            </label>
            <input
              className="input"
              type="number"
              step="0.5"
              min={1}
              value={s.defaultTripKm}
              onChange={(e) =>
                setS({ ...s, defaultTripKm: Number(e.target.value) })
              }
            />
          </div>
        </div>
      </SectionCard>

      {/* Planner defaults (igual) */}
      <SectionCard>
        <h3 className="font-semibold mb-3">Planner (valores por defecto)</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.budgetModeDefault}
              onChange={(e) =>
                setS({ ...s, budgetModeDefault: e.target.checked })
              }
            />
            Budget-mode por defecto
          </label>

          <div>
            <label className="text-sm block mb-1">Ventana (min)</label>
            <input
              className="input"
              type="number"
              min={20}
              max={240}
              step={10}
              value={s.windowMinsDefault}
              onChange={(e) =>
                setS({ ...s, windowMinsDefault: Number(e.target.value) })
              }
            />
          </div>

          <div>
            <label className="text-sm block mb-1">Paso (min)</label>
            <input
              className="input"
              type="number"
              min={5}
              max={60}
              step={5}
              value={s.stepMinsDefault}
              onChange={(e) =>
                setS({ ...s, stepMinsDefault: Number(e.target.value) })
              }
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.avoidTollsDefault}
              onChange={(e) =>
                setS({ ...s, avoidTollsDefault: e.target.checked })
              }
            />
            Evitar cuotas/peajes
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.avoidHighwaysDefault}
              onChange={(e) =>
                setS({ ...s, avoidHighwaysDefault: e.target.checked })
              }
            />
            Evitar autopistas
          </label>
        </div>
      </SectionCard>

      {/* Acciones */}
      <div className="flex flex-wrap gap-2 justify-end">
        <label className="btn btn-outline cursor-pointer">
          Importar
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={onImport}
          />
        </label>
        <button className="btn btn-outline" onClick={onExport}>
          Exportar
        </button>
        <button className="btn btn-outline" onClick={onReset}>
          Restablecer
        </button>
        <Button onClick={onSave} disabled={!dirty}>
          Guardar
        </Button>
      </div>
    </div>
  );
}
