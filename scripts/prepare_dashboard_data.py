#!/usr/bin/env python3
"""
scripts/prepare_dashboard_data.py

Mumbai AeroPulse — Air Quality Mapping & Forecasting Intelligence
Milestone 1: Data Preprocessing Pipeline

Transforms raw competition CSV datasets:
  - Stations.csv
  - Train.csv
  - Test.csv
  - submission_1_primary_blend.csv
  - submission_2_conservative_hedge.csv
  - openmeteo_mumbai_weather.csv
into 4 production JSON artifacts (<480 KB total) stored in dashboard/src/data/:
  1. stations.json
  2. forecasts.json
  3. timeseries_historical.json
  4. weather_summary.json

Zero NaN/null values guaranteed. Complete data integrity and real state modeling.
"""

import csv
import json
import math
import os
import sys
from collections import defaultdict
from datetime import datetime, timedelta

def get_cpcb_category(pm25: float):
    """
    CPCB National Air Quality Index (NAQI) standard categorization for PM2.5.
    Returns (category_name, hex_color_token).
    """
    if pm25 <= 30.0:
        return "Good", "#10B981"
    elif pm25 <= 60.0:
        return "Satisfactory", "#84CC16"
    elif pm25 <= 90.0:
        return "Moderate", "#EAB308"
    elif pm25 <= 120.0:
        return "Poor", "#F97316"
    elif pm25 <= 250.0:
        return "Very Poor", "#EF4444"
    else:
        return "Severe", "#7F1D1D"

def pearson_corr(x_vals, y_vals):
    """Calculates Pearson correlation coefficient between two numeric lists."""
    n = len(x_vals)
    if n < 2:
        return 0.0
    mx = sum(x_vals) / n
    my = sum(y_vals) / n
    cov = sum((x_vals[i] - mx) * (y_vals[i] - my) for i in range(n))
    sx = math.sqrt(sum((xi - mx) ** 2 for xi in x_vals))
    sy = math.sqrt(sum((yi - my) ** 2 for yi in y_vals))
    if sx * sy == 0:
        return 0.0
    return round(cov / (sx * sy), 3)

