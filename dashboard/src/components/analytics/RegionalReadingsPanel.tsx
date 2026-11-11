import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { StationData } from '../../types/aqi';
import { GoogleAirQualityData, GoogleHealthRecommendations } from '../../types/googleAirQuality';
import { fetchGoogleAirQuality } from '../../services/googleAirQualityService';
import { cn, formatISTDateTime } from '../../lib/aqi-utils';
import { SectionHeading, Stat, Tag, UNIT } from '../ui';

interface RegionalReadingsPanelProps {
  station: StationData;
  onLoaded?: (stationKey: string, data: GoogleAirQualityData) => void;
}

const AUDIENCES: Array<{ key: keyof GoogleHealthRecommendations; label: string }> = [
  { key: 'generalPopulation', label: 'Everyone' },
  { key: 'children', label: 'Children' },
  { key: 'elderly', label: 'Older adults' },
  { key: 'lungDiseasePopulation', label: 'Lung conditions' },
  { key: 'heartDiseasePopulation', label: 'Heart conditions' },
  { key: 'pregnantWomen', label: 'Pregnancy' },
  { key: 'athletes', label: 'Athletes' },
];

const unitLabel = (units: string) =>
  units === 'PARTS_PER_BILLION' ? 'ppb' : units === 'MICROGRAMS_PER_CUBIC_METER' ? UNIT : units.toLowerCase();

