"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ensureGoogleMaps } from "@/lib/map/loaders";

type Pred = { description: string; place_id: string };
type Status = "idle" | "ready" | "loading" | "error";

export function usePlacesAutocomplete(opts?: {
  countries?: string[]; // ej. ["mx"]
  minChars?: number; // ej. 3
}) {
  const { countries = ["mx"], minChars = 3 } = opts || {};
  const [status, setStatus] = useState<Status>("idle");
  const [preds, setPreds] = useState<Pred[]>([]);
  const [error, setError] = useState<string | null>(null);

  const svcRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);

  // Carga 'maps' + 'places' y prepara servicio + token
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureGoogleMaps(["maps", "places"]);
        if (cancelled) return;
        const g = (window as any).google?.maps;
        if (g?.places?.AutocompleteService) {
          svcRef.current = new g.places.AutocompleteService();
          sessionRef.current = new g.places.AutocompleteSessionToken();
          setStatus("ready");
          setError(null);
        } else {
          setStatus("error");
          setError("google.maps.places no disponible");
          console.warn("[places] no disponible");
        }
      } catch (e: any) {
        setStatus("error");
        setError(e?.message || "Error cargando Google Maps/Places");
        console.error("[places] loader error", e);
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
      const text = (input || "").trim();
      if (status !== "ready" || !svcRef.current || text.length < minChars) {
        setPreds([]);
        return;
      }
      const g = (window as any).google?.maps;
      const req: any = {
        input: text,
        sessionToken: sessionRef.current || undefined,
        // types: ["geocode"], // opcional; muchos devs lo omiten
        componentRestrictions: countries.length
          ? { country: countries }
          : undefined,
      };

      svcRef.current.getPlacePredictions(req, (results: any[], st: string) => {
        if (st !== (g?.places?.PlacesServiceStatus || {}).OK) {
          // Logs útiles para detectar permisos
          console.warn("[places] status:", st, results);
          if (st === "REQUEST_DENIED") {
            setError(
              "REQUEST_DENIED – revisa habilitación de Places API, billing y referrers de la key.",
            );
          } else if (st === "OVER_QUERY_LIMIT") {
            setError("OVER_QUERY_LIMIT – demasiado tráfico con esta key.");
          } else if (st === "INVALID_REQUEST") {
            setError("INVALID_REQUEST – verifica el request.");
          } else {
            setError(null);
          }
          setPreds([]);
          return;
        }
        setError(null);
        setPreds(
          (results || []).map((r: any) => ({
            description: r.description,
            place_id: r.place_id,
          })),
        );
      });
    },
    [status, minChars, countries],
  );

  const select = useCallback((description: string) => {
    // nueva sesión tras confirmar selección (buena práctica de billing)
    try {
      const g = (window as any).google?.maps;
      if (g?.places?.AutocompleteSessionToken) {
        sessionRef.current = new g.places.AutocompleteSessionToken();
      }
    } catch {}
    setPreds([]);
    return description;
  }, []);

  return { status, preds, error, query, select, clear };
}
