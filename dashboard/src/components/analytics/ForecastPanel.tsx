import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ForecastsData, StationData, TimeRangeMode, TimeseriesHistoricalData } from '../../types/aqi';
import {
  AQI_SCALE,
  cn,
  formatISTDateTime,
  formatISTDay,
  formatISTMonth,
  formatISTTime,
  formatShortIST,
  getAQICategory,
  toMs,
} from '../../lib/aqi-utils';
import { SeriesPoint, buildSeries, next24h } from '../../lib/series';
import { AqiChip, Check, SectionHeading, Segmented, Stat, UNIT } from '../ui';

interface ForecastPanelProps {
  station: StationData;
  forecasts: ForecastsData;
  historical: TimeseriesHistoricalData;
}

const SERIES = {
  observed: { label: 'Observed', color: '#f1f1ef', dash: undefined as string | undefined },
  sub1: { label: 'Submission 1 · CatBoost + LightGBM blend', color: '#7aa7dc', dash: undefined },
  sub2: { label: 'Submission 2 · CatBoost only', color: '#5fb8ab', dash: '5 3' },
};
type SeriesKey = keyof typeof SERIES;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const IST_OFFSET = 5.5 * HOUR;

function ticksFor(range: TimeRangeMode, data: SeriesPoint[]): number[] {
  if (!data.length) return [];
  const start = data[0].t;
  const end = data[data.length - 1].t;
  const aligned = (step: number) => {
    const out: number[] = [];
    for (let t = Math.ceil((start + IST_OFFSET) / step) * step - IST_OFFSET; t <= end; t += step) out.push(t);
    return out;
  };
  if (range === '24h') return aligned(6 * HOUR);
  if (range === '7d') return aligned(5 * DAY);
  // Quarter starts across the daily history.
  const out: number[] = [];
  const first = new Date(start + IST_OFFSET);
  let y = first.getUTCFullYear();
  let m = Math.ceil((first.getUTCMonth() + 1) / 3) * 3; // next quarter boundary (0-based month)
  for (;;) {
    const t = Date.UTC(y, m, 1) - IST_OFFSET;
    if (t > end) break;
    if (t >= start) out.push(t);
    m += 3;
    if (m >= 12) {
      y += Math.floor(m / 12);
      m = m % 12;
    }
  }
  return out;
}

const SeriesSwatch: React.FC<{ color: string; dash?: string }> = ({ color, dash }) => (
  <svg width="18" height="8" aria-hidden className="shrink-0">
    <line x1="1" y1="4" x2="17" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dash} strokeLinecap="round" />
  </svg>
);

