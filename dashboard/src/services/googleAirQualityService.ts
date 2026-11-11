// File: dashboard/src/services/googleAirQualityService.ts
// Real-time REST service for Google Maps Platform Air Quality API

import { GoogleAirQualityData, GoogleAQIIndex, GooglePollutant } from '../types/googleAirQuality';

const GOOGLE_AQ_API_ENDPOINT = 'https://airquality.googleapis.com/v1/currentConditions:lookup';

// Memory cache to avoid redundant API hits within 10 minutes
const cache = new Map<string, { data: GoogleAirQualityData; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function fetchGoogleAirQuality(
  latitude: number,
  longitude: number,
  userApiKey?: string,
  forceRefresh = false
): Promise<GoogleAirQualityData> {
  const cacheKey = `${latitude.toFixed(3)}_${longitude.toFixed(3)}`;
  const now = Date.now();

  if (!forceRefresh && cache.has(cacheKey)) {
    const cached = cache.get(cacheKey)!;
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const envApiKey =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY
      : typeof process !== 'undefined' && process.env
      ? process.env.VITE_GOOGLE_MAPS_API_KEY
      : undefined;

  const apiKey = (userApiKey && userApiKey.trim().length > 0 ? userApiKey.trim() : null) ||
    (envApiKey && envApiKey.trim().length > 0 ? envApiKey.trim() : null);

  // If no valid key is provided, return realistic fallback telemetry
  if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
    return generateFallbackAirQuality(latitude, longitude, 'No Google Maps Platform key is configured.');
  }

  try {
    const url = GOOGLE_AQ_API_ENDPOINT;
    const payload = {
      location: {
        latitude,
        longitude,
      },
      extraComputations: [
        'HEALTH_RECOMMENDATIONS',
        'DOMINANT_POLLUTANT_CONCENTRATION',
        'POLLUTANT_CONCENTRATION',
        'LOCAL_AQI',
      ],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`[GoogleAirQuality] API call returned ${response.status}: ${response.statusText}`);
      return generateFallbackAirQuality(
        latitude,
        longitude,
        response.status === 403
          ? 'The key is not allowed to use the Air Quality API (HTTP 403).'
          : `The Air Quality API returned HTTP ${response.status}.`
      );
    }

    const json = await response.json();

    const result: GoogleAirQualityData = {
      dateTime: json.dateTime || new Date().toISOString(),
      regionCode: json.regionCode || 'in',
      indexes: (json.indexes || []) as GoogleAQIIndex[],
      pollutants: (json.pollutants || []) as GooglePollutant[],
      healthRecommendations: json.healthRecommendations || {},
      isLive: true,
    };

    cache.set(cacheKey, { data: result, timestamp: now });
    return result;
  } catch (error) {
    console.warn('[GoogleAirQuality] Failed to fetch live air quality, using fallback:', error);
    return generateFallbackAirQuality(latitude, longitude, 'The Air Quality API could not be reached.');
  }
}

function generateFallbackAirQuality(
  latitude: number,
  longitude: number,
  fallbackReason?: string
): GoogleAirQualityData {
  // Approximate based on Mumbai geography (Shivaji Nagar higher, Borivali cleaner)
  const isEasternSuburbs = longitude > 72.90;
  const isNorthernSuburbs = latitude > 19.20;

  const basePM25 = isEasternSuburbs ? 105.0 : isNorthernSuburbs ? 58.0 : 75.0;
  const basePM10 = basePM25 * 1.8;

  return {
    dateTime: new Date().toISOString(),
    regionCode: 'in',
    indexes: [
      {
        code: 'uaqi',
        displayName: 'Universal AQI',
        aqi: isEasternSuburbs ? 15 : isNorthernSuburbs ? 45 : 30,
        category: isEasternSuburbs ? 'Very low air quality' : 'Moderate air quality',
        dominantPollutant: 'pm25',
        color: { red: 0.9, green: 0.3, blue: 0.2 },
      },
      {
        code: 'ind_cpcb',
        displayName: 'NAQI (IN)',
        aqi: Math.round(basePM25 * 1.6),
        category: isEasternSuburbs ? 'Poor air quality' : 'Moderate air quality',
        dominantPollutant: 'pm10',
        color: { red: 0.95, green: 0.6, blue: 0.2 },
      },
    ],
    pollutants: [
      {
        code: 'pm25',
        displayName: 'PM2.5',
        fullName: 'Fine particulate matter (<2.5µm)',
        concentration: { value: basePM25, units: 'MICROGRAMS_PER_CUBIC_METER' },
      },
      {
        code: 'pm10',
        displayName: 'PM10',
        fullName: 'Respirable suspended particulate matter (<10µm)',
        concentration: { value: basePM10, units: 'MICROGRAMS_PER_CUBIC_METER' },
      },
      {
        code: 'no2',
        displayName: 'NO2',
        fullName: 'Nitrogen dioxide',
        concentration: { value: 34.5, units: 'PARTS_PER_BILLION' },
      },
      {
        code: 'so2',
        displayName: 'SO2',
        fullName: 'Sulfur dioxide',
        concentration: { value: 5.2, units: 'PARTS_PER_BILLION' },
      },
      {
        code: 'co',
        displayName: 'CO',
        fullName: 'Carbon monoxide',
        concentration: { value: 380.0, units: 'PARTS_PER_BILLION' },
      },
      {
        code: 'o3',
        displayName: 'O3',
        fullName: 'Ozone',
        concentration: { value: 8.5, units: 'PARTS_PER_BILLION' },
      },
    ],
    healthRecommendations: {
      generalPopulation: 'Consider reducing prolonged heavy exertion outdoors if sensitive.',
      elderly: 'Limit outdoor exposure and avoid strenuous outdoor exercise.',
      children: 'Avoid outdoor sports during peak inversion hours.',
      athletes: 'Take more frequent breaks during prolonged outdoor workouts.',
    },
    isLive: false,
    fallbackReason,
  };
}
