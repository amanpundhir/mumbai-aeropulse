import React, { useMemo, useState } from 'react';
import { Area, AreaChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { StationData, WeatherSummaryData } from '../../types/aqi';
import { formatISTDay, formatShortIST } from '../../lib/aqi-utils';
import { WeatherPoint, weatherAt } from '../../lib/series';
import { SectionHeading, Segmented } from '../ui';

interface WeatherPanelProps {
  station: StationData;
  weather: WeatherSummaryData;
  points: WeatherPoint[];
  cutoff: number;
}

type Window = '3d' | '7d' | 'all';
type MetricKey = 'temp' | 'rh' | 'windSpeed' | 'ventilationIndex';

const METRICS: Array<{
  key: MetricKey;
  corr: 'temp' | 'rh' | 'windSpeed' | 'ventilation';
  label: string;
  unit: string;
  digits: number;
}> = [
  { key: 'ventilationIndex', corr: 'ventilation', label: 'Ventilation index', unit: 'm²/s', digits: 0 },
  { key: 'windSpeed', corr: 'windSpeed', label: 'Wind speed', unit: 'km/h', digits: 1 },
  { key: 'temp', corr: 'temp', label: 'Temperature', unit: '°C', digits: 1 },
  { key: 'rh', corr: 'rh', label: 'Relative humidity', unit: '%', digits: 0 },
];

const DAY = 86_400_000;
const fmt = (v: number, digits: number) =>
  v.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits });

function describeCorrelation(r: number): string {
  const size = Math.abs(r);
  if (size < 0.1) return 'No clear link with PM2.5 here';
  const strength = size < 0.3 ? 'Weak' : size < 0.5 ? 'Moderate' : 'Strong';
  return r < 0 ? `${strength} link: PM2.5 falls as this rises` : `${strength} link: PM2.5 rises with this`;
}

export const WeatherPanel: React.FC<WeatherPanelProps> = ({ station, weather, points, cutoff }) => {
  const [win, setWin] = useState<Window>('3d');
  const stationKey = String(station.stationId || station.id);
  const correlations = weather.correlations?.[stationKey];

  const data = useMemo(() => {
    if (win === 'all') return points.filter((_, i) => i % 3 === 0);
    const span = win === '3d' ? 3 * DAY : 7 * DAY;
    return points.filter((p) => p.t >= cutoff - span && p.t <= cutoff + span);
  }, [points, cutoff, win]);

  const now = useMemo(() => weatherAt(points, cutoff), [points, cutoff]);

  if (!points.length || !now) {
    return (
      <div>
        <SectionHeading title="Weather behind the forecast" />
        <p className="panel px-5 py-8 text-center text-[13px] text-ink-2">No weather data is bundled with this build.</p>
      </div>
    );
  }

  return (
    <div>
      <SectionHeading
        title="Weather behind the forecast"
        description={
          <>
            City-wide hourly weather from Open-Meteo. The ventilation index is boundary-layer height multiplied by wind
            speed: when it is low, pollution stays near the ground. At {formatShortIST(cutoff)} the boundary layer was{' '}
            <span className="num font-medium text-ink">{fmt(now.pblh, 0)} m</span> deep.
          </>
        }
        actions={
          <Segmented<Window>
            label="Weather time range"
            value={win}
            onChange={setWin}
            options={[
              { value: '3d', label: '± 3 days' },
              { value: '7d', label: '± 7 days' },
              { value: 'all', label: 'All 44 days' },
            ]}
          />
        }
      />

      <div className="panel grid grid-cols-1 divide-y divide-line-soft sm:grid-cols-2 sm:divide-y-0 xl:grid-cols-4">
        {METRICS.map((m, i) => {
          const values = data.map((d) => d[m.key]).filter((v) => v != null && !isNaN(v));
          const min = values.length ? Math.min(...values) : 0;
          const max = values.length ? Math.max(...values) : 0;
          const r = correlations?.[m.corr];
          return (
            <div
              key={m.key}
              className={[
                'min-w-0 px-4 py-4 sm:px-5',
                i % 2 === 1 ? 'sm:border-l sm:border-line-soft' : '',
                i >= 2 ? 'sm:border-t sm:border-line-soft xl:border-t-0' : '',
                i === 2 ? 'xl:border-l xl:border-line-soft' : '',
              ].join(' ')}
            >
              <h3 className="text-xs text-ink-3">{m.label}</h3>
              <p className="mt-1">
                <span className="num text-xl font-semibold tracking-[-0.01em] text-ink">{fmt(now[m.key], m.digits)}</span>
                <span className="ml-1 text-xs text-ink-3">{m.unit}</span>
                <span className="num ml-2 text-xs text-ink-2">
                  range {fmt(min, m.digits)}–{fmt(max, m.digits)}
                </span>
              </p>

              <div className="mt-2 h-[84px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 4, right: 18, left: 18, bottom: 0 }}>
                    <XAxis
                      dataKey="t"
                      type="number"
                      scale="time"
                      domain={['dataMin', 'dataMax']}
                      ticks={[data[0]?.t, cutoff, data[data.length - 1]?.t].filter((t): t is number => t != null)}
                      tickFormatter={(t: number) => formatISTDay(t)}
                      interval={0}
                      tick={{ fill: '#9a9b96', fontSize: 10 }}
                      tickLine={false}
                      stroke="#363633"
                      tickMargin={4}
                      height={20}
                    />
                    <YAxis hide domain={['dataMin', 'dataMax']} />
                    <Tooltip
                      isAnimationActive={false}
                      cursor={{ stroke: '#6b6b66', strokeWidth: 1 }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0].payload as WeatherPoint;
                        return (
                          <div className="rounded-md border border-line bg-surface px-2 py-1 text-xs shadow-pop">
                            <span className="num font-semibold text-ink">
                              {fmt(p[m.key], m.digits)} {m.unit}
                            </span>
                            <span className="ml-2 text-ink-2">{formatShortIST(p.t)}</span>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine x={cutoff} stroke="#9a9b96" strokeDasharray="3 3" />
                    <Area
                      type="monotone"
                      dataKey={m.key}
                      stroke="#7aa7dc"
                      strokeWidth={1.5}
                      fill="#7aa7dc"
                      fillOpacity={0.1}
                      isAnimationActive={false}
                      activeDot={{ r: 3, fill: '#7aa7dc', stroke: '#1c1c1c', strokeWidth: 1.5 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {r != null && (
                <p className="mt-2 text-xs leading-[18px] text-ink-2">
                  {describeCorrelation(r)} <span className="num text-ink-3">(r = {r.toFixed(2).replace('-', '−')})</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-ink-3">
        Dashed line marks the last station reading. Values after it are weather forecasts. Correlations are for{' '}
        {station.name} over the weather record.
      </p>
    </div>
  );
};