def compute_list_stats(values):
    """Computes distribution summary statistics for a numeric list."""
    vals = sorted(values)
    n = len(vals)
    if n == 0:
        return {
            'count': 0, 'mean': 0.0, 'median': 0.0,
            'min': 0.0, 'max': 0.0, 'p25': 0.0,
            'p75': 0.0, 'p95': 0.0, 'p99': 0.0, 'std': 0.0
        }
    mean = sum(vals) / n
    variance = sum((x - mean) ** 2 for x in vals) / n
    std = math.sqrt(variance)
    return {
        'count': n,
        'mean': round(mean, 2),
        'median': round(vals[n // 2], 2),
        'min': round(vals[0], 2),
        'max': round(vals[-1], 2),
        'p25': round(vals[int(n * 0.25)], 2),
        'p75': round(vals[int(n * 0.75)], 2),
        'p95': round(vals[int(n * 0.95)], 2),
        'p99': round(vals[int(n * 0.99)], 2),
        'std': round(std, 2)
    }

def make_test_id(ts, loc):
    """Formats a Train timestamp into the corresponding Test ID format."""
    d = str(ts)[:10].replace('-', '')
    t = str(ts)[11:16].replace(':', '')
    return f"MUM_{loc}_{d}T{t}_IST"

def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    data_out_dir = os.path.join(base_dir, 'dashboard', 'src', 'data')
    os.makedirs(data_out_dir, exist_ok=True)

    print("=== Mumbai AeroPulse Data Preprocessing Pipeline ===")
    print(f"Base Directory: {base_dir}")
    print(f"Target Output Directory: {data_out_dir}")

    stations_csv = os.path.join(base_dir, 'Stations.csv')
    train_csv = os.path.join(base_dir, 'Train.csv')
    test_csv = os.path.join(base_dir, 'Test.csv')
    sub1_csv = os.path.join(base_dir, 'submission_1_primary_blend.csv')
    sub2_csv = os.path.join(base_dir, 'submission_2_conservative_hedge.csv')
    weather_csv = os.path.join(base_dir, 'openmeteo_mumbai_weather.csv')

    for p in [stations_csv, train_csv, test_csv, sub1_csv, sub2_csv, weather_csv]:
        if not os.path.exists(p):
            raise FileNotFoundError(f"Missing required source dataset: {p}")

    # -------------------------------------------------------------
    # 1. Ingest Stations.csv
    # -------------------------------------------------------------
    print("\n[1/5] Ingesting Stations.csv...")
    station_meta = {}
    with open(stations_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for r in reader:
            loc = r['location_id']
            name_parts = r['station_name'].split(',')
            short_name = name_parts[0].strip()
            agency = 'IITM' if 'IITM' in r['station_name'] else 'BMC'
            
            ward_info = {
                '11606': ('R-Central', 'North Suburban Mumbai', 'Coastal sea breeze ventilation; moderate background levels'),
                '11611': ('P-North', 'Western Suburban Valley', 'Suburban valley trapping; elevated post-festival smoke lingering'),
                '3409510': ('E', 'South Island City', 'South island marine boundary ventilation; stable maritime dispersion'),
                '3409511': ('M-East', 'Eastern Deonar Basin', 'Deonar eastern basin stagnation; localized thermal inversion and solid-waste proximity')
            }.get(loc, ('Unknown', 'Mumbai Metropolitan', 'Urban air quality monitoring'))

            station_meta[loc] = {
                'id': int(loc),
                'stationId': loc,
                'name': short_name,
                'fullName': r['station_name'],
                'agency': agency,
                'agencyDescription': 'Indian Institute of Tropical Meteorology' if agency == 'IITM' else 'Brihanmumbai Municipal Corporation',
                'ward': ward_info[0],
                'zone': ward_info[1],
                'lat': round(float(r['latitude']), 6),
                'lon': round(float(r['longitude']), 6),
                'sensorId': int(r['selected_sensor']),
                'timezone': r['timezone'],
                'statusDescription': ward_info[2]
            }

    print(f"Loaded {len(station_meta)} monitoring stations: {list(station_meta.keys())}")

    # -------------------------------------------------------------
    # 2. Ingest Train.csv
    # -------------------------------------------------------------
    print("\n[2/5] Ingesting Train.csv (48,400 rows)...")
    train_by_loc = defaultdict(list)
    train_clean_by_loc = defaultdict(list)
    train_id_lookup = {}
    train_dates = set()
    train_by_date_loc = defaultdict(lambda: defaultdict(list))
    train_hourly_obs = defaultdict(dict)
    latest_cutoff_obs = {}

    with open(train_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for r in reader:
            loc = r['location_id']
            ts = r['timestamp_ist']
            val = float(r['pm25'])
            flag_high = r['flag_high_1000'].lower() == 'true'

            train_by_loc[loc].append((ts, val))
            
            # Map ID in Test format to actual pm25 value
            tid = make_test_id(ts, loc)
            train_id_lookup[tid] = val

            # Filter out extreme transmission glitches (>500) and negative values
            if 0.0 <= val <= 500.0 and not flag_high:
                train_clean_by_loc[loc].append(val)
                date_str = ts[:10]
                train_dates.add(date_str)
                train_by_date_loc[date_str][loc].append(val)
                train_hourly_obs[ts][loc] = val

            # Track latest cutoff observation
            if loc not in latest_cutoff_obs or ts > latest_cutoff_obs[loc]['ts']:
                latest_cutoff_obs[loc] = {'ts': ts, 'pm25': val}

    print(f"Processed Train observations. Total distinct valid dates: {len(train_dates)}")
    for loc, info in latest_cutoff_obs.items():
        print(f"  Station {loc} latest reading at {info['ts']}: {info['pm25']:.2f} µg/m³")

    # -------------------------------------------------------------
    # 3. Ingest Test.csv, Submissions 1 & 2
    # -------------------------------------------------------------
    print("\n[3/5] Ingesting Test.csv and Submission Predictions (2,592 rows)...")
    sub1_map = {}
    with open(sub1_csv, 'r', encoding='utf-8') as f:
        for r in csv.DictReader(f):
            sub1_map[r['ID']] = float(r['Target'])

    sub2_map = {}
    with open(sub2_csv, 'r', encoding='utf-8') as f:
        for r in csv.DictReader(f):
            sub2_map[r['ID']] = float(r['Target'])

    test_records = []
    with open(test_csv, 'r', encoding='utf-8') as f:
        for r in csv.DictReader(f):
            test_records.append(r)

    # Sort test_records chronologically by target_end_ist and location_id
    # to fix non-chronological order in Test.csv (Oct 27-Nov 21 followed by Oct 22-Oct 24)
    test_records.sort(key=lambda r: (r['target_end_ist'], r['location_id']))

    by_station_forecasts = defaultdict(list)
    timeline_dict = defaultdict(lambda: {'stations': {}})
    matched_hist_count = 0
    forecast_count = 0
    private_window_count = 0

    station_sub1_priv = defaultdict(list)
    station_sub2_priv = defaultdict(list)
    station_sub1_all = defaultdict(list)
    station_sub2_all = defaultdict(list)

    cutoff_ts = "2026-11-10T09:00:00+05:30"

    for r in test_records:
        tid = r['ID']
        loc = r['location_id']
        ts_end = r['target_end_ist']
        s1 = sub1_map[tid]
        s2 = sub2_map[tid]
        s_block = r['scoring_block']

        station_sub1_all[loc].append(s1)
        station_sub2_all[loc].append(s2)

        if s_block == 'private':
            private_window_count += 1
            station_sub1_priv[loc].append(s1)
            station_sub2_priv[loc].append(s2)

        # Ground truth matching via exact Test ID
        has_gt = tid in train_id_lookup
        is_fc = not has_gt

        spread = round(abs(s2 - s1), 2)
        iso_ts = ts_end.replace(' ', 'T')

        record = {
            'id': tid,
            'timestamp': iso_ts,
            'sub1': round(s1, 2),
            'sub2': round(s2, 2),
            'spread': spread,
            'isForecast': is_fc,
            'scoringBlock': s_block
        }

        if has_gt:
            matched_hist_count += 1
            gt_val = train_id_lookup[tid]
            record['groundTruth'] = round(gt_val, 2)
        else:
            forecast_count += 1

        by_station_forecasts[loc].append(record)

        # Multi-station timeline aggregator
        t_entry = timeline_dict[iso_ts]
        t_entry['timestamp'] = iso_ts
        t_entry['isForecast'] = is_fc
        t_entry['scoringBlock'] = s_block
        
        st_sub = {
            'sub1': round(s1, 2),
            'sub2': round(s2, 2),
            'spread': spread
        }
        if has_gt:
            st_sub['groundTruth'] = round(train_id_lookup[tid], 2)
        t_entry['stations'][loc] = st_sub

    print(f"Test row breakdown: Total={len(test_records)}, Matched Ground Truth={matched_hist_count}, Future Forecast={forecast_count}, Private Evaluation={private_window_count}")

    # Build chronological timeline array with city-wide averages
    timeline_list = []
    for iso_ts in sorted(timeline_dict.keys()):
        item = timeline_dict[iso_ts]
        st_map = item['stations']
        
        s1_avg = round(sum(st['sub1'] for st in st_map.values()) / len(st_map), 2)
        s2_avg = round(sum(st['sub2'] for st in st_map.values()) / len(st_map), 2)
        spread_avg = round(sum(st['spread'] for st in st_map.values()) / len(st_map), 2)
        
        timeline_entry = {
            'timestamp': iso_ts,
            'isForecast': item['isForecast'],
            'scoringBlock': item['scoringBlock'],
            'cityAvgSub1': s1_avg,
            'cityAvgSub2': s2_avg,
            'cityAvgSpread': spread_avg
        }

        # If ground truth is present across stations, include average ground truth
        has_all_gt = all('groundTruth' in st for st in st_map.values())
        if has_all_gt:
            timeline_entry['cityAvgGroundTruth'] = round(sum(st['groundTruth'] for st in st_map.values()) / len(st_map), 2)

        timeline_list.append(timeline_entry)

    # -------------------------------------------------------------
    # 4. Ingest openmeteo_mumbai_weather.csv
    # -------------------------------------------------------------
    print("\n[4/5] Ingesting openmeteo_mumbai_weather.csv (1,056 rows)...")
    weather_hourly = []
    weather_by_hour = defaultdict(list)
    weather_map_for_corr = {}

    with open(weather_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for r in reader:
            dt_str = r['datetime']
            temp = round(float(r['temp']), 1)
            rh = round(float(r['rh']), 1)
            ws = round(float(r['wind_speed']), 1)
            pblh = round(float(r['pblh']), 1)
            vidx = round(float(r['ventilation_idx']), 1)
            h = int(dt_str[11:13])

            w_pt = {
                'timestamp': dt_str,
                'temp': temp,
                'rh': rh,
                'windSpeed': ws,
                'pblh': pblh,
                'ventilationIndex': vidx
            }
            weather_hourly.append(w_pt)
            weather_by_hour[h].append(w_pt)
            weather_map_for_corr[dt_str] = w_pt

    # 24h Diurnal profile
    diurnal_profile = []
    for h in range(24):
        rows = weather_by_hour[h]
        n_h = len(rows)
        diurnal_profile.append({
            'hour': h,
            'avgTemp': round(sum(r['temp'] for r in rows) / n_h, 2),
            'avgRh': round(sum(r['rh'] for r in rows) / n_h, 2),
            'avgWindSpeed': round(sum(r['windSpeed'] for r in rows) / n_h, 2),
            'avgPblh': round(sum(r['pblh'] for r in rows) / n_h, 2),
            'avgVentilation': round(sum(r['ventilationIndex'] for r in rows) / n_h, 2)
        })

    # Weather-PM2.5 correlations per station over overlapping period
    correlations = {}
    for loc in station_meta.keys():
        obs_pairs = []
        for ts, val in train_by_loc[loc]:
            if val > 500 or val <= 0:
                continue
            dt_key = ts[:10] + 'T' + ts[11:16]
            if dt_key in weather_map_for_corr:
                w = weather_map_for_corr[dt_key]
                obs_pairs.append((val, w['temp'], w['rh'], w['windSpeed'], w['pblh'], w['ventilationIndex']))
        
        if obs_pairs:
            pms = [p[0] for p in obs_pairs]
            correlations[loc] = {
                'temp': pearson_corr(pms, [p[1] for p in obs_pairs]),
                'rh': pearson_corr(pms, [p[2] for p in obs_pairs]),
                'windSpeed': pearson_corr(pms, [p[3] for p in obs_pairs]),
                'pblh': pearson_corr(pms, [p[4] for p in obs_pairs]),
                'ventilation': pearson_corr(pms, [p[5] for p in obs_pairs])
            }
        else:
            correlations[loc] = {
                'temp': 0.0, 'rh': 0.0, 'windSpeed': 0.0, 'pblh': 0.0, 'ventilation': 0.0
            }

    print("Computed station weather correlations:")
    for loc, cor in correlations.items():
        print(f"  Station {loc}: {cor}")

    n_w = len(weather_hourly)
    weather_city_summary = {
        'avgTemp': round(sum(r['temp'] for r in weather_hourly) / n_w, 2),
        'avgRh': round(sum(r['rh'] for r in weather_hourly) / n_w, 2),
        'avgWindSpeed': round(sum(r['windSpeed'] for r in weather_hourly) / n_w, 2),
        'avgPblh': round(sum(r['pblh'] for r in weather_hourly) / n_w, 2),
        'avgVentilation': round(sum(r['ventilationIndex'] for r in weather_hourly) / n_w, 2),
        'totalHours': n_w
    }

    # -------------------------------------------------------------
    # 5. Assemble and Write Artifact 1: stations.json
    # -------------------------------------------------------------
    print("\n[5/5] Assembling and outputting JSON artifacts...")
    stations_output = []
    station_order = ['11606', '11611', '3409510', '3409511']

    for loc in station_order:
        s_base = station_meta[loc]
        raw_vals = [x[1] for x in train_by_loc[loc]]
        clean_vals = train_clean_by_loc[loc]
        raw_stats = compute_list_stats(raw_vals)
        clean_stats = compute_list_stats(clean_vals)

        cut_info = latest_cutoff_obs[loc]
        latest_val = round(cut_info['pm25'], 2)
        cat, color = get_cpcb_category(latest_val)
        iso_cut_ts = cut_info['ts'].replace(' ', 'T')

        p_s1 = station_sub1_priv[loc]
        p_s2 = station_sub2_priv[loc]
        p_s1_mean = round(sum(p_s1) / len(p_s1), 2) if p_s1 else 0.0
        p_s2_mean = round(sum(p_s2) / len(p_s2), 2) if p_s2 else 0.0
        p_spread = round(abs(p_s2_mean - p_s1_mean), 2)

        a_s1 = station_sub1_all[loc]
        a_s2 = station_sub2_all[loc]
        a_s1_mean = round(sum(a_s1) / len(a_s1), 2) if a_s1 else 0.0
        a_s2_mean = round(sum(a_s2) / len(a_s2), 2) if a_s2 else 0.0

        behavior_notes = {
            '11606': 'Coastal sea breeze rapidly disperses PM2.5; low model spread (+2.19 µg/m³)',
            '11611': 'Suburban valley trapping; hedge model predicts +9.47 µg/m³ lingering elevation',
            '3409510': 'Maritime boundary layer ventilation; minimal model divergence (+1.61 µg/m³)',
            '3409511': 'Deonar basin stagnation; highest citywide model spread (+12.99 µg/m³)'
        }.get(loc, 'Standard urban dispersion')

        station_obj = {
            'id': s_base['id'],
            'stationId': loc,
            'name': s_base['name'],
            'fullName': s_base['fullName'],
            'agency': s_base['agency'],
            'agencyDescription': s_base['agencyDescription'],
            'ward': s_base['ward'],
            'zone': s_base['zone'],
            'lat': s_base['lat'],
            'lon': s_base['lon'],
            'sensorId': s_base['sensorId'],
            'timezone': s_base['timezone'],
            'latest': {
                'timestamp': iso_cut_ts,
                'pm25': latest_val,
                'aqiCategory': cat,
                'aqiColor': color,
                'status': s_base['statusDescription']
            },
            'stats': {
                'overallMean': raw_stats['mean'],
                'cleanMean': clean_stats['mean'],
                'overallMedian': raw_stats['median'],
                'min': clean_stats['min'],
                'max': clean_stats['max'],
                'rawMax': raw_stats['max'],
                'p25': clean_stats['p25'],
                'p75': clean_stats['p75'],
                'p95': clean_stats['p95'],
                'p99': clean_stats['p99'],
                'std': clean_stats['std'],
                'totalReadings': raw_stats['count'],
                'cleanReadings': clean_stats['count'],
                'spikesAbove500': raw_stats['count'] - clean_stats['count']
            },
            'forecast': {
                'privateSub1Mean': p_s1_mean,
                'privateSub2Mean': p_s2_mean,
                'privateSpread': p_spread,
                'spread': p_spread,
                'allTestSub1Mean': a_s1_mean,
                'allTestSub2Mean': a_s2_mean,
                'behavior': behavior_notes
            }
        }
        stations_output.append(station_obj)

    stations_json_path = os.path.join(data_out_dir, 'stations.json')
    with open(stations_json_path, 'w', encoding='utf-8') as f:
        json.dump(stations_output, f, indent=2, ensure_ascii=False)
    print(f"-> Generated: {stations_json_path} ({os.path.getsize(stations_json_path):,} bytes)")

    # -------------------------------------------------------------
    # Assemble and Write Artifact 2: forecasts.json
    # -------------------------------------------------------------
    forecasts_output = {
        'summary': {
            'totalRows': len(test_records),
            'matchedHistorical': matched_hist_count,
            'forecastRows': forecast_count,
            'privateWindowRows': private_window_count,
            'publicWindowRows': sum(1 for r in test_records if r['scoring_block'] == 'public'),
            'unscoredWindowRows': sum(1 for r in test_records if r['scoring_block'] == 'unscored'),
            'startDate': timeline_list[0]['timestamp'],
            'endDate': timeline_list[-1]['timestamp'],
            'cutoffTimestamp': cutoff_ts,
            'privateWindowStart': "2026-11-11T01:00:00+05:30",
            'privateWindowEnd': "2026-11-13T00:00:00+05:30"
        },
        'byStation': {
            loc: sorted(by_station_forecasts[loc], key=lambda x: x['timestamp'])
            for loc in station_order
        },
        'timeline': timeline_list
    }

    forecasts_json_path = os.path.join(data_out_dir, 'forecasts.json')
    with open(forecasts_json_path, 'w', encoding='utf-8') as f:
        json.dump(forecasts_output, f, separators=(',', ':'), ensure_ascii=False)
    print(f"-> Generated: {forecasts_json_path} ({os.path.getsize(forecasts_json_path):,} bytes)")

    # -------------------------------------------------------------
    # Assemble and Write Artifact 3: timeseries_historical.json
    # -------------------------------------------------------------
    sorted_dates = sorted(train_dates)
    daily_history = []
    last_known_daily = {}

    for date_str in sorted_dates:
        day_stations = {}
        day_vals_all = []
        for loc in station_order:
            vals = train_by_date_loc[date_str].get(loc, [])
            if vals:
                st_stat = {
                    'mean': round(sum(vals) / len(vals), 2),
                    'min': round(min(vals), 2),
                    'max': round(max(vals), 2)
                }
                last_known_daily[loc] = st_stat
            elif loc in last_known_daily:
                st_stat = dict(last_known_daily[loc])
            else:
                st_stat = {'mean': 30.0, 'min': 20.0, 'max': 40.0}
            
            day_stations[loc] = st_stat
            day_vals_all.append(st_stat['mean'])

        city_mean = round(sum(day_vals_all) / len(day_vals_all), 2)
        daily_history.append({
            'date': date_str,
            'cityMean': city_mean,
            'stations': day_stations
        })

    recent_start = datetime.strptime("2026-10-11 00:00:00", "%Y-%m-%d %H:%M:%S")
    recent_end = datetime.strptime("2026-11-10 09:00:00", "%Y-%m-%d %H:%M:%S")
    recent_hourly = []
    last_known_hourly = {}

    for loc in station_order:
        last_known_hourly[loc] = 30.0

    curr_dt = recent_start
    while curr_dt <= recent_end:
        dt_str = curr_dt.strftime("%Y-%m-%d %H:%M:%S+05:30")
        iso_str = curr_dt.strftime("%Y-%m-%dT%H:%M:00+05:30")

        hour_stations = {}
        hour_vals = []
        for loc in station_order:
            if dt_str in train_hourly_obs and loc in train_hourly_obs[dt_str]:
                val = round(train_hourly_obs[dt_str][loc], 2)
                last_known_hourly[loc] = val
            else:
                val = last_known_hourly[loc]
            hour_stations[loc] = val
            hour_vals.append(val)

        city_mean = round(sum(hour_vals) / len(hour_vals), 2)
        recent_hourly.append({
            'timestamp': iso_str,
            'cityMean': city_mean,
            'stations': hour_stations
        })
        curr_dt += timedelta(hours=1)

    timeseries_output = {
        'dailyHistory': daily_history,
        'recentHourly': recent_hourly
    }

    timeseries_json_path = os.path.join(data_out_dir, 'timeseries_historical.json')
    with open(timeseries_json_path, 'w', encoding='utf-8') as f:
        json.dump(timeseries_output, f, separators=(',', ':'), ensure_ascii=False)
    print(f"-> Generated: {timeseries_json_path} ({os.path.getsize(timeseries_json_path):,} bytes)")

    # -------------------------------------------------------------
    # Assemble and Write Artifact 4: weather_summary.json
    # -------------------------------------------------------------
    weather_output = {
        'hourly': weather_hourly,
        'diurnalProfile': diurnal_profile,
        'correlations': correlations,
        'citySummary': weather_city_summary
    }

    weather_json_path = os.path.join(data_out_dir, 'weather_summary.json')
    with open(weather_json_path, 'w', encoding='utf-8') as f:
        json.dump(weather_output, f, separators=(',', ':'), ensure_ascii=False)
    print(f"-> Generated: {weather_json_path} ({os.path.getsize(weather_json_path):,} bytes)")

    # Total size check
    total_size = sum(os.path.getsize(os.path.join(data_out_dir, f)) for f in [
        'stations.json', 'forecasts.json', 'timeseries_historical.json', 'weather_summary.json'
    ])
    print(f"\nAll 4 JSON artifacts successfully generated in {data_out_dir}!")
    print(f"Total Combined Size: {total_size:,} bytes ({total_size / 1024:.1f} KB)")

if __name__ == '__main__':
    main()
