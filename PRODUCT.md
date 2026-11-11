# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: judges of the Google Mumbai Air Quality Mapping & Forecasting Challenge (Zindi, Creative Track). They open the site cold, have minutes, and need to understand the idea and see it working. Confirmed by the user.

Secondary, as the people the product is imagined for: BMC ward officers deciding where to send dust-suppression equipment, and Mumbai residents checking the air near them.

## Product Purpose

Mumbai AeroPulse turns PM2.5 forecasts for four Mumbai monitoring stations into two things a person can act on: a ward-level municipal action plan and a citizen health advisory. Success is a judge understanding, in one visit, what the air is doing, what the models expect next, and what should be done about it.

## Positioning

Forecast numbers are joined to boundary-layer weather (PBLH x wind speed = ventilation index) and to named places in each ward, so the advice is specific to a station rather than generic AQI guidance.

## Operating Context

- React + Vite dashboard in `dashboard/` (served at /app/), with a static landing page at /, fed by static JSON built by `scripts/prepare_dashboard_data.py`.
- Four stations: Borivali East and Malad West (IITM), Byculla and Shivaji Nagar (BMC).
- Data is a snapshot with a cutoff of 10 Nov 2026 09:00 IST; forecasts run to 21 Nov 2026. All times are IST.
- Two submitted models: Submission 1 (50% CatBoost + 50% LightGBM blend) and Submission 2 (100% CatBoost, conservative).
- Categories follow the CPCB NAQI PM2.5 breakpoints (Good to Severe).

## Capabilities and Constraints

- Station comparison, map (Google Maps when a key is present, built-in SVG map otherwise), Google Air Quality API readings, forecast chart over three time ranges, weather series, and a generated advisory with BMC and citizen views. All of these must remain. Confirmed by the user.
- Must work fully with no API keys: built-in map, estimated Google readings, rule-based advisory. Confirmed by the user.
- Two pages sharing one look (charcoal ground, sage accent, Funnel type): a landing page at / (static, dashboard/public/index.html) and the dashboard at /app/. Requested by the user on 11 Nov 2026.

## Brand Commitments

- Name: Mumbai AeroPulse. Fixed.
- Competition references stay: the Zindi challenge, Creative Track, and the Submission 1 / Submission 2 model names.

## Evidence on Hand

- `dashboard/src/data/*.json`: station snapshot and statistics, 648 hourly points per station with both forecasts, 615 days of daily history, 1,056 hours of weather.
- No testimonials, users, deployments or accuracy claims exist beyond what the data files contain. Do not invent any.

## Product Principles

1. Say what is real: label estimated and rule-based output as such, never as live.
2. The reading and the recommendation come first; method and model detail follow.
3. One station in focus at a time, with the other three always comparable.
4. Plain words over jargon; a judge outside atmospheric science should follow every label.
