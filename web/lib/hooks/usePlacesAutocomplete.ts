// web/hooks/usePlacesAutocomplete.ts
"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureGooglePlaces } from "@/lib/map/loaders";

export type Prediction = google.maps.places.AutocompletePrediction;

export function usePlacesAutocomplete(countryHint: string[] = ["mx"]) {
  const svc = useRef<google.maps.places.AutocompleteService | null>(null);
  const token = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null,
  );
  const geoBias = useRef<google.maps.LatLng | null>(null);

  const [ready, setReady] = useState(false);
  const [preds, setPreds] = useState<Prediction[]>([]);

  // cargar librería y preparar servicio + token
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureGooglePlaces();
        if (cancelled) return;
        const g = (window as any).google?.maps;
        svc.current = new g.places.AutocompleteService();
        token.current = new g.places.AutocompleteSessionToken();
        setReady(true);
      } catch (e) {
        console.error("[usePlacesAutocomplete] no disponible:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // pedir ubicación una vez para bias (opcional)
  useEffect(() => {
    if (!navigator.geolocation || geoBias.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const g = (window as any).google?.maps;
        geoBias.current = new g.LatLng(
          pos.coords.latitude,
          pos.coords.longitude,
        );
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 600000 },
    );
  }, []);

  const componentRestrictions = useMemo(
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

      const g = (window as any).google?.maps;
      const myReqId = ++reqIdRef.current;

      svc.current.getPlacePredictions(
        {
          input: text,
          // 👇 más amplio: direcciones + lugares
          types: ["geocode", "establishment"],
          componentRestrictions,
          // 👇 bias: si tenemos ubicación, sesgamos con un círculo ~20km
          locationBias: geoBias.current
            ? { center: geoBias.current, radius: 20_000 }
            : undefined,
          sessionToken: token.current || undefined,
        } as any,
        (
          results: Prediction[] | null,
          status: google.maps.places.PlacesServiceStatus,
        ) => {
          // descarta si llegó una respuesta vieja
          if (myReqId !== reqIdRef.current) return;

          if (status !== g.places.PlacesServiceStatus.OK || !results?.length) {
            setPreds((p) => (p.length ? [] : p));
            return;
          }
          setPreds(results);
        },
      );
    },
    [ready, componentRestrictions],
  );

  // al seleccionar, reinicia sessionToken (mejor ranking/precio)
  const select = useCallback(() => {
    const g = (window as any).google?.maps;
    if (g?.places?.AutocompleteSessionToken) {
      token.current = new g.places.AutocompleteSessionToken();
    }
    setPreds((p) => (p.length ? [] : p));
  }, []);

  const clear = useCallback(() => {
    setPreds((p) => (p.length ? [] : p));
  }, []);

  return { ready, preds, query, select, clear };
}
