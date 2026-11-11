import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check as CheckIcon, RefreshCw, X } from 'lucide-react';
import { ForecastsData, StationData } from '../../types/aqi';
import { GoogleAirQualityData } from '../../types/googleAirQuality';
import { GeminiAdvisoryResponse, StationContextInput } from '../../types/advisory';
import { fetchGeminiAdvisory } from '../../services/geminiService';
import { generateSyntheticAdvisory } from '../../services/syntheticAdvisoryEngine';
import { cn, formatISTTime, getAQICategory } from '../../lib/aqi-utils';
import { WeatherPoint, next24h, weatherAt } from '../../lib/series';
import { SectionHeading, Tag } from '../ui';

interface AdvisoryPanelProps {
  station: StationData;
  forecasts: ForecastsData;
  weatherPoints: WeatherPoint[];
  cutoff: number;
  googleAirQuality?: GoogleAirQualityData;
  /** True when a Gemini key is configured, so a live advisory will be requested. */
  geminiConfigured?: boolean;
  onStatus?: (status: { live: boolean; model?: string }) => void;
}

type Tab = 'municipal' | 'citizen';
type Tone = 'good' | 'caution' | 'warn' | 'danger';

const alertTone = (level: string): Tone =>
  level.includes('Red') ? 'danger' : level.includes('Orange') ? 'warn' : level.includes('Yellow') ? 'caution' : 'good';

const riskTone = (risk: string): Tone =>
  risk === 'Hazardous' ? 'danger' : risk === 'Unhealthy' ? 'warn' : risk === 'Moderate Concern' ? 'caution' : 'good';

const urgencyTone = (urgency: string): Tone | 'neutral' =>
  urgency.includes('Immediate') ? 'danger' : urgency.includes('Short') ? 'warn' : 'neutral';

// Shared across mounts so React's development double-mount does not send two requests.
const inFlight = new Map<string, Promise<GeminiAdvisoryResponse>>();

const YesNo: React.FC<{ yes: boolean; children: React.ReactNode }> = ({ yes, children }) => (
  <span className="inline-flex items-center gap-1.5">
    {yes ? (
      <CheckIcon className="h-3.5 w-3.5 text-[#8fd39b]" aria-hidden />
    ) : (
      <X className="h-3.5 w-3.5 text-ink-3" aria-hidden />
    )}
    {children}
  </span>
);

