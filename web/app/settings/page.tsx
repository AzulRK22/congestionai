"use client";

import { useState } from "react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";

type Provider = "google" | "apple";
type Units = "metric" | "imperial";

function getInitialProvider(): Provider {
  if (typeof window === "undefined") return "google";
  const p = localStorage.getItem("provider");
  return p === "google" || p === "apple" ? p : "google";
}

function getInitialUnits(): Units {
  if (typeof window === "undefined") return "metric";
  const u = localStorage.getItem("units");
  return u === "metric" || u === "imperial" ? u : "metric";
}

function getInitialCity(): string {
  if (typeof window === "undefined") return "CDMX";
  return localStorage.getItem("city") || "CDMX";
}

export default function SettingsPage() {
  // Inicializa desde localStorage de forma segura
  const [provider, setProvider] = useState<Provider>(getInitialProvider);
  const [city, setCity] = useState<string>(getInitialCity);
  const [units, setUnits] = useState<Units>(getInitialUnits);

  function handleProviderChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === "google" || val === "apple") setProvider(val);
  }

  function handleUnitsChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === "metric" || val === "imperial") setUnits(val);
  }

  function save() {
    localStorage.setItem("provider", provider);
    localStorage.setItem("city", city.trim() || "CDMX");
    localStorage.setItem("units", units);
    alert("Settings guardados ✅");
  }

  return (
    <section className="py-6 space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

      <SectionCard>
        <div className="grid gap-3">
          <div>
            <label htmlFor="provider" className="text-sm block mb-1">
              Mapa por defecto
            </label>
            <select
              id="provider"
              className="input"
              value={provider}
              onChange={handleProviderChange}
            >
              <option value="google">Google Maps</option>
              <option value="apple">Apple MapKit</option>
            </select>
          </div>

          <div>
            <label htmlFor="city" className="text-sm block mb-1">
              Ciudad
            </label>
            <input
              id="city"
              className="input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="CDMX"
              autoComplete="address-level2"
            />
          </div>

          <div>
            <label htmlFor="units" className="text-sm block mb-1">
              Unidades
            </label>
            <select
              id="units"
              className="input"
              value={units}
              onChange={handleUnitsChange}
            >
              <option value="metric">Métrico</option>
              <option value="imperial">Imperial</option>
            </select>
          </div>

          <div className="pt-1">
            <Button type="button" onClick={save}>
              Guardar
            </Button>
          </div>
        </div>
      </SectionCard>
    </section>
  );
}
