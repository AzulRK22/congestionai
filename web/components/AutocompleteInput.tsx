"use client";
import { useEffect, useRef, useState } from "react";
import { MapPin, X, Crosshair } from "lucide-react";
import { usePlacesAutocomplete } from "./usePlacesAutocomplete";
import { TextField } from "@/components/ui/TextField";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  allowMyLocation?: boolean;
};

export function AutocompleteInput({
  value,
  onChange,
  placeholder,
  allowMyLocation,
}: Props) {
  const { ready, preds, query, select, clear } = usePlacesAutocomplete();
  const [open, setOpen] = useState(false);
  const timer = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Debounce para no saturar
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      query(value);
      setOpen(true);
    }, 150);
    return () => clearTimeout(timer.current);
  }, [value]);

  // Cierra al click afuera
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function useMyLocation() {
    if (!allowMyLocation || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const v = `${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`;
        onChange(v);
        setOpen(false);
      },
      () => {
        /* ignora errores de permiso */
      },
    );
  }

  return (
    <div className="relative" ref={wrapRef}>
      <MapPin
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <TextField
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8"
        onFocus={() => value.length >= 3 && setOpen(true)}
      />
      {value && (
        <button
          type="button"
          aria-label="Limpiar"
          onClick={() => {
            onChange("");
            clear();
            setOpen(false);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
        >
          <X size={16} />
        </button>
      )}

      {/* Dropdown */}
      {open && (ready ? preds.length > 0 : false) && (
        <div className="autocomplete-menu">
          {preds.map((p) => (
            <div
              key={p.place_id}
              className="autocomplete-item"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(select(p.description));
                setOpen(false);
              }}
            >
              {p.description}
            </div>
          ))}
        </div>
      )}

      {/* Botón Mi ubicación (opcional) */}
      {allowMyLocation && (
        <button
          type="button"
          onClick={useMyLocation}
          className="mt-1 inline-flex items-center text-xs text-slate-600 hover:text-slate-900"
        >
          <Crosshair size={14} className="mr-1" /> Usar mi ubicación
        </button>
      )}
    </div>
  );
}
