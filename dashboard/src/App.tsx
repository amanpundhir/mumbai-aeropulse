import React, { useCallback, useMemo, useState } from 'react';
import { NAV, ServiceStatus, Sidebar, Topbar, useActiveSection } from './components/Header';
import { StationTable } from './components/stations/StationTable';
import { MapPanel } from './components/gis/MapPanel';
import { AdvisoryPanel } from './components/ai/AdvisoryPanel';
import { ForecastPanel } from './components/analytics/ForecastPanel';
import { WeatherPanel } from './components/analytics/WeatherPanel';
import { RegionalReadingsPanel } from './components/analytics/RegionalReadingsPanel';
import { AqiChip, KpiCard, UNIT } from './components/ui';

import stationsRaw from './data/stations.json';
import forecastsRaw from './data/forecasts.json';
import timeseriesHistoricalRaw from './data/timeseries_historical.json';
import weatherSummaryRaw from './data/weather_summary.json';

import { ForecastsData, StationData, TimeseriesHistoricalData, WeatherSummaryData } from './types/aqi';
import { GoogleAirQualityData } from './types/googleAirQuality';
import { AQI_SCALE, bandFor, cn, formatISTDateTime, formatISTTime, getAQICategory, toMs } from './lib/aqi-utils';
import { buildWeather, next24h, weatherAt } from './lib/series';
import { calculateDelta } from './lib/aqi-utils';

const stations = stationsRaw as StationData[];
const forecasts = forecastsRaw as ForecastsData;
const historical = timeseriesHistoricalRaw as TimeseriesHistoricalData;
const weather = weatherSummaryRaw as WeatherSummaryData;

const hasKey = (v: unknown) => typeof v === 'string' && v.trim().length > 0 && !v.startsWith('YOUR_');
const keyOf = (s: StationData) => String(s.stationId || s.id);
const SECTION_IDS = NAV.map((n) => n.id);

