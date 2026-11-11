import React, { useMemo } from 'react';
import { StationData } from '../../types/aqi';
import {
  CanvasDimensions,
  EEH_GPS_COORDINATES,
  MUMBAI_BOUNDS,
  SEA_LINK_GPS_COORDINATES,
  WEH_GPS_COORDINATES,
  projectGpsPolylineToSvgPath,
  projectGpsToCanvas,
} from '../../lib/coordinates';
import { bandFor } from '../../lib/aqi-utils';

export interface BuiltInMapProps {
  stations: StationData[];
  activeStationId: string;
  onSelectStation: (stationId: string) => void;
  showStations: boolean;
  showRadius: boolean;
  showHighways: boolean;
}

// Canvas proportions match the real ground distances of the bounding box
// (about 18.9 km east-west by 37.7 km north-south), so circles stay circular.
const CANVAS: CanvasDimensions = { width: 400, height: 740, paddingX: 30, paddingY: 30 };
const KM_PER_DEG_LAT = 110.9;
const PX_PER_KM =
  (CANVAS.height - CANVAS.paddingY * 2) / ((MUMBAI_BOUNDS.maxLat - MUMBAI_BOUNDS.minLat) * KM_PER_DEG_LAT);
const RADIUS_KM = 3.5;

const COASTLINE: Array<[number, number]> = [
  [19.26, 72.81],
  [19.23, 72.805],
  [19.2, 72.808],
  [19.165, 72.8],
  [19.135, 72.815],
  [19.1, 72.825],
  [19.06, 72.828],
  [19.04, 72.84],
  [19.02, 72.816],
  [18.995, 72.81],
  [18.955, 72.795],
  [18.94, 72.82],
  [18.91, 72.815],
  [18.905, 72.83],
  [18.925, 72.842],
  [18.96, 72.855],
  [18.99, 72.875],
  [19.015, 72.905],
  [19.035, 72.925],
  [19.07, 72.94],
  [19.105, 72.935],
  [19.145, 72.945],
  [19.18, 72.955],
  [19.225, 72.96],
  [19.255, 72.94],
  [19.26, 72.89],
  [19.26, 72.81],
];

const NATIONAL_PARK: Array<[number, number]> = [
  [19.255, 72.89],
  [19.245, 72.925],
  [19.22, 72.935],
  [19.165, 72.915],
  [19.155, 72.895],
  [19.18, 72.88],
  [19.225, 72.875],
  [19.255, 72.89],
];

const MITHI_RIVER: Array<[number, number]> = [
  [19.135, 72.905],
  [19.105, 72.885],
  [19.075, 72.87],
  [19.06, 72.855],
  [19.045, 72.842],
];

const path = (coords: Array<[number, number]>) => projectGpsPolylineToSvgPath(coords, MUMBAI_BOUNDS, CANVAS);

