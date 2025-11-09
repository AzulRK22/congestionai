# CongestionAI

AI-powered **departure advisor** and **72h congestion forecast**.
Pick origin/destination, get the **best time to leave**, with **ETA**, **risk**, and **savings** (time, fuel, CO₂). Save results to History and tweak defaults in Settings.

> Built for Hack-Nation (Venture Track). Goal: proactive, data-driven mobility decisions.

---

## Demo features (MVP)

- **Plan**
  - Origin/Destination (supports address, `@lat,lng`, or placeId).
  - Tunables: window, step, budget mode, avoid tolls/highways.
- **Result**
  - **Best departure** (ETA + risk).
  - **Departure Advisor chart** (new): ETA line over your window, background tinted by **risk** (green→red). Chips for **Weekend/Holiday** context.
  - 1-click **Add to calendar** (.ics) & **Share**.
  - **Save to History** with baseline / savings.
- **History**
  - Compact list + search & range filter.
  - Metrics: **Time saved**, **Fuel saved**, **CO₂ / Money** (uses Settings).
  - Pin/Unpin, Replan, Open, Delete, Import/Export JSON.
- **Settings**
  - Map provider, Units, **Country** (holiday-aware risk), City, Locale.
  - Savings model defaults: fuel price, consumption (with quick profiles), typical trip distance.
  - Planner defaults (window, step, budget, avoid tolls/highways).
  - Import/Export/Reset.
- **API**
  - `/api/analyze` — traffic-aware window sampling (Google Routes v2).
  - `/api/forecast` — **72h horizon** (hourly) + **top-3 windows** (lightweight).

---

## Why it matters

Congestion costs billions in time and fuel. Forecasting and advising **before** gridlock enables:

- Fleets to **shift departures** and **pre-position** assets.
- Cities to adjust **signage/control** before peaks.
- Drivers to reduce **time, fuel, and CO₂**.

---

## Tech stack

- **Next.js 15**, React, TypeScript, Tailwind.
- **Google Routes API v2** (traffic-aware).
- No heavy chart libs: custom **SVG** for speed and portability.
- Local/session storage for cache, settings, history.

---

## Getting started

````bash
pnpm install
pnpm dev

Create .env:
    # Client (optional but recommended for map components)
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...

    # Apple MapKit (optional)
    # NEXT_PUBLIC_MAPKIT_TOKEN=...

    # Server (required for /api/analyze and /api/forecast)
    GOOGLE_MAPS_API_KEY_SERVER=...

## Scripts
- `pnpm dev` — modo desarrollo
- `pnpm build` — compila producción
- `pnpm start` — arranca servidor

## Configuration
All defaults live in Settings (persisted in localStorage):
	•	Country → Holiday-aware risk (🇲🇽 mx, 🇺🇸 us, 🇩🇪 de).
	•	Units/Locale → Numbers, currency, and labels.
	•	Savings model → Fuel price, L/100km, typical trip distance.```

## Holiday awareness
	•	Minimal curated sets in lib/events/holidays.ts.
	•	Driven by Settings → Country.
	•	Reflected in Result via chips and in risk scoring features.
## What-if (planned)
	•	Compare current best vs shifted departure (±X minutes) with $ / CO₂ / time deltas.
	•	Event injection (concerts/holidays) for scenario testing.
## Known limitations
	•	Forecast relies on sampling Google Routes (no raw historical speed DB).
	•	Holiday lists are demo-size; expand per country for production.
	•	No server DB; history/settings live in the browser.

````
