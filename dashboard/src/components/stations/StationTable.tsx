import React from 'react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import { ForecastsData, StationData } from '../../types/aqi';
import { calculateDelta, cn, formatISTTime, getAQICategory } from '../../lib/aqi-utils';
import { next24h } from '../../lib/series';
import { AqiChip, UNIT } from '../ui';

interface StationTableProps {
  stations: StationData[];
  forecasts: ForecastsData;
  activeStationId: string;
  onSelectStation: (id: string) => void;
  previous24hReadings: Record<string, number>;
}

const Delta: React.FC<{ current: number; previous?: number }> = ({ current, previous }) => {
  const delta = calculateDelta(current, previous);
  if (!delta) return <span className="text-ink-3">No data</span>;
  const Icon = delta.direction === 'up' ? ArrowUpRight : delta.direction === 'down' ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        'num inline-flex items-center gap-0.5 font-medium',
        delta.direction === 'up' ? 'text-[#f29089]' : delta.direction === 'down' ? 'text-[#8fd39b]' : 'text-ink-2'
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {delta.text}
      <span className="sr-only">{delta.direction === 'up' ? 'higher' : delta.direction === 'down' ? 'lower' : 'unchanged'}</span>
    </span>
  );
};

export const StationTable: React.FC<StationTableProps> = ({
  stations,
  forecasts,
  activeStationId,
  onSelectStation,
  previous24hReadings,
}) => {
  const rows = stations.map((st) => {
    const id = String(st.stationId || st.id);
    const pm25 = st.latest?.pm25 ?? 0;
    return {
      id,
      st,
      pm25,
      category: getAQICategory(pm25),
      selected: id === String(activeStationId),
      next: next24h(id, forecasts),
      previous: previous24hReadings[id],
    };
  });

  return (
    <div className="panel overflow-hidden">
      {/* Table from sm up */}
      <table className="hidden w-full border-collapse text-left sm:table">
        <caption className="sr-only">PM2.5 at the four monitoring stations. Select a station to focus the page on it.</caption>
        <thead>
          <tr className="border-b border-line bg-surface-2 text-xs text-ink-2">
            <th scope="col" className="py-2.5 pl-4 pr-3 font-medium">
              Station
            </th>
            <th scope="col" className="px-3 py-2.5 font-medium">
              PM2.5 now
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              vs 24 h ago
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">
              Peak, next 24 h
            </th>
            <th scope="col" className="hidden py-2.5 pl-3 pr-4 text-right font-medium md:table-cell">
              Model gap
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ id, st, pm25, category, selected, next, previous }) => (
            <tr
              key={id}
              onClick={() => onSelectStation(id)}
              aria-selected={selected}
              className={cn(
                'cursor-pointer border-b border-line-soft transition-colors duration-150 last:border-b-0',
                selected ? 'bg-primary-soft' : 'hover:bg-surface-2'
              )}
            >
              <th scope="row" className="py-3 pl-4 pr-3 font-normal">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="radio"
                    name="station"
                    checked={selected}
                    onChange={() => onSelectStation(id)}
                    className="mt-1 h-3.5 w-3.5 cursor-pointer"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">{st.name}</span>
                    <span className="block text-xs text-ink-2">
                      Ward {st.ward} · {st.agency}
                    </span>
                  </span>
                </label>
              </th>
              <td className="px-3 py-3">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <span className="num text-base font-semibold text-ink">{pm25.toFixed(1)}</span>
                  <AqiChip category={category} />
                </div>
              </td>
              <td className="px-3 py-3 text-right text-[13px]">
                <Delta current={pm25} previous={previous} />
              </td>
              <td className="px-3 py-3 text-right text-[13px]">
                {next ? (
                  <>
                    <span className="num font-medium text-ink">{next.peak.toFixed(0)}</span>
                    <span className="num ml-1.5 text-xs text-ink-3">at {formatISTTime(next.peakAt)}</span>
                  </>
                ) : (
                  <span className="text-ink-3">No forecast</span>
                )}
              </td>
              <td className="num hidden py-3 pl-3 pr-4 text-right text-[13px] text-ink-2 md:table-cell">
                {st.forecast?.spread != null ? `±${st.forecast.spread.toFixed(1)}` : '–'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Stacked list on phones */}
      <ul className="divide-y divide-line-soft sm:hidden" role="radiogroup" aria-label="Station">
        {rows.map(({ id, st, pm25, category, selected, next, previous }) => (
          <li key={id}>
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelectStation(id)}
              className={cn('block w-full px-4 py-3 text-left', selected ? 'bg-primary-soft' : 'active:bg-surface-2')}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-ink">{st.name}</span>
                <span className="flex items-center gap-2">
                  <span className="num text-base font-semibold text-ink">{pm25.toFixed(1)}</span>
                  <AqiChip category={category} />
                </span>
              </span>
              <span className="mt-1 flex items-center justify-between gap-3 text-xs text-ink-2">
                <span>
                  Ward {st.ward} · {st.agency}
                </span>
                <span className="flex items-center gap-3">
                  <Delta current={pm25} previous={previous} />
                  {next && <span className="num">Peak {next.peak.toFixed(0)}</span>}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <p className="border-t border-line bg-surface-2 px-4 py-2 text-xs leading-[18px] text-ink-2">
        All values in {UNIT}. Peak is the higher of the two models. Model gap is the mean difference between Submission 1
        and Submission 2 in the scored window.
      </p>
    </div>
  );
};
