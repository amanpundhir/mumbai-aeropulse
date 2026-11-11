// File: dashboard/src/services/syntheticAdvisoryEngine.ts
// Deterministic High-Fidelity Context-Sensitive Civic Simulation Engine for Mumbai Air Quality

import {
  GeminiAdvisoryResponse,
  MunicipalIntervention,
  StationContextInput,
} from '../types/advisory';

export function generateSyntheticAdvisory(context: StationContextInput): GeminiAdvisoryResponse {
  const {
    stationName,
    currentPM25,
    aqiCategory,
    pblh,
    windSpeed,
    forecastTrend,
    forecastNext24hPeak,
    ventilationIndex,
  } = context;

  // Station-specific geographic context
  const isShivajiNagar = stationName.includes('Shivaji Nagar');
  const isByculla = stationName.includes('Byculla');
  const isMalad = stationName.includes('Malad');
  const isBorivali = stationName.includes('Borivali');

  let alertLevel: 'Green (Normal)' | 'Yellow (Elevated Caution)' | 'Orange (Substantial Alert)' | 'Red (Emergency)';
  let priorityScore: number;
  let riskBadge: 'Safe' | 'Moderate Concern' | 'Unhealthy' | 'Hazardous';
  let maskRecommended = false;
  let maskType: 'None' | 'Cloth/Surgical' | 'N95 / FFP2' = 'None';
  let mistCannons = 2;
  let smogGuns = 1;
  let sweepers = 2;
  let patrols = 2;

  if (currentPM25 > 120 || aqiCategory === 'Very Poor' || aqiCategory === 'Severe') {
    alertLevel = 'Red (Emergency)';
    priorityScore = 9;
    riskBadge = 'Hazardous';
    maskRecommended = true;
    maskType = 'N95 / FFP2';
    mistCannons = 6;
    smogGuns = 4;
    sweepers = 5;
    patrols = 6;
  } else if (currentPM25 > 60 || aqiCategory === 'Poor') {
    alertLevel = 'Orange (Substantial Alert)';
    priorityScore = 7;
    riskBadge = 'Unhealthy';
    maskRecommended = true;
    maskType = 'N95 / FFP2';
    mistCannons = 4;
    smogGuns = 3;
    sweepers = 4;
    patrols = 4;
  } else if (currentPM25 > 30 || aqiCategory === 'Moderate') {
    alertLevel = 'Yellow (Elevated Caution)';
    priorityScore = 4;
    riskBadge = 'Moderate Concern';
    maskRecommended = false;
    maskType = 'Cloth/Surgical';
    mistCannons = 2;
    smogGuns = 1;
    sweepers = 2;
    patrols = 2;
  } else {
    alertLevel = 'Green (Normal)';
    priorityScore = 2;
    riskBadge = 'Safe';
    maskRecommended = false;
    maskType = 'None';
    mistCannons = 1;
    smogGuns = 0;
    sweepers = 1;
    patrols = 1;
  }

  // Atmospheric Summary based on PBLH and micro-meteorology
  let atmosphericSummary = '';
  if (pblh < 250) {
    atmosphericSummary = `A shallow nocturnal planetary boundary layer (${Math.round(pblh)}m) under stagnant wind speeds (${windSpeed.toFixed(1)} km/h) has created a ground-level thermal inversion trap across the Mumbai metropolitan basin, preventing vertical pollutant dispersion.`;
  } else if (windSpeed > 10) {
    atmosphericSummary = `Moderate coastal maritime ventilation is active, with afternoon sea breezes elevating the mixing layer (${Math.round(pblh)}m) and diluting localized particulate plumes toward the interior mainland.`;
  } else {
    atmosphericSummary = `Stable atmospheric boundary conditions prevail with a boundary layer height of ${Math.round(pblh)}m and ventilation index of ${Math.round(ventilationIndex)}, maintaining moderate particulate concentration levels across the coastal airshed.`;
  }

  // Trajectory Summary grounded in multi-model blend
  const forecastTrajectoryAnalysis = `The 48-hour multi-model ensemble (CatBoost + LightGBM) indicates a ${forecastTrend} pollution curve, with a projected peak of ${forecastNext24hPeak.toFixed(1)} µg/m³ occurring during the early morning commuter and inversion confluence (06:00–08:30 IST).`;

  // Municipal Interventions strictly tailored to the 4 stations
  const interventions: MunicipalIntervention[] = [];

  if (isShivajiNagar) {
    interventions.push(
      {
        category: 'Dust Suppression',
        action: 'Deploy mobile mist cannon arrays along Ghatkopar-Mankhurd Link Road and Govandi Station Road.',
        targetLocation: 'Ward M-East (Govandi / Deonar periphery)',
        urgency: currentPM25 > 100 ? 'Immediate (0-2h)' : 'Short-Term (2-6h)',
        operationalDetails: 'Continuous high-pressure mist spraying to capture airborne flyash and resuspended silt.'
      },
      {
        category: 'Industrial & Waste',
        action: 'Thermal camera perimeter patrols around the Deonar dumping grounds to prevent open waste combustion.',
        targetLocation: 'Deonar Solid Waste Management Complex',
        urgency: 'Immediate (0-2h)',
        operationalDetails: 'Enforce Section 144 civic guidelines against localized biomass or garbage smouldering.'
      },
      {
        category: 'Traffic Diversion',
        action: 'Reroute heavy diesel transport trucks along Eastern Freeway outer bypass.',
        targetLocation: 'Sion-Panvel Expressway / Shivaji Nagar Junction',
        urgency: 'Short-Term (2-6h)',
        operationalDetails: 'Restrict non-essential multi-axle freight vehicles during peak inversion hours (22:00–07:00).'
      }
    );
  } else if (isByculla) {
    interventions.push(
      {
        category: 'Traffic Diversion',
        action: 'Synchronize traffic light timing at Dr. Babasaheb Ambedkar Road and Byculla Fire Station junction.',
        targetLocation: 'Ward E (Dr. B.A. Road & P D’Mello corridor)',
        urgency: 'Immediate (0-2h)',
        operationalDetails: 'Mitigate stop-and-go diesel exhaust idling near JJ Hospital healthcare buffer zone.'
      },
      {
        category: 'Construction Regulation',
        action: 'Mandatory continuous water sprinkling and 35-foot green dust-netting at all redevelopment high-rises.',
        targetLocation: 'Mazgaon & Byculla East construction corridor',
        urgency: 'Short-Term (2-6h)',
        operationalDetails: 'Inspect active high-rise construction sites; issue stop-work notices for dry unshielded cutting.'
      },
      {
        category: 'Dust Suppression',
        action: 'Deploy mechanical sweepers with vacuum filtration along Byculla Bridge.',
        targetLocation: 'Byculla Railway Station Flyover and Clare Road',
        urgency: 'Scheduled (Next 24h)',
        operationalDetails: 'Prevent heavy silt buildup from port access traffic corridors.'
      }
    );
  } else if (isMalad) {
    interventions.push(
      {
        category: 'Construction Regulation',
        action: 'Enforce BMC clean construction compliance across Mindspace commercial IT park projects.',
        targetLocation: 'Ward P-North (New Link Road & Chincholi Bunder)',
        urgency: 'Immediate (0-2h)',
        operationalDetails: 'Ensure all transit dumpers carry automated tarpaulin covers and tire wash baths upon site exit.'
      },
      {
        category: 'Dust Suppression',
        action: 'Deploy stationary anti-smog mist cannons at Malad SV Road metro interchange.',
        targetLocation: 'SV Road & Marve Road intersection',
        urgency: 'Short-Term (2-6h)',
        operationalDetails: 'Mitigate localized dust resuspension generated by heavy suburban commercial traffic.'
      },
      {
        category: 'Rapid Response',
        action: 'Inspect coastal mangrove buffer zone for unauthorized industrial scrap burning.',
        targetLocation: 'Malad Creek / Marve coastal belt',
        urgency: 'Scheduled (Next 24h)',
        operationalDetails: 'Joint patrol with Maharashtra Coastal Zone Management Authority.'
      }
    );
  } else if (isBorivali) {
    // Borivali East
    interventions.push(
      {
        category: 'Dust Suppression',
        action: 'Intensive water-washing and mist cannon deployment on Western Express Highway transit corridor.',
        targetLocation: 'Ward R-Central (WEH Magathane & National Park flyover)',
        urgency: 'Immediate (0-2h)',
        operationalDetails: 'Suppress high-velocity vehicular dust along the 8-lane expressway corridor.'
      },
      {
        category: 'Rapid Response',
        action: 'Ecological air corridor monitoring along Sanjay Gandhi National Park (SGNP) boundary.',
        targetLocation: 'SGNP Forest Fringe & Kulupwadi Road',
        urgency: 'Short-Term (2-6h)',
        operationalDetails: 'Ensure vegetative bio-filter zones remain free of localized combustion or dust dumping.'
      },
      {
        category: 'Traffic Diversion',
        action: 'Optimize Dahisar Toll Plaza electronic fast-tag lanes to eliminate vehicular queueing idling.',
        targetLocation: 'Dahisar Check Naka Northern Border',
        urgency: 'Short-Term (2-6h)',
        operationalDetails: 'Divert out-of-state diesel transport during nocturnal thermal inversion periods.'
      }
    );
  } else {
    // General Mumbai Metropolitan fallback
    interventions.push(
      {
        category: 'Dust Suppression',
        action: `Intensive water misting and mechanical sweeping across arterial transit corridors.`,
        targetLocation: `${stationName} Vicinity`,
        urgency: 'Immediate (0-2h)',
        operationalDetails: 'Continuous high-pressure water sprinkling on major transit routes.'
      },
      {
        category: 'Construction Regulation',
        action: 'Inspect active construction sites for dust barrier compliance and wet suppression.',
        targetLocation: `${stationName} Ward Zone`,
        urgency: 'Short-Term (2-6h)',
        operationalDetails: 'Enforce BMC clean air construction bylaws and particulate shielding.'
      }
    );
  }

  // Civic Directive under municipal authority
  const civicDirective = `Directive issued under BMC Act Sec 368 & Disaster Management Framework: Ward Officers are directed to activate Stage-${
    priorityScore > 7 ? 'III' : priorityScore > 4 ? 'II' : 'I'
  } air mitigation protocols immediately, prioritizing misting suppression and vehicular regulation across ${stationName}.`;

  // Citizen Guidance tailored to concentration levels
  const generalPublicGuidance =
    currentPM25 > 90
      ? 'Air quality is substantially degraded. Healthy adults should reduce prolonged outdoor exertion. Wear N95 protection near major roadways.'
      : currentPM25 > 60
      ? 'Air quality is moderately impacted. Sensitive individuals may experience minor cough or throat irritation. Consider outdoor activities in afternoon hours.'
      : 'Air quality is within acceptable parameters. Normal outdoor athletic and civic activities may proceed.';

  const vulnerablePopulations = {
    childrenAndSchools:
      currentPM25 > 90
        ? 'Mandatory cancellation or relocation of morning physical education and outdoor sports to ventilated indoor spaces.'
        : 'Maintain scheduled activities; advise asthmatic students to carry rescue inhalers.',
    elderlyAndCardiorespiratory:
      currentPM25 > 80
        ? 'Avoid early morning walks (05:00–08:30 IST) when ground inversion traps fine particulates. Keep home windows sealed.'
        : 'Safe for moderate walks during midday when solar heating opens the planetary boundary layer.',
    activeAthletesJoggers:
      currentPM25 > 80
        ? 'Postpone intensive aerobic runs to the afternoon (14:00–17:00 IST) when maritime sea breezes disperse localized PM2.5.'
        : 'Morning jogging is acceptable; avoid main arterial highways and truck transit corridors.'
  };

  const personalProtection = {
    maskRecommended,
    maskType,
    airPurifierRecommended: currentPM25 > 80,
    ventilationAdvice:
      pblh < 300
        ? 'Keep windows closed between 22:00 and 09:00 IST to seal against nocturnal inversion traps; ventilate freely during 13:00–17:00 IST.'
        : 'Natural cross-ventilation is safe; open ocean-facing windows during afternoon sea breeze circulation.'
  };

  const keyTakeaway =
    currentPM25 > 90
      ? `Elevated fine particulates require swift municipal misting in ${stationName} and proactive respiratory protection for sensitive citizens.`
      : `Stable air quality with moderate morning boundary layer compression; standard civic maintenance protocols apply.`;

  return {
    timestamp: new Date().toISOString(),
    stationName,
    currentPM25,
    aqiCategory,
    atmosphericSummary,
    forecastTrajectoryAnalysis,
    municipalActionPlan: {
      alertLevel,
      priorityScore,
      civicDirective,
      interventions,
      equipmentDeployment: {
        antiSmogGuns: smogGuns,
        mistCannonVehicles: mistCannons,
        mechanicalSweepers: sweepers,
        enforcementPatrols: patrols
      }
    },
    citizenHealthAdvisory: {
      riskLevelBadge: riskBadge,
      generalPublicGuidance,
      vulnerablePopulations,
      personalProtection
    },
    keyTakeaway,
    isSyntheticFallback: true
  };
}
