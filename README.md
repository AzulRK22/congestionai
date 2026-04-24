# CongestionAI — AI-Powered Departure Advisor & 72h Congestion Forecast

CongestionAI is an AI-assisted mobility planner that helps users decide when to leave, using traffic-aware sampling, short-term forecasting, and a clean Next.js interface.
Select origin and destination, configure your window, and get the best departure, predicted ETA, risk levels, and savings in time, fuel, and CO2.
Built for Hack-Nation 2025 (Venture Track) to demonstrate proactive, data-driven mobility decisions.

## What the MVP Includes

### Plan

- Origin and destination with address, `@lat,lng`, or `placeId`
- Window, step, and budget mode
- Avoid tolls and avoid highways

### Result

- Best departure with ETA and risk
- Advisor chart with ETA line and risk heatmap
- Weekend and holiday context chips
- Add to calendar, share, and save

### History

- List, search, and range filter
- Time, fuel, CO2, and money savings
- Pin, replan, open, delete, import, and export JSON

### Settings

- Map provider, units, country, and locale
- Savings model with fuel price, L/100km, and trip distance
- Planner defaults for window, step, and route preferences
- Import, export, and reset

## Why It Matters

Congestion drives major economic and environmental costs.
Predictive departure planning helps fleets, cities, and drivers make informed, efficient, and sustainable decisions before traffic peaks.

## API Endpoints

- `/api/analyze` — traffic-aware window sampling with Google Routes v2
- `/api/forecast` — 72-hour forecast with top windows

## What You’re Seeing

- `Plan` — planning and setup view
- `Result` — evaluation panel with go-now guidance and alternatives
- `History` — previous evaluations
- `Settings` — configuration and defaults

## Tech Stack

- Next.js 15
- React
- TypeScript
- Tailwind CSS
- Google Routes API v2
- Local and session storage for cache, history, and settings

## Getting Started

```bash
pnpm install
cp web/.env.example web/.env.local
pnpm dev
```

## Environment Variables

Create `web/.env.local`:

```env
# Client
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...

# Optional Apple MapKit
# NEXT_PUBLIC_MAPKIT_TOKEN=...

# Server
GOOGLE_MAPS_API_KEY_SERVER=...
```

Required Google APIs:

- `Routes API` for `/api/analyze` and `/api/forecast`
- `Places API (New)` for the autocomplete endpoint
- `Maps JavaScript API` for client-side maps

## Scripts

- `pnpm dev` — development
- `pnpm build` — production build
- `pnpm start` — production server
- `pnpm lint` — lint the app
- `pnpm typecheck` — run TypeScript checks

## Configuration

All defaults live in Settings and persist in localStorage:

- Country for holiday-aware risk
- Units and locale for formatting
- Savings model for fuel and trip assumptions

## Holiday Awareness

- Minimal curated holiday sets live in `web/lib/events/holidays.ts`
- Driven by Settings → Country
- Reflected in result chips and risk scoring

## What-if Ideas

- Compare best departure vs shifted departures with deltas in time, cost, and CO2
- Event injection for holidays, concerts, or special traffic scenarios

## Known Limitations

- Forecasts rely on sampled Google Routes data, not a historical speed database
- Holiday lists are still demo-sized
- No server database yet; history and settings live in the browser

## Demo Script

1. Open Plan and try CDMX to Puebla with a 120-minute window and 10-minute step.
2. In Result, show the best departure, advisor chart, holiday/weekend chips, save, and calendar action.
3. Open History to review metrics and replan a saved trip.
4. Open Settings and change Country to explain how it affects holiday-aware scoring.
5. Open Forecast and show the best 72-hour windows.

## Contributing

PRs are welcome. Standards: strict TypeScript, ESLint, and Tailwind.
