import {
  ForecastPoint,
  ForecastsData,
  TimeRangeMode,
  TimeseriesHistoricalData,
  WeatherHourlyPoint,
  WeatherSummaryData,
} from '../types/aqi';
import { toMs } from './aqi-utils';

export interface SeriesPoint {
  t: number;
  observed: number | null;
  sub1: number | null;
  sub2: number | null;
  isForecast: boolean;
  block?: string;
  /** Daily view only: lowest and highest hourly reading of the day. */
  dayMin?: number;
  dayMax?: number;
}

export interface WeatherPoint extends WeatherHourlyPoint {
  t: number;
}

const HOUR = 3_600_000;

/** Inserts an empty point after any break longer than one step so lines stop at gaps. */
function withGaps(points: SeriesPoint[], step = HOUR): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  points.forEach((p, i) => {
    const prev = points[i - 1];
    if (prev && p.t - prev.t > step * 1.5) {
      out.push({ t: prev.t + step, observed: null, sub1: null, sub2: null, isForecast: p.isForecast });
    }
    out.push(p);
  });
  return out;
}

/**
 * Model rows for the 24 hours after the last station reading. `isForecast` alone is not enough:
 * it also marks earlier hours whose readings were withheld from the dataset.
 */
function upcoming(points: ForecastPoint[], cutoff: number): ForecastPoint[] {
  return points.filter((f) => {
    const t = toMs(f.timestamp);
    return f.isForecast && t > cutoff && t <= cutoff + 24 * HOUR;
  });
}

export function buildSeries(
  range: TimeRangeMode,
  stationKey: string,
  forecasts: ForecastsData,
  historical: TimeseriesHistoricalData
): SeriesPoint[] {
  const stationFc = forecasts.byStation?.[stationKey] ?? [];

  if (range === 'full') {
    return (historical.dailyHistory ?? [])
      .map((d) => {
        const s = d.stations?.[stationKey];
        return {
          t: toMs(`${d.date}T12:00:00+05:30`),
          observed: s?.mean ?? null,
          sub1: null,
          sub2: null,
          isForecast: false,
          dayMin: s?.min,
          dayMax: s?.max,
        };
      })
      .filter((p) => !isNaN(p.t));
  }

  if (range === '24h') {
    const observed: SeriesPoint[] = (historical.recentHourly ?? []).slice(-24).map((h) => ({
      t: toMs(h.timestamp),
      observed: h.stations?.[stationKey] ?? null,
      sub1: null,
      sub2: null,
      isForecast: false,
    }));
    const future: SeriesPoint[] = upcoming(stationFc, toMs(forecasts.summary.cutoffTimestamp))
      .map((f) => ({
        t: toMs(f.timestamp),
        observed: null,
        sub1: f.sub1,
        sub2: f.sub2,
        isForecast: true,
        block: f.scoringBlock,
      }));
    return withGaps([...observed, ...future]);
  }

  return withGaps(
    stationFc.map((f) => ({
      t: toMs(f.timestamp),
      observed: !f.isForecast && f.groundTruth != null ? f.groundTruth : null,
      sub1: f.isForecast ? f.sub1 : null,
      sub2: f.isForecast ? f.sub2 : null,
      isForecast: f.isForecast,
      block: f.scoringBlock,
    }))
  );
}

export function buildWeather(weather: WeatherSummaryData): WeatherPoint[] {
  return weather.hourly.map((w) => ({ ...w, t: toMs(w.timestamp) })).filter((w) => !isNaN(w.t));
}

/** The weather row closest to a moment in time. */
export function weatherAt(points: WeatherPoint[], t: number): WeatherPoint | undefined {
  let best: WeatherPoint | undefined;
  let bestGap = Infinity;
  for (const p of points) {
    const gap = Math.abs(p.t - t);
    if (gap < bestGap) {
      best = p;
      bestGap = gap;
    }
  }
  return best;
}

export interface Next24h {
  peak: number;
  peakAt: number;
  trend: 'improving' | 'deteriorating' | 'stable';
  sub1: number[];
  sub2: number[];
}

export function next24h(stationKey: string, forecasts: ForecastsData): Next24h | null {
  const pts = upcoming(forecasts.byStation?.[stationKey] ?? [], toMs(forecasts.summary.cutoffTimestamp));
  if (!pts.length) return null;
  let peak = -Infinity;
  let peakAt = toMs(pts[0].timestamp);
  pts.forEach((f) => {
    const v = Math.max(f.sub1, f.sub2);
    if (v > peak) {
      peak = v;
      peakAt = toMs(f.timestamp);
    }
  });
  const diff = pts[pts.length - 1].sub1 - pts[0].sub1;
  return {
    peak,
    peakAt,
    trend: diff > 4 ? 'deteriorating' : diff < -4 ? 'improving' : 'stable',
    sub1: pts.map((f) => f.sub1),
    sub2: pts.map((f) => f.sub2),
  };
}
