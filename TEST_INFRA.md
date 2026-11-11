# E2E Test Infra: Mumbai AeroPulse Air Quality Intelligence Platform

## Test Philosophy
- **Requirement-Driven & Opaque-Box**: Tests are derived directly from user requirements (`ORIGINAL_REQUEST.md`), CPCB NAQI standards, and competition rules, without assuming internal implementation details.
- **Progressive Testability**: Verification mechanisms test each tier independently:
  - Tier 1: Core Feature Verification (Data assets integrity, Vite build, station rendering, GIS component mounting, Gemini fallback generation).
  - Tier 2: Boundary & Edge Cases (Missing API keys, extreme PM2.5 values, station toggling, zero/null values in data, network errors).
  - Tier 3: Cross-Feature Combinations (Active station toggle synchronized between map, analytics curves, and Gemini advisory cards).
  - Tier 4: Real-World Operational Scenarios (BMC Ward Officer morning inspection, citizen runner morning check, high-pollution inversion crisis response).

## Feature Inventory & Test Coverage Mapping
| # | Feature | Requirement Source | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|-------------------|:------:|:------:|:------:|:------:|
| 1 | Stations Metadata & JSON Integrity | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 2 | Historical PM2.5 Observations & Forecasts | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ | ✓ |
| 3 | React + Vite Dashboard Build & Smoke Test | ORIGINAL_REQUEST Acceptance Criteria | 5 | 5 | ✓ | ✓ |
| 4 | Interactive Google Maps Platform / Fallback | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 5 | Gemini AI Advisory Engine / Fallback | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| 6 | Creative Track Submission Package & .env | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ | ✓ |

## Test Architecture
- **Test Infrastructure**:
  - `scripts/verify_data_assets.py`: Validates existence, schemas, row counts, and value bounds of generated JSON artifacts.
  - `dashboard/smoke-test.mjs`: Programmatic Node.js smoke test testing `vite build`, preview server startup, HTTP 200 response, and DOM mount.
  - `scripts/verify_submission_package.py`: Validates `creative_submission_package.md` and `.env.example` completeness.
- **Pass/Fail Semantics**: All test commands must exit with return code `0`.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Expected Outcome |
|---|----------|--------------------|------------------|
| 1 | Ward M-East (Shivaji Nagar) Inversion Crisis | Map + Analytics + Gemini Advisory | Highest PM2.5 detected, Red alert badge, mist cannon deployment advisory for Deonar |
| 2 | Ward E (Byculla) Clean Marine Ventilation | Map + Analytics + Weather Sparklines | Satisfactory category, afternoon sea breeze dispersal verified, port truck idling advisory |
| 3 | Zero-API Key Full Demo Mode | Google Maps Fallback + Gemini Synthetic Engine | Interactive SVG map displays 4 pins, synthetic advisory generates complete BMC plan |
| 4 | Multi-Station Diurnal Comparison | Station Comparative Matrix + Recharts Multi-line | All 4 stations display distinct diurnal curves and divergent forecast hedge bands |
| 5 | Competition Package Completeness | Creative Track Package + .env.example | All 10 competition form fields populated with novel value propositions for BMC & Google |

## Coverage Thresholds
- Tier 1: ≥5 per feature area (Total ≥ 30 tests)
- Tier 2: ≥5 boundary/error cases per feature (Total ≥ 30 tests)
- Tier 3: Pairwise interactions across Map, Analytics, and AI panels
- Tier 4: ≥5 realistic operational end-to-end scenarios
