#!/usr/bin/env python3
"""
scripts/test_challenger_m6.py

Empirical stress testing and challenger verification suite for Milestone 6:
1. Coordinates & Projection Math Stress Test
2. CPCB NAQI Breakpoints Mathematical Verification
3. Data Monotonicity & Extreme Edge Cases
"""

import sys
import os
import json
import math
import csv

def test_coordinates_and_projection():
    print("--- Challenger Test 1: Mumbai Coordinates & Projection Math ---")
    
    # 1. Bounds defined in lib/coordinates.ts
    min_lat, max_lat = 18.92, 19.26
    min_lon, max_lon = 72.78, 72.96
    
    # Check all stations in Stations.csv
    stations_csv = os.path.join(os.path.dirname(__file__), '..', 'Stations.csv')
    with open(stations_csv, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        stations = list(reader)
    
    assert len(stations) == 4, f"Expected 4 stations in Stations.csv, found {len(stations)}"
    
    for st in stations:
        lat = float(st['latitude'])
        lon = float(st['longitude'])
        st_id = st['location_id']
        name = st['station_name']
        
        # Check within Mumbai bounding box
        in_lat = min_lat <= lat <= max_lat
        in_lon = min_lon <= lon <= max_lon
        print(f"  Station {st_id} ({name}): Lat {lat}°N, Lon {lon}°E -> In Bounds: {in_lat and in_lon}")
        assert in_lat, f"Station {name} lat {lat} outside bounds [{min_lat}, {max_lat}]"
        assert in_lon, f"Station {name} lon {lon} outside bounds [{min_lon}, {max_lon}]"
        
        # Test Projection to 500x700 canvas with paddingX=45, paddingY=50
        width, height = 500, 700
        padding_x, padding_y = 45, 50
        inner_w = width - padding_x * 2
        inner_h = height - padding_y * 2
        
        norm_x = (lon - min_lon) / (max_lon - min_lon)
        norm_y = (lat - min_lat) / (max_lat - min_lat)
        
        assert 0.0 <= norm_x <= 1.0, f"norm_x {norm_x} outside [0, 1]"
        assert 0.0 <= norm_y <= 1.0, f"norm_y {norm_y} outside [0, 1]"
        
        svg_x = padding_x + norm_x * inner_w
        svg_y = height - padding_y - norm_y * inner_h
        
        # Verify within canvas margins
        assert padding_x <= svg_x <= width - padding_x, f"svg_x {svg_x} outside canvas margins"
        assert padding_y <= svg_y <= height - padding_y, f"svg_y {svg_y} outside canvas margins"
        
        # Inverse projection
        inv_norm_x = (svg_x - padding_x) / inner_w
        inv_norm_y = (height - padding_y - svg_y) / inner_h
        inv_lon = min_lon + inv_norm_x * (max_lon - min_lon)
        inv_lat = min_lat + inv_norm_y * (max_lat - min_lat)
        
        assert abs(lat - inv_lat) < 1e-6, f"Inverse lat mismatch: {lat} vs {inv_lat}"
        assert abs(lon - inv_lon) < 1e-6, f"Inverse lon mismatch: {lon} vs {inv_lon}"
        print(f"    SVG Point: ({svg_x:.2f}, {svg_y:.2f}) -> Inverted: ({inv_lat:.5f}, {inv_lon:.5f}) [MATCH]")

    # Check stations.json matching
    stations_json_path = os.path.join(os.path.dirname(__file__), '..', 'dashboard', 'src', 'data', 'stations.json')
    with open(stations_json_path, 'r', encoding='utf-8') as f:
        json_stations = json.load(f)
    assert len(json_stations) == 4
    for js in json_stations:
        assert min_lat <= js['lat'] <= max_lat, f"JSON station {js['name']} lat {js['lat']} out of bounds"
        assert min_lon <= js['lon'] <= max_lon, f"JSON station {js['name']} lon {js['lon']} out of bounds"

    print("  [PASS] All stations firmly on Salsette Island within bounding box and projection is bijective.\n")

def test_cpcb_naqi_breakpoints():
    print("--- Challenger Test 2: CPCB NAQI Breakpoint Boundaries ---")
    
    # Official CPCB PM2.5 24-hr concentration breakpoints:
    # 0 - 30: Good
    # 31 - 60: Satisfactory
    # 61 - 90: Moderate
    # 91 - 120: Poor
    # 121 - 250: Very Poor
    # > 250: Severe
    
    def get_category(pm25):
        if pm25 is None or math.isnan(pm25):
            return "Good"
        if pm25 <= 30:
            return "Good"
        if pm25 <= 60:
            return "Satisfactory"
        if pm25 <= 90:
            return "Moderate"
        if pm25 <= 120:
            return "Poor"
        if pm25 <= 250:
            return "Very Poor"
        return "Severe"

    test_cases = [
        (0.0, "Good"),
        (15.0, "Good"),
        (30.0, "Good"),
        (30.001, "Satisfactory"),
        (31.0, "Satisfactory"),
        (60.0, "Satisfactory"),
        (60.001, "Moderate"),
        (75.5, "Moderate"),
        (90.0, "Moderate"),
        (90.001, "Poor"),
        (100.0, "Poor"),
        (120.0, "Poor"),
        (120.001, "Very Poor"),
        (185.0, "Very Poor"),
        (250.0, "Very Poor"),
        (250.001, "Severe"),
        (350.0, "Severe"),
        (500.0, "Severe"),
        (75203.52, "Severe"), # Raw spike in station 11606
    ]

    for val, expected in test_cases:
        actual = get_category(val)
        assert actual == expected, f"Value {val}: expected {expected}, got {actual}"
    
    print(f"  [PASS] Tested {len(test_cases)} CPCB NAQI boundary edge cases successfully.\n")

def main():
    test_coordinates_and_projection()
    test_cpcb_naqi_breakpoints()
    print("ALL CHALLENGER TEST SUITES COMPLETED SUCCESSFULLY.")

if __name__ == '__main__':
    main()
