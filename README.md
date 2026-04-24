# CongestionAI

CongestionAI is a web app for smarter car departure planning. Instead of showing only a route, it compares departure windows, estimates traffic-aware ETA, calculates congestion risk, and helps users decide whether they should leave now or wait a bit.

It was built as a mobility MVP with a strong product focus: clear recommendations, useful visual feedback, and actionable metrics such as time, fuel, money, and CO2 savings.

## What it does

- Compares multiple departure times for the same trip.
- Recommends the best departure window based on ETA and congestion risk.
- Shows a forecast of up to 72 hours to detect calmer travel windows.
- Supports origin and destination as text, coordinates (`@lat,lng`), or `placeId`.
- Lets users avoid tolls and highways.
- Adds weekend and holiday context by country.
- Stores trip history and allows replanning.
- Imports and exports settings and history as JSON.
- Includes quick actions such as sharing and adding to calendar.

## Product features

### Planning

- Trip form with origin, destination, analysis window, and step size.
- Place autocomplete powered by Google Places.
- Route preferences to avoid tolls or highways.
- Persistent user defaults.

### Result

- Primary departure recommendation.
- Estimated ETA for the best option.
- Risk level with a short explanation of the main factors.
- Comparison against “leave now”.
- Route map, heatmap, and nearby alternatives.
- Savings metrics for time, fuel, money, and CO2.

### Forecast

- Departure window explorer for the next 72 hours.
- Top recommended time slots from the forecast.
- Visual heatmap to identify route-pressure patterns.
- Context signals for weekends and holidays.

### History and Settings

- Local trip history with search, filters, and replanning.
- Country, units, locale, and map provider settings.
- Configurable savings model with fuel price, consumption, and trip distance.
- Settings and history import/export.

## App tabs

### Home

The Home tab is the main entry point for planning a trip. Users enter origin and destination, define the analysis window and interval, and choose route preferences such as avoiding tolls or highways. From here, the app sends the trip setup into the result flow.

### Result

The Result tab evaluates the selected trip and compares different departure options inside the chosen time window. It highlights the best departure time, estimated ETA, congestion risk, explanation factors, route visualization, and savings versus leaving immediately.

### Forecast

The Forecast tab is designed for flexible trips. It samples future departure windows across the next 72 hours, highlights the best time slots, and visualizes route pressure through a heatmap so users can spot calmer periods before committing to a trip.

### History

The History tab stores previously analyzed trips locally in the browser. Users can search, review saved runs, reopen past results, replan a route, and track aggregated savings over time.

### Settings

The Settings tab controls how the planner behaves and how results are interpreted. It includes country and locale preferences, units, map provider selection, default planning behavior, and the savings model used for fuel, money, and CO2 estimates.

## Model used

The app does not rely on an LLM for its core recommendation. Its decision engine uses two layers:

1. `Google Routes API v2` as the source of traffic-aware travel-time estimates (`routingPreference: TRAFFIC_AWARE_OPTIMAL`).
2. A small explainable risk/scoring model implemented in [`web/app/api/analyze/_shared.ts`](/Users/azulramirezkuri/Documents/GitHub/congestionai/web/app/api/analyze/_shared.ts:1).

That model combines variables such as:

- hour of week
- peak hour
- weekend
- holiday
- rain
- ratio between traffic ETA and static ETA

At the moment, it is a heuristic logistic-style model with fixed weights, designed to stay interpretable and easy to tune. Then the analysis API ranks each sampled option using a blend of ETA and risk to pick the best departure time.

## Tech stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Google Routes API v2
- Google Places API
- `localStorage` and `sessionStorage` for settings, cache, and history

## Main structure

- [`web/app/home-client.tsx`](/Users/azulramirezkuri/Documents/GitHub/congestionai/web/app/home-client.tsx:1): landing page and main trip form.
- [`web/app/api/analyze/route.ts`](/Users/azulramirezkuri/Documents/GitHub/congestionai/web/app/api/analyze/route.ts:1): departure-window comparison API.
- [`web/app/api/analyze/_shared.ts`](/Users/azulramirezkuri/Documents/GitHub/congestionai/web/app/api/analyze/_shared.ts:1): sample computation, risk scoring, and explanations.
- [`web/app/api/forecast/route.ts`](/Users/azulramirezkuri/Documents/GitHub/congestionai/web/app/api/forecast/route.ts:1): 72-hour forecast API.
- [`web/app/api/places-autocomplete/route.ts`](/Users/azulramirezkuri/Documents/GitHub/congestionai/web/app/api/places-autocomplete/route.ts:1): server-side autocomplete proxy.
- [`web/lib/hooks/usePlacesAutocomplete.ts`](/Users/azulramirezkuri/Documents/GitHub/congestionai/web/lib/hooks/usePlacesAutocomplete.ts:1): autocomplete hook with provider fallback logic.

## Running locally

```bash
pnpm install
cp web/.env.example web/.env.local
pnpm dev
```

## Environment variables

Create `web/.env.local` with:

```env
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
GOOGLE_MAPS_API_KEY_SERVER=...

# Optional
NEXT_PUBLIC_MAPKIT_TOKEN=...
```

Required Google APIs:

- `Routes API`
- `Places API (New)`
- `Maps JavaScript API`

## Scripts

- `pnpm dev`
- `pnpm build`
- `pnpm start`
- `pnpm lint`
- `pnpm typecheck`

## Current limitations

- The forecast is built from Google Routes sampling, not from a proprietary historical traffic dataset.
- The risk layer uses heuristic weights, not a model trained on real mobility data.
- Holiday coverage is still based on a small curated set.
- There is no database yet; history, settings, and cache live in the browser.

## Possible next steps

- Train or calibrate the scoring layer with real mobility data.
- Add real weather input instead of leaving rain at `0`.
- Persist history in a backend and add user accounts.
- Add special-event signals such as concerts, road closures, or traffic incidents.
