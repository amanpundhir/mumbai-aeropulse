// File: dashboard/src/services/geminiService.ts
// Client-side REST service for Gemini AI Dual-Perspective Intelligence Engine

import { GeminiAdvisoryResponse, StationContextInput } from '../types/advisory';
import { generateSyntheticAdvisory } from './syntheticAdvisoryEngine';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
// A Google-maintained alias that always points at the current Flash model.
const DEFAULT_MODEL = 'gemini-flash-latest';
const REQUEST_TIMEOUT_MS = 25000;
const TOTAL_BUDGET_MS = 55000;

function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/** The model that last answered successfully; reused for later requests. */
let resolvedModel: string | null = null;
let rankedModels: string[] | null = null;

/** Lists the text models this key can call, best match first. */
async function listAvailableModels(apiKey: string, signal: AbortSignal): Promise<string[]> {
  if (rankedModels) return rankedModels;
  try {
    const res = await fetch(`${GEMINI_API_BASE}?pageSize=200`, {
      headers: { 'x-goog-api-key': apiKey },
      signal,
    });
    if (!res.ok) return [];
    const json = await res.json();
    const names: string[] = (json?.models ?? [])
      .filter((m: any) => (m?.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((m: any) => String(m?.name ?? '').replace(/^models\//, ''))
      .filter((n: string) => n.startsWith('gemini'));
    const special = /(image|tts|audio|live|embed|vision|thinking|exp|computer|robotics|learn|native)/i;
    const general = names.filter((n) => !special.test(n));
    const version = (n: string) => parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? '0');
    const rank = (n: string) =>
      version(n) * 100 +
      (n.includes('flash') ? 20 : 0) -
      (n.includes('lite') ? 5 : 0) -
      (n.includes('preview') ? 3 : 0) -
      (/-\d{3,}$/.test(n) ? 1 : 0);
    const pool = general.length ? general : names;
    const flash = pool.filter((n) => n.includes('flash'));
    const ranked = (flash.length ? flash : pool).sort((x, y) => rank(y) - rank(x));
    // The maintained alias goes first when the key offers it.
    rankedModels = names.includes(DEFAULT_MODEL) ? [DEFAULT_MODEL, ...ranked.filter((n) => n !== DEFAULT_MODEL)] : ranked;
    return rankedModels;
  } catch {
    return [];
  }
}

export async function fetchGeminiAdvisory(
  context: StationContextInput,
  userApiKey?: string,
  modelName?: string
): Promise<GeminiAdvisoryResponse> {
  const envGeminiKey =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_GEMINI_API_KEY
      : typeof process !== 'undefined' && process.env
      ? process.env.VITE_GEMINI_API_KEY
      : undefined;

  const envGeminiModel =
    typeof import.meta !== 'undefined' && import.meta.env
      ? import.meta.env.VITE_GEMINI_MODEL
      : typeof process !== 'undefined' && process.env
      ? process.env.VITE_GEMINI_MODEL
      : undefined;

  const apiKey =
    (userApiKey && userApiKey.trim().length > 0 ? userApiKey.trim() : null) ||
    (envGeminiKey && envGeminiKey.trim().length > 0 ? envGeminiKey.trim() : null);

  const selectedModel =
    resolvedModel ||
    modelName ||
    (envGeminiModel && envGeminiModel.trim().length > 0
      ? envGeminiModel.trim()
      : DEFAULT_MODEL);

  // If no API key is provided, seamlessly and silently fall back to synthetic simulation
  const fallback = (reason: string): GeminiAdvisoryResponse => ({
    ...generateSyntheticAdvisory(context),
    fallbackReason: reason,
  });

  if (!apiKey) {
    return fallback('No Gemini API key is configured.');
  }

  const systemInstruction = `You are the chief environmental intelligence system for Mumbai, working jointly with the Brihanmumbai Municipal Corporation (BMC), Maharashtra Pollution Control Board (MPCB), and public health authorities.
You synthesize ground-truth ambient PM2.5 readings, atmospheric boundary layer dynamics (PBLH, ventilation index, coastal land-sea breeze circulation), and 48-hour multi-model machine learning forecasts.
Your mission is to generate actionable, hyper-localized civic advisories with zero hallucination.
Output ONLY a strict JSON object conforming to the requested schema.`;

  const prompt = `Analyze current air quality and 48-hour forecast for Mumbai monitoring station:
- Station Name: ${context.stationName} (ID: ${context.stationId}, Ward: ${context.ward || 'Unknown'}, Coords: ${context.latitude}, ${context.longitude})
- Current PM2.5: ${context.currentPM25.toFixed(1)} µg/m³ (${context.aqiCategory})
${context.googleLivePM25 != null ? `- Google Environmental API (Live Satellite Stream): PM2.5: ${context.googleLivePM25.toFixed(1)} µg/m³, PM10: ${context.googleLivePM10?.toFixed(1) ?? 'N/A'} µg/m³, UAQI: ${context.googleUniversalAQI ?? 'N/A'}, Dominant: ${context.googleDominantPollutant || 'pm25'}\n` : ''}- Micro-Meteorology: Temp ${context.temperature.toFixed(1)}°C, RH ${context.humidity.toFixed(0)}%, Wind ${context.windSpeed.toFixed(1)} km/h, PBLH ${Math.round(context.pblh)}m, Ventilation Index: ${Math.round(context.ventilationIndex)}
- 48-Hour ML Forecast Trajectory: Peak expected ${context.forecastNext24hPeak.toFixed(1)} µg/m³; Trend: ${context.forecastTrend}
- Ensemble Context: Primary Blend (50% CatBoost + 50% LightGBM) vs Conservative Hedge.

Generate a dual-perspective advisory:
1. Municipal Action Plan for BMC: targeted ward-level interventions (mist cannon deployment, dust suppression, traffic re-routing, construction halts).
2. Citizen & Public Health Advisory: vulnerable demographic cautions (asthma, elderly, schools, outdoor jogging, N95 masks).

Return strictly a JSON object with this structure:
{
  "timestamp": "${new Date().toISOString()}",
  "stationName": "${context.stationName}",
  "currentPM25": ${context.currentPM25},
  "aqiCategory": "${context.aqiCategory}",
  "atmosphericSummary": "2-3 sentences explaining boundary layer and meteorological causes",
  "forecastTrajectoryAnalysis": "2-3 sentences on 48h outlook and model convergence",
  "municipalActionPlan": {
    "alertLevel": "Green (Normal)" | "Yellow (Elevated Caution)" | "Orange (Substantial Alert)" | "Red (Emergency)",
    "priorityScore": number (1-10),
    "civicDirective": "Official executive directive string",
    "interventions": [
      {
        "category": "Dust Suppression" | "Traffic Diversion" | "Construction Regulation" | "Industrial & Waste" | "Rapid Response",
        "action": "string",
        "targetLocation": "string",
        "urgency": "Immediate (0-2h)" | "Short-Term (2-6h)" | "Scheduled (Next 24h)",
        "operationalDetails": "string"
      }
    ],
    "equipmentDeployment": {
      "antiSmogGuns": number,
      "mistCannonVehicles": number,
      "mechanicalSweepers": number,
      "enforcementPatrols": number
    }
  },
  "citizenHealthAdvisory": {
    "riskLevelBadge": "Safe" | "Moderate Concern" | "Unhealthy" | "Hazardous",
    "generalPublicGuidance": "string",
    "vulnerablePopulations": {
      "childrenAndSchools": "string",
      "elderlyAndCardiorespiratory": "string",
      "activeAthletesJoggers": "string"
    },
    "personalProtection": {
      "maskRecommended": boolean,
      "maskType": "None" | "Cloth/Surgical" | "N95 / FFP2",
      "airPurifierRecommended": boolean,
      "ventilationAdvice": "string"
    }
  },
  "keyTakeaway": "Single punchy executive sentence"
}`;

  try {
    // Each attempt gets its own time limit; newer models can take a while to answer.
    const withTimeout = async <T,>(ms: number, run: (signal: AbortSignal) => Promise<T>): Promise<T> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), ms);
      try {
        return await run(controller.signal);
      } finally {
        clearTimeout(timer);
      }
    };

    const send = (model: string) =>
      withTimeout(REQUEST_TIMEOUT_MS, (signal) =>
      fetch(`${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
        },
      }),
    }));

    // Model names are retired over time and individual models get overloaded. Start with
    // the configured model; if it is gone (404) or busy (500/503), ask the API which
    // models this key can use and work down that list.
    const MAX_MODELS = 4;
    const startedAt = performance.now();
    const queue: string[] = [selectedModel];
    const tried = new Set<string>();
    let listed = false;
    let usedModel = selectedModel;
    let response: Response | null = null;

    while (queue.length && tried.size < MAX_MODELS) {
      usedModel = queue.shift() as string;
      if (tried.has(usedModel)) continue;
      tried.add(usedModel);

      // A model that hangs is treated like one that is overloaded: move on to the next.
      let timedOut = false;
      try {
        response = await send(usedModel);
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) throw e;
        timedOut = true;
        response = null;
      }
      const status = response?.status ?? 0;
      if (!timedOut && status !== 404 && status !== 503 && status !== 500) break;
      if (performance.now() - startedAt > TOTAL_BUDGET_MS) {
        if (timedOut) return fallback('Gemini did not respond in time. Try Regenerate in a moment.');
        break;
      }

      console.warn(
        `[GeminiService] Model "${usedModel}" ${timedOut ? 'did not respond' : `answered HTTP ${status}`}. Trying another model.`
      );
      if (!listed) {
        listed = true;
        const available = await withTimeout(10000, (signal) => listAvailableModels(apiKey, signal));
        queue.push(...available.filter((m) => !tried.has(m)));
      }
    }

    if (!response) return fallback('Gemini did not respond in time. Try Regenerate in a moment.');
    if (response.ok) resolvedModel = usedModel;

    if (!response.ok) {
      console.warn(
        `[GeminiService] Live API returned HTTP ${response.status} (${response.statusText}). Gracefully activating synthetic advisory engine.`
      );
      return fallback(
        response.status === 429
          ? 'Gemini rate limit reached (HTTP 429).'
          : response.status === 503
          ? 'Gemini models are temporarily overloaded (HTTP 503). Try Regenerate in a moment.'
          : response.status === 404
          ? `Gemini model "${usedModel}" was not found (HTTP 404). Check VITE_GEMINI_MODEL.`
          : response.status === 400 || response.status === 403
          ? `Gemini rejected the request (HTTP ${response.status}). Check the API key and model name.`
          : `Gemini returned HTTP ${response.status}.`
      );
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      console.warn('[GeminiService] Empty candidate payload from Gemini API. Falling back to synthetic engine.');
      return fallback('Gemini returned an empty response.');
    }

    const cleaned = cleanJsonText(rawText);
    const parsed: GeminiAdvisoryResponse = JSON.parse(cleaned);

    // Validate essential structure before accepting
    if (
      !parsed.municipalActionPlan ||
      !parsed.citizenHealthAdvisory ||
      !Array.isArray(parsed.municipalActionPlan.interventions)
    ) {
      console.warn('[GeminiService] Invalid response schema from Gemini API. Falling back to synthetic engine.');
      return fallback('Gemini returned an incomplete advisory.');
    }

    parsed.isSyntheticFallback = false;
    parsed.model = usedModel;
    parsed.timestamp = new Date().toISOString();
    parsed.stationName = context.stationName;
    parsed.currentPM25 = context.currentPM25;
    parsed.aqiCategory = context.aqiCategory;
    return parsed;
  } catch (err) {
    console.warn('[GeminiService] Exception in Gemini API call. Engaging synthetic simulation fallback:', err);
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    return fallback(
      aborted
        ? 'Gemini did not respond in time. Try Regenerate in a moment.'
        : err instanceof SyntaxError
        ? 'Gemini returned a response that could not be read.'
        : 'Gemini could not be reached.'
    );
  }
}
