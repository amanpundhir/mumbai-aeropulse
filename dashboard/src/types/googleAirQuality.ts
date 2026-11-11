// File: dashboard/src/types/googleAirQuality.ts
// Strict TypeScript definitions for Google Maps Platform Air Quality API

export interface GoogleAQIIndex {
  code: string; // 'uaqi' | 'ind_cpcb'
  displayName: string;
  aqi: number;
  aqiDisplay?: string;
  color: {
    red: number;
    green: number;
    blue?: number;
  };
  category: string;
  dominantPollutant: string;
}

export interface GooglePollutant {
  code: string; // 'pm25' | 'pm10' | 'no2' | 'so2' | 'co' | 'o3' | 'nh3'
  displayName: string;
  fullName: string;
  concentration: {
    value: number;
    units: string; // 'MICROGRAMS_PER_CUBIC_METER' | 'PARTS_PER_BILLION'
  };
}

export interface GoogleHealthRecommendations {
  generalPopulation?: string;
  elderly?: string;
  lungDiseasePopulation?: string;
  heartDiseasePopulation?: string;
  athletes?: string;
  pregnantWomen?: string;
  children?: string;
}

export interface GoogleAirQualityData {
  dateTime: string;
  regionCode: string;
  indexes: GoogleAQIIndex[];
  pollutants: GooglePollutant[];
  healthRecommendations: GoogleHealthRecommendations;
  isLive: boolean;
  /** Why estimated values are shown instead of the live API, when they are. */
  fallbackReason?: string;
}