export const ForecastPanel: React.FC<ForecastPanelProps> = ({ station, forecasts, historical }) => {
  const stationKey = String(station.stationId || station.id);
  const [range, setRange] = useState<TimeRangeMode>('7d');
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({ observed: true, sub1: true, sub2: true });
  const [showBands, setShowBands] = useState(true);
  const [bridgeGaps, setBridgeGaps] = useState(false);
  const [fitSpikes, setFitSpikes] = useState(false);

  const data = useMemo(() => buildSeries(range, stationKey, forecasts, historical), [range, stationKey, forecasts, historical]);
  const ticks = useMemo(() => ticksFor(range, data), [range, data]);

  const cutoff = toMs(forecasts.summary.cutoffTimestamp);
  const scoredStart = toMs(forecasts.summary.privateWindowStart);
  const scoredEnd = toMs(forecasts.summary.privateWindowEnd);
  const domainStart = data[0]?.t ?? 0;
  const domainEnd = data[data.length - 1]?.t ?? 0;
  const hasForecast = range !== 'full';
  const gapCount = useMemo(() => data.filter((p) => p.observed == null && p.sub1 == null && p.sub2 == null).length, [data]);

  // A handful of extreme hours would flatten everything else, so the axis fits the
  // bulk of the data by default and the tallest spikes run off the top.
  const { yMax, clipped, dataMax } = useMemo(() => {
    const observed: number[] = [];
    let modelMax = 0;
    data.forEach((p) => {
      if (visible.observed && p.observed != null) observed.push(p.observed);
      if (visible.sub1 && p.sub1 != null) modelMax = Math.max(modelMax, p.sub1);
      if (visible.sub2 && p.sub2 != null) modelMax = Math.max(modelMax, p.sub2);
    });
    observed.sort((a, b) => a - b);
    const observedMax = observed.length ? observed[observed.length - 1] : 0;
    const typical = observed.length ? observed[Math.floor((observed.length - 1) * 0.985)] : 0;
    const full = Math.max(observedMax, modelMax);
    const round = (v: number) => Math.max(120, Math.ceil((v * 1.12) / 20) * 20);
    const fitted = round(Math.max(typical, modelMax));
    const useFull = fitSpikes || range === 'full' || round(full) <= fitted * 1.35;
    const top = useFull ? round(full) : fitted;
    return { yMax: top, clipped: observed.filter((v) => v > top).length, dataMax: full };
  }, [data, visible, fitSpikes, range]);
  const canClip = range !== 'full' && (clipped > 0 || fitSpikes);
  // Axis ticks sit on the CPCB category boundaries so the bands and the numbers agree.
  const yTicks = useMemo(() => {
    const marks = [0, 30, 60, 90, 120, 250, 500].filter((v) => v <= yMax);
    if (yMax - marks[marks.length - 1] > yMax * 0.12) marks.push(yMax);
    return marks;
  }, [yMax]);

  const next = useMemo(() => next24h(stationKey, forecasts), [stationKey, forecasts]);
  const pm25 = station.latest?.pm25 ?? 0;

  const tickFormatter = (t: number) =>
    range === '24h' ? formatISTTime(t) : range === '7d' ? formatISTDay(t) : formatISTMonth(t);

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as SeriesPoint;
    const rows = (Object.keys(SERIES) as SeriesKey[]).filter((k) => visible[k] && p[k] != null);
    if (!rows.length) return null;
    const lead = p.observed ?? p.sub1 ?? p.sub2 ?? 0;
    return (
      <div className="min-w-[13rem] rounded-lg border border-line bg-surface p-3 text-xs shadow-pop">
        <div className="flex items-center justify-between gap-3">
          <span className="font-medium text-ink">
            {range === 'full' ? `${formatISTDay(p.t)} ${new Date(p.t).getUTCFullYear()}, daily mean` : formatISTDateTime(p.t)}
          </span>
          <AqiChip category={getAQICategory(lead)} />
        </div>
        <dl className="mt-2 space-y-1">
          {rows.map((k) => (
            <div key={k} className="flex items-center justify-between gap-4">
              <dt className="flex items-center gap-1.5 text-ink-2">
                <SeriesSwatch color={SERIES[k].color} dash={SERIES[k].dash} />
                {k === 'observed' ? 'Observed' : k === 'sub1' ? 'Submission 1' : 'Submission 2'}
              </dt>
              <dd className="num font-semibold text-ink">{(p[k] as number).toFixed(1)}</dd>
            </div>
          ))}
          {p.dayMin != null && p.dayMax != null && (
            <div className="flex items-center justify-between gap-4 text-ink-2">
              <dt>Hourly range</dt>
              <dd className="num">
                {p.dayMin.toFixed(0)}–{p.dayMax.toFixed(0)}
              </dd>
            </div>
          )}
          {p.sub1 != null && p.sub2 != null && (
            <div className="flex items-center justify-between gap-4 border-t border-line-soft pt-1 text-ink-2">
              <dt>Gap between models</dt>
              <dd className="num">{Math.abs(p.sub1 - p.sub2).toFixed(1)}</dd>
            </div>
          )}
        </dl>
        {p.isForecast && p.block === 'private' && <p className="mt-2 text-ink-2">Inside the scored window</p>}
      </div>
    );
  };

  return (
    <div>
      <SectionHeading
        title={`Forecast for ${station.name}`}
        description={
          <>
            Hourly PM2.5 from the two submitted models, against what the station measured. The models fill every
            hour withheld from the dataset, both earlier gaps and everything after the last reading at{' '}
            {formatISTDateTime(cutoff)}. The competition scores 11–13 Nov.
          </>
        }
        actions={
          <Segmented<TimeRangeMode>
            label="Time range"
            value={range}
            onChange={setRange}
            options={[
              { value: '24h', label: '24 hours' },
              { value: '7d', label: '22 Oct – 21 Nov' },
              { value: 'full', label: 'Since Feb 2025' },
            ]}
          />
        }
      />

      <div className="panel">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-line px-4 py-4 sm:px-5 lg:grid-cols-4">
          <Stat
            label="Now"
            value={pm25.toFixed(1)}
            unit={UNIT}
            note={<AqiChip category={getAQICategory(pm25)} />}
          />
          <Stat
            label="Peak in the next 24 hours"
            value={next ? next.peak.toFixed(1) : '–'}
            unit={next ? UNIT : undefined}
            note={next ? `Around ${formatShortIST(next.peakAt)} · ${getAQICategory(next.peak)}` : 'No forecast available'}
          />
          <Stat
            label="Scored window mean, Submission 1"
            value={station.forecast?.privateSub1Mean?.toFixed(1) ?? '–'}
            unit={UNIT}
            note="CatBoost + LightGBM blend"
          />
          <Stat
            label="Scored window mean, Submission 2"
            value={station.forecast?.privateSub2Mean?.toFixed(1) ?? '–'}
            unit={UNIT}
            note={
              station.forecast?.privateSpread != null
                ? `CatBoost only · ${Math.abs(
                    (station.forecast.privateSub2Mean ?? 0) - (station.forecast.privateSub1Mean ?? 0)
                  ).toFixed(1)} ${
                    (station.forecast.privateSub2Mean ?? 0) >= (station.forecast.privateSub1Mean ?? 0) ? 'above' : 'below'
                  } Submission 1`
                : 'CatBoost only'
            }
          />
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pt-3 sm:px-5">
          <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <legend className="sr-only">Series</legend>
            {(Object.keys(SERIES) as SeriesKey[])
              .filter((k) => k === 'observed' || hasForecast)
              .map((k) => (
                <Check key={k} checked={visible[k]} onChange={(v) => setVisible((prev) => ({ ...prev, [k]: v }))}>
                  <SeriesSwatch color={SERIES[k].color} dash={SERIES[k].dash} />
                  {range === 'full' ? 'Observed daily mean' : SERIES[k].label}
                </Check>
              ))}
          </fieldset>
          <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <legend className="sr-only">Chart options</legend>
            <Check checked={showBands} onChange={setShowBands}>
              AQI bands
            </Check>
            {gapCount > 0 && (
              <Check checked={bridgeGaps} onChange={setBridgeGaps}>
                Bridge gaps in data
              </Check>
            )}
            {canClip && (
              <Check checked={fitSpikes} onChange={setFitSpikes}>
                Fit tallest spikes
              </Check>
            )}
          </fieldset>
        </div>

        <div className="h-[300px] w-full px-1 pb-1 pt-2 sm:h-[380px] sm:px-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 20, right: 16, left: 0, bottom: 4 }}>
              {showBands &&
                AQI_SCALE.map((b) => (
                  <ReferenceArea
                    key={b.category}
                    y1={b.min}
                    y2={b.max}
                    fill={b.solid}
                    fillOpacity={0.12}
                    stroke="none"
                    ifOverflow="hidden"
                  />
                ))}

              <CartesianGrid stroke="#2e2e2c" vertical={false} />

              {hasForecast && cutoff < domainEnd && (
                <ReferenceArea
                  x1={Math.max(cutoff, domainStart)}
                  x2={domainEnd}
                  fill="#ffffff"
                  fillOpacity={0.03}
                  stroke="none"
                  ifOverflow="hidden"
                />
              )}
              {hasForecast && scoredStart < domainEnd && scoredEnd > domainStart && (
                <ReferenceArea
                  x1={Math.max(scoredStart, domainStart)}
                  x2={Math.min(scoredEnd, domainEnd)}
                  fill="#7aa7dc"
                  fillOpacity={0.1}
                  stroke="none"
                  ifOverflow="hidden"
                  label={({ viewBox }: any) => (
                    <text
                      x={viewBox.x + viewBox.width / 2}
                      y={viewBox.y - 6}
                      textAnchor="middle"
                      fill="#7aa7dc"
                      fontSize={11}
                      fontWeight={500}
                    >
                      Scored
                    </text>
                  )}
                />
              )}

              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                ticks={ticks}
                tickFormatter={tickFormatter}
                stroke="#363633"
                tickLine={false}
                tick={{ fill: '#9a9b96', fontSize: 11 }}
                tickMargin={8}
              />
              <YAxis
                width={44}
                domain={[0, yMax]}
                ticks={yTicks}
                interval={0}
                allowDataOverflow
                stroke="#363633"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9a9b96', fontSize: 11 }}
              />

              <Tooltip content={renderTooltip} cursor={{ stroke: '#6b6b66', strokeWidth: 1 }} isAnimationActive={false} />

              {hasForecast && cutoff > domainStart && cutoff < domainEnd && (
                <ReferenceLine
                  x={cutoff}
                  stroke="#9a9b96"
                  strokeDasharray="3 3"
                  label={({ viewBox }: any) => (
                    <text x={viewBox.x - 6} y={viewBox.y - 6} textAnchor="end" fill="#9a9b96" fontSize={11}>
                      Last reading
                    </text>
                  )}
                />
              )}

              {(Object.keys(SERIES) as SeriesKey[]).map(
                (k) =>
                  visible[k] && (
                    <Line
                      key={k}
                      type="monotone"
                      dataKey={k}
                      stroke={SERIES[k].color}
                      strokeWidth={k === 'observed' ? 1.75 : 2}
                      strokeDasharray={SERIES[k].dash}
                      dot={false}
                      activeDot={{ r: 4, fill: SERIES[k].color, stroke: '#1c1c1c', strokeWidth: 2 }}
                      connectNulls={bridgeGaps}
                      isAnimationActive={false}
                    />
                  )
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line px-4 py-2.5 text-xs text-ink-2 sm:px-5">
          <ul className={cn('flex flex-wrap gap-x-3.5 gap-y-1', !showBands && 'opacity-60')} aria-label="CPCB PM2.5 categories">
            {AQI_SCALE.map((b) => (
              <li key={b.category} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: b.solid }} aria-hidden />
                {b.category} <span className="num text-ink-3">{b.range}</span>
              </li>
            ))}
          </ul>
          <span>
            PM2.5 in {UNIT}, times in IST
            {gapCount > 0 && !bridgeGaps ? ' · breaks in the line are hours with no data' : ''}
            {clipped > 0
              ? ` · ${clipped} ${clipped === 1 ? 'reading runs' : 'readings run'} off the top (highest ${dataMax.toFixed(0)})`
              : ''}
          </span>
        </div>
      </div>
    </div>
  );
};