export const App: React.FC = () => {
  const hasGoogleMapsKey = hasKey(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);
  const hasGeminiKey = hasKey(import.meta.env.VITE_GEMINI_API_KEY);

  const worstStation = useMemo(
    () => [...stations].sort((a, b) => (b.latest?.pm25 ?? 0) - (a.latest?.pm25 ?? 0))[0],
    []
  );
  const [activeStationId, setActiveStationId] = useState<string>(() => keyOf(worstStation ?? stations[0]));
  const [googleAQ, setGoogleAQ] = useState<Record<string, GoogleAirQualityData>>({});
  const [mapsLive, setMapsLive] = useState(hasGoogleMapsKey);
  const [advisoryStatus, setAdvisoryStatus] = useState<{ live: boolean; model?: string } | null>(null);

  const activeStation = useMemo(
    () => stations.find((s) => keyOf(s) === activeStationId) ?? stations[0],
    [activeStationId]
  );
  const activeKey = keyOf(activeStation);

  const cutoff = toMs(forecasts.summary.cutoffTimestamp);
  const weatherPoints = useMemo(() => buildWeather(weather), []);

  const cityMean = useMemo(
    () => stations.reduce((acc, s) => acc + (s.latest?.pm25 ?? 0), 0) / Math.max(1, stations.length),
    []
  );

  const previous24h = useMemo(() => {
    const map: Record<string, number> = {};
    const recent = historical.recentHourly ?? [];
    const point = recent[recent.length - 25];
    if (point?.stations) Object.assign(map, point.stations);
    return map;
  }, []);

  const handleGoogleAQ = useCallback((stationKey: string, data: GoogleAirQualityData) => {
    setGoogleAQ((prev) => (prev[stationKey] === data ? prev : { ...prev, [stationKey]: data }));
  }, []);

  const handleAdvisoryStatus = useCallback((status: { live: boolean; model?: string }) => {
    setAdvisoryStatus((prev) => (prev && prev.live === status.live && prev.model === status.model ? prev : status));
  }, []);

  const activeAQ = googleAQ[activeKey];
  const aqLive = activeAQ ? activeAQ.isLive : hasGoogleMapsKey;
  const geminiLive = advisoryStatus ? advisoryStatus.live : hasGeminiKey;

  const services: ServiceStatus[] = [
    {
      name: 'Map',
      live: mapsLive,
      liveLabel: 'Google Maps',
      fallbackLabel: 'Built-in schematic',
      detail: mapsLive ? undefined : hasGoogleMapsKey ? 'Google Maps could not load with this key.' : 'No Google Maps key set.',
    },
    {
      name: 'Google Air Quality API',
      live: aqLive,
      liveLabel: 'Live',
      fallbackLabel: 'Placeholder values',
      detail: aqLive ? undefined : activeAQ?.fallbackReason ?? 'No Google Maps Platform key set.',
    },
    {
      name: 'Advisory',
      live: geminiLive,
      liveLabel: advisoryStatus?.model ? `Gemini · ${advisoryStatus.model}` : 'Gemini',
      fallbackLabel: 'Rule-based',
      detail: geminiLive ? undefined : hasGeminiKey ? 'Gemini did not answer; rules are used instead.' : 'No Gemini key set.',
    },
  ];

  const activeBand = bandFor(activeStation.latest?.pm25);
  const others = stations.filter((s) => keyOf(s) !== keyOf(worstStation));
  const cleanest = [...others].sort((a, b) => (a.latest?.pm25 ?? 0) - (b.latest?.pm25 ?? 0))[0];

  const activeSection = useActiveSection(SECTION_IDS);
  const activeNext = useMemo(() => next24h(activeKey, forecasts), [activeKey]);
  const weatherNow = useMemo(() => weatherAt(weatherPoints, cutoff), [weatherPoints, cutoff]);
  const activeDelta = calculateDelta(activeStation.latest?.pm25 ?? 0, previous24h[activeKey]);
  const shellProps = {
    stations,
    activeStationId,
    onSelectStation: setActiveStationId,
    services,
    snapshotLabel: `Readings as of ${formatISTDateTime(cutoff)}`,
  };

  return (
    <div className="min-h-screen">
      <a
        href="#overview"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:shadow-pop"
      >
        Skip to content
      </a>

      <Sidebar {...shellProps} activeSection={activeSection} />

      <div className="flex min-h-screen flex-col lg:pl-64">
      <Topbar {...shellProps} stationName={activeStation.name} activeSection={activeSection} />

      <main className="mx-auto w-full max-w-[1320px] flex-1 space-y-14 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <section id="overview" aria-labelledby="overview-title">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <div>
              <p className="eyebrow">Mumbai · four monitoring stations</p>
              <h1 id="overview-title" className="display mt-1.5 text-[32px] font-medium leading-[1.1] text-ink sm:text-[38px]">
                Air quality across Mumbai
              </h1>
              <p className="mt-3 max-w-[70ch] text-[15px] leading-6 text-ink-2">
                The four-station average is{' '}
                <span className="num font-semibold text-ink">
                  {cityMean.toFixed(1)} {UNIT}
                </span>
                , which is <span className="font-semibold text-ink">{getAQICategory(cityMean)}</span> on the CPCB
                scale. {worstStation.name} is highest at{' '}
                <span className="num font-semibold text-ink">{worstStation.latest.pm25.toFixed(0)}</span>
                {cleanest && (
                  <>
                    ; {cleanest.name} is lowest at{' '}
                    <span className="num font-semibold text-ink">{cleanest.latest.pm25.toFixed(0)}</span>
                  </>
                )}
                .
              </p>
            </div>
            <a href="#advisory" className="btn-primary">
              Read the advisory for {activeStation.name}
            </a>
          </div>

          <dl className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="City average, PM2.5"
              value={cityMean.toFixed(1)}
              unit={UNIT}
              chip={<AqiChip category={getAQICategory(cityMean)} />}
              note="Mean of the four stations"
            />
            <KpiCard
              label={`${activeStation.name} now`}
              value={(activeStation.latest?.pm25 ?? 0).toFixed(1)}
              unit={UNIT}
              chip={<AqiChip category={activeBand.category} />}
              note={
                activeDelta ? (
                  <>
                    <span className={activeDelta.direction === 'up' ? 'font-medium text-[#f29089]' : activeDelta.direction === 'down' ? 'font-medium text-[#8fd39b]' : ''}>
                      {activeDelta.text}
                    </span>{' '}
                    on the same hour yesterday
                  </>
                ) : (
                  'No reading from yesterday'
                )
              }
              accent={activeBand.solid}
            />
            <KpiCard
              label="Forecast peak, next 24 h"
              value={activeNext ? activeNext.peak.toFixed(0) : '–'}
              unit={UNIT}
              chip={activeNext ? <AqiChip category={getAQICategory(activeNext.peak)} /> : undefined}
              note={activeNext ? `At ${formatISTTime(activeNext.peakAt)} IST, higher of the two models` : 'No forecast for this station'}
            />
            <KpiCard
              label="Ventilation index"
              value={weatherNow ? Math.round(weatherNow.ventilationIndex).toLocaleString('en-IN') : '–'}
              unit="m²/s"
              note={weatherNow ? `Mixing height ${Math.round(weatherNow.pblh)} m, wind ${weatherNow.windSpeed} km/h` : 'No weather at this hour'}
            />
          </dl>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <div className="space-y-5 xl:col-span-7">
              <StationTable
                stations={stations}
                forecasts={forecasts}
                activeStationId={activeStationId}
                onSelectStation={setActiveStationId}
                previous24hReadings={previous24h}
              />

              <div className="panel">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                  <div>
                    <h2 className="text-sm font-semibold text-ink">{activeStation.fullName ?? activeStation.name}</h2>
                    <p className="mt-0.5 text-xs text-ink-2">
                      {activeStation.zone} · run by the {activeStation.agencyDescription ?? activeStation.agency}
                    </p>
                  </div>
                  <AqiChip category={activeBand.category} />
                </div>
                <div className="grid grid-cols-1 gap-x-8 gap-y-4 px-4 py-4 sm:grid-cols-2 sm:px-5">
                  <div>
                    <h3 className="text-xs font-medium text-ink-3">What {activeBand.category.toLowerCase()} air means</h3>
                    <p className="mt-1 text-[13px] leading-5 text-ink">{activeBand.description}</p>
                    {activeStation.latest?.status && (
                      <p className="mt-2 text-[13px] leading-5 text-ink-2">{activeStation.latest.status}.</p>
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-medium text-ink-3">CPCB scale for PM2.5, {UNIT}</h3>
                    <ul className="mt-1.5 space-y-1">
                      {AQI_SCALE.map((b) => {
                        const current = b.category === activeBand.category;
                        return (
                          <li
                            key={b.category}
                            className={cn(
                              'flex items-center justify-between gap-3 rounded-md px-2 py-0.5 text-[13px]',
                              current ? 'font-semibold text-ink' : 'text-ink-2'
                            )}
                            style={current ? { backgroundColor: b.tint } : undefined}
                            aria-current={current ? 'true' : undefined}
                          >
                            <span className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.solid }} aria-hidden />
                              {b.category}
                            </span>
                            <span className="num">{b.range}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line-soft px-4 py-3.5 text-[13px] sm:grid-cols-4 sm:px-5">
                  {[
                    ['Typical level', activeStation.stats?.overallMedian, 'median'],
                    ['95th percentile', activeStation.stats?.p95, 'exceeded 5% of hours'],
                    ['Highest valid hour', activeStation.stats?.max, 'since Feb 2025'],
                  ].map(([label, value, note]) => (
                    <div key={label as string}>
                      <dt className="text-xs text-ink-3">{label}</dt>
                      <dd className="mt-0.5">
                        <span className="num font-semibold text-ink">
                          {typeof value === 'number' ? value.toFixed(0) : '–'}
                        </span>{' '}
                        <span className="text-xs text-ink-3">{note}</span>
                      </dd>
                    </div>
                  ))}
                  <div>
                    <dt className="text-xs text-ink-3">Hourly readings</dt>
                    <dd className="mt-0.5">
                      <span className="num font-semibold text-ink">
                        {activeStation.stats?.cleanReadings?.toLocaleString('en-IN') ?? '–'}
                      </span>{' '}
                      <span className="text-xs text-ink-3">in the record</span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div id="gis-map-container" className="xl:col-span-5">
              <MapPanel
                stations={stations}
                activeStationId={activeStationId}
                onSelectStation={setActiveStationId}
                hasGoogleMapsKey={hasGoogleMapsKey}
                onGoogleMapsStatus={setMapsLive}
              />
            </div>
          </div>
        </section>

        <section id="advisory" aria-label="Advisory">
          <div id="gemini-advisory-container">
            <AdvisoryPanel
              station={activeStation}
              forecasts={forecasts}
              weatherPoints={weatherPoints}
              cutoff={cutoff}
              googleAirQuality={activeAQ}
              geminiConfigured={hasGeminiKey}
              onStatus={handleAdvisoryStatus}
            />
          </div>
        </section>

        <section id="forecast" aria-label="Forecast">
          <ForecastPanel station={activeStation} forecasts={forecasts} historical={historical} />
        </section>

        <section id="weather" aria-label="Weather">
          <WeatherPanel station={activeStation} weather={weather} points={weatherPoints} cutoff={cutoff} />
        </section>

        <section id="regional" aria-label="Google Air Quality readings">
          <div id="google-air-quality-container">
            <RegionalReadingsPanel station={activeStation} onLoaded={handleGoogleAQ} />
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-x-10 gap-y-5 px-4 py-8 text-[13px] leading-5 text-ink-2 sm:px-6 md:grid-cols-3 lg:px-8">
          <div>
            <p className="font-display text-[15px] font-medium text-ink">Mumbai AeroPulse</p>
            <p className="mt-1">
              Built for the Google Mumbai Air Quality Mapping &amp; Forecasting Challenge on Zindi, Creative Track.
            </p>
          </div>
          <div>
            <p className="font-medium text-ink">Data</p>
            <p className="mt-1">
              Station readings from IITM and BMC monitors via the challenge dataset. Weather from Open-Meteo. All times
              are Indian Standard Time (UTC+05:30).
            </p>
          </div>
          <div>
            <p className="font-medium text-ink">Models</p>
            <p className="mt-1">
              Submission 1 blends CatBoost and LightGBM equally. Submission 2 is CatBoost alone and is the more
              conservative forecast.
            </p>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
};

export default App;
