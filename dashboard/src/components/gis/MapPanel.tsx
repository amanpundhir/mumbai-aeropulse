import React, { useCallback, useState } from 'react';
import { Info } from 'lucide-react';
import { StationData } from '../../types/aqi';
import { AQI_SCALE } from '../../lib/aqi-utils';
import { Check, Segmented } from '../ui';
import { BuiltInMap } from './BuiltInMap';
import { GoogleMapsView } from './GoogleMapsView';

export interface MapPanelProps {
  stations: StationData[];
  activeStationId: string;
  onSelectStation: (stationId: string) => void;
  hasGoogleMapsKey: boolean;
  onGoogleMapsStatus?: (live: boolean) => void;
}

type MapMode = 'google' | 'builtin';

export const MapPanel: React.FC<MapPanelProps> = ({
  stations,
  activeStationId,
  onSelectStation,
  hasGoogleMapsKey,
  onGoogleMapsStatus,
}) => {
  const [mode, setMode] = useState<MapMode>(hasGoogleMapsKey ? 'google' : 'builtin');
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [showStations, setShowStations] = useState(true);
  const [showRadius, setShowRadius] = useState(true);
  const [showHighways, setShowHighways] = useState(true);

  const googleAvailable = hasGoogleMapsKey && !googleError;
  const showGoogle = mode === 'google' && googleAvailable;

  const handleGoogleError = useCallback(
    (err: Error) => {
      console.warn('[MapPanel] Google Maps unavailable, using the built-in map:', err.message);
      setGoogleError(err.message);
      setMode('builtin');
      onGoogleMapsStatus?.(false);
    },
    [onGoogleMapsStatus]
  );

  return (
    <div className="panel flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-2.5">
        <h3 className="text-[13px] font-semibold text-ink">Station map</h3>
        {googleAvailable && (
          <Segmented<MapMode>
            label="Map type"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'google', label: 'Google Maps' },
              { value: 'builtin', label: 'Schematic' },
            ]}
          />
        )}
      </div>

      {googleError && (
        <p role="status" className="flex items-start gap-2 border-b border-line bg-[#3a311a] px-4 py-2 text-xs leading-[18px] text-[#f2c96a]">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>Google Maps could not load ({googleError.replace(/\.$/, '')}). Showing the schematic map instead.</span>
        </p>
      )}

      <div id="station-map-canvas" className="relative min-h-[420px] flex-1 bg-[#18222a] lg:min-h-[480px]">
        <div className="absolute inset-0">
          {showGoogle ? (
            <GoogleMapsView
              stations={stations}
              activeStationId={activeStationId}
              onSelectStation={onSelectStation}
              showStations={showStations}
              showRadius={showRadius}
              showHighways={showHighways}
              onError={handleGoogleError}
            />
          ) : (
            <BuiltInMap
              stations={stations}
              activeStationId={activeStationId}
              onSelectStation={onSelectStation}
              showStations={showStations}
              showRadius={showRadius}
              showHighways={showHighways}
            />
          )}
        </div>
      </div>

      <div className="space-y-2.5 border-t border-line px-4 py-3">
        <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <legend className="sr-only">Map layers</legend>
          <Check checked={showStations} onChange={setShowStations}>
            Stations
          </Check>
          <Check checked={showRadius} onChange={setShowRadius}>
            3.5 km radius
          </Check>
          <Check checked={showHighways} onChange={setShowHighways}>
            Highways
          </Check>
        </fieldset>
        <ul className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-ink-2" aria-label="PM2.5 colour scale">
          {AQI_SCALE.map((b) => (
            <li key={b.category} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.solid }} aria-hidden />
              {b.category}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
