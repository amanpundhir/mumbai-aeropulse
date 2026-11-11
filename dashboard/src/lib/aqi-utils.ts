import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AQICategory } from '../types/aqi';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export interface AqiBand {
  category: AQICategory;
  min: number;
  max: number;
  range: string;
  /** Strong colour for dots, map markers and chart bands. */
  solid: string;
  /** Pale background for chips. */
  tint: string;
  /** Text colour that passes 4.5:1 on the tint and on the charcoal ground. */
  text: string;
  description: string;
}

/**
 * CPCB National Air Quality Index breakpoints for PM2.5 (24-hour, µg/m³).
 */
export const AQI_SCALE: AqiBand[] = [
  {
    category: 'Good',
    min: 0,
    max: 30,
    range: '0–30',
    solid: '#4caf50',
    tint: '#1f3324',
    text: '#8fd39b',
    description: 'Minimal health impact.',
  },
  {
    category: 'Satisfactory',
    min: 30,
    max: 60,
    range: '31–60',
    solid: '#9ccc65',
    tint: '#283321',
    text: '#b8da8e',
    description: 'Minor breathing discomfort for sensitive people.',
  },
  {
    category: 'Moderate',
    min: 60,
    max: 90,
    range: '61–90',
    solid: '#f2b632',
    tint: '#3a311a',
    text: '#f2c96a',
    description: 'Breathing discomfort for people with lung, asthma or heart conditions.',
  },
  {
    category: 'Poor',
    min: 90,
    max: 120,
    range: '91–120',
    solid: '#f08c3a',
    tint: '#3d2b1b',
    text: '#f5a865',
    description: 'Breathing discomfort for most people on prolonged exposure.',
  },
  {
    category: 'Very Poor',
    min: 120,
    max: 250,
    range: '121–250',
    solid: '#e5534b',
    tint: '#3f2120',
    text: '#f29089',
    description: 'Respiratory illness on prolonged exposure; high risk for children and older adults.',
  },
  {
    category: 'Severe',
    min: 250,
    max: 500,
    range: 'Above 250',
    solid: '#b8322b',
    tint: '#3a1b1a',
    text: '#e88079',
    description: 'Affects healthy people and seriously affects those with existing conditions.',
  },
];

export function getAQICategory(pm25: number | null | undefined): AQICategory {
  if (pm25 == null || isNaN(pm25)) return 'Good';
  if (pm25 <= 30) return 'Good';
  if (pm25 <= 60) return 'Satisfactory';
  if (pm25 <= 90) return 'Moderate';
  if (pm25 <= 120) return 'Poor';
  if (pm25 <= 250) return 'Very Poor';
  return 'Severe';
}

export function bandForCategory(category: AQICategory): AqiBand {
  return AQI_SCALE.find((b) => b.category === category) ?? AQI_SCALE[0];
}

export function bandFor(pm25: number | null | undefined): AqiBand {
  return bandForCategory(getAQICategory(pm25));
}

export function getAQIColor(pm25: number | null | undefined): string {
  return bandFor(pm25).solid;
}

const IST = 'Asia/Kolkata';

/** Weather rows carry local IST timestamps without an offset. */
export function toMs(iso: string): number {
  if (!iso) return NaN;
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso);
  if (hasZone) return new Date(iso).getTime();
  const padded = iso.length === 16 ? `${iso}:00` : iso;
  return new Date(`${padded}+05:30`).getTime();
}

type TimeInput = string | number;
const asDate = (v: TimeInput) => new Date(typeof v === 'number' ? v : toMs(v));

/** "10 Nov, 09:00" */
export function formatShortIST(v: TimeInput): string {
  const d = asDate(v);
  if (isNaN(d.getTime())) return String(v);
  const day = d.toLocaleDateString('en-GB', { timeZone: IST, day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('en-GB', { timeZone: IST, hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day}, ${time}`;
}

/** "10 Nov 2026, 09:00 IST" */
export function formatISTDateTime(v: TimeInput): string {
  const d = asDate(v);
  if (isNaN(d.getTime())) return String(v);
  const day = d.toLocaleDateString('en-GB', { timeZone: IST, day: 'numeric', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { timeZone: IST, hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day}, ${time} IST`;
}

/** "09:00" */
export function formatISTTime(v: TimeInput): string {
  const d = asDate(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleTimeString('en-GB', { timeZone: IST, hour: '2-digit', minute: '2-digit', hour12: false });
}

/** "10 Nov" */
export function formatISTDay(v: TimeInput): string {
  const d = asDate(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('en-GB', { timeZone: IST, day: 'numeric', month: 'short' });
}

/** "Nov 2026" */
export function formatISTMonth(v: TimeInput): string {
  const d = asDate(v);
  if (isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('en-GB', { timeZone: IST, month: 'short', year: 'numeric' });
}

export function calculateDelta(current: number, previous: number | undefined | null) {
  if (previous == null || previous === 0 || isNaN(previous)) return null;
  const pct = ((current - previous) / previous) * 100;
  return {
    percent: pct,
    text: `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct).toFixed(0)}%`,
    direction: Math.abs(pct) < 0.5 ? ('flat' as const) : pct > 0 ? ('up' as const) : ('down' as const),
  };
}
