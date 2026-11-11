// File: dashboard/src/types/advisory.ts
// Contract definitions for Mumbai AeroPulse Gemini AI & Civic Advisory Engine

export type AQICategory = 
  | 'Good' 
  | 'Satisfactory' 
  | 'Moderate' 
  | 'Poor' 
  | 'Very Poor' 
  | 'Severe';

export interface MunicipalIntervention {
  category: 'Dust Suppression' | 'Traffic Diversion' | 'Construction Regulation' | 'Industrial & Waste' | 'Rapid Response';
  action: string;
  targetLocation: string;
  urgency: 'Immediate (0-2h)' | 'Short-Term (2-6h)' | 'Scheduled (Next 24h)';
  operationalDetails: string;
}

export interface EquipmentDeployment {
  antiSmogGuns: number;
  mistCannonVehicles: number;
  mechanicalSweepers: number;
  enforcementPatrols: number;
}

export interface MunicipalActionPlan {
  alertLevel: 'Green (Normal)' | 'Yellow (Elevated Caution)' | 'Orange (Substantial Alert)' | 'Red (Emergency)';
  priorityScore: number; // 1-10
  civicDirective: string;
  interventions: MunicipalIntervention[];
  equipmentDeployment: EquipmentDeployment;
}

export interface VulnerablePopulationsGuidance {
  childrenAndSchools: string;
  elderlyAndCardiorespiratory: string;
  activeAthletesJoggers: string;
}

export interface PersonalProtection {
  maskRecommended: boolean;
  maskType: 'None' | 'Cloth/Surgical' | 'N95 / FFP2';
  airPurifierRecommended: boolean;
  ventilationAdvice: string;
}

export interface CitizenHealthAdvisory {
  riskLevelBadge: 'Safe' | 'Moderate Concern' | 'Unhealthy' | 'Hazardous';
  generalPublicGuidance: string;
  vulnerablePopulations: VulnerablePopulationsGuidance;
  personalProtection: PersonalProtection;
}

export interface GeminiAdvisoryResponse {
  timestamp: string;
  stationName: string;
  currentPM25: number;
  aqiCategory: AQICategory;
  atmosphericSummary: string;
  forecastTrajectoryAnalysis: string;
  municipalActionPlan: MunicipalActionPlan;
  citizenHealthAdvisory: CitizenHealthAdvisory;
  keyTakeaway: string;
  isSyntheticFallback: boolean;
  /** Why the rule-based advisory was used instead of Gemini, when it was. */
  fallbackReason?: string;
  /** Gemini model that produced the advisory, when live. */
  model?: string;
}

export interface StationContextInput {
  stationName: string;
  stationId: string;
  latitude: number;
  longitude: number;
  ward?: string;
  currentPM25: number;
  aqiCategory: AQICategory;
  temperature: number;
  humidity: number;
  windSpeed: number;
  pblh: number; // Planetary Boundary Layer Height (meters)
  ventilationIndex: number;
  forecastNext24hPeak: number;
  forecastTrend: 'improving' | 'deteriorating' | 'stable';
  primaryBlendForecast48h?: number[];
  conservativeHedgeForecast48h?: number[];
  googleLivePM25?: number;
  googleLivePM10?: number;
  googleUniversalAQI?: number;
  googleDominantPollutant?: string;
}
