/**
 * Mumbai Geographic Bounding Box & Cartographic Projection System
 * 
 * Maps GPS coordinates (latitude, longitude) of Mumbai Metropolitan Region
 * to 2D SVG canvas coordinates (viewBox: 0 0 500 700).
 */

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
  paddingX: number;
  paddingY: number;
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Mumbai Geographic Bounding Box covering Salsette Island and South Mumbai peninsula:
 * - South: Colaba / Mumbai Port (~18.92° N)
 * - North: Dahisar / Borivali / SGNP North boundary (~19.26° N)
 * - West: Arabian Sea coastline / Gorai / Versova (~72.78° E)
 * - East: Thane Creek / Mulund / Vashi channel (~72.96° E)
 */
export const MUMBAI_BOUNDS: BoundingBox = {
  minLat: 18.92,
  maxLat: 19.26,
  minLon: 72.78,
  maxLon: 72.96,
};

/**
 * Default SVG Canvas parameters for the interactive cartographic view
 */
export const DEFAULT_CANVAS: CanvasDimensions = {
  width: 500,
  height: 700,
  paddingX: 45,
  paddingY: 50,
};

/**
 * Projects GPS (lat, lon) coordinates to SVG canvas space (x, y)
 * In standard cartography, latitude points North (up), while SVG y-axis points down.
 * 
 * @param lat Latitude in decimal degrees (e.g., 19.23241)
 * @param lon Longitude in decimal degrees (e.g., 72.86895)
 * @param bounds Geographic bounding box
 * @param canvas Canvas dimensions with padding
 * @returns Projected Point2D { x, y }
 */
export function projectGpsToCanvas(
  lat: number,
  lon: number,
  bounds: BoundingBox = MUMBAI_BOUNDS,
  canvas: CanvasDimensions = DEFAULT_CANVAS
): Point2D {
  const innerWidth = canvas.width - canvas.paddingX * 2;
  const innerHeight = canvas.height - canvas.paddingY * 2;

  // Clamp normalized values to ensure points stay within canvas margins
  const normX = Math.max(0, Math.min(1, (lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)));
  const normY = Math.max(0, Math.min(1, (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)));

  // X maps left to right (West to East)
  const x = canvas.paddingX + normX * innerWidth;
  // Y maps bottom to top (South to North, so invert for SVG)
  const y = canvas.height - canvas.paddingY - normY * innerHeight;

  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
  };
}

/**
 * Inverse projection: maps SVG canvas space (x, y) back to GPS (lat, lon)
 */
export function projectCanvasToGps(
  x: number,
  y: number,
  bounds: BoundingBox = MUMBAI_BOUNDS,
  canvas: CanvasDimensions = DEFAULT_CANVAS
): { lat: number; lon: number } {
  const innerWidth = canvas.width - canvas.paddingX * 2;
  const innerHeight = canvas.height - canvas.paddingY * 2;

  const normX = (x - canvas.paddingX) / innerWidth;
  const normY = (canvas.height - canvas.paddingY - y) / innerHeight;

  const lon = bounds.minLon + normX * (bounds.maxLon - bounds.minLon);
  const lat = bounds.minLat + normY * (bounds.maxLat - bounds.minLat);

  return {
    lat: Number(lat.toFixed(6)),
    lon: Number(lon.toFixed(6)),
  };
}

/**
 * Format GPS coordinates into human-readable notation (e.g., "19.2324°N, 72.8690°E")
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`;
}

/**
 * Calculate Great-Circle distance between two GPS coordinates using the Haversine formula (km)
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(2));
}

/**
 * Major Mumbai Urban Transit Corridors (Highways & Arterials) in GPS coordinates.
 * Projecting these coordinates creates realistic SVG overlays for spatial context.
 */

// Western Express Highway (WEH / NH 48) corridor from Dahisar Check Naka to Bandra
export const WEH_GPS_COORDINATES: Array<[number, number]> = [
  [19.255, 72.866], // Dahisar Check Naka
  [19.230, 72.864], // Borivali East / National Park flyover
  [19.208, 72.859], // Kandivali East / Samata Nagar
  [19.176, 72.858], // Malad East / Pushpa Park
  [19.155, 72.856], // Goregaon East / Hub Mall
  [19.123, 72.852], // Jogeshwari East / JVLR junction
  [19.114, 72.854], // Andheri East / Gundavali
  [19.096, 72.855], // Vile Parle / Domestic Airport
  [19.064, 72.846], // Santacruz / Vakola
  [19.055, 72.844], // Bandra Kalanagar junction
];

// Eastern Express Highway (EEH) corridor from Mulund to Sion / Priyadarshini
export const EEH_GPS_COORDINATES: Array<[number, number]> = [
  [19.215, 72.955], // Mulund Toll Plaza
  [19.185, 72.938], // Bhandup / Kanjurmarg
  [19.128, 72.925], // Vikhroli Godrej campus
  [19.080, 72.915], // Ghatkopar East / Chedda Nagar
  [19.052, 72.887], // Chembur / Amar Mahal junction
  [19.038, 72.863], // Sion Circle / Priyadarshini Park
];

// Bandra-Worli Sea Link & Coastal Road Spine
export const SEA_LINK_GPS_COORDINATES: Array<[number, number]> = [
  [19.052, 72.830], // Bandra Reclamation
  [19.035, 72.818], // Cable-stayed main span
  [19.018, 72.814], // Worli Sea Face entry
  [19.005, 72.812], // Haji Ali coastal link
  [18.968, 72.805], // Marine Drive / Girgaon Chowpatty
  [18.922, 72.825], // Nariman Point / Colaba
];

/**
 * Projects an array of GPS [lat, lon] tuples into an SVG path "d" string
 */
export function projectGpsPolylineToSvgPath(
  coords: Array<[number, number]>,
  bounds: BoundingBox = MUMBAI_BOUNDS,
  canvas: CanvasDimensions = DEFAULT_CANVAS
): string {
  if (!coords || coords.length === 0) return '';
  return coords
    .map(([lat, lon], idx) => {
      const pt = projectGpsToCanvas(lat, lon, bounds, canvas);
      return `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`;
    })
    .join(' ');
}
