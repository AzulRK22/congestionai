// web/hooks/usePlacesAutocomplete.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ensureGoogleMaps } from "@/lib/map/loaders";

type Status = "idle" | "loading" | "ready" | "error";
type Provider = "new-js" | "legacy-js" | "server" | "none";

export type Prediction = {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

type PlacesCtorLib = {
  AutocompleteSessionToken?: new () => unknown;
  AutocompleteService?: new () => {
    getPlacePredictions: (
      request: { input: string; sessionToken?: unknown },
      callback: (
        results: Array<{
          place_id: string;
          description: string;
          structured_formatting?: {
            main_text?: string;
            secondary_text?: string;
          };
        }> | null,
        status: google.maps.places.PlacesServiceStatus,
      ) => void,
    ) => void;
  };
  PlacesServiceStatus?: typeof google.maps.places.PlacesServiceStatus;
  AutocompleteSuggestion?: {
    fetchAutocompleteSuggestions: (request: {
      input: string;
      sessionToken?: unknown;
      includedRegionCodes?: string[];
      language?: string;
    }) => Promise<{
      suggestions?: Array<{
        placePrediction?: {
          placeId?: string;
          text?: { text?: string; toString?: () => string };
          mainText?: { text?: string; toString?: () => string };
          secondaryText?: { text?: string; toString?: () => string };
        };
      }>;
    }>;
  };
};

type ServerResponse = {
  suggestions?: Prediction[];
  error?: string;
  detail?: string;
};

export function usePlacesAutocomplete(countryHint?: string[]) {
  const token = useRef<unknown>(null);
  const placesRef = useRef<PlacesCtorLib | null>(null);
  const legacySvcRef = useRef<InstanceType<NonNullable<PlacesCtorLib["AutocompleteService"]>> | null>(null);
  const providerRef = useRef<Provider>("none");

  const [status, setStatus] = useState<Status>("idle");
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);
  const ready = status === "ready";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatus("loading");
        setError(null);
        const libs = await ensureGoogleMaps(["maps", "places"]);
        if (cancelled) return;

        const places =
          (libs.places as PlacesCtorLib | undefined) ??
          ((window as unknown as { google?: typeof google }).google?.maps
            ?.places as PlacesCtorLib | undefined);

        placesRef.current = places ?? null;

        if (
          places?.AutocompleteSuggestion?.fetchAutocompleteSuggestions &&
          places.AutocompleteSessionToken
        ) {
          providerRef.current = "new-js";
          token.current = new places.AutocompleteSessionToken();
          setStatus("ready");
          setError(null);
          return;
        }

        if (places?.AutocompleteService && places.AutocompleteSessionToken) {
          providerRef.current = "legacy-js";
          legacySvcRef.current = new places.AutocompleteService();
          token.current = new places.AutocompleteSessionToken();
          setStatus("ready");
          setError(null);
          return;
        }

        providerRef.current = "server";
        setStatus("ready");
        setError(null);
      } catch {
        providerRef.current = "server";
        setStatus("ready");
        setError(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reqIdRef = useRef(0);

  const queryViaServer = useCallback(
    async (text: string, myReqId: number) => {
      const res = await fetch("/api/places-autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: text,
          countryHint,
          sessionToken:
            typeof token.current === "string" ? token.current : undefined,
        }),
      });

      if (myReqId !== reqIdRef.current) return;
      const data = (await res.json().catch(() => ({}))) as ServerResponse;
      const next = data.suggestions ?? [];
      if (!res.ok) {
        setError(
          data.detail ??
            data.error ??
            "No se pudo consultar Places en el servidor.",
        );
        setPreds((p) => (p.length ? [] : p));
        return;
      }
      if (!next.length) {
        setError("Sin sugerencias. Prueba otra forma de escribir el lugar.");
        setPreds((p) => (p.length ? [] : p));
        return;
      }
      setError(null);
      setPreds(next);
    },
    [countryHint],
  );

  const query = useCallback(
    (input: string) => {
      if (!ready) {
        setPreds((p) => (p.length ? [] : p));
        return;
      }

      const text = (input ?? "").trim();
      if (text.length < 3) {
        setPreds((p) => (p.length ? [] : p));
        return;
      }

      const myReqId = ++reqIdRef.current;
      setIsQuerying(true);
      setError(null);

      if (
        providerRef.current === "new-js" &&
        placesRef.current?.AutocompleteSuggestion?.fetchAutocompleteSuggestions
      ) {
        const includedRegionCodes = (countryHint ?? [])
          .map((value) => value.trim().toLowerCase())
          .filter((value) => value.length === 2)
          .slice(0, 5);

        void placesRef.current.AutocompleteSuggestion.fetchAutocompleteSuggestions(
          {
            input: text,
            sessionToken: token.current ?? undefined,
            includedRegionCodes: includedRegionCodes.length
              ? includedRegionCodes
              : undefined,
            language: "es",
          },
        )
          .then((response) => {
            if (myReqId !== reqIdRef.current) return;
            const next = (response?.suggestions ?? [])
              .map((item) => item.placePrediction)
              .filter(Boolean)
              .map((prediction) => ({
                place_id: prediction?.placeId ?? "",
                description:
                  prediction?.text?.text ??
                  prediction?.text?.toString?.() ??
                  "",
                structured_formatting: {
                  main_text:
                    prediction?.mainText?.text ??
                    prediction?.mainText?.toString?.(),
                  secondary_text:
                    prediction?.secondaryText?.text ??
                    prediction?.secondaryText?.toString?.(),
                },
              }))
              .filter((item) => item.place_id && item.description);

            if (!next.length) {
              setError(
                "Sin sugerencias desde AutocompleteSuggestion. Intentando fallback...",
              );
              providerRef.current = "server";
              void queryViaServer(text, myReqId).finally(() => {
                if (myReqId === reqIdRef.current) setIsQuerying(false);
              });
              return;
            }

            setError(null);
            setPreds(next);
            setIsQuerying(false);
          })
          .catch(() => {
            if (myReqId !== reqIdRef.current) return;
            providerRef.current = "server";
            void queryViaServer(text, myReqId).finally(() => {
              if (myReqId === reqIdRef.current) setIsQuerying(false);
            });
          });
        return;
      }

      if (providerRef.current === "legacy-js" && legacySvcRef.current) {
        legacySvcRef.current.getPlacePredictions(
          {
            input: text,
            sessionToken: token.current ?? undefined,
          },
          (results, serviceStatus) => {
            if (myReqId !== reqIdRef.current) return;
            const okStatus =
              placesRef.current?.PlacesServiceStatus?.OK ??
              google.maps.places.PlacesServiceStatus.OK;
            if (serviceStatus !== okStatus || !results?.length) {
              providerRef.current = "server";
              void queryViaServer(text, myReqId).finally(() => {
                if (myReqId === reqIdRef.current) setIsQuerying(false);
              });
              return;
            }
            setError(null);
            setPreds(results as Prediction[]);
            setIsQuerying(false);
          },
        );
        return;
      }

      void queryViaServer(text, myReqId).finally(() => {
        if (myReqId === reqIdRef.current) setIsQuerying(false);
      });
    },
    [countryHint, queryViaServer, ready],
  );

  const select = useCallback(() => {
    try {
      const SessionToken = placesRef.current?.AutocompleteSessionToken;
      if (SessionToken) {
        token.current = new SessionToken();
      } else {
        token.current =
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      }
    } catch {
      /* noop */
    }
    setPreds((p) => (p.length ? [] : p));
  }, []);

  const clear = useCallback(() => {
    setIsQuerying(false);
    setError(null);
    setPreds((p) => (p.length ? [] : p));
  }, []);

  return {
    ready,
    preds,
    query,
    select,
    clear,
    status,
    error,
    isQuerying,
  };
}
