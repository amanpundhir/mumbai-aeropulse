export type StationId = '11606' | '11611' | '3409510' | '3409511';

export type AQICategory = 
  | 'Good' 
  | 'Satisfactory' 
  | 'Moderate' 
  | 'Poor' 
  | 'Very Poor' 
  | 'Severe';

export interface StationLatest {
  timestamp: string;
  pm25: number;
  aqiCategory: AQICategory;
  aqiColor: string;
  status: string;
}

export interface StationStats {
  overallMean: number;
  cleanMean: number;
  overallMedian: number;
  min: number;
  max: number;
  rawMax: number;
  p25: number;
  p75: number;
  p95: number;
  p99: number;
  std: number;
  totalReadings: number;
  cleanReadings: number;
  spikesAbove500: number;
}

export interface StationForecastSummary {
  privateSub1Mean: number;
  privateSub2Mean: number;
  privateSpread: number;
  spread: number;
  allTestSub1Mean: number;
  allTestSub2Mean: number;
  behavior: string;
}

export interface StationData {
  id: number;
  stationId: string;
  name: string;
  fullName: string;
  agency: 'IITM' | 'BMC';
  agencyDescription: string;
  ward: string;
  zone: string;
  lat: number;
  lon: number;
  sensorId: number;
  timezone: string;
  latest: StationLatest;
  stats: StationStats;
  forecast: StationForecastSummary;
}

export interface ForecastPoint {
  id: string;
  timestamp: string;
  sub1: number;
  sub2: number;
  spread: number;
  isForecast: boolean;
  scoringBlock: 'public' | 'unscored' | 'private' | string;
  groundTruth?: number;
}

export interface ForecastsData {
  summary: {
    totalRows: number;
    matchedHistorical: number;
    forecastRows: number;
    privateWindowRows: number;
    publicWindowRows: number;
    unscoredWindowRows: number;
    startDate: string;
    endDate: string;
    cutoffTimestamp: string;
    privateWindowStart: string;
    privateWindowEnd: string;
  };
  byStation: Record<string, ForecastPoint[]>;
  timeline: Array<{
    timestamp: string;
    isForecast: boolean;
    scoringBlock: string;
    cityAvgSub1: number;
    cityAvgSub2: number;
    cityAvgSpread: number;
    cityAvgGroundTruth?: number;
  }>;
}

export interface DailyHistoryPoint {
  date: string;
  cityMean: number;
  stations: Record<string, { mean: number; min: number; max: number }>;
}

export interface RecentHourlyPoint {
  timestamp: string;
  cityMean: number;
  stations: Record<string, number>;
}

export interface TimeseriesHistoricalData {
  dailyHistory: DailyHistoryPoint[];
  recentHourly: RecentHourlyPoint[];
}

export interface WeatherHourlyPoint {
  timestamp: string;
  temp: number;
  rh: number;
  windSpeed: number;
  pblh: number;
  ventilationIndex: number;
}

export interface DiurnalProfilePoint {
  hour: number;
  avgTemp: number;
  avgRh: number;
  avgWindSpeed: number;
  avgPblh: number;
  avgVentilation: number;
}

export interface WeatherSummaryData {
  hourly: WeatherHourlyPoint[];
  diurnalProfile: DiurnalProfilePoint[];
  correlations: Record<string, {
    temp: number;
    rh: number;
    windSpeed: number;
    pblh: number;
    ventilation: number;
  }>;
  citySummary: {
    avgTemp: number;
    avgRh: number;
    avgWindSpeed: number;
    avgPblh: number;
    avgVentilation: number;
    totalHours: number;
  };
}

export type TimeRangeMode = '24h' | '7d' | 'full';

export interface ChartDataPoint {
  timestamp: string;
  displayTime: string;
  actualPM25: number | null;
  submission1: number | null;
  submission2: number | null;
  spread: number | null;
  isForecast: boolean;
  scoringBlock?: string;
  temp?: number;
  rh?: number;
  windSpeed?: number;
  pblh?: number;
  ventilationIndex?: number;
}