/** Draws a smooth curve through the given coordinates (Catmull-Rom converted to cubic Béziers). */
function smoothPath(coords: Array<[number, number]>, closed: boolean): string {
  const ring = closed && coords.length > 1 && coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1]
    ? coords.slice(0, -1)
    : coords;
  const pts = ring.map(([lat, lon]) => projectGpsToCanvas(lat, lon, MUMBAI_BOUNDS, CANVAS));
  const n = pts.length;
  if (n < 3) return path(coords);
  const at = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const tension = 0.42;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  const segments = closed ? n : n - 1;
  for (let i = 0; i < segments; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1.x + ((p2.x - p0.x) * tension) / 2;
    const c1y = p1.y + ((p2.y - p0.y) * tension) / 2;
    const c2x = p2.x - ((p3.x - p1.x) * tension) / 2;
    const c2y = p2.y - ((p3.y - p1.y) * tension) / 2;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y}`;
  }
  return closed ? `${d} Z` : d;
}

const point = (lat: number, lon: number) => projectGpsToCanvas(lat, lon, MUMBAI_BOUNDS, CANVAS);

export const BuiltInMap: React.FC<BuiltInMapProps> = ({
  stations,
  activeStationId,
  onSelectStation,
  showStations,
  showRadius,
  showHighways,
}) => {
  const shapes = useMemo(
    () => ({
      land: smoothPath(COASTLINE, true),
      park: smoothPath(NATIONAL_PARK, true),
      river: smoothPath(MITHI_RIVER, false),
      weh: smoothPath(WEH_GPS_COORDINATES, false),
      eeh: smoothPath(EEH_GPS_COORDINATES, false),
      coastal: smoothPath(SEA_LINK_GPS_COORDINATES, false),
    }),
    []
  );

  const placed = useMemo(
    () =>
      stations.map((st) => {
        const p = point(st.lat, st.lon);
        const id = String(st.stationId || st.id);
        return { st, id, x: p.x, y: p.y, band: bandFor(st.latest?.pm25), active: id === String(activeStationId) };
      }),
    [stations, activeStationId]
  );

  const park = point(19.21, 72.905);
  const sea = point(19.03, 72.79);
  const creek = point(19.1, 72.957);
  const scaleY = CANVAS.height - 18;
  const scaleX = CANVAS.width - 24 - PX_PER_KM * 5;

  return (
    <svg
      viewBox={`0 0 ${CANVAS.width} ${CANVAS.height}`}
      className="h-full w-full select-none"
      preserveAspectRatio="xMidYMid meet"
      role="group"
      aria-label="Schematic map of Mumbai showing the four monitoring stations"
    >
      <path d={shapes.land} fill="#262625" stroke="#45453f" strokeWidth="1" strokeLinejoin="round" />
      <path d={shapes.park} fill="#2a3529" stroke="#3c4c3a" strokeWidth="0.75" strokeLinejoin="round" />
      <path d={shapes.river} fill="none" stroke="#2c4152" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      <g fontFamily="inherit" fontSize="9.5" fill="#7f8f9c" pointerEvents="none">
        <text x={sea.x} y={sea.y} fontStyle="italic" textAnchor="middle">
          <tspan x={sea.x} dy="0">
            Arabian
          </tspan>
          <tspan x={sea.x} dy="12">
            Sea
          </tspan>
        </text>
        <text x={creek.x} y={creek.y} fontStyle="italic" textAnchor="middle" transform={`rotate(-72 ${creek.x} ${creek.y})`}>
          Thane Creek
        </text>
        <text x={park.x} y={park.y} textAnchor="middle" fill="#8fa68e">
          <tspan x={park.x} dy="0">
            Sanjay Gandhi
          </tspan>
          <tspan x={park.x} dy="11">
            National Park
          </tspan>
        </text>
      </g>

      {showHighways && (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
          {[shapes.weh, shapes.eeh, shapes.coastal].map((d, i) => (
            <g key={i}>
              <path d={d} stroke="#45453f" strokeWidth="3" />
              <path d={d} stroke="#5a5a54" strokeWidth="1.25" />
            </g>
          ))}
        </g>
      )}

      {showRadius &&
        placed.map(({ id, x, y, band }) => (
          <circle
            key={id}
            cx={x}
            cy={y}
            r={PX_PER_KM * RADIUS_KM}
            fill={band.solid}
            fillOpacity="0.14"
            stroke={band.solid}
            strokeOpacity="0.55"
            strokeWidth="1"
            pointerEvents="none"
          />
        ))}

      {showStations &&
        [...placed]
          .sort((a, b) => Number(a.active) - Number(b.active))
          .map(({ st, id, x, y, band, active }) => {
            const value = st.latest?.pm25 != null ? st.latest.pm25.toFixed(0) : '–';
            const labelLeft = x > CANVAS.width * 0.62;
            const nameWidth = st.name.length * 6.3 + value.length * 7 + 26;
            const lx = labelLeft ? x - 14 - nameWidth : x + 14;
            return (
              <g
                key={id}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-label={`${st.name}, PM2.5 ${value}, ${band.category}`}
                onClick={() => onSelectStation(id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectStation(id);
                  }
                }}
                className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-[#8fa68e] [&:focus-visible>rect]:stroke-2"
              >
                {active && <circle cx={x} cy={y} r="13" fill="none" stroke="#f1f1ef" strokeWidth="2" />}
                <circle cx={x} cy={y} r="8" fill={band.solid} stroke="#1c1c1c" strokeWidth="2" />
                <rect
                  x={lx}
                  y={y - 11}
                  width={nameWidth}
                  height="22"
                  rx="6"
                  fill="#242423"
                  stroke={active ? '#f1f1ef' : '#45453f'}
                  strokeWidth={active ? 1.5 : 1}
                />
                <text x={lx + 8} y={y + 4} fontSize="11" fontWeight={active ? 600 : 500} fill="#f1f1ef">
                  {st.name}
                </text>
                <text
                  x={lx + nameWidth - 8}
                  y={y + 4}
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="end"
                  fill={band.text}
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {value}
                </text>
              </g>
            );
          })}

      <g pointerEvents="none">
        <path
          d={`M ${scaleX} ${scaleY - 4} V ${scaleY} H ${scaleX + PX_PER_KM * 5} V ${scaleY - 4}`}
          fill="none"
          stroke="#7f8f9c"
          strokeWidth="1"
        />
        <text x={scaleX + (PX_PER_KM * 5) / 2} y={scaleY - 6} fontSize="9" fill="#7f8f9c" textAnchor="middle">
          5 km
        </text>
      </g>
    </svg>
  );
};
