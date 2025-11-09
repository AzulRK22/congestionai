// web/hooks/usePlacesAutocomplete.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureGooglePlaces } from "@/lib/map/loaders";

type Status = "idle" | "ready" | "error";
export type Prediction = google.maps.places.AutocompletePrediction;

export function usePlacesAutocomplete(countryHint: string[] = ["mx"]) {
  const svc = useRef<google.maps.places.AutocompleteService | null>(null);
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null,
  );
  const geoCenter = useRef<google.maps.LatLng | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [preds, setPreds] = useState<Prediction[]>([]);
  const ready = status === "ready";

  // Carga Places y prepara servicio + token
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureGooglePlaces();
        if (cancelled) return;

        const g = (window as unknown as { google?: typeof google }).google;
        const maps = g?.maps;

        if (
          !maps?.places?.AutocompleteService ||
          !maps.places.AutocompleteSessionToken
        ) {
          setStatus("error");
          return;
        }

        svc.current = new maps.places.AutocompleteService();
        token.current = new maps.places.AutocompleteSessionToken();
        setStatus("ready");
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[usePlacesAutocomplete] no disponible:", e);
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Obtener ubicación una vez para sesgo (opcional)
  useEffect(() => {
    if (!navigator.geolocation || geoCenter.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const g = (window as unknown as { google?: typeof google }).google;
        const maps = g?.maps;
        if (!maps) return;
        geoCenter.current = new maps.LatLng(
          pos.coords.latitude,
          pos.coords.longitude,
        );
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 600000 },
    );
  }, []);

  // Restricción por país (tipado correcto)
  const componentRestrictions = useMemo<
    google.maps.places.ComponentRestrictions | undefined
  >(
    () => (countryHint.length ? { country: countryHint } : undefined),
    [countryHint],
  );

  // requestId para descartar respuestas viejas
  const reqIdRef = useRef(0);

  const query = useCallback(
    (input: string) => {
      if (!ready || !svc.current) {
        setPreds((p) => (p.length ? [] : p));
        return;
      }

      const text = (input ?? "").trim();
      if (text.length < 3) {
        setPreds((p) => (p.length ? [] : p));
        return;
      }

      const g = (window as unknown as { google?: typeof google }).google;
      const maps = g?.maps;
      if (!maps) return;

      const myReqId = ++reqIdRef.current;

      // AutocompletionRequest tipado
      const req: google.maps.places.AutocompletionRequest = {
        input: text,
        sessionToken: token.current ?? undefined,
        componentRestrictions,
        // Tipos comunes y aceptados por AutocompleteService
        types: ["geocode", "establishment"],
        // Sesgo de ubicación (API clásica): center + radius (m)
        location: geoCenter.current ?? undefined,
        radius: geoCenter.current ? 20000 : undefined,
      };

      svc.current.getPlacePredictions(
        req,
        (
          results: google.maps.places.AutocompletePrediction[] | null,
          st: google.maps.places.PlacesServiceStatus,
        ) => {
          if (myReqId !== reqIdRef.current) return; // respuesta vieja

          if (
            st !== google.maps.places.PlacesServiceStatus.OK ||
            !results?.length
          ) {
            setPreds((p) => (p.length ? [] : p));
            return;
          }
          setPreds(results);
        },
      );
    },
    [ready, componentRestrictions],
  );

  // Al seleccionar, nueva sesión (mejor billing/ranking)
  const select = useCallback(() => {
    try {
      token.current = new google.maps.places.AutocompleteSessionToken();
    } catch {
      /* noop */
    }
    setPreds((p) => (p.length ? [] : p));
  }, []);

  const clear = useCallback(() => {
    setPreds((p) => (p.length ? [] : p));
  }, []);

  return { ready, preds, query, select, clear };
}
