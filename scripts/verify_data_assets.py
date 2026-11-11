#!/usr/bin/env python3
"""
scripts/verify_data_assets.py

Mumbai AeroPulse — Air Quality Mapping & Forecasting Intelligence
Milestone 1: Automated Verification Test Suite

Programmatically verifies:
  1. Existence and non-empty content of all 4 JSON artifacts in dashboard/src/data/
  2. JSON syntax and formatting validity
  3. Absolute absence of NaN, Infinity, or null values (both raw text and parsed structures)
  4. Station metadata: exactly 4 stations, coordinates, agencies, cutoff readings, CPCB colors
  5. Forecasts: exactly 2,592 records, 1,284 ground truth matches, 1,308 forecasts, 192 private block rows
  6. Historical timeseries: 615 daily records (no extreme >500 spikes), 730 recent hourly records
  7. Weather summary: 1,056 hourly rows, 24h diurnal profile, 4-station correlation coefficients

Exits with code 0 on 100% pass, code 1 on any assertion failure.
"""

import json
import math
import os
import re
import sys

def check_no_null_or_nan(obj, path="root"):
    """Recursively walks an object ensuring zero None / null and zero NaN / Inf floats."""
    if obj is None:
        raise AssertionError(f"Null / None value encountered at {path}")
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            raise AssertionError(f"Invalid float (NaN / Inf) encountered at {path}: {obj}")
    elif isinstance(obj, dict):
        for k, v in obj.items():
            check_no_null_or_nan(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            check_no_null_or_nan(item, f"{path}[{i}]")

def main():
    print("=" * 70)
    print("Mumbai AeroPulse — Milestone 1: Automated Data Assets Verification")
    print("=" * 70)

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    data_dir = os.path.join(base_dir, 'dashboard', 'src', 'data')
    print(f"Data directory under test: {data_dir}\n")

    expected_files = [
        'stations.json',
        'forecasts.json',
        'timeseries_historical.json',
        'weather_summary.json'
    ]

    total_tests = 0
    passed_tests = 0

    def test_case(name, condition, error_msg):
        nonlocal total_tests, passed_tests
        total_tests += 1
        if condition:
            passed_tests += 1
            print(f"  [PASS] {name}")
        else:
            print(f"  [FAIL] {name}: {error_msg}")
            raise AssertionError(f"Test failed: {name} — {error_msg}")

    # =========================================================================
    # TEST SUITE 1: File Existence, Non-Empty Content & Null/NaN Scan
    # =========================================================================
    print("--- 1. File Existence & Text Integrity ---")
    data_cache = {}

    for fname in expected_files:
        fpath = os.path.join(data_dir, fname)
        test_case(f"File exists: {fname}", os.path.exists(fpath), f"File not found at {fpath}")
        
        fsize = os.path.getsize(fpath)
        test_case(f"File non-empty (>1 KB): {fname} ({fsize:,} bytes)", fsize > 1024, f"File size too small: {fsize} bytes")

        with open(fpath, 'r', encoding='utf-8') as f:
            raw_text = f.read()

        # Raw string token scans
        test_case(f"No literal 'null' in {fname}", not re.search(r'\bnull\b', raw_text), "Literal 'null' found in JSON text")
        test_case(f"No literal 'NaN' in {fname}", not re.search(r'\bNaN\b', raw_text), "Literal 'NaN' found in JSON text")
        test_case(f"No literal 'undefined' in {fname}", not re.search(r'\bundefined\b', raw_text), "Literal 'undefined' found in JSON text")

        try:
            parsed = json.loads(raw_text)
            data_cache[fname] = parsed
            test_case(f"JSON syntax valid: {fname}", True, "")
        except Exception as e:
            test_case(f"JSON syntax valid: {fname}", False, f"JSON decode error: {e}")

        # Deep recursive data structure scan
        try:
            check_no_null_or_nan(data_cache[fname], fname)
            test_case(f"Zero null/NaN across all object fields: {fname}", True, "")
        except AssertionError as e:
            test_case(f"Zero null/NaN across all object fields: {fname}", False, str(e))

    # =========================================================================
    # TEST SUITE 2: stations.json Verification
    # =========================================================================
    print("\n--- 2. stations.json Schema & Data Integrity ---")
    stations = data_cache['stations.json']
    test_case("stations.json is list", isinstance(stations, list), "stations.json must be a list")
    test_case("Exactly 4 monitoring stations", len(stations) == 4, f"Expected 4 stations, got {len(stations)}")

    station_ids = [s['stationId'] for s in stations]
    expected_ids = ['11606', '11611', '3409510', '3409511']
    test_case("Correct station IDs in order", station_ids == expected_ids, f"Expected {expected_ids}, got {station_ids}")

    expected_coords = {
        '11606': (19.23241, 72.86895, 'IITM', 'R-Central', 50.42, 'Satisfactory', '#84CC16'),
        '11611': (19.19709, 72.82204, 'IITM', 'P-North', 189.93, 'Very Poor', '#EF4444'),
        '3409510': (18.9767, 72.838, 'BMC', 'E', 43.80, 'Satisfactory', '#84CC16'),
        '3409511': (19.060498, 72.923356, 'BMC', 'M-East', 77.04, 'Moderate', '#EAB308')
    }

    for s in stations:
        loc = s['stationId']
        exp = expected_coords[loc]
        test_case(f"Coordinates valid for Station {loc}", abs(s['lat'] - exp[0]) < 1e-4 and abs(s['lon'] - exp[1]) < 1e-4, f"Coords {s['lat']},{s['lon']} != {exp[0]},{exp[1]}")
        test_case(f"Agency valid for Station {loc}", s['agency'] == exp[2], f"Agency {s['agency']} != {exp[2]}")
        test_case(f"Municipal Ward valid for Station {loc}", s['ward'] == exp[3], f"Ward {s['ward']} != {exp[3]}")
        test_case(f"Cutoff latest PM2.5 valid for Station {loc}", s['latest']['pm25'] == exp[4], f"PM2.5 {s['latest']['pm25']} != {exp[4]}")
        test_case(f"Cutoff AQI category valid for Station {loc}", s['latest']['aqiCategory'] == exp[5], f"AQI {s['latest']['aqiCategory']} != {exp[5]}")
        test_case(f"CPCB Color token valid for Station {loc}", s['latest']['aqiColor'] == exp[6], f"Color {s['latest']['aqiColor']} != {exp[6]}")
        test_case(f"Overall stats present for Station {loc}", s['stats']['totalReadings'] > 10000 and s['stats']['cleanMean'] > 0, "Missing or invalid station stats")
        test_case(f"Private forecast spread present for Station {loc}", s['forecast']['spread'] > 0, "Missing forecast spread")

    # =========================================================================
    # TEST SUITE 3: forecasts.json Verification
    # =========================================================================
    print("\n--- 3. forecasts.json Schema & Prediction Counts ---")
    forecasts = data_cache['forecasts.json']
    summary = forecasts['summary']
    by_station = forecasts['byStation']
    timeline = forecasts['timeline']

    test_case("Total rows in summary == 2,592", summary['totalRows'] == 2592, f"Expected 2592, got {summary['totalRows']}")
    test_case("Matched historical in summary == 1,284", summary['matchedHistorical'] == 1284, f"Expected 1284, got {summary['matchedHistorical']}")
    test_case("Future forecasts in summary == 1,308", summary['forecastRows'] == 1308, f"Expected 1308, got {summary['forecastRows']}")
    test_case("Private window rows in summary == 192", summary['privateWindowRows'] == 192, f"Expected 192, got {summary['privateWindowRows']}")
    test_case("summary startDate < endDate", summary['startDate'] < summary['endDate'], f"Expected startDate < endDate, got {summary['startDate']} >= {summary['endDate']}")
    test_case("summary startDate == '2026-10-22T01:00:00+05:30'", summary['startDate'] == '2026-10-22T01:00:00+05:30', f"Unexpected summary startDate {summary['startDate']}")
    test_case("summary endDate == '2026-11-21T00:00:00+05:30'", summary['endDate'] == '2026-11-21T00:00:00+05:30', f"Unexpected summary endDate {summary['endDate']}")

    test_case("byStation contains all 4 stations", set(by_station.keys()) == set(expected_ids), f"Missing station keys in byStation: {set(by_station.keys())}")

    total_records = 0
    total_matched = 0
    total_forecast = 0
    total_private = 0

    for loc in expected_ids:
        st_rows = by_station[loc]
        test_case(f"Station {loc} has exactly 648 forecast rows", len(st_rows) == 648, f"Expected 648, got {len(st_rows)}")
        total_records += len(st_rows)
        
        # Chronological monotonicity check: each station's records must be strictly increasing
        st_timestamps = [r['timestamp'] for r in st_rows]
        is_strictly_monotonic = all(st_timestamps[i] < st_timestamps[i+1] for i in range(len(st_timestamps) - 1))
        test_case(f"Station {loc} timestamps are strictly increasing (monotonic)", is_strictly_monotonic, f"Station {loc} timestamps are not strictly increasing")
        test_case(f"Station {loc} start timestamp == '2026-10-22T01:00:00+05:30'", st_timestamps[0] == '2026-10-22T01:00:00+05:30', f"Unexpected start timestamp for {loc}: {st_timestamps[0]}")
        test_case(f"Station {loc} end timestamp == '2026-11-21T00:00:00+05:30'", st_timestamps[-1] == '2026-11-21T00:00:00+05:30', f"Unexpected end timestamp for {loc}: {st_timestamps[-1]}")

        for r in st_rows:
            if not r['isForecast']:
                total_matched += 1
                test_case(f"Row {r['id']} has groundTruth float", isinstance(r.get('groundTruth'), (int, float)), f"Missing groundTruth on historical row {r['id']}")
            else:
                total_forecast += 1
                test_case(f"Row {r['id']} omits groundTruth", 'groundTruth' not in r, f"Forecast row {r['id']} has unexpected groundTruth")
            if r['scoringBlock'] == 'private':
                total_private += 1
            test_case(f"Row {r['id']} has positive sub1 & sub2", r['sub1'] > 0 and r['sub2'] > 0, f"Non-positive predictions in {r['id']}")

    test_case("Total records across stations == 2,592", total_records == 2592, f"Expected 2592, got {total_records}")
    test_case("Total matched ground truth across stations == 1,284", total_matched == 1284, f"Expected 1284, got {total_matched}")
    test_case("Total future forecasts across stations == 1,308", total_forecast == 1308, f"Expected 1308, got {total_forecast}")
    test_case("Total private evaluation rows across stations == 192", total_private == 192, f"Expected 192, got {total_private}")

    test_case("Timeline contains exactly 648 chronological time steps", len(timeline) == 648, f"Expected 648, got {len(timeline)}")
    timeline_timestamps = [t['timestamp'] for t in timeline]
    timeline_monotonic = all(timeline_timestamps[i] < timeline_timestamps[i+1] for i in range(len(timeline_timestamps) - 1))
    test_case("Timeline timestamps are strictly increasing (monotonic)", timeline_monotonic, "Timeline timestamps are not strictly increasing")
    test_case("Timeline first timestamp matches 2026-10-22T01:00:00+05:30", timeline[0]['timestamp'] == '2026-10-22T01:00:00+05:30', f"Unexpected start timestamp {timeline[0]['timestamp']}")
    test_case("Timeline last timestamp matches 2026-11-21T00:00:00+05:30", timeline[-1]['timestamp'] == '2026-11-21T00:00:00+05:30', f"Unexpected end timestamp {timeline[-1]['timestamp']}")

    # =========================================================================
    # TEST SUITE 4: timeseries_historical.json Verification
    # =========================================================================
    print("\n--- 4. timeseries_historical.json Verification ---")
    ts_hist = data_cache['timeseries_historical.json']
    daily = ts_hist['dailyHistory']
    recent = ts_hist['recentHourly']

    test_case("dailyHistory has >= 600 days", len(daily) >= 600, f"Expected >= 600 days, got {len(daily)}")
    test_case("dailyHistory starts on 2025-02-19", daily[0]['date'] == '2025-02-19', f"Expected 2025-02-19, got {daily[0]['date']}")
    test_case("dailyHistory ends on 2026-11-10", daily[-1]['date'] == '2026-11-10', f"Expected 2026-11-10, got {daily[-1]['date']}")

    for day in daily:
        test_case(f"Date {day['date']} has cityMean", day['cityMean'] > 0 and day['cityMean'] <= 500, f"CityMean {day['cityMean']} out of range on {day['date']}")
        for loc in expected_ids:
            st_d = day['stations'][loc]
            test_case(f"Station {loc} has valid daily stats on {day['date']}", st_d['mean'] <= 500 and st_d['min'] <= st_d['max'], f"Invalid station {loc} stats on {day['date']}")

    test_case("recentHourly has 730 consecutive hours (Oct 11 – Nov 10 09:00)", len(recent) == 730, f"Expected 730 hours, got {len(recent)}")
    test_case("recentHourly starts on 2026-10-11T00:00", recent[0]['timestamp'].startswith('2026-10-11T00:00'), f"Unexpected start {recent[0]['timestamp']}")
    test_case("recentHourly ends on 2026-11-10T09:00", recent[-1]['timestamp'].startswith('2026-11-10T09:00'), f"Unexpected end {recent[-1]['timestamp']}")

    for h in recent:
        for loc in expected_ids:
            val = h['stations'][loc]
            test_case(f"Hourly reading valid for Station {loc} at {h['timestamp']}", 0 <= val <= 500, f"Out of range reading: {val}")

    # =========================================================================
    # TEST SUITE 5: weather_summary.json Verification
    # =========================================================================
    print("\n--- 5. weather_summary.json Verification ---")
    weather = data_cache['weather_summary.json']
    w_hourly = weather['hourly']
    w_diurnal = weather['diurnalProfile']
    w_corr = weather['correlations']

    test_case("weather hourly has exactly 1,056 rows", len(w_hourly) == 1056, f"Expected 1056, got {len(w_hourly)}")
    test_case("weather hourly starts on 2026-10-11T00:00", w_hourly[0]['timestamp'] == '2026-10-11T00:00', f"Unexpected start {w_hourly[0]['timestamp']}")
    test_case("weather hourly ends on 2026-11-23T23:00", w_hourly[-1]['timestamp'] == '2026-11-23T23:00', f"Unexpected end {w_hourly[-1]['timestamp']}")

    for pt in w_hourly[:50]:
        test_case(f"Physical ranges for weather at {pt['timestamp']}", 15.0 <= pt['temp'] <= 45.0 and 0.0 <= pt['rh'] <= 100.0 and pt['windSpeed'] >= 0, f"Unphysical weather: {pt}")

    test_case("diurnalProfile has exactly 24 hours (0-23)", len(w_diurnal) == 24 and [d['hour'] for d in w_diurnal] == list(range(24)), f"Diurnal hours invalid: {[d['hour'] for d in w_diurnal]}")

    test_case("correlations contains all 4 stations", set(w_corr.keys()) == set(expected_ids), f"Missing correlation keys: {set(w_corr.keys())}")

    # Physical correlation check: Shivaji Nagar and Malad West should have strong negative correlation with ventilation
    test_case("Shivaji Nagar PM2.5 negatively correlated with ventilation", w_corr['3409511']['ventilation'] < -0.15, f"Expected < -0.15, got {w_corr['3409511']['ventilation']}")
    test_case("Malad West PM2.5 negatively correlated with ventilation", w_corr['11611']['ventilation'] < -0.15, f"Expected < -0.15, got {w_corr['11611']['ventilation']}")

    print("\n" + "=" * 70)
    print(f"VERIFICATION COMPLETE: {passed_tests}/{total_tests} test cases passed (100% SUCCESS)!")
    print("=" * 70)

if __name__ == '__main__':
    try:
        main()
        sys.exit(0)
    except AssertionError as e:
        print(f"\nFATAL: Verification failed with assertion: {e}")
        sys.exit(1)
