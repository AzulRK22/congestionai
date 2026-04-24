import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlacesAutocompleteBody = {
  input?: string;
  countryHint?: string[];
  sessionToken?: string;
  locationBias?: {
    lat: number;
    lng: number;
    radius?: number;
  } | null;
};

type PlacesAutocompleteApiResponse = {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
};

type Suggestion = {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

function extractErrorMessage(detail: string) {
  if (!detail.trim()) return "";
  try {
    const parsed = JSON.parse(detail) as {
      error?: { message?: string; status?: string };
    };
    const status = parsed.error?.status?.trim();
    const message = parsed.error?.message?.trim();
    if (status && message) return `${status}: ${message}`;
    return message ?? detail;
  } catch {
    return detail;
  }
}

async function readJsonBody(
  req: NextRequest,
): Promise<PlacesAutocompleteBody | null> {
  const text = await req.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as PlacesAutocompleteBody;
  } catch {
    return null;
  }
}

function normalizeCountryHint(countryHint?: string[]) {
  return (countryHint ?? [])
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length === 2)
    .slice(0, 5);
}

function mapSuggestions(data: PlacesAutocompleteApiResponse): Suggestion[] {
  return (data.suggestions ?? [])
    .map((item) => item.placePrediction)
    .filter(Boolean)
    .map((prediction) => ({
      place_id: prediction?.placeId ?? "",
      description: prediction?.text?.text ?? "",
      structured_formatting: {
        main_text: prediction?.structuredFormat?.mainText?.text,
        secondary_text: prediction?.structuredFormat?.secondaryText?.text,
      },
    }))
    .filter((item) => item.place_id && item.description);
}

export async function POST(req: NextRequest) {
  const body = await readJsonBody(req);
  if (!body?.input?.trim()) {
    return NextResponse.json(
      { error: "missing input", suggestions: [] },
      { status: 400 },
    );
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY_SERVER;
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing GOOGLE_MAPS_API_KEY_SERVER", suggestions: [] },
      { status: 500 },
    );
  }

  const input = body.input.trim();
  const countryHint = normalizeCountryHint(body.countryHint);
  const regionCode = countryHint[0];

  const payload: Record<string, unknown> = {
    input,
    languageCode: "es",
    sessionToken: body.sessionToken,
  };

  if (regionCode) {
    payload.regionCode = regionCode;
    payload.includedRegionCodes = countryHint;
  }

  if (
    body.locationBias &&
    Number.isFinite(body.locationBias.lat) &&
    Number.isFinite(body.locationBias.lng)
  ) {
    payload.locationBias = {
      circle: {
        center: {
          latitude: body.locationBias.lat,
          longitude: body.locationBias.lng,
        },
        radius: Math.max(1000, Math.min(body.locationBias.radius ?? 20000, 50000)),
      },
    };
  }

  const upstream = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    const message = extractErrorMessage(detail);
    return NextResponse.json(
      {
        error: message || "places autocomplete request failed",
        detail: message || detail,
        suggestions: [],
      },
      { status: upstream.status || 502 },
    );
  }

  const data = (await upstream.json()) as PlacesAutocompleteApiResponse;
  return NextResponse.json({ suggestions: mapSuggestions(data) });
}
