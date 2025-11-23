# CongestionAI — AI-Powered Departure Advisor & 72h Congestion Forecast

CongestionAI is an AI-assisted mobility planner that helps users decide **when to leave**, using traffic-aware sampling, short-term forecasting, and a clean Next.js interface.  
Select origin/destination, configure your window, and get the **best departure**, predicted ETA, risk levels, and savings (time, fuel, CO₂).  
Built for **Hack-Nation 2025 (Venture Track)** to demonstrate proactive, data-driven mobility decisions.

## 🔍 What the MVP Includes

### Plan
- Origin/Destination (address, @lat,lng, or placeId)
- Window, Step, Budget mode
- Avoid tolls/highways

### Result
- Best departure (ETA + risk)
- Advisor chart (ETA line + risk heatmap)
- Chips: Weekend / Holiday context
- Add to calendar (.ics), Share, Save

### History
- List + search + range filter
- Time/Fuel/CO₂/Money savings
- Pin, Replan, Open, Delete
- Import/Export JSON

### Settings
- Map provider, Units, Country, Locale
- Savings model: fuel price, L/100km, trip distance
- Planner defaults (window, step, avoid tolls/highways)
- Import/Export/Reset

## 🧠 Why It Matters
Congestion drives massive economic and environmental costs.  
Predictive departure planning helps fleets, cities, and drivers take informed, efficient, and sustainable actions.

## 🗺 API Endpoints
- **/api/analyze** — traffic-aware window sampling (Google Routes v2)
- **/api/forecast** — 72h forecast + top-3 windows

## 🖼 Screenshots

<p align="center">
  <img src="web/public/media/plan.jpg" alt="Plan screen" width="420" />
  <img src="web/public/media/result1.jpg" alt="Result 1" width="420" />
  <img src="web/public/media/result2.jpg" alt="Result 2" width="420" />
</p>

<p align="center">
  <img src="web/public/media/result3.jpg" alt="Result 3" width="420" />
  <img src="web/public/media/history.jpg" alt="History screen" width="420" />
  <img src="web/public/media/settings.jpg" alt="Settings screen" width="420" />
</p>

**What you’re seeing**

- **Plan** — planning/setup view
- **Result 1–3** — evaluation panel (“Don’t leave yet” / “OK to go”) + suggested wait
- **History** — previous evaluations
- **Settings** — configuration

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
## 🛠 Getting Started

pnpm install  
pnpm dev

### .env
Create .env:
    # Client (optional but recommended for map components)
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...

    # Apple MapKit (optional)
    # NEXT_PUBLIC_MAPKIT_TOKEN=...

    # Server (required for /api/ana

## Scripts## Scripts
- `pnpm dev` — dev
- `pnpm build` — prod
- `pnpm start` — server

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

## 🧪 Demo script (for judges)
  1. Open Plan → CDMX → Puebla → Window 120 / Step 10 → Plan.
  2. In Result: show Best, the Advisor, chips Holiday/Weekend, Save, Add to calendar.
  3. Open History: view metrics and the saved item; use Replan.
  4. Show Settings: change Country to us and explain how it impacts risk/holiday and cache.
  5. Go to Forecast: show 72h and “Plan that window”.

## 🤝 Contributing
  PRs welcome. Standards: Strict TypeScript, ESLint, Tailwind.

## License

