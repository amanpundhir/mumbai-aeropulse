import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Loader2 } from 'lucide-react';
import { StationData } from '../../types/aqi';
import { EEH_GPS_COORDINATES, SEA_LINK_GPS_COORDINATES, WEH_GPS_COORDINATES } from '../../lib/coordinates';
import { bandFor } from '../../lib/aqi-utils';

export interface GoogleMapsViewProps {
  stations: StationData[];
  activeStationId: string;
  onSelectStation: (stationId: string) => void;
  showStations: boolean;
  showRadius: boolean;
  showHighways: boolean;
  onError?: (error: Error) => void;
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/* eslint-disable @typescript-eslint/no-explicit-any */
export const GoogleMapsView: React.FC<GoogleMapsViewProps> = ({
  stations,
  activeStationId,
  onSelectStation,
  showStations,
  showRadius,
  showHighways,
  onError,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const libs = useRef<{ maps: any; marker: any } | null>(null);
  const markers = useRef<any[]>([]);
  const circles = useRef<any[]>([]);
  const lines = useRef<any[]>([]);
  const onErrorRef = useRef(onError);
  const onSelectRef = useRef(onSelectStation);
  onErrorRef.current = onError;
  onSelectRef.current = onSelectStation;

  const [ready, setReady] = useState(false);

  // Load the API and create the map once.
  useEffect(() => {
    let cancelled = false;
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

    const fail = (err: Error) => {
      if (!cancelled) onErrorRef.current?.(err);
    };

    if (!apiKey) {
      fail(new Error('No Google Maps key is configured.'));
      return;
    }

    // Google reports a rejected key through this global rather than a rejected promise.
    const w = window as any;
    const previousAuthFailure = w.gm_authFailure;
    w.gm_authFailure = () => fail(new Error('Google Maps rejected the API key.'));

    const loader = new Loader({ apiKey, version: 'weekly', libraries: ['maps', 'marker'] });

    (async () => {
      try {
        const maps = (await loader.importLibrary('maps')) as any;
        const marker = (await loader.importLibrary('marker')) as any;
        if (cancelled || !mapRef.current) return;

        libs.current = { maps, marker };
        mapInstance.current = new maps.Map(mapRef.current, {
          center: { lat: 19.09, lng: 72.88 },
          zoom: 11,
          mapId,
          backgroundColor: '#18222a',
          colorScheme: 'DARK',
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });
        setReady(true);
      } catch (err) {
        fail(err instanceof Error ? err : new Error(String(err)));
      }
    })();

    return () => {
      cancelled = true;
      w.gm_authFailure = previousAuthFailure;
      markers.current.forEach((m) => (m.map = null));
      circles.current.forEach((c) => c.setMap(null));
      lines.current.forEach((l) => l.setMap(null));
      markers.current = [];
      circles.current = [];
      lines.current = [];
      mapInstance.current = null;
    };
  }, []);

  // Station markers: redrawn when the selection or data changes.
  useEffect(() => {
    if (!ready || !libs.current || !mapInstance.current) return;
    markers.current.forEach((m) => (m.map = null));
    markers.current = stations.map((st) => {
      const id = String(st.stationId || st.id);
      const active = id === String(activeStationId);
      const band = bandFor(st.latest?.pm25);
      const value = st.latest?.pm25 != null ? st.latest.pm25.toFixed(0) : '–';

      const el = document.createElement('button');
      el.type = 'button';
      el.setAttribute('aria-label', `${st.name}, PM2.5 ${value}, ${band.category}`);
      el.style.cssText = [
        'display:flex',
        'align-items:center',
        'gap:6px',
        'height:26px',
        'padding:0 9px 0 7px',
        'border-radius:8px',
        'background:#242423',
        `border:${active ? '2px solid #f1f1ef' : '1px solid #45453f'}`,
        'box-shadow:0 2px 6px -1px rgba(0,0,0,0.5)',
        'font:500 12px "Funnel Sans",system-ui,sans-serif',
        'color:#f1f1ef',
        'cursor:pointer',
        'white-space:nowrap',
      ].join(';');
      el.innerHTML = `<span style="width:10px;height:10px;border-radius:50%;background:${band.solid}"></span><span style="font-weight:${
        active ? 600 : 500
      }">${escapeHtml(st.name)}</span><span style="font-weight:600;color:${band.text};font-variant-numeric:tabular-nums">${value}</span>`;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onSelectRef.current(id);
      });

      return new libs.current!.marker.AdvancedMarkerElement({
        map: showStations ? mapInstance.current : null,
        position: { lat: st.lat, lng: st.lon },
        content: el,
        zIndex: active ? 10 : 1,
      });
    });
  }, [ready, stations, activeStationId, showStations]);

  // 3.5 km radius around each station.
  useEffect(() => {
    if (!ready || !libs.current || !mapInstance.current) return;
    circles.current.forEach((c) => c.setMap(null));
    circles.current = showRadius
      ? stations.map((st) => {
          const band = bandFor(st.latest?.pm25);
          return new libs.current!.maps.Circle({
            map: mapInstance.current,
            center: { lat: st.lat, lng: st.lon },
            radius: 3500,
            strokeColor: band.solid,
            strokeOpacity: 0.7,
            strokeWeight: 1.5,
            fillColor: band.solid,
            fillOpacity: 0.14,
            clickable: false,
          });
        })
      : [];
  }, [ready, stations, showRadius]);

  // Highway overlays.
  useEffect(() => {
    if (!ready || !libs.current || !mapInstance.current) return;
    lines.current.forEach((l) => l.setMap(null));
    lines.current = showHighways
      ? [WEH_GPS_COORDINATES, EEH_GPS_COORDINATES, SEA_LINK_GPS_COORDINATES].map(
          (coords) =>
            new libs.current!.maps.Polyline({
              map: mapInstance.current,
              path: coords.map(([lat, lng]) => ({ lat, lng })),
              geodesic: true,
              strokeColor: '#9a9b96',
              strokeOpacity: 0.75,
              strokeWeight: 3,
              clickable: false,
            })
        )
      : [];
  }, [ready, showHighways]);

  // Bring the selected station into view.
  useEffect(() => {
    if (!ready || !mapInstance.current) return;
    const target = stations.find((s) => String(s.stationId || s.id) === String(activeStationId));
    if (target) mapInstance.current.panTo({ lat: target.lat, lng: target.lon });
  }, [ready, activeStationId, stations]);

  return (
    <div className="relative h-full w-full">
      <div ref={mapRef} className="h-full w-full" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-[#18222a] text-[13px] text-ink-2">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading Google Maps…
        </div>
      )}
    </div>
  );
};
