"use client";
import { useEffect, useState } from "react";
import { SectionCard } from "@/components/ui/SectionCard";
import { Button } from "@/components/ui/Button";

export default function SettingsPage() {
  const [provider, setProvider] = useState<"google" | "apple">("google");
  const [city, setCity] = useState("CDMX");
  const [units, setUnits] = useState<"metric" | "imperial">("metric");

  useEffect(() => {
    const p = localStorage.getItem("provider") as "google" | "apple" | null;
    if (p) setProvider(p);
    const c = localStorage.getItem("city");
    if (c) setCity(c);
    const u = localStorage.getItem("units") as "metric" | "imperial" | null;
    if (u) setUnits(u);
  }, []);

  function save() {
    localStorage.setItem("provider", provider);
    localStorage.setItem("city", city);
    localStorage.setItem("units", units);
    alert("Settings guardados ✅");
  }

  return (
    <section className="py-6 space-y-4">
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>

      <SectionCard>
        <div className="grid gap-3">
          <div>
            <label className="text-sm block mb-1">Mapa por defecto</label>
            <select
              className="input"
              value={provider}
              onChange={(e) => setProvider(e.target.value as any)}
            >
              <option value="google">Google Maps</option>
              <option value="apple">Apple MapKit</option>
            </select>
          </div>

          <div>
            <label className="text-sm block mb-1">Ciudad</label>
            <input
              className="input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm block mb-1">Unidades</label>
            <select
              className="input"
              value={units}
              onChange={(e) => setUnits(e.target.value as any)}
            >
              <option value="metric">Métrico</option>
              <option value="imperial">Imperial</option>
            </select>
          </div>

          <div>
            <Button onClick={save}>Guardar</Button>
          </div>
        </div>
      </SectionCard>
    </section>
  );
}