export const AdvisoryPanel: React.FC<AdvisoryPanelProps> = ({
  station,
  forecasts,
  weatherPoints,
  cutoff,
  googleAirQuality,
  geminiConfigured = false,
  onStatus,
}) => {
  const stationKey = String(station.stationId || station.id);
  const [tab, setTab] = useState<Tab>('municipal');
  const [advisory, setAdvisory] = useState<GeminiAdvisoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef<Record<string, GeminiAdvisoryResponse>>({});
  const onStatusRef = useRef(onStatus);
  onStatusRef.current = onStatus;

  const context = useMemo<StationContextInput>(() => {
    const currentPM25 = station.latest?.pm25 ?? 0;
    const w = weatherAt(weatherPoints, cutoff);
    const next = next24h(stationKey, forecasts);
    return {
      stationName: station.name,
      stationId: stationKey,
      latitude: station.lat,
      longitude: station.lon,
      ward: station.ward,
      currentPM25,
      aqiCategory: getAQICategory(currentPM25),
      temperature: w?.temp ?? 28,
      humidity: w?.rh ?? 60,
      windSpeed: w?.windSpeed ?? 6,
      pblh: w?.pblh ?? 300,
      ventilationIndex: w?.ventilationIndex ?? 1800,
      forecastNext24hPeak: next?.peak ?? currentPM25,
      forecastTrend: next?.trend ?? 'stable',
      primaryBlendForecast48h: next?.sub1 ?? [],
      conservativeHedgeForecast48h: next?.sub2 ?? [],
      googleLivePM25: googleAirQuality?.isLive
        ? googleAirQuality.pollutants.find((p) => p.code === 'pm25')?.concentration.value
        : undefined,
      googleLivePM10: googleAirQuality?.isLive
        ? googleAirQuality.pollutants.find((p) => p.code === 'pm10')?.concentration.value
        : undefined,
      googleUniversalAQI: googleAirQuality?.isLive ? googleAirQuality.indexes.find((i) => i.code === 'uaqi')?.aqi : undefined,
      googleDominantPollutant: googleAirQuality?.isLive
        ? googleAirQuality.indexes.find((i) => i.code === 'uaqi')?.dominantPollutant
        : undefined,
    };
  }, [station, stationKey, forecasts, weatherPoints, cutoff, googleAirQuality]);

  const contextRef = useRef(context);
  contextRef.current = context;

  const load = useCallback(
    async (force: boolean) => {
      if (!force && cache.current[stationKey]) {
        const cached = cache.current[stationKey];
        setAdvisory(cached);
        setLoading(false);
        setError(null);
        onStatusRef.current?.({ live: !cached.isSyntheticFallback, model: cached.model });
        return;
      }

      setLoading(true);
      setError(null);
      // The rule-based advisory is instant, so show it while Gemini writes its own.
      setAdvisory(geminiConfigured ? generateSyntheticAdvisory(contextRef.current) : null);
      try {
        let request = force ? undefined : inFlight.get(stationKey);
        if (!request) {
          request = fetchGeminiAdvisory(contextRef.current).finally(() => inFlight.delete(stationKey));
          inFlight.set(stationKey, request);
        }
        const response = await request;
        cache.current[stationKey] = response;
        if (contextRef.current.stationId !== stationKey) return;
        setAdvisory(response);
        onStatusRef.current?.({ live: !response.isSyntheticFallback, model: response.model });
      } catch (err) {
        console.error('[AdvisoryPanel] Failed to build advisory:', err);
        if (contextRef.current.stationId === stationKey) {
          setError('The advisory could not be generated. Try again.');
        }
      } finally {
        if (contextRef.current.stationId === stationKey) setLoading(false);
      }
    },
    [stationKey, geminiConfigured]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  const plan = advisory?.municipalActionPlan;
  const health = advisory?.citizenHealthAdvisory;
  const equipment = plan?.equipmentDeployment;

  return (
    <div>
      <SectionHeading
        title={`What to do in ${station.name}`}
        description={
          <>
            An action plan for the Ward {station.ward} office and guidance for residents, written from the current
            reading, the next 24 hours of forecast and the weather.
          </>
        }
        actions={
          <>
            {advisory &&
              (loading && advisory.isSyntheticFallback ? (
                <Tag tone="neutral">Rule-based for now · Gemini is writing</Tag>
              ) : advisory.isSyntheticFallback ? (
                <Tag tone="neutral" title={advisory.fallbackReason}>
                  Rule-based advisory
                </Tag>
              ) : (
                <Tag tone="live">Written by Gemini{advisory.model ? ` · ${advisory.model}` : ''}</Tag>
              ))}
            <button type="button" className="btn" onClick={() => load(true)} disabled={loading}>
              <RefreshCw className={cn('h-3.5 w-3.5 text-ink-2', loading && 'animate-spin')} aria-hidden />
              {loading ? 'Generating…' : 'Regenerate'}
            </button>
          </>
        }
      />

      {error && (
        <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#5a2a27] bg-[#3f2120] px-4 py-2.5 text-[13px] text-[#f29089]">
          {error}
          <button type="button" className="btn" onClick={() => load(true)}>
            Try again
          </button>
        </div>
      )}

      {loading && !advisory && !error && (
        <div className="panel space-y-4 p-5" aria-busy="true" aria-label="Generating advisory">
          <div className="skeleton h-5 w-3/4" />
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-full" />
            <div className="skeleton h-3.5 w-11/12" />
            <div className="skeleton h-3.5 w-2/3" />
          </div>
          <div className="skeleton h-28 w-full" />
        </div>
      )}

      {advisory && plan && health && (
        <div className="panel overflow-hidden">
          <div className="px-4 py-4 sm:px-5 sm:py-5">
            <p className="max-w-[70ch] text-base font-medium leading-6 text-ink">{advisory.keyTakeaway}</p>
            <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-medium text-ink-3">Why the air is like this</h3>
                <p className="mt-1 text-[13px] leading-5 text-ink-2">{advisory.atmosphericSummary}</p>
              </div>
              <div>
                <h3 className="text-xs font-medium text-ink-3">What the models expect</h3>
                <p className="mt-1 text-[13px] leading-5 text-ink-2">{advisory.forecastTrajectoryAnalysis}</p>
              </div>
            </div>
          </div>

          <div role="tablist" aria-label="Advisory audience" className="flex gap-1 border-y border-line bg-surface-2 px-3 sm:px-4">
            {(
              [
                { id: 'municipal', label: 'Municipal action plan' },
                { id: 'citizen', label: 'Advice for residents' },
              ] as Array<{ id: Tab; label: string }>
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`advisory-tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`advisory-panel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={cn(
                  '-mb-px h-10 border-b-2 px-2.5 text-[13px] font-medium transition-colors duration-150',
                  tab === t.id ? 'border-primary text-ink' : 'border-transparent text-ink-2 hover:text-ink'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'municipal' && (
            <div role="tabpanel" id="advisory-panel-municipal" aria-labelledby="advisory-tab-municipal">
              <div className="flex flex-wrap items-start gap-x-6 gap-y-3 px-4 py-4 sm:px-5">
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Tag tone={alertTone(plan.alertLevel)}>{plan.alertLevel}</Tag>
                  <span className="text-xs text-ink-2">
                    Priority <span className="num font-semibold text-ink">{plan.priorityScore}</span> of 10
                  </span>
                </div>
                <p className="min-w-[16rem] max-w-[72ch] flex-1 text-[13px] leading-5 text-ink">{plan.civicDirective}</p>
              </div>

              {plan.interventions.length > 0 ? (
                <ol className="border-t border-line-soft">
                  {plan.interventions.map((item, i) => (
                    <li
                      key={i}
                      className="grid grid-cols-1 gap-x-6 gap-y-1.5 border-b border-line-soft px-4 py-3.5 sm:px-5 md:grid-cols-[11rem_minmax(0,1fr)]"
                    >
                      <div className="flex flex-row flex-wrap items-center gap-2 md:flex-col md:items-start md:gap-1.5">
                        <Tag tone={urgencyTone(item.urgency)}>{item.urgency}</Tag>
                        <span className="text-xs text-ink-2">{item.category}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-5 text-ink">{item.action}</p>
                        <p className="mt-1 text-[13px] leading-5 text-ink-2">
                          <span className="text-ink">{item.targetLocation}.</span> {item.operationalDetails}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="border-y border-line-soft px-5 py-6 text-[13px] text-ink-2">
                  No interventions are recommended at this level.
                </p>
              )}

              {equipment && (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 px-4 py-4 sm:grid-cols-4 sm:px-5">
                  {[
                    ['Mist cannon vehicles', equipment.mistCannonVehicles],
                    ['Anti-smog guns', equipment.antiSmogGuns],
                    ['Mechanical sweepers', equipment.mechanicalSweepers],
                    ['Enforcement patrols', equipment.enforcementPatrols],
                  ].map(([label, count]) => (
                    <div key={label as string}>
                      <dt className="text-xs text-ink-3">{label}</dt>
                      <dd className="num mt-0.5 text-lg font-semibold text-ink">{count}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}

          {tab === 'citizen' && (
            <div role="tabpanel" id="advisory-panel-citizen" aria-labelledby="advisory-tab-citizen">
              <div className="flex flex-wrap items-start gap-x-6 gap-y-3 px-4 py-4 sm:px-5">
                <Tag tone={riskTone(health.riskLevelBadge)} className="shrink-0">
                  {health.riskLevelBadge}
                </Tag>
                <p className="min-w-[16rem] max-w-[72ch] flex-1 text-sm leading-6 text-ink">
                  {health.generalPublicGuidance}
                </p>
              </div>

              <dl className="border-t border-line-soft">
                {[
                  ['Children and schools', health.vulnerablePopulations.childrenAndSchools],
                  ['Older adults, heart and lung conditions', health.vulnerablePopulations.elderlyAndCardiorespiratory],
                  ['Runners and outdoor exercise', health.vulnerablePopulations.activeAthletesJoggers],
                  ['Ventilating your home', health.personalProtection.ventilationAdvice],
                ].map(([label, text]) => (
                  <div
                    key={label}
                    className="grid grid-cols-1 gap-x-6 gap-y-1 border-b border-line-soft px-4 py-3 sm:px-5 md:grid-cols-[11rem_minmax(0,1fr)]"
                  >
                    <dt className="text-[13px] font-medium text-ink">{label}</dt>
                    <dd className="max-w-[72ch] text-[13px] leading-5 text-ink-2">{text}</dd>
                  </div>
                ))}
              </dl>

              <div className="flex flex-wrap gap-x-8 gap-y-2 px-4 py-3.5 text-[13px] text-ink sm:px-5">
                <YesNo yes={health.personalProtection.maskRecommended}>
                  {health.personalProtection.maskRecommended
                    ? `Wear a mask outdoors (${health.personalProtection.maskType})`
                    : 'No mask needed outdoors'}
                </YesNo>
                <YesNo yes={health.personalProtection.airPurifierRecommended}>
                  {health.personalProtection.airPurifierRecommended
                    ? 'Run an air purifier indoors'
                    : 'No air purifier needed'}
                </YesNo>
              </div>
            </div>
          )}

          <p className="border-t border-line bg-surface-2 px-4 py-2 text-xs leading-[18px] text-ink-2 sm:px-5">
            {advisory.isSyntheticFallback
              ? `Produced by fixed rules in this site, not by an AI model or a public authority. ${
                  loading ? 'Gemini is writing a replacement.' : advisory.fallbackReason ?? ''
                }`
              : 'Written by an AI model from the data on this page. It is not an official BMC or health-authority notice.'}{' '}
            Generated at {formatISTTime(new Date(advisory.timestamp).getTime())} IST.
          </p>
        </div>
      )}
    </div>
  );
};
