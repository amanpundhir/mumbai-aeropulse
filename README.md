# Mumbai AeroPulse
### Spatio-Temporal AI Airshed Intelligence & Civic Action Platform

[![React 18](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev/)
[![Vite 5](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS 3](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Google Maps Platform](https://img.shields.io/badge/Google_Maps-Platform-4285F4.svg)](https://developers.google.com/maps)
[![Google Gemini AI](https://img.shields.io/badge/Google_Gemini-2.5_Flash-FF7043.svg)](https://ai.google.dev/)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-green.svg)](https://python.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Live site:** https://amanpundhir.github.io/mumbai-aeropulse/ (landing page) · https://amanpundhir.github.io/mumbai-aeropulse/app/ (dashboard)

An end-to-end, publication-grade environmental intelligence and civic action platform built for the **Google Mumbai Air Quality Mapping & Forecasting Challenge** on Zindi, organized in partnership with **Google**, **Beyond**, and **ClimateVerse** (CrisisReady at Harvard University / Mittal South Asia Institute / Harvard Data Science Initiative).

Mumbai AeroPulse bridges the critical "last mile" between raw tabular machine learning predictions and real-world urban civic action. By coupling micro-meteorological thermodynamics (boundary layer height and ventilation capacity) with dual-model machine learning ensembles, real-time spatial GIS mapping, and Google's Gemini generative AI, AeroPulse translates numerical PM2.5 forecasts into **actionable ward-level municipal intervention plans** and **hyper-localized citizen health advisories**.

---

## Table of Contents
1. [Key Features](#key-features)
2. [System Architecture](#system-architecture)
3. [Quickstart Guide](#quickstart-guide)
4. [Zero-Dependency Demo Mode vs Live Cloud Mode](#zero-dependency-demo-mode-vs-live-cloud-mode)
5. [Dashboard Interface & Component Breakdown](#dashboard-interface--component-breakdown)
6. [Offline ML Forecasting Engine](#offline-ml-forecasting-engine)
7. [Repository & Code Structure](#repository--code-structure)
8. [Automated Verification & Smoke Checks](#automated-verification--smoke-checks)
9. [Creative Track Competition Package](#creative-track-competition-package)
10. [Licensing & Data Attribution](#licensing--data-attribution)

---

## 1. Key Features

- **Dual-Perspective Civic Intelligence (Gemini AI)**: Translates multi-model forecast curves into two distinct operational directives:
  - **BMC Municipal Action Plan**: Ward-specific equipment deployment (mist cannons, anti-smog guns, mechanical sweepers, traffic diversions, construction dust halts) across Wards M-East, E, P-North, and R-Central.
  - **Citizen & Public Health Advisory**: Vulnerable population safeguards (children/schools, elderly/cardiorespiratory, athletes/joggers, N95 masking, and indoor ventilation timing).
- **Dual-Engine Spatial GIS Mapping (Google Maps Platform + SVG Fallback)**:
  - Live Google Maps JavaScript API with dark-theme cartography, `AdvancedMarkerElement` pins, and circular atmospheric dispersion overlays.
  - Built-in zero-dependency interactive SVG Cartographic Fallback mapping Mumbai's Salsette Island coastline, major highway spines, and station pins.
- **Physics-Guided Meteorological Coupling**: Fuses continuous thermodynamics from Open-Meteo, computing an atmospheric **Ventilation Index** ($V_i = \text{PBLH} \times \text{WindSpeed}$) to directly model nocturnal thermal inversion traps and daytime maritime marine clearance.
- **Dual Machine Learning Ensemble**:
  - **Submission 1 (Primary Blend)**: 50% CatBoost + 50% LightGBM modeling rapid post-Diwali cleansing.
  - **Submission 2 (Conservative Hedge)**: 100% CatBoost modeling localized particulate persistence.
- **Multi-Line Recharts Forecast Analytics**: Visualizes historical actuals against both forecast models across the 48-hour evaluation window, layered over official Central Pollution Control Board (CPCB) National Air Quality Index (NAQI) benchmark bands (Good to Severe).
- **Zero-Dependency Demo Mode**: Runs 100% out-of-the-box without requiring any external API keys or paid cloud accounts.

---

## 2. System Architecture

```
                                    MUMBAI AEROPULSE ARCHITECTURE
                                    
  +-----------------------------------------------------------------------------------------+
  |                                DATA ENGINEERING LAYER                                   |
  |  Raw Datasets: Stations.csv | Train.csv | submission_*.csv | openmeteo_mumbai_weather.csv   |
  |                                           |                                             |
  |                         scripts/prepare_dashboard_data.py                               |
  |                                           v                                             |
  |              Compact Preprocessed JSON Assets (<480 KB in dashboard/src/data/)           |
  |         [stations.json] [forecasts.json] [timeseries_historical.json] [weather_summary] |
  +-----------------------------------------------------------------------------------------+
                                              |
                                              v
  +-----------------------------------------------------------------------------------------+
  |                           REACT 18 + VITE 5 FRONTEND SPA                                |
  |                                                                                         |
  |  +----------------------+  +---------------------------+  +--------------------------+  |
  |  |   Header & Status    |  | Station Comparative Card  |  |  Meteorological Sparks   |  |
  |  | Mumbai Avg AQI & Nav |  | 4 Wards Matrix & 24h Delta|  | Temp, RH, Wind, Vent-Idx |  |
  |  +----------------------+  +---------------------------+  +--------------------------+  |
  |                                                                                         |
  |  +-----------------------------------------------------------------------------------+  |
  |  |                    DUAL-ENGINE SPATIAL GIS MAPPING CONTAINER                      |  |
  |  |  * Live Google Maps JS API (Dark theme, AdvancedMarkerElement, Dispersion halos)   |  |
  |  |  * Built-in SVG Cartographic Fallback (Salsette Island, Expressways, Pins)        |  |
  |  +-----------------------------------------------------------------------------------+  |
  |                                                                                         |
  |  +-----------------------------------------------------------------------------------+  |
  |  |                      RECHARTS 48-HOUR FORECAST ANALYTICS                          |  |
  |  | Actuals vs Sub 1 (Primary Blend) vs Sub 2 (Conservative Hedge) + CPCB NAQI Bands  |  |
  |  +-----------------------------------------------------------------------------------+  |
  |                                                                                         |
  |  +-----------------------------------------------------------------------------------+  |
  |  |                     DUAL-PERSPECTIVE GEMINI AI ADVISORY PANEL                     |  |
  |  |  * BMC Municipal Action Plan (Mist cannons, anti-smog guns, traffic diversions)    |  |
  |  |  * Citizen Health Advisory (Vulnerable groups, schools, outdoor jogging, N95)    |  |
  |  |  * Zero-Dependency Synthetic Engine Fallback (Context-aware ward heuristics)      |  |
  |  +-----------------------------------------------------------------------------------+  |
  +-----------------------------------------------------------------------------------------+
```

---

## 3. Quickstart Guide

### Prerequisites
- **Node.js**: `v18.0.0` or higher (Node 20+ recommended)
- **npm**: `v9.0.0` or higher
- **Python**: `3.10` or `3.11` (for offline data preprocessing or ML reproduction)

### Step 1: Navigate to the Dashboard
```bash
cd dashboard
```

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Run Local Development Server
```bash
npm run dev
```
Open your browser to `http://localhost:5173` to interact with the dashboard. By default, the application launches immediately in **Zero-Dependency Demo Mode** without needing any API keys.

### Production Build & Preview
To verify clean compilation and test the production distribution:
```bash
# Build TypeScript and bundle assets
npm run build

# Preview production build locally
npm run preview
```

---

## 4. Zero-Dependency Demo Mode vs Live Cloud Mode

Mumbai AeroPulse is designed with robust fallback mechanisms so that judges, evaluators, and civic engineers can run and test the complete system out-of-the-box:

| Feature | Zero-Dependency Demo Mode (Default, No Keys) | Live Cloud Services Mode (.env configured) |
| :--- | :--- | :--- |
| **Setup Required** | **None** (Works immediately with zero configuration) | Requires `.env` file with Google API keys |
| **Spatial GIS Engine** | Built-in interactive SVG cartography of Mumbai peninsula | Google Maps JavaScript API with dark-theme styling |
| **Station Markers** | Interactive SVG pins with CPCB color-coded badges | `AdvancedMarkerElement` pins with ambient pulsing rings |
| **Generative AI** | Context-sensitive Synthetic Simulation Engine | Live Google Gemini AI (`gemini-2.5-flash`) via REST API |
| **Civic Advisories** | Real-time ward-specific BMC plans & health guidance | Live LLM-generated BMC plans & health guidance |
| **Data Analytics** | Complete real historical data & 48h ML forecasts | Complete real historical data & 48h ML forecasts |

### Enabling Live Cloud Services (Optional)
To connect live Google Maps and Gemini AI services:
1. In `dashboard/`, copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Populate your keys:
   ```env
   # Google Maps Platform (Maps JavaScript API)
   # Get key: https://console.cloud.google.com/google/maps-apis
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

   # Google Gemini AI (Google AI Studio)
   # Get key: https://aistudio.google.com/app/apikey (Free tier available)
   VITE_GEMINI_API_KEY=your_gemini_api_key_here

   # Optional Model Selection (default: gemini-2.5-flash)
   VITE_GEMINI_MODEL=gemini-2.5-flash
   ```
3. Restart Vite (`npm run dev`).

---

## 5. Dashboard Interface & Component Breakdown

The web dashboard is organized into four core functional blocks:

1. **Citywide Header & Connectivity Chips**:
   - Displays real-time citywide average PM2.5, CPCB category chip, active monitoring station selector, and live service health indicators (Google Maps API & Gemini AI connectivity).
2. **Station Comparative Matrix**:
   - Four interactive cards representing Mumbai's monitoring network:
     - **Borivali East (11606)**: Ward R-Central (IITM)
     - **Byculla (3409510)**: Ward E (BMC)
     - **Malad West (11611)**: Ward P-North (IITM)
     - **Shivaji Nagar (3409511)**: Ward M-East (BMC)
   - Displays current PM2.5, 24-hour delta %, and forecasted 48-hour peak.
3. **Dual-Engine Spatial GIS & Meteorological Telemetry**:
   - Seamlessly toggles between Google Maps Platform and SVG Cartography.
   - Synchronized sparkline cards displaying surface temperature, relative humidity, wind speed, and ventilation index.
4. **Forecast Analytics & Dual-Perspective Advisory Panel**:
   - Recharts multi-line chart comparing historical observations against **Submission 1 (Primary Blend)** and **Submission 2 (Conservative Hedge)**.
   - Background bands demarcating CPCB NAQI categories: Good (0-30), Satisfactory (30-60), Moderate (60-90), Poor (90-120), Very Poor (120-250), and Severe (>250 µg/m³).
   - Dual-perspective AI card with toggle tabs for **BMC Municipal Action Plan** (equipment deployment counters, targeted interventions, operational directives) and **Citizen & Public Health Advisory** (risk badge, vulnerable groups, protective masking, window ventilation).

---

## 6. Offline ML Forecasting Engine

In addition to the interactive dashboard, this repository includes the complete offline data engineering and machine learning pipeline that produced the competition submission files:

### Quick Reproduction
```bash
# Install Python ML dependencies
pip install -r requirements.txt

# Execute end-to-end training and inference
python reproduce_submission.py
```

### Google Colab Notebook
Reviewers can execute `AQI_model.ipynb` directly in Google Colab for 1-click execution on Google's free CPU runtime in ~3 minutes.

### Submission Strategies Summary
| Strategy | Submission File | Modeling Hypothesis | 48-Hour Private Mean |
| :--- | :--- | :--- | :---: |
| **Primary Blend** | `submission_1_primary_blend.csv` | **Reversion**: Particulate cleanses rapidly post-Diwali | **$54.2\ \mu\text{g/m}^3$** |
| **Conservative Hedge** | `submission_2_conservative_hedge.csv` | **Persistence**: Particulate lingers around high-emission wards | **$64.1\ \mu\text{g/m}^3$** |

---

## 7. Repository & Code Structure

```
AQI/
├── Stations.csv                                # Official CAAQMS metadata
├── Train.csv                                   # 48,400 hourly historical PM2.5 observations
├── Test.csv                                    # Test evaluation coordinates & timestamps
├── SampleSubmission.csv                        # Official submission template
├── openmeteo_mumbai_weather.csv                # Hourly meteorological thermodynamics
├── submission_1_primary_blend.csv              # Final submission 1 (Reversion Blend)
├── submission_2_conservative_hedge.csv         # Final submission 2 (Conservative Hedge)
├── reproduce_submission.py                     # Deterministic offline ML reproduction script
├── requirements.txt                            # Python dependencies
├── audit_compliance_report.md                 # Forensic data science verification report
├── creative_submission_package.md              # 10-Field Google Form submission text
├── README.md                                   # Publication-grade documentation
├── .env.example                                # Root environment configuration template
├── scripts/
│   ├── prepare_dashboard_data.py               # Preprocesses CSVs into compact JSON assets
│   ├── verify_data_assets.py                   # Data integrity test suite
│   └── verify_submission_package.py            # Packaging & configuration test suite
└── dashboard/                                  # React 18 + Vite 5 Web Application
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── .env.example                            # Dashboard environment configuration template
    ├── smoke-test.mjs                          # Automated smoke check runner
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── types/                              # TypeScript interfaces for AQI & advisories
        ├── data/                               # Compact preprocessed JSON assets (<480 KB)
        ├── services/
        │   ├── geminiService.ts                # Gemini API REST client
        │   └── syntheticAdvisoryEngine.ts      # Zero-dependency synthetic mock engine
        └── components/
            ├── Header.tsx                      # App navigation & status chips
            ├── gis/                            # Google Maps & SVG cartography components
            ├── analytics/                      # Recharts forecast charts & sparklines
            ├── stations/                       # Station comparative matrix & cards
            └── ai/                             # Gemini dual-perspective advisory UI
```

---

## 8. Automated Verification & Smoke Checks

Ensure full system integrity across both data engineering, packaging, and frontend build:

### 1. Verify Submission Package & Configuration
```bash
python scripts/verify_submission_package.py
```
Validates `.env.example`, `creative_submission_package.md`, and `README.md` for complete coverage of all required competition fields, station references, and elevator pitch word count.

### 2. Verify Preprocessed Data Assets
```bash
python scripts/verify_data_assets.py
```
Validates that all compact JSON assets exist, conform to expected schemas, have zero NaNs, and remain under size budgets.

### 3. Verify Production Frontend Build
```bash
cd dashboard
npm run build
```
Executes TypeScript type checking (`tsc -b`) and Vite production bundle generation, ensuring zero build errors.

### 4. Execute Automated Smoke Test
```bash
cd dashboard
node smoke-test.mjs
```
Launches a preview server, performs an HTTP smoke test, and confirms clean DOM mounting.

---

## 9. Creative Track Competition Package

The complete creative track submission targeting the **$500 USD "Most Creative Submission Track"** award (Deadline: **13 November 2026 at 18:29 GMT / 23:59:59 IST**) is organized in `creative_submission_package.md`. It covers all 10 fields of the official Google Form ([https://forms.gle/uLpzqYfJm9AjTvjT9](https://forms.gle/uLpzqYfJm9AjTvjT9)):

- **Field 1**: Project Title
- **Field 2**: Track & Eligibility Confirmation
- **Field 3**: Executive Summary & Elevator Pitch (173 words, within 150–250 limit)
- **Field 4**: Problem Statement & Mumbai Coastal Airshed Dynamics
- **Field 5**: Technical Innovation & Methodology
- **Field 6**: Google Ecosystem Integration (Google Maps, Gemini AI, Google Colab / Cloud)
- **Field 7**: Dual-Perspective Civic Decision Support (BMC vs Citizen Guidance)
- **Field 8**: User Experience & Dashboard Architecture
- **Field 9**: Real-World Impact, Scalability & Policy Roadmap
- **Field 10**: Deliverables & Verification Links

---

## 10. Licensing & Data Attribution

- **Meteorological Data**: Weather data provided by **[Open-Meteo.com](https://open-meteo.com/)** under the **Creative Commons Attribution 4.0 International (CC-BY 4.0)** license.
- **Air Quality Data**: Continuous Ambient Air Quality Monitoring Station (CAAQMS) observations provided by the **Central Pollution Control Board (CPCB)**, **Maharashtra Pollution Control Board (MPCB)**, and the **Indian Institute of Tropical Meteorology (IITM)**.
- **Software License**: Authored code, dashboard components, and documentation are licensed under the **[MIT License](LICENSE)**.
