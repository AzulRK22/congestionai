"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ensureGoogleMaps } from "@/lib/map/loaders";

type Pred = { description: string; place_id: string };
type Status = "idle" | "ready" | "loading" | "error";

type AutocompleteOpts = {
  countries?: string[]; // ej. ["mx"]
  minChars?: number; // ej. 3
};

export function usePlacesAutocomplete(opts?: AutocompleteOpts) {
  const { countries = ["mx"], minChars = 3 } = opts ?? {};

  const [status, setStatus] = useState<Status>("idle");
  const [preds, setPreds] = useState<Pred[]>([]);
  const [error, setError] = useState<string | null>(null);

  const svcRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const sessionRef = useRef<google.maps.places.AutocompleteSessionToken | null>(
    null,
  );

  // Carga 'maps' + 'places' y prepara servicio + token
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setStatus("loading");
        await ensureGoogleMaps(["maps", "places"]);

        if (cancelled) return;

        // Obtén el namespace de forma segura sin usar `any`
        type GMaps = typeof google.maps;
        const g = (window as unknown as { google?: { maps?: GMaps } }).google
          ?.maps;

        if (g?.places?.AutocompleteService) {
          svcRef.current = new g.places.AutocompleteService();
          sessionRef.current = new g.places.AutocompleteSessionToken();
          setStatus("ready");
          setError(null);
        } else {
          setStatus("error");
          setError("google.maps.places no disponible");
          // console.warn("[places] no disponible");
        }
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : typeof e === "string"
              ? e
              : "Error cargando Google Maps/Places";
        setStatus("error");
        setError(msg);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const clear = useCallback(() => {
    setPreds([]);
  }, []);

  const query = useCallback(
    (input: string) => {
      const text = (input ?? "").trim();
      if (status !== "ready" || !svcRef.current || text.length < minChars) {
        setPreds([]);
        return;
      }

      type GMaps = typeof google.maps;
      const g = (window as unknown as { google?: { maps?: GMaps } }).google
        ?.maps;
      if (!g) return;

      const req: google.maps.places.AutocompletionRequest = {
        input: text,
        sessionToken: sessionRef.current ?? undefined,
        // types: ["geocode"], // opcional
        componentRestrictions: countries.length
          ? { country: countries as unknown as string | string[] }
          : undefined,
      };

      svcRef.current.getPlacePredictions(
        req,
        (
          results: google.maps.places.AutocompletePrediction[] | null,
          st: google.maps.places.PlacesServiceStatus,
        ) => {
          if (st !== google.maps.places.PlacesServiceStatus.OK || !results) {
            // Mensajes útiles para diagnósticos
            if (st === google.maps.places.PlacesServiceStatus.REQUEST_DENIED) {
              setError(
                "REQUEST_DENIED – revisa habilitación de Places API, billing y referrers de la key.",
              );
            } else if (
              st === google.maps.places.PlacesServiceStatus.OVER_QUERY_LIMIT
            ) {
              setError("OVER_QUERY_LIMIT – demasiado tráfico con esta key.");
            } else if (
              st === google.maps.places.PlacesServiceStatus.INVALID_REQUEST
            ) {
              setError("INVALID_REQUEST – verifica el request.");
            } else {
              setError(null);
            }
            setPreds([]);
            return;
          }

          setError(null);
          setPreds(
            results.map((r) => ({
              description: r.description,
              place_id: r.place_id,
            })),
          );
        },
      );
    },
    [status, minChars, countries],
  );

  const select = useCallback((description: string) => {
    // Nueva sesión tras confirmar selección (buena práctica de billing)
    try {
      if (google?.maps?.places?.AutocompleteSessionToken) {
        sessionRef.current = new google.maps.places.AutocompleteSessionToken();
      }
    } catch {
      // noop
    }
    setPreds([]);
    return description;
  }, []);

  return {
    status,
    preds,
    error,
    query,
    select,
    clear,
    ready: status === "ready",
  };
}