export const RegionalReadingsPanel: React.FC<RegionalReadingsPanelProps> = ({ station, onLoaded }) => {
  const stationKey = String(station.stationId || station.id);
  const [data, setData] = useState<GoogleAirQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [audience, setAudience] = useState<keyof GoogleHealthRecommendations>('generalPopulation');
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  const load = useCallback(
    async (force: boolean) => {
      setLoading(true);
      try {
        const result = await fetchGoogleAirQuality(station.lat, station.lon, undefined, force);
        return result;
      } finally {
        setLoading(false);
      }
    },
    [station.lat, station.lon]
  );

  useEffect(() => {
    let cancelled = false;
    load(false).then((result) => {
      if (cancelled) return;
      setData(result);
      onLoadedRef.current?.(stationKey, result);
    });
    return () => {
      cancelled = true;
    };
  }, [load, stationKey]);

  const refresh = async () => {
    const result = await load(true);
    setData(result);
    onLoadedRef.current?.(stationKey, result);
  };

  const uaqi = data?.indexes.find((i) => i.code === 'uaqi');
  const naqi = data?.indexes.find((i) => i.code === 'ind_cpcb');
  const googlePM25 = data?.pollutants.find((p) => p.code === 'pm25')?.concentration.value;
  const groundPM25 = station.latest?.pm25;
  const diff = googlePM25 != null && groundPM25 != null ? googlePM25 - groundPM25 : null;

  const audiences = AUDIENCES.filter((a) => data?.healthRecommendations?.[a.key]);
  const activeAudience = audiences.find((a) => a.key === audience) ?? audiences[0];

  return (
    <div>
      <SectionHeading
        title={`Google Air Quality readings near ${station.name}`}
        description={
          data?.isLive ? (
            <>
              Google's modelled air quality for the station's location right now, as a cross-check on the ground sensor.
              The station reading is from the 10 Nov snapshot, so the two are not the same moment.
            </>
          ) : (
            <>
              These are fixed placeholder values, not measurements. With a Google Maps Platform key this section shows
              Google's live modelled air quality for the station's location.
            </>
          )
        }
        actions={
          <>
            {data &&
              (data.isLive ? (
                <Tag tone="live">Live · {formatISTDateTime(data.dateTime)}</Tag>
              ) : (
                <Tag tone="caution" title={data.fallbackReason}>
                  Placeholder values
                </Tag>
              ))}
            <button type="button" className="btn" onClick={refresh} disabled={loading}>
              <RefreshCw className={cn('h-3.5 w-3.5 text-ink-2', loading && 'animate-spin')} aria-hidden />
              Refresh
            </button>
          </>
        }
      />

      {data && !data.isLive && data.fallbackReason && (
        <p role="status" className="mb-3 rounded-lg border border-line bg-surface px-4 py-2.5 text-[13px] leading-5 text-ink-2">
          {data.fallbackReason} Placeholder values are shown instead.
        </p>
      )}

      {!data ? (
        <div className="panel space-y-3 p-5" aria-busy="true" aria-label="Loading Google Air Quality readings">
          <div className="skeleton h-5 w-1/3" />
          <div className="skeleton h-4 w-2/3" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="panel xl:col-span-7">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-line px-4 py-4 sm:grid-cols-4 sm:px-5">
              <Stat
                label="Ground sensor PM2.5"
                value={groundPM25 != null ? groundPM25.toFixed(1) : '–'}
                unit={UNIT}
                note={`${station.agency} station`}
              />
              <Stat
                label="Google PM2.5"
                value={googlePM25 != null ? googlePM25.toFixed(1) : '–'}
                unit={UNIT}
                note={
                  diff != null
                    ? `${Math.abs(diff).toFixed(0)} ${diff >= 0 ? 'above' : 'below'} the sensor`
                    : 'Not reported'
                }
              />
              <Stat label="Universal AQI" value={uaqi?.aqi ?? '–'} unit="of 100" note={uaqi?.category ?? 'Not reported'} />
              <Stat label="India NAQI" value={naqi?.aqi ?? '–'} unit="of 500" note={naqi?.category ?? 'Not reported'} />
            </dl>

            <table className="w-full border-collapse text-left text-[13px]">
              <caption className="sr-only">Pollutant concentrations reported by Google</caption>
              <thead>
                <tr className="border-b border-line-soft text-xs text-ink-2">
                  <th scope="col" className="py-2 pl-4 pr-3 font-medium sm:pl-5">
                    Pollutant
                  </th>
                  <th scope="col" className="hidden px-3 py-2 font-medium sm:table-cell">
                    Name
                  </th>
                  <th scope="col" className="py-2 pl-3 pr-4 text-right font-medium sm:pr-5">
                    Concentration
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.pollutants.map((p) => (
                  <tr key={p.code} className="border-b border-line-soft last:border-b-0">
                    <th scope="row" className="py-2 pl-4 pr-3 font-medium text-ink sm:pl-5">
                      {p.displayName}
                    </th>
                    <td className="hidden px-3 py-2 text-ink-2 sm:table-cell">{p.fullName}</td>
                    <td className="num py-2 pl-3 pr-4 text-right text-ink sm:pr-5">
                      {p.concentration.value.toFixed(1)}{' '}
                      <span className="text-xs text-ink-3">{unitLabel(p.concentration.units)}</span>
                    </td>
                  </tr>
                ))}
                {data.pollutants.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-6 text-center text-ink-2">
                      Google returned no pollutant concentrations for this location.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="panel flex flex-col xl:col-span-5">
            <h3 className="border-b border-line px-4 py-2.5 text-[13px] font-semibold text-ink sm:px-5">
              Google's health guidance
            </h3>
            {audiences.length > 0 && activeAudience ? (
              <>
                <div role="tablist" aria-label="Audience" className="flex flex-wrap gap-1.5 px-4 pt-3 sm:px-5">
                  {audiences.map((a) => {
                    const selected = a.key === activeAudience.key;
                    return (
                      <button
                        key={a.key}
                        type="button"
                        role="tab"
                        aria-selected={selected}
                        onClick={() => setAudience(a.key)}
                        className={cn(
                          'h-7 rounded-full border px-3 text-xs font-medium transition-colors duration-150',
                          selected
                            ? 'border-primary bg-primary-soft text-primary'
                            : 'border-line bg-surface text-ink-2 hover:bg-ground hover:text-ink'
                        )}
                      >
                        {a.label}
                      </button>
                    );
                  })}
                </div>
                <p role="tabpanel" className="px-4 pb-5 pt-3 text-sm leading-6 text-ink sm:px-5">
                  {data.healthRecommendations[activeAudience.key]}
                </p>
              </>
            ) : (
              <p className="px-5 py-6 text-[13px] text-ink-2">Google returned no health guidance for this location.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
