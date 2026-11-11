import React from 'react';
import { AQICategory } from '../types/aqi';
import { bandForCategory, cn } from '../lib/aqi-utils';

export const AqiChip: React.FC<{ category: AQICategory; className?: string }> = ({ category, className }) => {
  const band = bandForCategory(category);
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-xs font-medium',
        className
      )}
      style={{ backgroundColor: band.tint, color: band.text }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: band.solid }} aria-hidden />
      {category}
    </span>
  );
};

type Tone = 'neutral' | 'live' | 'good' | 'caution' | 'warn' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-ink-2 border-line',
  live: 'bg-primary-soft text-primary border-transparent',
  good: 'bg-[#1f3324] text-[#8fd39b] border-transparent',
  caution: 'bg-[#3a311a] text-[#f2c96a] border-transparent',
  warn: 'bg-[#3d2b1b] text-[#f5a865] border-transparent',
  danger: 'bg-[#3f2120] text-[#f29089] border-transparent',
};

export const Tag: React.FC<{ tone?: Tone; children: React.ReactNode; title?: string; className?: string }> = ({
  tone = 'neutral',
  children,
  title,
  className,
}) => (
  <span
    title={title}
    className={cn(
      'inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-full border px-2 text-xs font-medium',
      TONES[tone],
      className
    )}
  >
    {children}
  </span>
);

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  className?: string;
}

export function Segmented<T extends string>({ label, value, onChange, options, className }: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('inline-flex rounded-lg border border-line bg-ground p-0.5', className)}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              'h-7 whitespace-nowrap rounded-md px-3 text-[13px] font-medium transition-colors duration-150',
              selected ? 'bg-surface-2 text-ink shadow-[0_0_0_1px_rgba(255,255,255,0.06)]' : 'text-ink-2 hover:text-ink'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export const Check: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: React.ReactNode;
  className?: string;
}> = ({ checked, onChange, children, className }) => (
  <label className={cn('inline-flex cursor-pointer select-none items-center gap-2 text-[13px] text-ink', className)}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="h-3.5 w-3.5 cursor-pointer"
    />
    {children}
  </label>
);

export const SectionHeading: React.FC<{
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}> = ({ title, description, actions }) => (
  <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
    <div className="min-w-0">
      <h2 className="display text-[22px] font-medium leading-tight text-ink">{title}</h2>
      {description && <p className="mt-1.5 max-w-[72ch] text-[13px] leading-5 text-ink-2">{description}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

export const Stat: React.FC<{
  label: string;
  value: React.ReactNode;
  unit?: string;
  note?: React.ReactNode;
  className?: string;
}> = ({ label, value, unit, note, className }) => (
  <div className={cn('min-w-0', className)}>
    <dt className="text-xs text-ink-3">{label}</dt>
    <dd className="mt-1">
      <span className="num text-xl font-semibold tracking-[-0.01em] text-ink">{value}</span>
      {unit && <span className="ml-1 text-xs text-ink-3">{unit}</span>}
      {note && <div className="mt-1 text-xs leading-4 text-ink-2">{note}</div>}
    </dd>
  </div>
);

export const KpiCard: React.FC<{
  label: string;
  value: React.ReactNode;
  unit?: string;
  chip?: React.ReactNode;
  note?: React.ReactNode;
  accent?: string;
}> = ({ label, value, unit, chip, note, accent }) => (
  <div className="panel relative overflow-hidden px-5 py-4">
    {accent && <span className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} aria-hidden />}
    <dt className="flex items-center justify-between gap-3 text-xs font-medium text-ink-3">
      <span className="truncate">{label}</span>
      {chip}
    </dt>
    <dd className="mt-2.5">
      <span className="num font-display text-[30px] font-medium leading-none tracking-[-0.02em] text-ink">{value}</span>
      {unit && <span className="ml-1.5 text-xs text-ink-3">{unit}</span>}
      {note && <p className="mt-2 text-xs leading-[18px] text-ink-2">{note}</p>}
    </dd>
  </div>
);

export const UNIT = 'µg/m³';
