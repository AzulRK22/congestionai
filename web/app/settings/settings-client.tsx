// web/app/settings/settings-client.tsx
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
  { name: "Moto / Hybrid", l100: 4.5 },
  { name: "City sedan", l100: 7.5 },
  { name: "SUV", l100: 10.5 },
  { name: "Pickup", l100: 13.0 },
];

export default function SettingsClient() {
  const [s, setS] = useState<AppSettings>(defaultSettings);
  const { hasGmaps, hasMapKit } = apiStatus();

  // cargar settings en cliente
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
    alert("Settings saved and synced with Planner ✅");
  }

  function onReset() {
    if (!confirm("Reset to defaults?")) return;
    resetSettings();
    setS(loadSettings());
    alert("Settings reset ✅");
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
        alert("Settings imported ✅");
      } catch {
        alert("Invalid file");
      }
    };
    reader.readAsText(f);
    e.currentTarget.value = "";
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end gap-2">
        <label className="btn btn-outline cursor-pointer">
          Import
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={onImport}
          />
        </label>
        <button className="btn btn-outline" onClick={onExport}>
          Export
        </button>
        <button className="btn btn-outline" onClick={onReset}>
          Reset
        </button>
        <Button onClick={onSave} disabled={!dirty}>
          Save
        </Button>
      </div>

      {/* Region & units */}
      <SectionCard>
        <h3 className="font-semibold mb-3">Region & units</h3>
        <p className="text-xs text-slate-500 mb-3">
          Holiday awareness uses <b>Country</b>. Locale affects number & date
          formats.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-sm block mb-1">Default map</label>
            <select
              className="input"
              value={s.provider}
              onChange={(e) =>
                setS({
                  ...s,
                  provider: e.target.value as AppSettings["provider"],
                })
              }
              aria-label="Default map provider"
            >
              <option value="google">Google Maps</option>
              <option value="apple">Apple MapKit</option>
            </select>
          </div>

          <div>
            <label className="text-sm block mb-1">Units</label>
            <select
              className="input"
              value={s.units}
              onChange={(e) =>
                setS({ ...s, units: e.target.value as AppSettings["units"] })
              }
              aria-label="Units"
            >
              <option value="metric">Metric</option>
              <option value="imperial">Imperial</option>
            </select>
          </div>

          <div>
            <label className="text-sm block mb-1">Country</label>
            <select
              className="input"
              value={s.country}
              onChange={(e) =>
                setS({
                  ...s,
                  country: e.target.value as AppSettings["country"],
                })
              }
              aria-label="Country"
            >
              <option value="mx">Mexico 🇲🇽</option>
              <option value="us">United States 🇺🇸</option>
              <option value="de">Germany 🇩🇪</option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Used for holiday-aware risk in Result.
            </p>
          </div>

          <div>
            <label className="text-sm block mb-1">City</label>
            <input
              className="input"
              value={s.city}
              onChange={(e) => setS({ ...s, city: e.target.value })}
              placeholder="e.g., Mexico City"
              aria-label="City"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm block mb-1">Locale</label>
            <input
              className="input"
              value={s.locale}
              onChange={(e) => setS({ ...s, locale: e.target.value })}
              placeholder="en-US"
              aria-label="Locale"
            />
          </div>
        </div>
      </SectionCard>

      {/* Savings & CO₂ */}
      <SectionCard>
        <h3 className="font-semibold mb-3">Savings & CO₂ (defaults)</h3>
        <p className="text-xs text-slate-500 mb-3">
          These values drive money/fuel/CO₂ estimates in Result and History.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-sm block mb-1">Fuel price (per L)</label>
            <input
              className="input"
              type="number"
              step="0.01"
              min={0}
              value={s.fuelPricePerL}
              onChange={(e) =>
                setS({ ...s, fuelPricePerL: Number(e.target.value) })
              }
              aria-label="Fuel price per liter"
            />
          </div>

          <div>
            <label className="text-sm block mb-1">
              Consumption (L / 100 km)
            </label>
            <input
              className="input"
              type="number"
              step="0.1"
              min={1}
              value={s.carLper100km}
              onChange={(e) =>
                setS({ ...s, carLper100km: Number(e.target.value) })
              }
              aria-label="Consumption L per 100 km"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {PROFILES.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  className="btn btn-outline text-xs"
                  onClick={() => setS({ ...s, carLper100km: p.l100 })}
                  aria-label={`Set profile ${p.name}`}
                >
                  {p.name} • {p.l100}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm block mb-1">
              Typical trip distance (km)
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
              aria-label="Default trip distance (km)"
            />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Note: internal calculations use liters; if you select Imperial, only
          the display in some screens converts to gal.
        </p>
      </SectionCard>

      {/* Planner defaults */}
      <SectionCard>
        <h3 className="font-semibold mb-3">Planner defaults</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.budgetModeDefault}
              onChange={(e) =>
                setS({ ...s, budgetModeDefault: e.target.checked })
              }
              aria-label="Budget mode default"
            />
            Budget mode ON
          </label>

          <div>
            <label className="text-sm block mb-1">Window (min)</label>
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
              aria-label="Default window minutes"
            />
          </div>

          <div>
            <label className="text-sm block mb-1">Step (min)</label>
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
              aria-label="Default step minutes"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.avoidTollsDefault}
              onChange={(e) =>
                setS({ ...s, avoidTollsDefault: e.target.checked })
              }
              aria-label="Avoid tolls default"
            />
            Avoid tolls
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={s.avoidHighwaysDefault}
              onChange={(e) =>
                setS({ ...s, avoidHighwaysDefault: e.target.checked })
              }
              aria-label="Avoid highways default"
            />
            Avoid highways
          </label>
        </div>
      </SectionCard>

      {/* Developer (colapsable) */}
      <details className="rounded-2xl border bg-white p-3 open:shadow-sm">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">
          Developer (API keys & diagnostics)
        </summary>
        <div className="grid gap-3 sm:grid-cols-2 mt-3">
          <div className="rounded-xl border p-3 bg-white">
            <div className="text-xs text-slate-500">Google Maps (client)</div>
            <div
              className={`text-sm mt-1 ${hasGmaps ? "text-emerald-600" : "text-red-600"}`}
            >
              {hasGmaps
                ? "OK — NEXT_PUBLIC_GOOGLE_MAPS_API_KEY found"
                : "Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"}
            </div>
          </div>
          <div className="rounded-xl border p-3 bg-white">
            <div className="text-xs text-slate-500">Apple MapKit (client)</div>
            <div
              className={`text-sm mt-1 ${hasMapKit ? "text-emerald-600" : "text-amber-600"}`}
            >
              {hasMapKit
                ? "OK — NEXT_PUBLIC_MAPKIT_TOKEN found"
                : "Optional — add NEXT_PUBLIC_MAPKIT_TOKEN to enable"}
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Server-side keys (Routes v2) must be set in <code>.env</code>.
        </p>
      </details>
    </div>
  );
}
