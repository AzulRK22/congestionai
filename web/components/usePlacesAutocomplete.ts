"use client";
import { useEffect, useRef, useState } from "react";

export function usePlacesAutocomplete() {
  const [preds, setPreds] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [ready, setReady] = useState(false);
  const svc = useRef<google.maps.places.AutocompleteService | null>(null);
  const session = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null,
  );

  useEffect(() => {
    const w = window as any;
    if (w.google?.maps?.places?.AutocompleteService) {
      svc.current = new w.google.maps.places.AutocompleteService();
      session.current = new w.google.maps.places.AutocompleteSessionToken();
      setReady(true);
    }
  }, []);

  function query(input: string) {
    if (!ready || !svc.current || input.trim().length < 3) {
      setPreds([]);
      return;
    }
    svc.current.getPlacePredictions(
      { input, sessionToken: session.current! },
      (p) => setPreds(p || []),
    );
  }

  function select(description: string) {
    // al confirmar, resetea la sesión (precio 1x por selección)
    session.current = new (
      window as any
    ).google.maps.places.AutocompleteSessionToken();
    setPreds([]);
    return description;
  }

  function clear() {
    setPreds([]);
  }

  return { ready, preds, query, select, clear };
}
