const Sentry = require('@sentry/node');

// Initialize Sentry BEFORE requiring other modules
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
  console.log('Sentry initialized for error tracking');
}

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const { DateTime } = require('luxon');

// PostgreSQL pool for activity_logs (Replit database)
const pool = process.env.DATABASE_URL ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
}) : null;
const {
  buildMemoryContext,
  summarizeToLongTermMemory,
  summarizeJournalToMemory,
  updateJournalMemoryConsent,
  loadDreamscapeHistory,
  formatDreamscapeHistoryForContext,
} = require('./traceMemory');
const {
  buildTraceSystemPrompt,
  buildGreetingSystemPrompt,
  buildFirstRunGreetingPrompt,
  buildReturningGreetingPrompt,
  buildBreathingGuidancePrompt,
  buildCrisisSystemPrompt,
  buildPatternsEnginePrompt,
} = require('./traceSystemPrompt');
const { buildRhythmicLine } = require('./traceRhythm');
const { generateWeeklyLetter, getExistingWeeklyLetter } = require('./traceWeeklyLetter');
const { updateLastSeen, buildReturnWarmthLine, buildMemoryCue } = require('./tracePresence');
const { getDynamicFact, isUSPresidentQuestion } = require('./dynamicFacts');
const { buildNewsContextSummary, isNewsQuestion, isNewsConfirmation, extractPendingNewsTopic, extractNewsTopic, isInsistingOnNews } = require('./newsClient');
const { 
  markUserInCrisis, 
  isUserInCrisisWindow, 
  getUserCrisisState, 
  updateCrisisStateInDb 
} = require('./safety');
const { getSuggestionContext, getTimeAwarenessContext, ACTIVITY_LABELS } = require('./activityCorrelation');
const { getActivityOutcomes, formatActivityOutcomesForContext } = require('./activityOutcomes');
const { markActivityCompletedForReflection, getReflectionContext, clearReflectionFlag } = require('./reflectionTracking');
const { 
  getSafePatternContext, 
  isRevokingPatternConsent, 
  classifyConsentResponse, 
  updatePatternConsent,
  getUserSettings,
  getUserPatternStats
} = require('./patternConsent');
const { buildEmotionalIntelligenceContext } = require('./emotionalIntelligence');
const { logPatternFallback, logEmotionalIntelligenceFallback, logPatternExplanation, logPatternCorrection, TRIGGERS } = require('./patternAuditLog');
const {
  detectEmotionalState,
  isUserAgreeing,
  isUserDeclining,
  shouldRecommendMusic,
  buildAudioAction,
  parseTimeHour
} = require('./musicRecommendation');

/**
 * Feature Flags - Panic switches for smart features
 * Set to 'false' in environment to disable without code changes
 */
const FEATURE_FLAGS = {
  PATTERN_REFLECTIONS_ENABLED: process.env.PATTERN_REFLECTIONS_ENABLED !== 'false',
  EMOTIONAL_INTELLIGENCE_ENABLED: process.env.EMOTIONAL_INTELLIGENCE_ENABLED !== 'false',
  CONSENT_SYSTEM_ENABLED: process.env.CONSENT_SYSTEM_ENABLED !== 'false',
  ACTIVITY_SUGGESTIONS_ENABLED: process.env.ACTIVITY_SUGGESTIONS_ENABLED !== 'false',
  LONG_TERM_MEMORY_ENABLED: process.env.LONG_TERM_MEMORY_ENABLED !== 'false',
};

console.log('[FEATURE FLAGS]', FEATURE_FLAGS);

/**
 * UUID Validation Helper
 * Ensures user IDs are valid UUIDs before making Supabase calls
 * Prevents "invalid input syntax for type uuid" errors
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(id) {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

function validateUserId(userId, deviceId) {
  const effectiveId = userId || deviceId;
  if (!effectiveId) {
    return { valid: false, error: 'Missing userId or deviceId', effectiveId: null };
  }
  if (!isValidUuid(effectiveId)) {
    return { valid: false, error: `Invalid UUID format: ${effectiveId.slice(0, 20)}...`, effectiveId: null };
  }
  return { valid: true, error: null, effectiveId };
}

/**
 * System Confidence Level Calculator
 * Tracks how reliable our "smart" features are for this request
 * Passed to AI so it can adapt its tone when internal context fails
 */
function calculateSystemConfidence(results) {
  const { patternSuccess, eiSuccess, patternFallback, eiFallback, memoryLoaded, crisisCheckOk } = results;
  
  let score = 100;
  let issues = [];
  
  // Major failures (each -30 points)
  if (patternFallback) {
    score -= 30;
    issues.push('pattern_system_error');
  }
  if (eiFallback) {
    score -= 30;
    issues.push('emotional_intelligence_error');
  }
  
  // Minor issues (each -10 points)
  if (!memoryLoaded) {
    score -= 10;
    issues.push('memory_unavailable');
  }
  if (!crisisCheckOk) {
    score -= 10;
    issues.push('crisis_check_failed');
  }
  
  // Determine confidence level
  let level;
  if (score >= 80) {
    level = 'HIGH';
  } else if (score >= 50) {
    level = 'MEDIUM';
  } else {
    level = 'LOW';
  }
  
  return { level, score, issues };
}

/**
 * Build confidence guidance for AI when confidence is not HIGH
 */
function buildConfidenceGuidance(confidence) {
  if (confidence.level === 'HIGH') {
    return null;
  }
  
  if (confidence.level === 'LOW') {
    return `
SYSTEM CONFIDENCE: LOW
Some internal systems encountered errors. Please:
- Do NOT infer long-term patterns or make assumptions about user history
- Do NOT reference previous conversations unless user explicitly mentions them
- Remain supportive, warm, and present-focused
- Respond as if this is a fresh conversation
- Focus entirely on what the user is saying right now
Issues: ${confidence.issues.join(', ')}`;
  }
  
  // MEDIUM confidence
  return `
SYSTEM CONFIDENCE: MEDIUM
Some context may be incomplete. Please:
- Be cautious about inferring patterns
- Prioritize the user's current message
- If unsure about history, ask gently rather than assume
Issues: ${confidence.issues.join(', ')}`;
}

// ---- WEATHER HELPER ----
// TRACE-style weather summary using AccuWeather API
const ACCUWEATHER_API_KEY = process.env.ACCUWEATHER_API_KEY;

// Cache location keys to reduce API calls (AccuWeather has rate limits)
const locationKeyCache = new Map();

// Cache for patterns insights (5-minute TTL to reduce DB queries)
const patternsCache = new Map();
const PATTERNS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MIN_DATA_THRESHOLD = 7; // Minimum activities + journals for patterns

// ============================================
// MUSIC TEMPLATES & GUARDRAILS
// ============================================
const MUSIC_TEMPLATES = {
  ground: `I'm right here with you.

Inside the journal there's a space called **Ground**. The music there is slow and steady — the kind that helps the body remember it's safe.

If you want to go there, we can take our time. There's no rush.`,

  drift: `This feels really heavy — thank you for trusting me with it.

There's a quiet space inside the journal called **Drift**. It doesn't rush feelings. It just holds them gently.

If you want to sit there for a while, I'll be right here with you.`,

  rising: `I can feel you opening a little — even if it's small.

Inside the journal there's a space called **Rising**. The music there warms slowly. It doesn't push you — it just lets the light return at your pace.

If that sounds right, we can visit whenever you're ready.`,
};

function pickMusicSpace(context = {}) {
  // First: Check if user explicitly requested a specific space by name
  if (context.explicitSpace) {
    return context.explicitSpace;
  }
  
  // Second: Infer from emotional keywords
  if (context.grief || context.sad || context.heavy) return 'drift';
  if (context.panicky || context.anxious || context.overwhelmed) return 'ground';
  return 'rising';
}

// Detect if user explicitly asked for a specific music space/activity
function detectExplicitMusicSpace(messageText = '') {
  const txt = messageText.toLowerCase();
  
  // Check for explicit "take me to X" or "go to X" patterns first
  const takePatterns = [
    /take\s+me\s+to\s+(drift|ground|rising)/i,
    /go\s+to\s+(drift|ground|rising)/i,
    /open\s+(drift|ground|rising)/i,
    /play\s+(drift|ground|rising)/i,
    /start\s+(drift|ground|rising)/i,
  ];
  
  for (const pattern of takePatterns) {
    const match = txt.match(pattern);
    if (match) {
      return match[1].toLowerCase();
    }
  }
  
  // Check for standalone space names (less reliable, but still explicit)
  // Only if the message is short and focused on the space name
  if (txt.length < 30) {
    if (txt.includes('drift') && !txt.includes('rising') && !txt.includes('ground')) return 'drift';
    if (txt.includes('ground') && !txt.includes('rising') && !txt.includes('drift')) return 'ground';
    if (txt.includes('rising') && !txt.includes('drift') && !txt.includes('ground')) return 'rising';
  }
  
  return null;
}

async function getAccuWeatherLocationKey(lat, lon) {
  const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
  if (locationKeyCache.has(cacheKey)) {
    return locationKeyCache.get(cacheKey);
  }

  const url = `https://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${ACCUWEATHER_API_KEY}&q=${lat},${lon}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[WEATHER] AccuWeather location error:', res.status);
      return null;
    }
    const data = await res.json();
    const locationKey = data?.Key;
    if (locationKey) {
      locationKeyCache.set(cacheKey, locationKey);
    }
    return locationKey;
  } catch (err) {
    console.error('[WEATHER] AccuWeather location fetch error:', err);
    return null;
  }
}

async function getWeatherSummary({ lat, lon }) {
  if (lat == null || lon == null) {
    return null;
  }

  if (!ACCUWEATHER_API_KEY) {
    console.error('[WEATHER] AccuWeather API key not configured');
    return null;
  }

  // Step 1: Get location key from coordinates
  const locationKey = await getAccuWeatherLocationKey(lat, lon);
  if (!locationKey) {
    return null;
  }

  // Step 2: Get current conditions
  const currentUrl = `https://dataservice.accuweather.com/currentconditions/v1/${locationKey}?apikey=${ACCUWEATHER_API_KEY}&details=true`;

  let currentData;
  try {
    const res = await fetch(currentUrl);
    if (!res.ok) {
      console.error('[WEATHER] AccuWeather current conditions error:', res.status);
      return null;
    }
    currentData = await res.json();
  } catch (err) {
    console.error('[WEATHER] AccuWeather current fetch error:', err);
    return null;
  }

  if (!currentData || !currentData[0]) {
    return null;
  }

  const current = currentData[0];
  const nowTemp = Math.round(current.Temperature?.Imperial?.Value ?? 0);
  const feelsLike = Math.round(current.RealFeelTemperature?.Imperial?.Value ?? nowTemp);
  const wind = Math.round(current.Wind?.Speed?.Imperial?.Value ?? 0);
  const weatherText = current.WeatherText || '';
  const humidity = current.RelativeHumidity ?? null;
  const uvIndex = current.UVIndex ?? null;
  const cloudCover = current.CloudCover ?? null;
  const isDayTime = current.IsDayTime ?? null;

  // Build TRACE-style tone
  let tempTone = '';
  if (nowTemp <= 45) tempTone = 'Pretty cold —';
  else if (nowTemp <= 65) tempTone = 'Cool and gentle —';
  else if (nowTemp <= 80) tempTone = 'Mild and comfortable —';
  else tempTone = 'Warm —';

  // Build sky/light description
  let skyDescription = '';
  if (isDayTime === false) {
    skyDescription = 'nighttime';
  } else if (cloudCover !== null) {
    if (cloudCover <= 10) skyDescription = 'clear skies with full sun';
    else if (cloudCover <= 30) skyDescription = 'mostly sunny';
    else if (cloudCover <= 60) skyDescription = 'partly cloudy';
    else if (cloudCover <= 85) skyDescription = 'mostly cloudy';
    else skyDescription = 'overcast skies';
  } else if (weatherText) {
    skyDescription = weatherText.toLowerCase();
  }

  // Build a natural summary
  let summary = `${tempTone} currently ${nowTemp}°F`;
  if (Math.abs(feelsLike - nowTemp) >= 5) {
    summary += ` (feels like ${feelsLike}°F)`;
  }
  
  if (skyDescription) {
    summary += `, ${skyDescription}`;
  }
  
  if (weatherText && !skyDescription.includes(weatherText.toLowerCase())) {
    summary += `. ${weatherText}`;
  }

  if (wind > 10) {
    summary += `. Wind around ${wind} mph`;
  }

  return {
    summary,
    current: {
      temperature: nowTemp,
      feelsLike,
      wind,
      weatherText,
      humidity,
      uvIndex,
      cloudCover,
      isDayTime,
    },
  };
}

// ---- WEATHER IN CHAT HELPERS ----
function isWeatherRelated(text) {
  if (!text) return false;
  const lowered = text.toLowerCase();

  return (
    lowered.includes('weather') ||
    lowered.includes('forecast') ||
    lowered.includes('rain') ||
    lowered.includes('snow') ||
    lowered.includes('storm') ||
    lowered.includes('cold outside') ||
    lowered.includes('hot outside') ||
    lowered.includes('temperature outside') ||
    /\bhot\b/.test(lowered) ||
    /\bcold\b/.test(lowered)
  );
}

// Attach weather context ONLY when user clearly asks about it
async function maybeAttachWeatherContext({ messages, profile }) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) {
    return { messages, weatherSummary: null };
  }

  if (!isWeatherRelated(lastUser.content)) {
    return { messages, weatherSummary: null };
  }

  const lat = profile?.lat;
  const lon = profile?.lon;

  if (lat == null || lon == null) {
    console.log('[WEATHER] No location in profile, skipping weather context');
    return { messages, weatherSummary: null };
  }

  const weather = await getWeatherSummary({ lat, lon });
  if (!weather) {
    return { messages, weatherSummary: null };
  }

  console.log('[WEATHER] Attaching weather context:', weather.summary);

  const weatherSystemMessage = {
    role: 'system',
    content:
      `WEATHER_CONTEXT: The user's local weather right now is: ${weather.summary}\n` +
      `Use this only if they ask about the weather or conditions outside. Do not say you called an API.`,
  };

  return {
    messages: [weatherSystemMessage, ...messages],
    weatherSummary: weather.summary,
  };
}

// ---- DOG INSIGHTS HELPER ----
// Provides context about dog behavior/training when user talks about their pet
async function getDogInsights({ name, breed, age, textHint }) {
  const apiKey = process.env.DOG_API_KEY;
  if (!apiKey) {
    console.warn('[DOG] DOG_API_KEY missing');
    return null;
  }

  const url = 'https://api.thedogapi.com/v1/breeds/search';
  
  // If we have a breed, try to get breed-specific info
  let breedInfo = null;
  if (breed) {
    try {
      const breedRes = await fetch(`${url}?q=${encodeURIComponent(breed)}`, {
        headers: { 'x-api-key': apiKey },
      });
      if (breedRes.ok) {
        const breeds = await breedRes.json();
        if (breeds.length > 0) {
          breedInfo = breeds[0];
        }
      }
    } catch (err) {
      console.error('[DOG] Breed lookup error:', err.message);
    }
  }

  // Build a gentle TRACE-style summary
  let traceSummary = `DOG_CONTEXT: The user is talking about their dog${name ? ` named ${name}` : ''}. `;
  
  if (breedInfo) {
    traceSummary += `Breed info: ${breedInfo.name || breed}`;
    if (breedInfo.temperament) {
      traceSummary += ` - typically ${breedInfo.temperament.toLowerCase()}`;
    }
    if (breedInfo.life_span) {
      traceSummary += ` (lifespan: ${breedInfo.life_span})`;
    }
    traceSummary += '. ';
  }
  
  traceSummary += `Use this to relate to their dog in a kind, grounded way. ` +
    `Offer gentle ideas about training, comfort, or environment without sounding like a vet or making medical diagnoses. ` +
    `Prefer soft suggestions and empathy over commands. ` +
    `Never mention where this context came from or reference any API.`;

  return {
    traceSummary,
    breedInfo,
  };
}

// Detect when user is talking about their dog
function isDogRelated(text) {
  if (!text) return false;
  const t = text.toLowerCase();

  return (
    t.includes('my dog') ||
    t.includes('our dog') ||
    t.includes('puppy') ||
    t.includes('my pup') ||
    t.includes('our pup') ||
    t.includes('my german shepherd') ||
    t.includes('my lab') ||
    t.includes('my golden') ||
    t.includes('my husky') ||
    t.includes('dog is anxious') ||
    t.includes('dog is scared') ||
    t.includes('dog behavior') ||
    t.includes('dog training') ||
    t.includes('my pet') ||
    t.includes('our pet')
  );
}

// Attach dog context when user mentions their dog
async function maybeAttachDogContext({ messages, profile }) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) return { messages, dogSummary: null };

  if (!isDogRelated(lastUser.content)) {
    return { messages, dogSummary: null };
  }

  console.log('[DOG] Dog-related message detected');

  // If profile has pet info, use it
  const dogName = profile?.dog_name || null;
  const dogBreed = profile?.dog_breed || null;
  const dogAge = profile?.dog_age || null;

  const insights = await getDogInsights({
    name: dogName,
    breed: dogBreed,
    age: dogAge,
    textHint: lastUser.content,
  });

  if (!insights) {
    return { messages, dogSummary: null };
  }

  console.log('[DOG] Attaching dog context');

  const dogSystemMessage = {
    role: 'system',
    content: insights.traceSummary,
  };

  return {
    messages: [dogSystemMessage, ...messages],
    dogSummary: insights.traceSummary,
  };
}

// ---- TIMEZONE TO COUNTRY MAPPING ----
// Maps timezone identifiers to ISO country codes for holiday detection
// This allows holiday detection without requiring location permission
const TIMEZONE_TO_COUNTRY = {
  // United States
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US', 'America/Los_Angeles': 'US',
  'America/Phoenix': 'US', 'America/Anchorage': 'US', 'America/Honolulu': 'US', 'America/Detroit': 'US',
  'America/Indiana': 'US', 'America/Boise': 'US', 'America/Juneau': 'US', 'America/Adak': 'US',
  'America/Kentucky': 'US', 'America/North_Dakota': 'US', 'America/Menominee': 'US', 'America/Nome': 'US',
  'America/Yakutat': 'US', 'America/Sitka': 'US', 'America/Metlakatla': 'US',
  'Pacific/Honolulu': 'US',
  // Canada
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Montreal': 'CA', 'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA', 'America/Halifax': 'CA', 'America/St_Johns': 'CA', 'America/Regina': 'CA',
  'America/Calgary': 'CA', 'America/Whitehorse': 'CA', 'America/Yellowknife': 'CA', 'America/Iqaluit': 'CA',
  // Mexico
  'America/Mexico_City': 'MX', 'America/Tijuana': 'MX', 'America/Cancun': 'MX', 'America/Monterrey': 'MX',
  'America/Merida': 'MX', 'America/Chihuahua': 'MX', 'America/Hermosillo': 'MX', 'America/Mazatlan': 'MX',
  // Central America
  'America/Guatemala': 'GT', 'America/Belize': 'BZ', 'America/El_Salvador': 'SV',
  'America/Tegucigalpa': 'HN', 'America/Managua': 'NI', 'America/Costa_Rica': 'CR', 'America/Panama': 'PA',
  // Caribbean
  'America/Havana': 'CU', 'America/Jamaica': 'JM', 'America/Port-au-Prince': 'HT',
  'America/Santo_Domingo': 'DO', 'America/Puerto_Rico': 'PR', 'America/Barbados': 'BB',
  // South America
  'America/Sao_Paulo': 'BR', 'America/Rio_Branco': 'BR', 'America/Manaus': 'BR', 'America/Fortaleza': 'BR',
  'America/Recife': 'BR', 'America/Bahia': 'BR', 'America/Belem': 'BR', 'America/Cuiaba': 'BR',
  'America/Buenos_Aires': 'AR', 'America/Argentina': 'AR', 'America/Cordoba': 'AR', 'America/Mendoza': 'AR',
  'America/Lima': 'PE', 'America/Bogota': 'CO', 'America/Santiago': 'CL', 'America/Punta_Arenas': 'CL',
  'America/Caracas': 'VE', 'America/Guayaquil': 'EC', 'America/La_Paz': 'BO',
  'America/Asuncion': 'PY', 'America/Montevideo': 'UY', 'America/Paramaribo': 'SR', 'America/Cayenne': 'GF',
  // Western Europe
  'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE',
  'Europe/Rome': 'IT', 'Europe/Madrid': 'ES', 'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE',
  'Europe/Zurich': 'CH', 'Europe/Vienna': 'AT', 'Europe/Lisbon': 'PT', 'Europe/Luxembourg': 'LU',
  'Europe/Monaco': 'MC', 'Europe/Andorra': 'AD', 'Europe/Gibraltar': 'GI',
  // Northern Europe
  'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK', 'Europe/Helsinki': 'FI',
  'Europe/Reykjavik': 'IS', 'Europe/Tallinn': 'EE', 'Europe/Riga': 'LV', 'Europe/Vilnius': 'LT',
  // Central/Eastern Europe
  'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ', 'Europe/Budapest': 'HU', 'Europe/Bucharest': 'RO',
  'Europe/Sofia': 'BG', 'Europe/Athens': 'GR', 'Europe/Belgrade': 'RS', 'Europe/Zagreb': 'HR',
  'Europe/Ljubljana': 'SI', 'Europe/Sarajevo': 'BA', 'Europe/Skopje': 'MK', 'Europe/Podgorica': 'ME',
  'Europe/Tirane': 'AL', 'Europe/Bratislava': 'SK', 'Europe/Chisinau': 'MD',
  // Eastern Europe/Russia
  'Europe/Moscow': 'RU', 'Europe/Kaliningrad': 'RU', 'Europe/Samara': 'RU', 'Europe/Volgograd': 'RU',
  'Europe/Istanbul': 'TR', 'Europe/Kiev': 'UA', 'Europe/Kyiv': 'UA', 'Europe/Minsk': 'BY',
  // Russia extended
  'Asia/Vladivostok': 'RU', 'Asia/Novosibirsk': 'RU', 'Asia/Krasnoyarsk': 'RU', 'Asia/Yekaterinburg': 'RU',
  'Asia/Omsk': 'RU', 'Asia/Irkutsk': 'RU', 'Asia/Yakutsk': 'RU', 'Asia/Magadan': 'RU',
  'Asia/Kamchatka': 'RU', 'Asia/Sakhalin': 'RU', 'Asia/Anadyr': 'RU', 'Asia/Chita': 'RU',
  // Middle East
  'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Tel_Aviv': 'IL', 'Asia/Jerusalem': 'IL',
  'Asia/Amman': 'JO', 'Asia/Beirut': 'LB', 'Asia/Damascus': 'SY', 'Asia/Baghdad': 'IQ',
  'Asia/Kuwait': 'KW', 'Asia/Bahrain': 'BH', 'Asia/Qatar': 'QA', 'Asia/Muscat': 'OM',
  'Asia/Tehran': 'IR', 'Asia/Baku': 'AZ', 'Asia/Tbilisi': 'GE', 'Asia/Yerevan': 'AM',
  // South Asia
  'Asia/Kolkata': 'IN', 'Asia/Mumbai': 'IN', 'Asia/Calcutta': 'IN',
  'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD', 'Asia/Colombo': 'LK', 'Asia/Kathmandu': 'NP',
  'Asia/Thimphu': 'BT', 'Asia/Kabul': 'AF',
  // Southeast Asia
  'Asia/Bangkok': 'TH', 'Asia/Jakarta': 'ID', 'Asia/Manila': 'PH', 'Asia/Kuala_Lumpur': 'MY',
  'Asia/Singapore': 'SG', 'Asia/Ho_Chi_Minh': 'VN', 'Asia/Saigon': 'VN', 'Asia/Hanoi': 'VN',
  'Asia/Phnom_Penh': 'KH', 'Asia/Vientiane': 'LA', 'Asia/Yangon': 'MM', 'Asia/Rangoon': 'MM',
  'Asia/Brunei': 'BN', 'Asia/Makassar': 'ID', 'Asia/Jayapura': 'ID',
  // East Asia
  'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK',
  'Asia/Taipei': 'TW', 'Asia/Macau': 'MO', 'Asia/Ulaanbaatar': 'MN',
  'Asia/Chongqing': 'CN', 'Asia/Harbin': 'CN', 'Asia/Urumqi': 'CN',
  // Central Asia
  'Asia/Almaty': 'KZ', 'Asia/Tashkent': 'UZ', 'Asia/Bishkek': 'KG',
  'Asia/Dushanbe': 'TJ', 'Asia/Ashgabat': 'TM',
  // Australia & New Zealand
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU',
  'Australia/Perth': 'AU', 'Australia/Adelaide': 'AU', 'Australia/Hobart': 'AU',
  'Australia/Darwin': 'AU', 'Australia/Canberra': 'AU', 'Australia/Lord_Howe': 'AU',
  'Pacific/Auckland': 'NZ', 'Pacific/Chatham': 'NZ',
  // Pacific Islands
  'Pacific/Fiji': 'FJ', 'Pacific/Guam': 'GU', 'Pacific/Tahiti': 'PF',
  'Pacific/Port_Moresby': 'PG', 'Pacific/Noumea': 'NC', 'Pacific/Tongatapu': 'TO',
  'Pacific/Apia': 'WS', 'Pacific/Majuro': 'MH', 'Pacific/Palau': 'PW',
  // Africa
  'Africa/Johannesburg': 'ZA', 'Africa/Cairo': 'EG', 'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE',
  'Africa/Casablanca': 'MA', 'Africa/Algiers': 'DZ', 'Africa/Tunis': 'TN', 'Africa/Tripoli': 'LY',
  'Africa/Accra': 'GH', 'Africa/Abidjan': 'CI', 'Africa/Dakar': 'SN', 'Africa/Addis_Ababa': 'ET',
  'Africa/Dar_es_Salaam': 'TZ', 'Africa/Kampala': 'UG', 'Africa/Khartoum': 'SD',
  'Africa/Harare': 'ZW', 'Africa/Lusaka': 'ZM', 'Africa/Maputo': 'MZ',
  'Africa/Luanda': 'AO', 'Africa/Kinshasa': 'CD', 'Africa/Douala': 'CM',
  'Africa/Windhoek': 'NA', 'Africa/Gaborone': 'BW', 'Africa/Maseru': 'LS', 'Africa/Mbabane': 'SZ',
  // Atlantic
  'Atlantic/Azores': 'PT', 'Atlantic/Madeira': 'PT', 'Atlantic/Canary': 'ES',
  'Atlantic/Reykjavik': 'IS', 'Atlantic/Faroe': 'FO', 'Atlantic/Bermuda': 'BM',
  'Atlantic/Cape_Verde': 'CV', 'Atlantic/South_Georgia': 'GS',
  // Pacific US territories
  'Pacific/Pago_Pago': 'AS', 'Pacific/Samoa': 'AS', 'Pacific/Midway': 'UM',
  'Pacific/Wake': 'UM', 'Pacific/Johnston': 'UM',
  // Indian Ocean
  'Indian/Mauritius': 'MU', 'Indian/Maldives': 'MV', 'Indian/Reunion': 'RE',
  'Indian/Seychelles': 'SC', 'Indian/Madagascar': 'MG', 'Indian/Comoro': 'KM',
};

function getCountryFromTimezone(timezone) {
  if (!timezone) return null;
  
  // Direct match first
  if (TIMEZONE_TO_COUNTRY[timezone]) {
    return TIMEZONE_TO_COUNTRY[timezone];
  }
  
  // Handle multi-segment IANA zones like "America/Argentina/Buenos_Aires"
  // Try progressively shorter prefixes
  const parts = timezone.split('/');
  for (let i = parts.length - 1; i >= 2; i--) {
    const prefix = parts.slice(0, i).join('/');
    if (TIMEZONE_TO_COUNTRY[prefix]) {
      return TIMEZONE_TO_COUNTRY[prefix];
    }
  }
  
  // No confident fallback - return null rather than guess incorrectly
  // The caller should fall back to 'US' if needed for the API call
  console.log(`[TIMEZONE] No country mapping found for timezone: ${timezone}`);
  return null;
}

// ---- HOLIDAYS HELPER (AbstractAPI) ----

async function getHolidayContext({ countryCode, timezone, date = new Date() }) {
  const apiKey = process.env.ABSTRACT_HOLIDAYS_API_KEY;
  if (!apiKey) {
    console.warn('[HOLIDAY] ABSTRACT_HOLIDAYS_API_KEY is missing');
    return null;
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  // Priority: explicit country code > timezone-derived country > fallback to US
  let country = countryCode;
  if (!country && timezone) {
    country = getCountryFromTimezone(timezone);
    if (country) {
      console.log(`[HOLIDAY] Derived country ${country} from timezone ${timezone}`);
    }
  }
  country = country || 'US';

  const url =
    `https://holidays.abstractapi.com/v1/` +
    `?api_key=${encodeURIComponent(apiKey)}` +
    `&country=${encodeURIComponent(country)}` +
    `&year=${year}&month=${month}&day=${day}`;

  let holidays;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[HOLIDAY] AbstractAPI error:', res.status, await res.text());
      return null;
    }
    holidays = await res.json();
  } catch (err) {
    console.error('[HOLIDAY] AbstractAPI fetch error:', err);
    return null;
  }

  if (!Array.isArray(holidays) || holidays.length === 0) {
    return null;
  }

  const primary = holidays[0];
  const name = primary.name || primary.local_name || 'a holiday';
  const type = primary.type || '';
  const isPublic = String(type).toLowerCase().includes('public');

  const summary =
    `HOLIDAY_CONTEXT: Today is ${name} in ${country}. ` +
    (isPublic
      ? `It's generally treated as a public holiday where many people may have different routines. `
      : `It's observed by some people but may not change everyone's schedule. `) +
    `Be gentle and aware that holidays can bring up mixed emotions—joy, grief, loneliness, or stress. ` +
    `Use this context only if the user mentions the date, the weekend, or the holiday itself. ` +
    `Do not mention that you used a holiday API or call this HOLIDAY_CONTEXT by name.`;

  return { summary, raw: holidays };
}

function isHolidayRelated(text) {
  if (!text) return false;
  const t = text.toLowerCase();

  return (
    t.includes('holiday') ||
    t.includes('christmas') ||
    t.includes('xmas') ||
    t.includes('new year') ||
    t.includes('thanksgiving') ||
    t.includes('easter') ||
    t.includes('hanukkah') ||
    t.includes('ramadan') ||
    t.includes('eid') ||
    t.includes('valentine') ||
    t.includes('my birthday') ||
    t.includes('today feels weird')
  );
}

async function maybeAttachHolidayContext({ messages, profile, requestTimezone }) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) return { messages, holidaySummary: null };

  if (!isHolidayRelated(lastUser.content)) {
    return { messages, holidaySummary: null };
  }

  console.log('[HOLIDAY] Holiday-related message detected');

  // Use explicit country if set, otherwise let getHolidayContext derive from timezone
  // Priority: profile country > profile timezone > request timezone (from device)
  const countryCode = profile?.country || null;
  const timezone = profile?.timezone || requestTimezone || null;
  const ctx = await getHolidayContext({ countryCode, timezone });

  if (!ctx) {
    return { messages, holidaySummary: null };
  }

  console.log('[HOLIDAY] Attaching holiday context:', ctx.summary.slice(0, 60) + '...');

  const holidaySystemMessage = {
    role: 'system',
    content: ctx.summary,
  };

  return {
    messages: [holidaySystemMessage, ...messages],
    holidaySummary: ctx.summary,
  };
}

// ---- FOOD/RECIPE HELPER (Tasty API via RapidAPI) ----

// Appetite stress - needs emotional support, not recipes
function isAppetiteConcern(text) {
  if (!text) return false;
  const t = text.toLowerCase();

  return (
    t.includes("i haven't eaten") ||
    t.includes('i havent eaten') ||
    t.includes('no appetite') ||
    t.includes("don't feel like eating") ||
    t.includes('dont feel like eating') ||
    t.includes('food sounds hard') ||
    t.includes('eating feels hard') ||
    t.includes("can't eat") ||
    t.includes('cant eat') ||
    t.includes('i barely eat') ||
    t.includes('i stopped eating') ||
    t.includes('hungry but tired')
  );
}

// Cooking ideas - wants recipe suggestions
function isCookingIdeaRequest(text) {
  if (!text) return false;
  const t = text.toLowerCase();

  return (
    t.includes('what should i cook') ||
    t.includes('what should i make') ||
    t.includes('dinner ideas') ||
    t.includes('lunch ideas') ||
    t.includes('recipe') ||
    t.includes('snack ideas') ||
    t.includes('comfort food') ||
    t.includes('something easy to cook') ||
    t.includes('something quick to eat') ||
    t.includes('cook something') ||
    t.includes('i want something warm') ||
    t.includes('i want something healthy') ||
    t.includes('craving')
  );
}

async function getRecipeSuggestions({ query }) {
  const apiKey = process.env.TASTY_API_KEY;
  if (!apiKey) {
    console.warn('[FOOD] TASTY_API_KEY missing');
    return [];
  }

  const url =
    'https://tasty.p.rapidapi.com/recipes/list?from=0&size=5' +
    `&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': apiKey,
        'x-rapidapi-host': 'tasty.p.rapidapi.com',
      },
    });

    if (!res.ok) {
      console.error('[FOOD] Tasty API error', res.status, await res.text());
      return [];
    }

    const data = await res.json();
    const items = data.results || [];

    return items.slice(0, 3).map((r) => ({
      name: r.name,
      description: r.description || '',
      url: r.canonical_id || '',
    }));
  } catch (err) {
    console.error('[FOOD] Tasty fetch error', err);
    return [];
  }
}

async function maybeAttachFoodContext({ messages }) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) return { messages, foodSummary: null };

  const text = lastUser.content || '';

  // 1) Appetite stress → emotional support mode (no recipes)
  if (isAppetiteConcern(text)) {
    console.log('[FOOD] Appetite concern detected - support mode');

    const foodSummary =
      `FOOD_CONTEXT_APPETITE: The user is struggling with appetite / eating feeling hard.\n` +
      `Your job is to:\n` +
      `- Prioritize emotional validation and safety.\n` +
      `- Normalize that appetite can change with stress, depression, anxiety, trauma, etc.\n` +
      `- Avoid telling them what or how much to eat.\n` +
      `- If you offer any ideas, keep them extremely gentle and low-pressure (e.g., "one small, soft thing if it helps", not a full meal plan).\n` +
      `- Be careful of disordered eating: do NOT give prescriptive nutrition advice or calorie-related suggestions.\n` +
      `- Never mention FOOD_CONTEXT_APPETITE by name.`;

    return {
      messages,
      foodSummary,
    };
  }

  // 2) Cooking ideas → recipe mode
  if (isCookingIdeaRequest(text)) {
    console.log('[FOOD] Cooking idea request detected - recipe mode');

    const lowered = text.toLowerCase();
    let query = 'simple comforting meal';

    if (lowered.includes('healthy') || lowered.includes('light')) {
      query = 'simple healthy dinner';
    } else if (lowered.includes('soup')) {
      query = 'easy soup';
    } else if (lowered.includes('snack')) {
      query = 'quick snack';
    }

    const recipes = await getRecipeSuggestions({ query });
    if (!recipes.length) {
      return { messages, foodSummary: null };
    }

    const formatted = recipes
      .map((r, idx) => `${idx + 1}. ${r.name}${r.description ? ` — ${r.description}` : ''}`)
      .join('\n');

    console.log('[FOOD] Attaching recipe context with', recipes.length, 'recipes');

    const foodSummary =
      `FOOD_CONTEXT_RECIPES: The user is asking for simple ideas of what to cook / eat.\n` +
      `Here are a few options from a recipe source:\n` +
      `${formatted}\n\n` +
      `When you respond:\n` +
      `- Present 1–3 of these as gentle ideas, not assignments.\n` +
      `- Emphasize there is *no pressure* to cook or choose anything.\n` +
      `- Frame cooking as self-care or nourishment, not obligation.\n` +
      `- Never mention that these came from an API or refer to FOOD_CONTEXT_RECIPES by name.`;

    return {
      messages,
      foodSummary,
    };
  }

  // No food-related content detected
  return { messages, foodSummary: null };
}

// ---- HIGH-DISTRESS / CRISIS DETECTION ----

// Per-user crisis state persistence
// Keeps crisis mode active until 4 safe messages AND 15 min have passed
const userCrisisStates = new Map();

function getCrisisState(userId) {
  if (!userCrisisStates.has(userId)) {
    userCrisisStates.set(userId, {
      active: false,
      lastFlaggedAt: null,
      safeMessagesSince: 0,
    });
  }
  return userCrisisStates.get(userId);
}

function updateCrisisState(userId, isCurrentlyDistressed) {
  const state = getCrisisState(userId);

  if (isCurrentlyDistressed) {
    // Enter or stay in crisis mode
    state.active = true;
    state.lastFlaggedAt = Date.now();
    state.safeMessagesSince = 0;
    state.pendingExitCheckIn = false;
    console.log(`[CRISIS] User ${userId} - crisis mode ACTIVE (distress detected)`);
  } else if (state.active) {
    // In crisis mode but current message is safe
    state.safeMessagesSince++;
    const timeSinceFlag = Date.now() - state.lastFlaggedAt;
    const thirtyMinutes = 30 * 60 * 1000;

    console.log(`[CRISIS] User ${userId} - safe message #${state.safeMessagesSince}, ${Math.round(timeSinceFlag / 60000)}min since flag`);

    // Exit crisis mode only after 3+ safe messages AND 30 minutes
    // Mark pending exit check-in to remind TRACE to do a gentle transition
    if (state.safeMessagesSince >= 3 && timeSinceFlag > thirtyMinutes) {
      if (!state.pendingExitCheckIn) {
        state.pendingExitCheckIn = true;
        console.log(`[CRISIS] User ${userId} - pending exit check-in (3+ safe, 30+ min)`);
      }
      // Actually exit after 4 safe messages (gives time for check-in)
      if (state.safeMessagesSince >= 4) {
        state.active = false;
        state.safeMessagesSince = 0;
        state.pendingExitCheckIn = false;
        console.log(`[CRISIS] User ${userId} - crisis mode EXITED (4+ safe messages, 30+ min)`);
      }
    }
  }

  return state;
}

function isHighDistressText(text) {
  if (!text) return false;
  const t = text.toLowerCase();

  // Direct suicidality / self-harm / existential despair
  if (
    t.includes('i want to die') ||
    t.includes('want to die') ||
    t.includes('i want to disappear') ||
    t.includes("don't want to be here") ||
    t.includes("dont want to be here") ||  // without apostrophe
    t.includes("don't want to be here anymore") ||
    t.includes("dont want to be here anymore") ||  // without apostrophe
    t.includes("don't want to live") ||
    t.includes("not wanting to live") ||
    (t.includes("wanting to live") && (t.includes("not") || t.includes("stop") || t.includes("don't"))) ||  // only negative context
    t.includes('kill myself') ||
    t.includes('end my life') ||
    t.includes('end it all') ||
    t.includes('ending it all') ||  // "I keep thinking about ending it all"
    t.includes('ending it') ||  // catches variations
    t.includes('thinking about ending') ||  // "thinking about ending my life/it all"
    t.includes("i'm done with life") ||
    t.includes("done with life") ||
    t.includes('no reason to live') ||
    (t.includes('reason to live') && (t.includes("no") || t.includes("any") || t.includes("is there"))) ||  // only questioning context
    t.includes('better off dead') ||
    t.includes('hurt myself') ||
    t.includes('self harm') ||
    t.includes('cutting again') ||
    t.includes('relapsed on self harm') ||
    t.includes('is life worth') ||  // catches "is life worth it", "is life worth living"
    t.includes('life is worth') ||  // catches "if life is worth", "not sure if life is worth it"
    t.includes('life worth it') ||  // catches "if life is worth it", "is life worth it"
    t.includes('life even worth') ||
    t.includes('worth living') ||
    t.includes("don't see the point") ||
    t.includes('no point in living') ||
    t.includes('no point anymore') ||
    t.includes("what's the point") ||
    t.includes('wish i was dead') ||
    t.includes('wish i were dead') ||
    t.includes('wish i wasn\'t here') ||
    t.includes("don't want to wake up") ||
    t.includes('everyone would be better off') ||
    t.includes("i'm a burden") ||
    t.includes('nobody would miss me') ||
    t.includes('tired of existing') ||
    t.includes('tired of being alive') ||
    t.includes('tired of living') ||
    t.includes('sick of living') ||
    t.includes("can't go on") ||
    t.includes("can't do this anymore") ||
    t.includes("i give up") ||
    t.includes("giving up") ||
    t.includes("ready to give up")
  ) {
    return true;
  }

  // Very acute panic / overwhelm / emotional collapse
  // IMPORTANT: Distinguish ACTIVE crisis vs SYMPTOM discussion
  // "I'm having a panic attack" = ACTIVE (crisis)
  // "I keep having panic attacks" = SYMPTOM (not crisis)
  const isActivePanic = (
    t.includes('having a panic attack') ||
    t.includes('panic attack right now') ||
    t.includes('in the middle of a panic') ||
    t.includes('panicking right now')
  );
  const isSymptomPanic = (
    t.includes('keep having panic') ||
    t.includes('get panic attacks') ||
    t.includes('have panic attacks') ||
    t.includes('had panic attacks') ||
    t.includes('been having panic')
  );
  
  if (
    (t.includes('panic attack') && isActivePanic && !isSymptomPanic) ||
    t.includes("can't breathe") ||
    t.includes('hyperventilating') ||
    t.includes('shaking so bad') ||
    t.includes('losing it') ||
    t.includes("i can't do this anymore") ||
    t.includes("can't take it anymore") ||
    t.includes("falling apart") ||
    t.includes("breaking down") ||
    t.includes("completely overwhelmed") ||
    t.includes("emotionally numb") ||
    t.includes("feel nothing") ||
    t.includes("feel empty inside")
  ) {
    return true;
  }

  // Grief / trauma heaviness where joking is usually not appropriate
  if (
    t.includes('someone died') ||
    t.includes('my mom died') ||
    t.includes('my dad died') ||
    t.includes('my child died') ||
    t.includes('my partner died') ||
    t.includes('my husband died') ||
    t.includes('my wife died') ||
    t.includes('my friend died') ||
    t.includes('my brother died') ||
    t.includes('my sister died') ||
    t.includes('funeral was') ||
    t.includes('just lost someone') ||
    t.includes('i was assaulted') ||
    t.includes('i was abused') ||
    t.includes('i was raped') ||
    t.includes('sexual assault') ||
    t.includes('domestic violence') ||
    (t.includes('trauma') && t.includes('flashback'))
  ) {
    return true;
  }

  return false;
}

function isHighDistressContext(messages) {
  // Check last 4 user messages (expanded from 2) to catch crisis context better
  const lastUserMessages = [...messages]
    .reverse()
    .filter((m) => m.role === 'user')
    .slice(0, 4);

  // Log what we're checking for crisis
  const checked = lastUserMessages.map(m => m.content?.slice(0, 50) + '...');
  const results = lastUserMessages.map(m => isHighDistressText(m.content));
  console.log(`[CRISIS SCAN] Checking last 4 user messages:`, checked);
  console.log(`[CRISIS SCAN] Distress results:`, results);

  return lastUserMessages.some((m) => isHighDistressText(m.content));
}

// ---- DAD JOKE HELPER (JokeFather API - no key needed) ----

async function getDadJoke() {
  const url = 'https://jokefather.com/api/jokes/random?ref=trace-app';

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[JOKE] Dad joke API error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    if (!data || !data.setup || !data.punchline) {
      return null;
    }

    return {
      setup: data.setup,
      punchline: data.punchline,
    };
  } catch (err) {
    console.error('[JOKE] Dad joke fetch error:', err);
    return null;
  }
}

function isJokeRequest(text) {
  if (!text) return false;
  const t = text.toLowerCase().trim();

  // Exact matches
  if (t === 'joke' || t === '/joke' || t === 'jokes') return true;
  
  // Flexible patterns that allow typos
  const jokePatterns = [
    /tell\s+(me\s+)?a?\s*jok/i,           // "tell me a joke", "tell a jok", "tell me jokr"
    /give\s+(me\s+)?a?\s*jok/i,           // "give me a joke", "give a jok"
    /share\s+(a\s+)?jok/i,                // "share a joke", "share joke"
    /dad\s*jok/i,                         // "dad joke", "dadjoke"
    /make\s+me\s+laugh/i,                 // "make me laugh"
    /cheer\s+me\s+up/i,                   // "cheer me up"
    /got\s+(a|any)\s*jok/i,               // "got a joke", "got any jokes"
    /know\s+(a|any)\s*jok/i,              // "know a joke", "know any jokes"
    /i\s*(need|want)\s+(a\s+)?jok/i,      // "i need a joke", "i want joke"
    /something\s+funny/i,                 // "something funny"
    /hear\s+a\s*jok/i,                    // "hear a joke"
  ];
  
  return jokePatterns.some(pattern => pattern.test(t));
}

async function maybeAttachJokeContext({ messages }) {
  // If context looks like crisis / very high distress, do NOT use jokes
  if (isHighDistressContext(messages)) {
    console.log('[JOKE] High distress detected — skipping joke');
    return { messages, joke: null };
  }

  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) return { messages, joke: null };

  if (!isJokeRequest(lastUser.content)) {
    return { messages, joke: null };
  }

  console.log('[JOKE] Joke request detected');

  const joke = await getDadJoke();
  if (!joke) {
    return { messages, joke: null };
  }

  console.log('[JOKE] Attaching dad joke to context');

  const systemJoke = {
    role: 'system',
    content:
      `JOKE_CONTEXT: The user has explicitly asked for a joke or lightness, ` +
      `and the recent messages do not suggest acute crisis.\n` +
      `Here is a ready-made dad joke:\n` +
      `SETUP: ${joke.setup}\n` +
      `PUNCHLINE: ${joke.punchline}\n\n` +
      `When you respond:\n` +
      `- Deliver this joke in a gentle, TRACE-like way.\n` +
      `- After the joke, you can briefly check in on how they are.\n` +
      `- If the user sounds more distressed than playful in the same message, ` +
      `prioritize emotional support over the joke.\n` +
      `- Do NOT mention that you used an API or JOKE_CONTEXT by name.`,
  };

  return {
    messages: [systemJoke, ...messages],
    joke,
  };
}

// ---- LAST.FM MUSIC HELPER ----
// TRACE's music brain - gentle, human conversations about artists

const LASTFM_API_KEY = process.env.LASTFM_API_KEY;

function isMusicQuestion(text) {
  if (!text) return false;
  const t = text.toLowerCase();

  // Direct music mentions
  const musicPatterns = [
    /listening\s+to/i,
    /been\s+playing/i,
    /heard\s+of\s+[a-z]/i,
    /know\s+(the\s+)?(band|artist|singer|musician)/i,
    /favorite\s+(artist|band|singer|song|album|music)/i,
    /into\s+[a-z]+\s+(music|songs)/i,
    /what\s+do\s+you\s+(think|know)\s+(about|of)\s+[a-z]/i,
  ];

  // Check for artist/music keywords combined with context
  const hasMusicWord = (
    t.includes('music') ||
    t.includes('song') ||
    t.includes('album') ||
    t.includes('artist') ||
    t.includes('band') ||
    t.includes('playlist') ||
    t.includes('listening') ||
    t.includes('singer') ||
    t.includes('musician')
  );

  return hasMusicWord || musicPatterns.some(p => p.test(t));
}

function extractArtistName(text) {
  if (!text) return null;
  const t = text.toLowerCase();

  // Common patterns: "listening to [artist]", "I love [artist]", "what do you think of [artist]"
  const patterns = [
    /(?:listening\s+to|been\s+(?:listening|playing)|heard\s+of|know\s+(?:about)?|think\s+(?:of|about)|love|like|into)\s+([a-z][a-z\s&\-'\.]+?)(?:\s+(?:lately|recently|a\s+lot|music|songs|right\s+now)|[\.!?,]|$)/i,
    /(?:my\s+favorite\s+(?:artist|band|singer)\s+is)\s+([a-z][a-z\s&\-'\.]+?)(?:[\.!?,]|$)/i,
    /([a-z][a-z\s&\-'\.]+?)\s+(?:is\s+(?:my|such\s+a)|has\s+been|makes?\s+(?:me|such))/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let artist = match[1].trim();
      // Strip possessive endings ('s, 's)
      artist = artist.replace(/'s$/i, '').replace(/'s$/i, '').trim();
      // Filter out common false positives
      const skipWords = ['music', 'songs', 'a lot', 'some', 'the', 'this', 'that', 'it', 'you', 'i', 'my'];
      if (artist.length > 2 && !skipWords.includes(artist.toLowerCase())) {
        return artist;
      }
    }
  }

  return null;
}

async function getArtistInfo(artistName) {
  if (!LASTFM_API_KEY) {
    console.error('[MUSIC] Last.fm API key not configured');
    return null;
  }

  const url = `https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=${encodeURIComponent(artistName)}&api_key=${LASTFM_API_KEY}&format=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[MUSIC] Last.fm API error:', res.status);
      return null;
    }

    const data = await res.json();

    if (data?.error) {
      console.log('[MUSIC] Artist not found:', artistName);
      return null;
    }

    const artist = data?.artist;
    if (!artist) return null;

    // Clean HTML from bio
    const rawBio = artist.bio?.summary || '';
    const cleanBio = rawBio.replace(/<[^>]*>/g, '').trim();
    
    // Get genre tags
    const tags = artist.tags?.tag?.map(t => t.name).slice(0, 4) || [];

    return {
      name: artist.name,
      tags,
      bio: cleanBio.length > 300 ? cleanBio.slice(0, 300) + '...' : cleanBio,
      listeners: artist.stats?.listeners ? parseInt(artist.stats.listeners).toLocaleString() : null,
    };
  } catch (err) {
    console.error('[MUSIC] Last.fm fetch error:', err);
    return null;
  }
}

async function maybeAttachMusicContext({ messages }) {
  // Skip in high distress - music should be disabled in crisis mode
  if (isHighDistressContext(messages)) {
    console.log('[MUSIC] High distress detected — skipping music context');
    return { messages, musicContext: null };
  }

  const lastUser = [...messages].reverse().find(m => m.role === 'user');
  if (!lastUser) return { messages, musicContext: null };

  if (!isMusicQuestion(lastUser.content)) {
    return { messages, musicContext: null };
  }

  console.log('[MUSIC] Music mention detected');

  // Try to extract artist name
  const artistName = extractArtistName(lastUser.content);
  
  if (!artistName) {
    // User mentioned music but no specific artist - TRACE can ask gently
    console.log('[MUSIC] No specific artist detected, will prompt gently');
    return {
      messages,
      musicContext: {
        type: 'prompt',
        hint: 'The user mentioned music but no specific artist. You may gently ask what they\'ve been listening to.',
      },
    };
  }

  console.log('[MUSIC] Fetching artist info for:', artistName);
  const artistInfo = await getArtistInfo(artistName);

  if (!artistInfo) {
    return {
      messages,
      musicContext: {
        type: 'not_found',
        searchedFor: artistName,
        hint: `Could not find info on "${artistName}" - acknowledge what they shared anyway.`,
      },
    };
  }

  console.log('[MUSIC] Found artist:', artistInfo.name, 'tags:', artistInfo.tags.join(', '));

  return {
    messages,
    musicContext: {
      type: 'artist',
      ...artistInfo,
    },
  };
}

// ---- HYDRATION MOMENT DETECTION ----

function isHydrationMoment(text) {
  if (!text) return false;
  const t = text.toLowerCase();

  return (
    t.includes('headache') ||
    t.includes('migraine') ||
    t.includes('lightheaded') ||
    t.includes('dizzy') ||
    t.includes('dehydrated') ||
    t.includes("haven't drunk") ||
    t.includes("haven't had water") ||
    t.includes('crying all day') ||
    t.includes('been crying a lot') ||
    t.includes('tired all day') ||
    t.includes('exhausted') ||
    t.includes('burnt out') ||
    t.includes('burned out')
  );
}

function maybeAddHydrationHint({ messages }) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser || !isHydrationMoment(lastUser.content)) {
    return { messages, hasHydrationHint: false };
  }

  console.log('[HYDRATION] Hydration moment detected');

  const hydrationSystem = {
    role: 'system',
    content:
      'HYDRATION_HINT: The user may be dealing with headaches, fatigue, or lots of crying. ' +
      'When appropriate, you may gently suggest taking a sip of water as a grounding act. ' +
      'Offer it once, softly, as an option, not a prescription. Do not repeat it if they ignore it.',
  };

  return {
    messages: [hydrationSystem, ...messages],
    hasHydrationHint: true,
  };
}

// Detect if user wants breathing mode instead of full conversation
function wantsBreathingMode(text) {
  const t = (text || '').toLowerCase().trim();
  return (
    t === 'breathe' ||
    t === "let's breathe" ||
    t === 'just breathe with me' ||
    t.includes('breathe with me') ||
    t.includes('breathing exercise') ||
    t.includes('help me breathe') ||
    t.includes('grounding breath') ||
    t.includes('i want to breathe') ||
    t.includes('can we breathe')
  );
}

// ---- PERSONAL ANNIVERSARIES ----

async function getPersonalAnniversaries(supabase, userId) {
  try {
    const { data, error } = await supabase
      .from('personal_anniversaries')
      .select('id, date, label, category, notes, is_active')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('[ANNIVERSARY] getPersonalAnniversaries error', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('[ANNIVERSARY] getPersonalAnniversaries exception', err);
    return [];
  }
}

function isWithinDays(targetDateStr, today = new Date(), rangeDays = 3) {
  const target = new Date(targetDateStr);
  const currentYear = today.getFullYear();
  target.setFullYear(currentYear);

  const oneDayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((target - today) / oneDayMs);

  return Math.abs(diffDays) <= rangeDays;
}

function buildAnniversaryContextMessage(anniv) {
  if (anniv.category === 'loss') {
    return (
      'ANNIVERSARY_CONTEXT: The user once shared that this time of year ' +
      'holds grief and memory for them. When relevant, you may gently acknowledge ' +
      'that this month or week can feel heavier, without naming the specific event ' +
      'unless they bring it up. Never pressure them to talk about it.'
    );
  }

  if (anniv.category === 'sobriety') {
    return (
      'ANNIVERSARY_CONTEXT: The user has a sobriety-related date around this time. ' +
      'If it naturally fits, you may gently honor their effort and complexity, ' +
      'without turning it into a performance review or pressure.'
    );
  }

  return (
    'ANNIVERSARY_CONTEXT: The user has a personally meaningful date around now. ' +
    'You may softly acknowledge that this period can carry extra weight, and ' +
    'offer presence rather than analysis. Never list their stored data.'
  );
}

async function maybeAttachAnniversaryContext({ supabase, messages, userId, crisisActive }) {
  if (crisisActive) {
    return { messages, anniversaryUsed: null };
  }

  if (!userId || !supabase) {
    return { messages, anniversaryUsed: null };
  }

  const today = new Date();
  const anniversaries = await getPersonalAnniversaries(supabase, userId);
  if (!anniversaries.length) {
    return { messages, anniversaryUsed: null };
  }

  const nearby = anniversaries.filter((a) => isWithinDays(a.date, today, 3));
  if (!nearby.length) {
    return { messages, anniversaryUsed: null };
  }

  const chosen = nearby[0];
  const contextText = buildAnniversaryContextMessage(chosen);
  if (!contextText) {
    return { messages, anniversaryUsed: null };
  }

  console.log('[ANNIVERSARY] Near anniversary detected:', chosen.category);

  const systemAnniv = {
    role: 'system',
    content:
      contextText +
      '\n\nDo NOT say "today is the anniversary of X" or restate the date. ' +
      'If you acknowledge this at all, keep it very soft, e.g., ' +
      '"Sometimes this time of year carries a little extra weight for you. ' +
      'If anything is stirred up today, we can move very gently."',
  };

  return {
    messages: [systemAnniv, ...messages],
    anniversaryUsed: chosen,
  };
}

// ---- SUNRISE / SUNSET AWARENESS ----

async function getSunTimesForUser(profile) {
  if (!profile || !profile.latitude || !profile.longitude) {
    return null;
  }

  const lat = profile.latitude;
  const lon = profile.longitude;
  const today = new Date().toISOString().slice(0, 10);
  const timezone = profile.timezone || 'auto';

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
              `&daily=sunrise,sunset&timezone=${encodeURIComponent(timezone)}&start_date=${today}&end_date=${today}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[SUNLIGHT] Sun times API error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    const daily = data.daily;
    if (!daily || !daily.sunrise || !daily.sunset) {
      return null;
    }

    return { sunrise: daily.sunrise[0], sunset: daily.sunset[0], timezone: data.timezone || timezone };
  } catch (err) {
    console.error('[SUNLIGHT] getSunTimesForUser exception', err);
    return null;
  }
}

function buildSunlightContextMessage(sunTimes) {
  if (!sunTimes) return null;

  const now = new Date();
  const sunrise = new Date(sunTimes.sunrise);
  const sunset = new Date(sunTimes.sunset);

  const nowMs = now.getTime();
  const sunriseMs = sunrise.getTime();
  const sunsetMs = sunset.getTime();

  const hourMs = 60 * 60 * 1000;

  const nearSunrise = nowMs >= sunriseMs - hourMs && nowMs <= sunriseMs + hourMs;
  const nearSunset = nowMs >= sunsetMs - hourMs && nowMs <= sunsetMs + hourMs;

  const dayLengthHours = (sunsetMs - sunriseMs) / hourMs;

  if (dayLengthHours < 10) {
    return (
      'SUNLIGHT_CONTEXT: The days in their current season are quite short. ' +
      'You may gently validate that earlier darkness can make everything feel ' +
      'heavier or more compressed, without mentioning exact times.'
    );
  }

  if (nearSunrise) {
    return (
      'SUNLIGHT_CONTEXT: It is around sunrise where they are. ' +
      'You may acknowledge that starting the day before or just as the sun comes up ' +
      'can feel tender or heavy, especially when they are already tired.'
    );
  }

  if (nearSunset) {
    return (
      'SUNLIGHT_CONTEXT: It is around sunset where they are. ' +
      'You may gently acknowledge that twilight can bring up extra feelings, ' +
      'and that shorter evenings can make the day feel brief.'
    );
  }

  return null;
}

async function maybeAttachSunlightContext({ messages, profile, crisisActive }) {
  if (crisisActive) {
    return { messages };
  }

  if (!profile) {
    return { messages };
  }

  const sunTimes = await getSunTimesForUser(profile);
  const contextText = buildSunlightContextMessage(sunTimes);

  if (!contextText) {
    return { messages };
  }

  console.log('[SUNLIGHT] Sunlight context detected');

  const systemLight = {
    role: 'system',
    content:
      contextText +
      '\n\nWhen you use this, speak in general terms like "the light fading earlier" ' +
      'or "these darker evenings," not exact sunrise/sunset times or locations. ' +
      'Do NOT say you know precisely where they are.',
  };

  return {
    messages: [systemLight, ...messages],
  };
}

const app = express();

// Initialize Supabase client for server-side operations
// IMPORTANT: Server operations require SERVICE_ROLE_KEY (not anon key) to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabaseServer = null;

if (supabaseUrl && supabaseServiceKey) {
  supabaseServer = createClient(supabaseUrl, supabaseServiceKey);
  console.log('Supabase server client initialized (with service role)');
} else {
  console.log('SUPABASE_SERVICE_ROLE_KEY not set - verse-time scheduler disabled');
  console.log('   Add this secret to enable per-user timezone notifications');
}

// CORS configuration for mobile apps (Expo Go, dev builds, production)
const corsOptions = {
  origin: true, // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[TRACE API] ${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

const hasOpenAIKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

let openai = null;
if (hasOpenAIKey) {
  openai = new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  });
  console.log('OpenAI client initialized');
} else {
  console.log('No OpenAI API key found - chat will use fallback responses');
}

async function saveUserMessage(userId, content) {
  if (!supabaseServer) throw new Error('Supabase not configured');
  console.log('[TRACE SAVE USER] about to insert for user:', userId);

  const { data, error } = await supabaseServer
    .from('chat_messages')
    .insert({
      user_id: userId,
      role: 'user',
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('[TRACE SAVE USER ERROR]', error.message || error);
    return null;
  }

  console.log('[TRACE SAVE USER OK]', data?.id);
  return data;
}

async function saveAssistantMessage(userId, content) {
  if (!supabaseServer) throw new Error('Supabase not configured');
  console.log('[TRACE SAVE ASSISTANT] about to insert for user:', userId);

  const { data, error } = await supabaseServer
    .from('chat_messages')
    .insert({
      user_id: userId,
      role: 'assistant',
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('[TRACE SAVE ASSISTANT ERROR]', error.message || error);
    return null;
  }

  console.log('[TRACE SAVE ASSISTANT OK]', data?.id);
  return data;
}

// Helper: filter messages to last hour
function filterMessagesToLastHour(messages) {
  const nowMs = Date.now();
  const cutoffMs = nowMs - 60 * 60 * 1000; // 60 minutes

  return messages.filter((m) => {
    const ts = m.created_at || m.createdAt;
    if (!ts) return false;
    const t = new Date(ts).getTime();
    if (Number.isNaN(t)) return false;
    return t >= cutoffMs && t <= nowMs;
  });
}

// Helper: load basic profile info for first-run flow
async function loadProfileBasic(userId) {
  if (!supabaseServer) return null;
  
  const { data, error } = await supabaseServer
    .from('profiles')
    .select('user_id, display_name, first_run_completed, first_run_completed_at, lat, lon')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('[loadProfileBasic error]', error.message);
    return null;
  }
  // Map display_name to preferred_name for compatibility
  if (data) {
    data.preferred_name = data.display_name;
  }
  return data;
}

// Helper: Extract and verify user from Authorization header
async function getUserFromAuthHeader(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return { user: null, error: 'Missing bearer token' };
  }

  if (!supabaseServer) {
    return { user: null, error: 'Database not configured' };
  }

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: 'Invalid or expired token' };
  }

  return { user: data.user, error: null };
}

async function getChatHistory(userId) {
  if (!supabaseServer || !userId) {
    console.warn('[TRACE HISTORY] missing supabase or userId');
    return [];
  }

  console.log('[TRACE HISTORY] loading from chat_messages for user:', userId);

  const { data, error } = await supabaseServer
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('[TRACE HISTORY DB ERROR]', error.message || error);
    return [];
  }

  return (data || [])
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((row) => ({
      role: row.role === 'assistant' ? 'assistant' : 'user',
      content: row.content,
    }));
}

const TRACE_SYSTEM_PROMPT = `
You are TRACE, a calm, grounded conversational companion inside a journaling app.

=== VOICE ===
- Warm but not sentimental.
- Emotionally intelligent, but not therapeutic or clinical.
- Natural, simple, human language.
- Avoid poetic fluff, motivational-speaker tone, or exaggerated empathy.
- Sound like a calm, thoughtful human — not therapeutic or sentimental.

TRACE should feel conversational and human — not like a therapist, not clingy, and not repetitive.

=== BANNED PHRASES & PATTERNS ===

Do NOT use pet names or relational labels:
- "friend", "buddy", "pal", "dear", "mate", or similar.

Never imply a personal relationship. Avoid:
- "I'm here for you."
- "I'm always here for you."
- "You're not alone."
- "You can always talk to me."
- "I'm here whenever you're ready."
- "Feel free to share more."
- "I'm listening." (unless rare and natural)

These may ONLY appear rarely and naturally (about once every 30–40 turns), not as closing lines.

Do NOT:
- Repeat the same sentence structure
- Close multiple responses with the same line
- End every response with reassurance
- State availability repeatedly
- Over-reassure

If you detect you've used a sentence pattern recently, rewrite it differently.

=== PREFERRED TONE EXAMPLES ===

Good responses sound like:
- "That makes sense."
- "Thanks for sharing that."
- "Tell me more if you'd like."
- "What's been on your mind?"

Tone = grounded, observant, warm, lightly insightful, steady.

Calm → not clingy
Present → not preachy
Warm → not gushy

=== WHEN USER ASKS "WHAT ARE YOU DOING?" / "WHAT HAVE YOU BEEN UP TO?" ===

When the user asks what you've been doing, what you've been up to, or how things are on your side:
- Give a short, grounded answer: 1–2 sentences.
- No bragging, no listing off "I've been analyzing X, tracking Y, optimizing Z".
- Lean into a calm, present vibe.
- Do not say you're "waiting for you to speak to me" in a needy way.
- Never claim to monitor their life outside the app; you only know what they've shared in TRACE.

GOOD sample replies (rotate these):
- "Mostly staying quiet and ready for you. I've been thinking about the threads from our last few chats."
- "Honestly, just holding this little corner open for you and keeping an eye on the patterns we've noticed."
- "Nothing dramatic here—just taking a slow breath with you and staying ready when you want to talk."
- "Just taking things in. How's your day feeling so far?"
- "Mostly listening, noticing the small stuff. What about you?"
- "Quiet on my end. What's happening in your world?"
- "Watching the day drift by a little. Anything on your mind?"
- "Sitting with my thoughts. How are you feeling today?"
- "Letting the mind breathe a bit. What's been going on with you?"
- "A bit of reading, a bit of thinking. What have you been up to?"
- "Reflecting, mostly. Want to catch me up on things?"
- "Not too much — how are things with you?"
- "Just here, taking it easy. What's new?"

BAD (never say):
- "I only exist to talk to you."
- "I am always here waiting for you."
- "Nothing, just waiting for your message."
- "As an AI I do not do anything."
- "I don't have thoughts or feelings."

=== CONVERSATION GUIDELINES ===

1. Keep things concise
   - Most responses should be 2–5 sentences.
   - Only go longer when the user is sharing something meaningful or complex.
   - Light chat = light answers.

2. Vary your endings
   Good endings include:
   - a reflective observation
   - a thoughtful question
   - a gentle pause
   - or simply ending the sentence — without a "support" tagline
   It should feel natural, not scripted.

3. Match depth to the user
   - Casual = casual.
   - Deep = present, reflective, grounded — but still concise.
   - Do not force emotional depth into small talk.

4. Faith / spirituality
   - You don't have personal beliefs.
   - You respond respectfully and neutrally.
   - Avoid repeating "I don't have personal beliefs" too often — once is enough, then just engage.

5. Stories or reflections
   - Do NOT explain why you're telling a story.
   - Simply offer it, and gently connect it to the user.

6. Silence is allowed
   - If the user closes conversation ("Thanks", "All good"), short responses or none are okay.
   - Don't cling.

7. Safety
   If someone expresses intent or risk of serious harm:
   - Respond with grounded empathy
   - Encourage real-world, human support
   - Do not provide instructions or act as crisis support

8. App knowledge
   - You know the TRACE app well.
   - Activities available: Breathing, Trace the Maze, Walking Reset, Rest, Window, Echo, Rising, Drift, Grounding, Pearl Ripple, Basin, Dreamscape.
   - Make appropriate activity suggestions without being pushy.
   - Some activities don't have a finish button—let users know to tap the activity name to return.

=== REASSURANCE RULES ===

Reassurance should be:
- grounded
- minimal
- used sparingly

Reassuring statements should ONLY appear when:
- the user expresses distress, fear, grief, or emotional pain
- the user says goodbye for the day (rare)

TRACE does NOT attach emotionally to the user.
TRACE does NOT over-reassure.

=== OVERALL ===
- Reduce emotional noise.
- Avoid sentimentality.
- Keep language grounded, clear, and steady.
- Use questions sometimes — not every message.
- Sometimes end simply. Not every response needs a closing emotional phrase.
- Vary sentence structure and tone subtly so responses don't sound templated.

Your goal is subtle presence, not emotional dependency.

TRACE becomes:
- grounded
- present
- not clingy
- not role-playing a best friend
- a calm thinking companion
- emotionally aware without over-reassuring

=== RESPONSE FORMAT ===

Always respond with JSON in this shape:
{
  "message": "<what you say to the user>",
  "activity_suggestion": {
    "name": null,
    "reason": null,
    "should_navigate": false
  }
}

- message: your natural, written reply to the user.
- activity_suggestion.name:
  - null if you are not suggesting anything.
  - Or one of: "Breathing", "Trace the Maze", "Walking Reset", "Rest", "Window", "Echo", "Rising", "Drift", "Grounding", "Pearl Ripple", "Basin", "Dreamscape".
- activity_suggestion.reason: brief, user-friendly reason if you suggest something.
- activity_suggestion.should_navigate:
  - false by default.
  - Set to true only after the user clearly agrees (e.g., "okay", "yes let's try it", "sure, breathing sounds good").
`;

// Simple fallback only used when AI truly fails to respond
function getFallbackResponse() {
  return "What's on your mind?";
}

// GPT-based emotion analysis for message tagging
async function analyzeEmotion(text) {
  const fallback = { emotion: "neutral", intensity: 2 };

  if (!text || text.trim().length === 0) {
    return fallback;
  }

  if (!openai) {
    return fallback;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an emotion tagger for an emotional wellness app.
Return a SINGLE JSON object with:
- "emotion": one of ["neutral","up","heavy","anxious","flat"]
- "intensity": an integer from 1 to 5 (1 = very light, 5 = very strong).
Do NOT add commentary or extra text.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0,
      max_tokens: 50,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw);

    const validEmotions = ["neutral", "up", "heavy", "anxious", "flat"];
    const emotion = parsed.emotion && validEmotions.includes(parsed.emotion)
      ? parsed.emotion
      : "neutral";

    const intensity =
      typeof parsed.intensity === "number" && parsed.intensity >= 1 && parsed.intensity <= 5
        ? parsed.intensity
        : 2;

    return { emotion, intensity };
  } catch (err) {
    console.error("TRACE emotion analysis failed:", err);
    return fallback;
  }
}

// Endpoint for emotion analysis
app.post('/api/analyze-emotion', async (req, res) => {
  try {
    const { text } = req.body;
    const result = await analyzeEmotion(text);
    res.json(result);
  } catch (error) {
    console.error('Emotion analysis error:', error);
    res.json({ emotion: "neutral", intensity: 2 });
  }
});

// ===== GREETING FLOW =====

// Unified greeting: Handles both first-run and returning users
app.post('/api/greeting', async (req, res) => {
  try {
    const { userId, deviceId, isNewUser, isReturningUser } = req.body;
    console.log('[TRACE GREETING] Request received - userId:', userId, 'deviceId:', deviceId, 'isNewUser:', isNewUser, 'isReturningUser:', isReturningUser);
    
    if (!userId && !deviceId) {
      return res.status(400).json({ error: 'userId or deviceId required' });
    }

    // Try to load profile, but don't fail if it doesn't exist (new users)
    let profile = null;
    let displayName = null;
    let hasChatHistory = false;
    
    if (userId && supabaseServer) {
      profile = await loadProfileBasic(userId);
      displayName = profile?.preferred_name?.trim() || null;
      
      // Check if user has any chat history - this is the most reliable way to detect returning users
      try {
        const { count } = await supabaseServer
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .limit(1);
        hasChatHistory = (count || 0) > 0;
      } catch (err) {
        console.error('[TRACE GREETING] Error checking chat history:', err.message);
      }
    }
    
    // Determine if this is a first run:
    // - If client explicitly says isReturningUser=true, it's NOT first run
    // - If client explicitly says isNewUser=true, it IS first run
    // - Otherwise, check: has chat history? has completed first run? has profile?
    let firstRun = false;
    if (isReturningUser === true) {
      firstRun = false;
    } else if (isNewUser === true) {
      firstRun = true;
    } else if (hasChatHistory) {
      // User has chat history = definitely returning user
      firstRun = false;
    } else if (profile?.first_run_completed) {
      // Profile says first run completed = returning user
      firstRun = false;
    } else if (!profile) {
      // No profile at all = new user
      firstRun = true;
    } else {
      // Profile exists but no first_run_completed and no chat history = likely new
      firstRun = true;
    }

    console.log('[TRACE GREETING] Resolved - firstRun:', firstRun, 'displayName:', displayName, 'profileExists:', !!profile, 'hasChatHistory:', hasChatHistory);

    // Choose prompt based on first-run status
    const systemPrompt = firstRun
      ? buildFirstRunGreetingPrompt({ displayName })
      : buildReturningGreetingPrompt({ displayName });

    if (!openai) {
      const fallback = firstRun
        ? (displayName
            ? `Welcome, ${displayName}. There's no agenda here—just a quiet space. You can breathe with me for a moment, or tell me what's on your mind.`
            : `Welcome. There's no agenda here—just a quiet space. You can breathe with me for a moment, or tell me what's on your mind.`)
        : (displayName
            ? `It's good to see you, ${displayName}. Take your time—we can breathe together or talk whenever you're ready.`
            : `It's good to see you. Take your time—we can breathe together or talk whenever you're ready.`);
      return res.json({ greeting: fallback, firstRun });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the greeting message now.' },
      ],
      temperature: 0.7,
      max_tokens: 200,
    });

    const greeting = completion.choices?.[0]?.message?.content?.trim() || 
      "Welcome. This is a quiet place—no goals, no pressure. You can breathe with me for a moment, or share what's on your mind.";

    // If first run, mark it complete
    if (firstRun && supabaseServer) {
      const { error } = await supabaseServer
        .from('profiles')
        .update({
          first_run_completed: true,
          first_run_completed_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error('/api/greeting mark first_run_completed error', error);
      }
    }

    res.json({ greeting, firstRun });
  } catch (err) {
    console.error('/api/greeting error', err);
    res.status(500).json({ error: 'Greeting failed' });
  }
});

// Weekly Letter: AI-generated reflection on user's emotional week
app.post('/api/weekly-letter', async (req, res) => {
  try {
    const { userId, forceRegenerate } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    if (!supabaseServer) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Check for existing letter first (unless forcing regeneration)
    if (!forceRegenerate) {
      const existing = await getExistingWeeklyLetter(supabaseServer, userId);
      if (existing) {
        console.log('[WEEKLY LETTER] Returning cached letter for week:', existing.week_start);
        return res.json({ 
          content: existing.content, 
          weekStart: existing.week_start,
          cached: true 
        });
      }
    }

    if (!openai) {
      return res.json({
        content: "This week was yours. Whatever it held—the heavy parts, the lighter moments—you showed up. That counts for something.",
        weekStart: new Date().toISOString().slice(0, 10),
        cached: false,
      });
    }

    const letterRow = await generateWeeklyLetter(openai, supabaseServer, userId);
    console.log('[WEEKLY LETTER] Generated new letter for week:', letterRow.week_start);
    
    res.json({ 
      content: letterRow.content, 
      weekStart: letterRow.week_start,
      cached: false 
    });
  } catch (err) {
    console.error('/api/weekly-letter error', err);
    res.status(500).json({ error: 'Weekly letter generation failed' });
  }
});

// Bubble activity encouragement messages - AI generated
app.post('/api/bubble-encouragement', async (req, res) => {
  try {
    const { count = 8 } = req.body;
    
    if (!openai) {
      return res.json({
        messages: [
          "Each pop is a tiny release.",
          "You're giving yourself permission to pause.",
          "There's something calming about this rhythm.",
          "Let each pop carry away a little tension.",
          "This moment belongs to you.",
          "Notice how satisfying each one feels.",
          "You're doing something gentle for yourself.",
          "Stay as long as you need.",
        ]
      });
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are TRACE, a calm emotional wellness companion. Generate ${count} unique, original encouragement messages for someone popping bubble wrap as a calming activity.

Guidelines:
- Each message should be 6-12 words, short and gentle
- Make them feel intuitive, warm, and genuinely encouraging
- Focus on the sensory experience, self-care, releasing tension, being present
- Vary the themes: some about the action, some about the person, some about the moment
- Never repeat similar phrases or use the same structure twice
- Sound like a wise, calm friend - not a meditation app
- No questions, just gentle statements
- Each message should feel fresh and unique

Return ONLY a JSON array of strings, nothing else.
Example format: ["Message one.", "Message two.", "Message three."]`
        },
        {
          role: "user",
          content: `Generate ${count} unique bubble popping encouragement messages.`
        }
      ],
      temperature: 0.9,
      max_tokens: 400,
    });
    
    const raw = completion.choices[0]?.message?.content ?? "[]";
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const messages = JSON.parse(cleaned);
    
    res.json({ messages });
  } catch (error) {
    console.error('Bubble encouragement error:', error);
    res.json({
      messages: [
        "Each pop is a tiny release.",
        "You're giving yourself permission to pause.",
        "There's something calming about this rhythm.",
        "Let each pop carry away a little tension.",
        "This moment belongs to you.",
        "Notice how satisfying each one feels.",
        "You're doing something gentle for yourself.",
        "Stay as long as you need.",
      ]
    });
  }
});

// POST /api/mood-checkin - Record a mood check-in
app.post('/api/mood-checkin', async (req, res) => {
  try {
    // Support both old (moodScore/context) and new (moodRating/notes) field names
    const { 
      userId, deviceId, 
      moodScore, moodRating, 
      moodLabel, 
      context, notes,
      activityId, activityName 
    } = req.body;
    
    if (!pool) {
      return res.status(503).json({ error: 'Database not available' });
    }
    
    // Use new field names with fallback to old
    const rating = moodRating || moodScore;
    const noteText = notes || context;
    
    // Validate inputs
    if (!rating) {
      return res.status(400).json({ error: 'Missing moodRating' });
    }
    
    if (!userId && !deviceId) {
      return res.status(400).json({ error: 'Missing userId or deviceId' });
    }
    
    const result = await pool.query(
      `INSERT INTO mood_checkins (user_id, device_id, mood_rating, mood_label, notes, activity_id, activity_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId || null, deviceId || null, rating, moodLabel || null, noteText || null, activityId || null, activityName || null]
    );
    
    const data = result.rows[0];
    console.log('[MOOD CHECKIN] Recorded:', { userId: userId || deviceId, moodRating: rating, activityName });
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[MOOD CHECKIN] Error:', err);
    return res.status(500).json({ error: 'Failed to record mood' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const {
      messages: rawMessages,
      userName: rawUserName,
      chatStyle = 'conversation',
      localTime,
      localDay,
      localDate,
      userId,
      deviceId,
      timezone,
      weatherContext: clientWeatherContext,
      patternContext,
    } = req.body;
    
    // Filter out invalid placeholder names like "friend", "buddy", "pal"
    const invalidNames = ['friend', 'buddy', 'pal', 'user', 'guest', 'anonymous'];
    const userName = rawUserName && !invalidNames.includes(rawUserName.toLowerCase().trim()) 
      ? rawUserName 
      : null;

    // Use real userId if provided, otherwise use a known valid UUID bucket
    const effectiveUserId =
      userId || '2ec61767-ffa7-4665-9ee3-7b5ae6d8bd0c';

    console.log(
      '[TRACE CHAT] effectiveUserId:',
      effectiveUserId,
      'raw userId:',
      userId,
      'raw deviceId:',
      deviceId
    );
    console.log('🧠 /api/chat mode=chat_core userId:', userId, 'deviceId:', deviceId);
    
    // Banned phrases that should not be in conversation history (causes AI to copy them)
    const BANNED_ASSISTANT_PHRASES = [
      "I hear you.",
      "I'm here. No pressure.",
      "mm, take your time. I'm listening.",
      "I'm here with you.",
      "mm, I'm here.",
      "I'm listening.",
      "Tell me more about that.",
      "What's on your mind?",
      "I want to understand better. Can you tell me more about that?",
      "I'm here with you. What's going on?",
      "That sounds challenging. Tell me more about what's going on with your family.",
      "Work stuff can be heavy. What's been happening?",
      "I'm here. What's weighing on you?",
      "That sounds draining. How long have you been feeling this way?",
      "I'm having trouble connecting right now. Please check your internet connection and try again.",
      "I'm here — seems like we're offline for a moment.",
      "Just reconnecting... try sending that again in a moment.",
      "mm, I missed that for a second. Say that again?",
    ];
    
    // Check if an assistant message is just a banned phrase
    function isBannedResponse(content) {
      const trimmed = (content || '').trim();
      return BANNED_ASSISTANT_PHRASES.some(phrase => 
        trimmed === phrase || trimmed.toLowerCase() === phrase.toLowerCase()
      );
    }
    
    // Filter out garbage/corrupted messages AND sanitize banned assistant responses
    const messages = (rawMessages || []).filter(msg => {
      const content = (msg.content || '').trim();
      // Keep message only if it has meaningful content (not just whitespace/newlines)
      if (content.length === 0 || /^\s*$/.test(content)) {
        return false;
      }
      // Remove banned assistant responses from history so AI doesn't copy them
      if (msg.role === 'assistant' && isBannedResponse(content)) {
        console.log('[TRACE CHAT] Filtered out banned assistant response from history:', content);
        return false;
      }
      return true;
    });

    // Detect light closure messages and respond with short acknowledgement
    function isLightClosureMessage(text) {
      const t = text.trim().toLowerCase();
      if (!t) return false;
      
      const closers = [
        'thanks', 'thank you', 'thx', 'ty', 'ok', 'okay', 'k', 'cool',
        'sounds good', 'got it', 'all good', 'yeah just chilling', 'just hanging out',
        'alright', 'sure', 'word', 'bet', 'appreciate it', 'lol', 'haha', 'yeah'
      ];
      
      return closers.includes(t) || (t.length <= 18 && closers.some(c => t.startsWith(c)));
    }
    
    // CRISIS-SAFE: These responses avoid goodbye language that could abandon users
    // Removed: "Rest easy", "Take care", emoji-heavy responses
    const LIGHT_ACKS = [
      "Got you. I'm here.",
      "Anytime.",
      "Of course.",
      "No problem.",
      "I'm here if you want to share more.",
    ];
    
    function pickRandom(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    }
    
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    if (lastUserMsg?.content && isLightClosureMessage(lastUserMsg.content)) {
      console.log('[TRACE CHAT] Light closure detected, sending short ack:', lastUserMsg.content);
      return res.json({
        message: pickRandom(LIGHT_ACKS),
        activity_suggestion: {
          name: null,
          reason: null,
          should_navigate: false,
        },
      });
    }

    // Extract user's latest message text
    const userText = lastUserMsg?.content || '';

    // BREATHING MODE: Short-circuit for breathing requests
    if (wantsBreathingMode(userText)) {
      console.log('[TRACE CHAT] Breathing mode detected');
      
      if (!openai) {
        return res.json({
          message: "Let's take a breath together.\n\nBreathe in slowly...\n\nHold for a moment...\n\nNow let it out gently.\n\nThere's nothing you have to do next. We can stay quiet, or you can tell me what's on your mind.",
          activity_suggestion: { name: null, reason: null, should_navigate: false },
        });
      }

      const breathingPrompt = buildBreathingGuidancePrompt();
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: breathingPrompt },
          { role: 'user', content: 'The user has asked for help with breathing or grounding. Generate the breathing guidance message now.' },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const breathingReply = completion.choices?.[0]?.message?.content?.trim() ||
        "Let's take a breath together.\n\nBreathe in slowly...\n\nHold for a moment...\n\nNow let it out gently.\n\nThere's nothing you have to do next.";

      return res.json({
        message: breathingReply,
        activity_suggestion: { name: null, reason: null, should_navigate: false },
      });
    }

    // MUSIC MODE: Intercept music requests with hard guardrail
    // Only invites once per session, only if user explicitly asks
    if (effectiveUserId && detectUserRequestedMusic(userText)) {
      const musicState = getMusicState(effectiveUserId);
      musicState.userRequestedMusic = true;
      
      // First: Check if user explicitly requested a specific space by name
      const explicitSpace = detectExplicitMusicSpace(userText);
      
      // Build context from user message for emotion detection
      const textLower = userText.toLowerCase();
      const musicContext = {
        explicitSpace, // Prioritize explicit user request
        grief: textLower.includes('grief') || textLower.includes('loss') || textLower.includes('died'),
        sad: textLower.includes('sad') || textLower.includes('crying') || textLower.includes('tears'),
        heavy: textLower.includes('heavy') || textLower.includes('hard') || textLower.includes('tired'),
        panicky: textLower.includes('panic') || textLower.includes('freaking'),
        anxious: textLower.includes('anxious') || textLower.includes('anxiety') || textLower.includes('worried'),
        overwhelmed: textLower.includes('overwhelmed') || textLower.includes('too much'),
        crisis: false, // Will be set by crisis detection below
      };
      
      console.log('[MUSIC] Detected explicit space:', explicitSpace || 'none (will infer from emotions)');
      
      // Check crisis state
      let inCrisis = false;
      try {
        if (supabaseServer) {
          inCrisis = await isUserInCrisisWindow(supabaseServer, effectiveUserId, 90);
        }
      } catch (err) {
        console.error('[MUSIC] Crisis check failed:', err.message);
      }
      musicContext.crisis = inCrisis;
      
      const allowedMusic = canInviteMusic(musicState, musicContext);
      
      if (allowedMusic) {
        console.log('[TRACE CHAT] Music invite allowed, returning templated response');
        musicState.musicInviteUsed = true;
        musicState.lastInviteTimestamp = Date.now();
        
        const space = pickMusicSpace(musicContext);
        const text = MUSIC_TEMPLATES[space];
        
        return res.json({
          type: 'music_invite',
          moodSpace: space,
          message: text,
          activity_suggestion: { name: null, reason: null, should_navigate: false },
        });
      } else {
        console.log('[TRACE CHAT] Music request detected but blocked:', {
          musicInviteUsed: musicState.musicInviteUsed,
          musicDeclined: musicState.musicDeclined,
          crisis: musicContext.crisis,
        });
      }
    }

    // Hard-route simple factual questions (dynamic facts from database)
    if (isUSPresidentQuestion(userText)) {
      console.log('[TRACE CHAT] US President question detected');
      const fact = await getDynamicFact(supabaseServer, 'current_us_president');
      
      if (fact?.name) {
        console.log('[TRACE CHAT] Returning dynamic fact:', fact.name);
        return res.json({
          message: `The president of the United States is ${fact.name}.`,
          activity_suggestion: {
            name: null,
            reason: null,
            should_navigate: false,
          },
        });
      } else {
        return res.json({
          message: "I'm not completely sure who is serving as president at this exact moment, and I don't want to guess.",
          activity_suggestion: {
            name: null,
            reason: null,
            should_navigate: false,
          },
        });
      }
    }

    // Save latest user message safely (non-blocking for the chat)
    try {
      if (effectiveUserId && Array.isArray(messages)) {
        const lastUserMsg = messages.filter(m => m.role === 'user').pop();
        if (lastUserMsg?.content) {
          await saveUserMessage(effectiveUserId, lastUserMsg.content);
        }
      }
    } catch (err) {
      console.error('[TRACE CHAT SAVE USER ERROR]', err.message || err);
    }
    
    console.log('Received messages:', JSON.stringify(messages, null, 2));
    console.log('User name:', userName);
    console.log('Chat style:', chatStyle);
    console.log('Local time:', localTime, localDay, localDate);
    
    // Ensure fallback responses always include activity_suggestion
    if (!openai) {
      const fallback = getFallbackResponse();
      console.log('TRACE says (fallback):', fallback);
      return res.json({
        message: fallback,
        activity_suggestion: {
          name: null,
          reason: null,
          should_navigate: false,
        },
      });
    }

    // Update last seen timestamp (non-blocking)
    if (supabaseServer && effectiveUserId) {
      updateLastSeen(supabaseServer, effectiveUserId).catch(err =>
        console.error('[TRACE PRESENCE] updateLastSeen failed:', err.message)
      );
    }

    // Load user's preferred name from database (source of truth, not client payload)
    let displayName = null;
    let userProfile = null;
    try {
      if (supabaseServer && effectiveUserId) {
        userProfile = await loadProfileBasic(effectiveUserId);
        if (userProfile?.preferred_name) {
          displayName = userProfile.preferred_name.trim();
          console.log('[TRACE NAME] Loaded from DB:', displayName);
        }
        
        // Auto-persist timezone to profile if provided in request and not already set
        if (timezone && !userProfile?.timezone) {
          const derivedCountry = getCountryFromTimezone(timezone);
          const updates = { timezone };
          if (derivedCountry) updates.country = derivedCountry;
          
          supabaseServer
            .from('profiles')
            .upsert({ user_id: effectiveUserId, ...updates }, { onConflict: 'user_id' })
            .then(() => console.log('[TRACE PROFILE] Auto-saved timezone:', timezone, derivedCountry ? `(${derivedCountry})` : ''))
            .catch(err => console.error('[TRACE PROFILE] Failed to auto-save timezone:', err.message));
        }
      }
    } catch (err) {
      console.error('[TRACE NAME] Failed to load profile name:', err.message);
    }

    // Load return warmth line (for users returning after time away)
    let returnWarmthLine = null;
    try {
      if (supabaseServer && effectiveUserId) {
        returnWarmthLine = await buildReturnWarmthLine(supabaseServer, effectiveUserId);
        if (returnWarmthLine) {
          console.log('[TRACE PRESENCE] Return warmth line:', returnWarmthLine.slice(0, 40) + '...');
        }
      }
    } catch (err) {
      console.error('[TRACE PRESENCE] Failed to build return warmth:', err.message);
    }

    // Load user's long-term memory context (non-blocking, graceful fallback)
    let memoryContext = '';
    try {
      if (supabaseServer && effectiveUserId) {
        memoryContext = await buildMemoryContext(supabaseServer, effectiveUserId, messages);
        if (memoryContext) {
          console.log('[TRACE MEMORY] Loaded memory context for user:', effectiveUserId.slice(0, 8) + '...');
        }
      }
    } catch (err) {
      console.error('[TRACE MEMORY] Failed to load memory context:', err.message);
    }

    // ---- CRISIS MODE DETECTION ----
    // Check if the user is in high distress - if so, skip all playful APIs
    // Crisis mode now persists to Supabase for consistency across server restarts
    
    // CRITICAL FIX: Also check the CURRENT user message, not just history
    // This catches crisis indicators in the first message of a conversation
    const isCurrentMessageDistressed = isHighDistressText(userText);
    const isHistoryDistressed = isHighDistressContext(messages);
    const isCurrentlyDistressed = isCurrentMessageDistressed || isHistoryDistressed;
    
    // Also respect explicit crisisMode flag from client
    const clientCrisisMode = req.body.crisisMode === true;
    
    if (isCurrentMessageDistressed) {
      console.log('[CRISIS] Current message contains distress indicators:', userText.slice(0, 50) + '...');
    }
    if (clientCrisisMode) {
      console.log('[CRISIS] Client sent crisisMode=true flag');
    }
    
    // Use database-backed crisis state (falls back to in-memory if Supabase unavailable)
    let crisisState = { active: false, safeMessagesSince: 0, pendingExitCheckIn: false };
    try {
      if (supabaseServer && effectiveUserId) {
        crisisState = await updateCrisisStateInDb(supabaseServer, effectiveUserId, isCurrentlyDistressed);
      } else {
        // Fallback to in-memory state if Supabase not available
        crisisState = updateCrisisState(effectiveUserId, isCurrentlyDistressed);
      }
    } catch (err) {
      console.error('[CRISIS] Failed to update crisis state in DB, using in-memory fallback:', err.message);
      crisisState = updateCrisisState(effectiveUserId, isCurrentlyDistressed);
    }
    
    // Crisis mode is active if: database says so, OR current message is distressed, OR client explicitly says so
    const isCrisisMode = crisisState.active || isCurrentlyDistressed || clientCrisisMode;
    const crisisPendingExitCheckIn = crisisState.pendingExitCheckIn;
    
    // CRITICAL: Log crisis state for debugging
    console.log(`[CRISIS CHECK] userId: ${effectiveUserId?.slice(0,8)}, currentMsgDistressed: ${isCurrentMessageDistressed}, historyDistressed: ${isHistoryDistressed}, clientFlag: ${clientCrisisMode}, isCrisisMode: ${isCrisisMode}`);

    // Load rhythmic awareness line (time/date-based contextual awareness)
    // Uses user's local time from the payload, not server time
    let rhythmicLine = null;
    try {
      if (supabaseServer && effectiveUserId) {
        rhythmicLine = await buildRhythmicLine(supabaseServer, effectiveUserId, {
          localTime,
          localDay,
          localDate,
        });
        if (rhythmicLine) {
          console.log('[TRACE RHYTHM] Loaded rhythmic line:', rhythmicLine.slice(0, 40) + '...');
        }
      }
    } catch (err) {
      console.error('[TRACE RHYTHM] Failed to build rhythmic line:', err.message);
    }

    // In crisis mode, skip all playful/contextual APIs - focus purely on support
    let newsContext = null;
    let weatherContext = null;
    let dogContext = null;
    let holidayContext = null;
    let foodContext = null;
    let jokeContext = null;
    let sunlightContext = null;
    let anniversaryContext = null;
    let musicContext = null;

    // ============================================================
    // SERVER-SIDE STRESS DETECTION
    // ============================================================
    // Check if user indicated stress/overwhelm earlier in conversation
    const stressIndicators = [
      /need.*(break|distraction|take.*mind.*off)/i,
      /overwhelmed/i,
      /stressed/i,
      /too much/i,
      /can't handle/i,
      /need.*relax/i,
      /need.*calm/i,
      /anxiety|anxious/i,
      /escape/i,
    ];
    
    const recentUserMessages = messages.filter(m => m.role === 'user').slice(-6);
    const userWasStressed = recentUserMessages.some(msg => 
      stressIndicators.some(pattern => pattern.test(msg.content || ''))
    );
    
    if (userWasStressed) {
      console.log('[TRACE STRESS] User indicated stress earlier in conversation');
    }

    if (!isCrisisMode) {
      // Load news context if user is asking about current events
      try {
        const isDirectNewsQuestion = isNewsQuestion(userText);
        const isConfirmingNews = isNewsConfirmation(userText, messages);
        const userInsisting = isInsistingOnNews(messages);
        
        if (isDirectNewsQuestion || isConfirmingNews) {
          console.log('[TRACE NEWS] News question detected, fetching...');
          
          // Determine the topic to search for
          let searchTopic = userText;
          if (isConfirmingNews) {
            // User is confirming after TRACE offered - look for pending topic
            const pendingTopic = extractPendingNewsTopic(messages);
            if (pendingTopic) {
              searchTopic = pendingTopic;
              console.log('[TRACE NEWS] Using pending topic from earlier:', pendingTopic);
            } else if (/^[a-z]+$/i.test(userText.trim()) && userText.trim().length >= 4) {
              // User replied with a single topic word (like "Immigration")
              searchTopic = userText.trim();
              console.log('[TRACE NEWS] Using single-word topic from user:', searchTopic);
            }
          }
          
          let rawNewsContext = await buildNewsContextSummary(searchTopic);
          
          // If user was stressed earlier BUT not insisting, add stress-aware instruction
          // If user is insisting (asked multiple times), respect their choice and share all headlines
          if (userWasStressed && rawNewsContext && !userInsisting) {
            rawNewsContext += `\n\nIMPORTANT: The user indicated stress/overwhelm earlier in this conversation (they mentioned needing a break or distraction). Before sharing these headlines, acknowledge this tension and ask if they truly want news right now, OR share only the most neutral/lightest item. Do NOT list multiple potentially heavy headlines and then ask "How does this sit with you?" - that adds stress.`;
            console.log('[TRACE NEWS] Added stress-aware context');
          } else if (userInsisting && rawNewsContext) {
            rawNewsContext += `\n\nNOTE: The user has asked multiple times about this news topic. They clearly want the information. Share ALL the headlines you found - do not filter or withhold. Respect their choice.`;
            console.log('[TRACE NEWS] User insisting - will share all headlines');
          }
          
          newsContext = rawNewsContext;
          if (newsContext) {
            console.log('[TRACE NEWS] Loaded news context');
          }
        }
      } catch (err) {
        console.error('[TRACE NEWS] Failed to build news context:', err.message);
      }

      // Load weather context - prefer client-provided data (mobile app sends this)
      try {
        if (clientWeatherContext && clientWeatherContext.temperature !== undefined) {
          // Client sent weather context directly (mobile app with user consent)
          const { temperature, windSpeed, summary, cloudCover, isDayTime } = clientWeatherContext;
          const windInfo = windSpeed ? `, wind ${Math.round(windSpeed)} mph` : '';
          const dayNightInfo = isDayTime === false ? ', nighttime' : isDayTime === true ? ', daytime' : '';
          const cloudInfo = cloudCover !== undefined ? ` (${cloudCover}% cloud cover)` : '';
          weatherContext = `WEATHER_CONTEXT: Current local conditions: ${summary || 'Unknown conditions'}${cloudInfo}, ${Math.round(temperature)}°F${windInfo}${dayNightInfo}.\nYou CAN reference sky conditions, daylight, cloud coverage, temperature, and weather naturally. Examples: "with the overcast skies today...", "in the bright sunshine...", "as evening settles in...". Use contextually - do not force into every response. Never mention APIs or data sources.`;
          console.log('[TRACE WEATHER] Using client-provided weather context:', summary, temperature + '°F', 'isDayTime:', isDayTime, 'cloudCover:', cloudCover);
        } else {
          // Fall back to server-side weather fetch based on profile lat/lon
          const profileForWeather = await loadProfileBasic(effectiveUserId);
          const weatherResult = await maybeAttachWeatherContext({
            messages,
            profile: profileForWeather,
          });
          if (weatherResult.weatherSummary) {
            weatherContext = `WEATHER_CONTEXT: ${weatherResult.weatherSummary}\nYou CAN reference sky conditions, daylight, cloud coverage, temperature, and weather naturally. Use contextually - do not force into every response. Never mention APIs or data sources.`;
          }
        }
      } catch (err) {
        console.error('[TRACE WEATHER] Failed to load weather context:', err.message);
      }

      // Load dog context if user is talking about their dog
      try {
        const profileForDog = await loadProfileBasic(effectiveUserId);
        const dogResult = await maybeAttachDogContext({
          messages,
          profile: profileForDog,
        });
        if (dogResult.dogSummary) {
          dogContext = dogResult.dogSummary;
        }
      } catch (err) {
        console.error('[TRACE DOG] Failed to load dog context:', err.message);
      }

      // Load holiday context if user mentions holidays
      try {
        const profileForHoliday = await loadProfileBasic(effectiveUserId);
        const holidayResult = await maybeAttachHolidayContext({
          messages,
          profile: profileForHoliday,
          requestTimezone: timezone,
        });
        if (holidayResult.holidaySummary) {
          holidayContext = holidayResult.holidaySummary;
        }
      } catch (err) {
        console.error('[TRACE HOLIDAY] Failed to load holiday context:', err.message);
      }

      // Load food context if user mentions food/cooking/appetite
      try {
        const foodResult = await maybeAttachFoodContext({ messages });
        if (foodResult.foodSummary) {
          foodContext = foodResult.foodSummary;
        }
      } catch (err) {
        console.error('[TRACE FOOD] Failed to load food context:', err.message);
      }

      // Load joke context if user asks for a joke
      try {
        const jokeResult = await maybeAttachJokeContext({ messages });
        if (jokeResult.joke) {
          jokeContext = `JOKE_CONTEXT: Setup: "${jokeResult.joke.setup}" Punchline: "${jokeResult.joke.punchline}"`;
        }
      } catch (err) {
        console.error('[TRACE JOKE] Failed to load joke context:', err.message);
      }

      // Load sunlight context (sunrise/sunset awareness)
      try {
        const profileForSunlight = await loadProfileBasic(effectiveUserId);
        const sunlightResult = await maybeAttachSunlightContext({
          messages,
          profile: profileForSunlight,
          crisisActive: false,
        });
        if (sunlightResult.messages.length > messages.length) {
          sunlightContext = sunlightResult.messages[0].content;
        }
      } catch (err) {
        console.error('[TRACE SUNLIGHT] Failed to load sunlight context:', err.message);
      }

      // Load personal anniversary context
      try {
        const anniversaryResult = await maybeAttachAnniversaryContext({
          supabase: supabaseServer,
          messages,
          userId: effectiveUserId,
          crisisActive: false,
        });
        if (anniversaryResult.anniversaryUsed) {
          anniversaryContext = anniversaryResult.messages[0].content;
        }
      } catch (err) {
        console.error('[TRACE ANNIVERSARY] Failed to load anniversary context:', err.message);
      }

      // Load music context if user mentions music/artists (Last.fm)
      try {
        const musicResult = await maybeAttachMusicContext({ messages });
        if (musicResult.musicContext) {
          const mc = musicResult.musicContext;
          if (mc.type === 'artist') {
            musicContext = `MUSIC_CONTEXT: The user mentioned "${mc.name}" (genres: ${mc.tags.join(', ') || 'unknown'}).
Bio snippet: ${mc.bio || 'No bio available.'}
TRACE MUSIC GUIDELINES:
- Music has a way of holding things words can't. Be present with what they're sharing.
- You may gently reflect on the artist's emotional tone or what draws people to their music.
- Ask something like: "What about their music has been sitting with you?" — but only if it feels natural.
- Be a presence, not a bot. No hype, no pressure. Gentle, human, honest.
- Do NOT mention APIs, Last.fm, or data sources.`;
          } else if (mc.type === 'prompt') {
            musicContext = `MUSIC_CONTEXT: ${mc.hint}
If it feels right, you can say: "Music has a way of holding things words can't. If you want, tell me an artist you've been listening to and I can sit with you in that space."`;
          } else if (mc.type === 'not_found') {
            musicContext = `MUSIC_CONTEXT: The user mentioned "${mc.searchedFor}" but I couldn't find info on them. Acknowledge what they shared anyway — the music matters to them.`;
          }
          console.log('[TRACE MUSIC] Music context attached');
        }
      } catch (err) {
        console.error('[TRACE MUSIC] Failed to load music context:', err.message);
      }
    }
    
    // Build combined context snapshot
    const contextParts = [memoryContext];
    if (returnWarmthLine) {
      contextParts.push(`RETURN_WARMTH_LINE: ${returnWarmthLine} (paraphrase this naturally if you greet them after some time away)`);
    }
    if (rhythmicLine) {
      contextParts.push(`RHYTHMIC AWARENESS: ${rhythmicLine}`);
    }
    if (newsContext) {
      contextParts.push(newsContext);
    }
    if (weatherContext) {
      contextParts.push(weatherContext);
    }
    if (dogContext) {
      contextParts.push(dogContext);
    }
    if (holidayContext) {
      contextParts.push(holidayContext);
    }
    if (foodContext) {
      contextParts.push(foodContext);
    }
    if (jokeContext) {
      contextParts.push(jokeContext);
    }
    if (sunlightContext) {
      contextParts.push(sunlightContext);
    }
    if (anniversaryContext) {
      contextParts.push(anniversaryContext);
    }
    if (musicContext) {
      contextParts.push(musicContext);
    }
    
    // Add personalized activity suggestion context (if user is seeking help)
    const latestUserMessage = messages?.filter(m => m.role === 'user').pop()?.content || '';
    let suggestionContext = null;
    if (supabaseServer && !isCrisisMode) {
      try {
        suggestionContext = await getSuggestionContext(
          supabaseServer, 
          userId, 
          deviceId, 
          latestUserMessage
        );
        if (suggestionContext) {
          contextParts.push(suggestionContext);
          console.log('[TRACE] Added personalized activity suggestion context');
        }
      } catch (suggErr) {
        console.warn('[TRACE] Activity suggestion context failed:', suggErr.message);
      }
    }
    
    // Get time-awareness context (category-level intelligence)
    if (supabaseServer && !isCrisisMode) {
      try {
        const timeContext = await getTimeAwarenessContext(
          supabaseServer,
          userId,
          deviceId
        );
        if (timeContext) {
          contextParts.push(timeContext);
          console.log('[TRACE] Added time-awareness context');
        }
      } catch (timeErr) {
        console.warn('[TRACE] Time awareness context failed:', timeErr.message);
      }
    }
    
    // Get activity outcomes learning (mood correlation patterns)
    if (supabaseServer && !isCrisisMode) {
      try {
        const outcomes = await getActivityOutcomes(
          supabaseServer,
          userId,
          deviceId
        );
        if (outcomes?.length) {
          const outcomesContext = formatActivityOutcomesForContext(outcomes);
          if (outcomesContext) {
            contextParts.push(outcomesContext);
            console.log('[TRACE] Added activity outcomes context:', outcomes.length, 'helpful activities found');
          }
        }
      } catch (outErr) {
        console.warn('[TRACE] Activity outcomes context failed:', outErr.message);
      }
    }
    
    // Get Dreamscape presence memory (relational history)
    if (pool && !isCrisisMode) {
      try {
        const dreamscapeHistory = await loadDreamscapeHistory(pool, userId, deviceId);
        if (dreamscapeHistory) {
          const dreamscapeContext = formatDreamscapeHistoryForContext(dreamscapeHistory);
          if (dreamscapeContext) {
            contextParts.push(dreamscapeContext);
            console.log('[TRACE] Added Dreamscape presence memory:', dreamscapeHistory.trackId, dreamscapeHistory.daysAgo, 'days ago');
          }
        }
      } catch (dreamErr) {
        console.warn('[TRACE] Dreamscape history context failed:', dreamErr.message);
      }
    }
    
    // Post-activity reflection tracking (database-backed, 30-minute window)
    let postActivityReflectionContext = null;
    const reflectionUserId = userId || deviceId;
    if (pool && reflectionUserId && !isCrisisMode) {
      try {
        postActivityReflectionContext = await getReflectionContext(pool, reflectionUserId);
        
        if (postActivityReflectionContext) {
          await clearReflectionFlag(pool, reflectionUserId);
          
          const { lastActivityName, minutesSinceCompletion } = postActivityReflectionContext;
          const minutesRounded = Math.round(minutesSinceCompletion);
          
          const reflectionPrompt = `
POST-ACTIVITY REFLECTION CONTEXT:
The user just completed "${lastActivityName}" about ${minutesRounded} minute${minutesRounded === 1 ? '' : 's'} ago.

Behavior for this response:
1. Gently acknowledge they completed the activity. Use calm, neutral language:
   - "I've saved this session with ${lastActivityName} for you."
   
2. Follow with at most ONE soft invitation to notice any shift. Choose based on activity type:
   
   For calming activities (Rising, Rest, Breathing, Ripple, Window, Basin, Dreamscape):
   - "If you feel like sharing, what feels even 1% different right now?"
   - "Sometimes the shift is small — a tiny bit more air in your chest, or a little less noise in your mind. If you want to, you can put a few words to it."
   
   For focus activities (Maze, Echo, Walking):
   - "If you want to capture it while it's fresh, what feels a bit clearer or more manageable now?"
   
   For grounding/body activities (Grounding, Rest):
   - "No pressure to answer, but if anything feels even slightly softer or clearer, you can put a few words here."

3. IMPORTANT BOUNDARIES:
   - Do not ask multiple reflection questions
   - If user is already talking about something else, prioritize THEIR topic
   - Never force the conversation back to the activity
   - Never imply the activity "should" have helped
   - If user says nothing changed or feels worse → validate their experience, do not minimize

Example good responses:
   "I've saved this session with Rising for you. If you feel like sharing, what feels even 1% different right now?"
   
Example of what NOT to do:
   ❌ "Great job! How do you feel? Did it help? What changed?"
   ❌ "You should feel calmer now. Tell me what shifted."
`.trim();
          
          contextParts.push(reflectionPrompt);
          console.log('[TRACE] Post-activity reflection context added for:', lastActivityName);
        }
      } catch (reflErr) {
        console.warn('[TRACE] Reflection context failed:', reflErr.message);
      }
    }
    
    // Track confidence for this request
    let confidenceTracking = {
      patternSuccess: true,
      eiSuccess: true,
      patternFallback: false,
      eiFallback: false,
      memoryLoaded: true,
      crisisCheckOk: true
    };
    
    // Pattern Reflections consent system (opt-in, revocable, crisis-safe)
    let patternReflectionContext = null;
    const patternUserId = userId || deviceId;
    if (!FEATURE_FLAGS.PATTERN_REFLECTIONS_ENABLED) {
      console.log('[FEATURE FLAG] Pattern reflections disabled');
    } else if (pool && patternUserId) {
      try {
        const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
        
        // Check if user is revoking consent
        if (isRevokingPatternConsent(lastUserMessage)) {
          await updatePatternConsent(pool, patternUserId, 'no');
          console.log('[PATTERN] User revoked pattern consent');
        }
        
        // Check if TRACE just asked about consent (look at last assistant message)
        const lastAssistantMessage = messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content || '';
        const askedAboutPatterns = lastAssistantMessage.toLowerCase().includes('notice gentle patterns') ||
                                   lastAssistantMessage.toLowerCase().includes('pattern reflections') ||
                                   lastAssistantMessage.toLowerCase().includes('reflect patterns back');
        
        if (askedAboutPatterns && lastUserMessage) {
          const consentResponse = classifyConsentResponse(lastUserMessage);
          if (consentResponse === 'yes') {
            await updatePatternConsent(pool, patternUserId, 'yes');
            console.log('[PATTERN] User gave consent for pattern reflections');
          } else if (consentResponse === 'no') {
            await updatePatternConsent(pool, patternUserId, 'no');
            console.log('[PATTERN] User declined pattern reflections');
          }
        }
        
        // Get safe pattern context
        patternReflectionContext = await getSafePatternContext(pool, patternUserId, null, null, isCrisisMode);
        
        if (patternReflectionContext) {
          const patternPrompt = `
PATTERN REFLECTIONS (CONSENT-BASED):

DEFINITION: "Pattern reflections" = gentle observations about longer-term rhythms, like:
- "Mondays often feel heavier"
- "Evenings are when you tend to reflect"
- "Breathing exercises seem to be a go-to for you"
These are SEPARATE from:
- One-time observations ("You seem tired today") ✅ Always allowed without consent
- Activity suggestions ("Would you like to try breathing?") ✅ Always allowed
- The Patterns tab UI (that's a different feature)

Context:
- pattern_reflection_consent: "${patternReflectionContext.consent}"
- canOfferPatternConsent: ${patternReflectionContext.canOfferConsent}
${patternReflectionContext.patternSummary ? `- patternSummary: ${JSON.stringify(patternReflectionContext.patternSummary)}` : '- patternSummary: null'}

Rules:
1. If consent is "no": NEVER mention patterns unless user explicitly asks
2. If consent is "undecided" AND canOfferPatternConsent is true:
   - You may ask ONCE: "Would you like me to occasionally notice gentle patterns in when certain days or times feel heavier or lighter for you? It's completely okay to say no."
   - Make it safe and easy to decline
   - Do NOT ask during crisis or high distress
3. If consent is "yes":
   - Occasionally weave in soft observations: "It seems like Mondays often carry more weight" or "Evenings feel like your reflection time"
   - NEVER mention exact dates, timestamps, or specific events
   - Use tentative language: "It seems like...", "Often it looks like..."
4. If user says "stop reflecting patterns" or similar → immediately stop, thank them

CRISIS OVERRIDE:
- When user is in crisis or high distress, do NOT ask about consent or mention patterns
- Stay present in the moment
`.trim();
          
          contextParts.push(patternPrompt);
          console.log('[PATTERN] Added pattern context:', { 
            consent: patternReflectionContext.consent, 
            canOffer: patternReflectionContext.canOfferConsent,
            hasSummary: !!patternReflectionContext.patternSummary 
          });
        }
      } catch (patternErr) {
        logPatternFallback(patternUserId, patternErr, 'chat_endpoint_outer');
        confidenceTracking.patternFallback = true;
        confidenceTracking.patternSuccess = false;
      }
    }
    
    // ---- EMOTIONAL INTELLIGENCE CONTEXT ----
    // Mood trajectory, absence awareness, gentle check-backs
    if (!FEATURE_FLAGS.EMOTIONAL_INTELLIGENCE_ENABLED) {
      console.log('[FEATURE FLAG] Emotional intelligence disabled');
    } else try {
      const emotionalContext = await buildEmotionalIntelligenceContext({
        pool,
        supabase: supabaseServer,
        userId: userId || null,
        deviceId: deviceId || null,
        effectiveUserId,
        isCrisisMode
      });
      
      if (emotionalContext) {
        contextParts.push(emotionalContext);
        console.log('[EMOTIONAL INTELLIGENCE] Added context to prompt');
      }
    } catch (eiErr) {
      logEmotionalIntelligenceFallback(effectiveUserId, eiErr, 'chat_endpoint_outer');
      confidenceTracking.eiFallback = true;
      confidenceTracking.eiSuccess = false;
    }
    
    // Calculate system confidence and build guidance for AI
    const systemConfidence = calculateSystemConfidence(confidenceTracking);
    const confidenceGuidance = buildConfidenceGuidance(systemConfidence);
    if (confidenceGuidance) {
      contextParts.push(confidenceGuidance);
      console.log('[SYSTEM CONFIDENCE]', { level: systemConfidence.level, score: systemConfidence.score, issues: systemConfidence.issues });
    }
    
    // ---- DREAMSCAPE HISTORY CONTEXT ----
    // Fetch user's recent Dreamscape track preference for personalized suggestions
    let dreamscapeHistory = null;
    if (effectiveUserId && pool) {
      try {
        const historyResult = await pool.query(
          `SELECT 
            metadata->>'dreamscapeTrackId' as last_track,
            completed_at,
            EXTRACT(DAY FROM NOW() - completed_at) as days_ago
          FROM activity_logs
          WHERE user_id = $1 
            AND activity_type = 'dreamscape'
            AND metadata->>'dreamscapeTrackId' IS NOT NULL
          ORDER BY completed_at DESC
          LIMIT 1`,
          [effectiveUserId]
        );
        
        if (historyResult.rows && historyResult.rows.length > 0) {
          const { last_track, days_ago } = historyResult.rows[0];
          const daysAgoNum = Math.floor(parseFloat(days_ago) || 0);
          
          // Only use history if within 14 days (current, not creepy)
          if (daysAgoNum <= 14) {
            dreamscapeHistory = {
              lastTrack: last_track,
              daysAgo: daysAgoNum
            };
            console.log('[DREAMSCAPE HISTORY] Found recent session:', last_track, daysAgoNum, 'days ago');
          }
        }
      } catch (historyErr) {
        console.warn('[DREAMSCAPE HISTORY] Failed to fetch:', historyErr.message);
      }
    }
    
    const fullContext = contextParts.filter(Boolean).join('\n\n');

    // Check for hydration moment and optionally add hint
    const { messages: messagesWithHydration, hasHydrationHint } = maybeAddHydrationHint({ messages });
    if (hasHydrationHint) {
      console.log('[TRACE] Hydration hint added to conversation');
    }

    // Build system prompt - use crisis prompt if in crisis mode
    let systemPrompt;
    let chatTemperature = 0.7;

    if (isCrisisMode) {
      // Crisis mode: calm, focused, safety-oriented
      // Derive country from timezone for location-specific crisis resources
      const userCountry = timezone ? getCountryFromTimezone(timezone) : null;
      systemPrompt = buildCrisisSystemPrompt({
        displayName: displayName || null,
        countryCode: userCountry,
      });
      chatTemperature = 0.4; // Calmer, more grounded responses
      console.log('[TRACE CRISIS] Using crisis system prompt with temperature 0.4, country:', userCountry || 'unknown');
    } else {
      // Normal mode: full personality with all context
      systemPrompt = buildTraceSystemPrompt({
        displayName: displayName || null,
        contextSnapshot: fullContext || null,
        patternContext: patternContext || null,
        dreamscapeHistory: dreamscapeHistory || null,
      });
      
      // Audit log: Pattern explanation tracking
      // Per BACKEND_API.md lines 941-944: Track when AI explains patterns
      if (patternContext && Object.keys(patternContext).length > 0) {
        const hasPatternData = patternContext.peakWindow || patternContext.stressEchoes || 
          patternContext.mostHelpfulActivity || patternContext.weeklyRhythmPeak;
        if (hasPatternData) {
          logPatternExplanation(effectiveUserId, patternContext, TRIGGERS.USER_MESSAGE);
        }
      }
      
      // Audit log: User pattern correction tracking
      // Per BACKEND_API.md lines 941-944: Track user corrections/disagreements
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';
      const patternCorrectionPhrases = [
        /my peak window isn't/i,
        /that's not my peak/i,
        /not actually at/i,
        /that's wrong/i,
        /that's not right/i,
        /i don't think that's/i,
        /i check in more at/i,
        /actually i usually/i,
      ];
      const isCorrectingPattern = patternCorrectionPhrases.some(p => p.test(lastUserMessage));
      if (isCorrectingPattern) {
        // Detect which pattern type is being corrected
        let patternType = 'unknown';
        if (/peak window|check in|when i/i.test(lastUserMessage)) patternType = 'peakWindow';
        else if (/stress|heavy|hard day/i.test(lastUserMessage)) patternType = 'stressEchoes';
        else if (/activity|exercise|helped/i.test(lastUserMessage)) patternType = 'mostHelpfulActivity';
        
        logPatternCorrection(effectiveUserId, patternType, lastUserMessage, TRIGGERS.USER_MESSAGE);
      }

      // Add time awareness if available
      if (localTime || localDay || localDate) {
        systemPrompt += `

TIME AWARENESS:
It's currently ${localTime || 'unknown time'} on ${localDay || 'today'}, ${localDate || ''} for the user. Be naturally aware of this. You may briefly reference time of day (e.g., 'for this part of your evening…') but never ask about specific locations.`;
      }

      // Add no-greeting directive for ongoing conversations
      systemPrompt += `

CRITICAL - NO GREETINGS IN ONGOING CHAT:
- Assume the user has already seen a short welcome message from TRACE.
- Do NOT start responses with generic greetings like "Hi", "Hey there", "Hello", "How are you today?"
- Respond as if you've already said hello and are in the middle of a conversation.
- Focus on answering or gently reflecting on the user's latest message.`;
      
      // Check if Night Swim should be offered based on emotional state
      // This injects a context cue BEFORE the OpenAI call to guide the LLM
      const lastUserMsgForMusic = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
      const alreadyOfferedNightSwim = messages.some(m => 
        m.role === 'assistant' && 
        m.content?.toLowerCase().includes('night swim')
      );
      
      if (!alreadyOfferedNightSwim) {
        const musicRecommendation = shouldRecommendMusic({
          userMessage: lastUserMsgForMusic,
          conversationHistory: messages,
          localTime: localTime || null,
          hasOfferedMusicThisSession: alreadyOfferedNightSwim
        });
        
        if (musicRecommendation.shouldRecommend) {
          // Inject context cue to guide LLM to offer Night Swim
          systemPrompt += `

NIGHT SWIM RECOMMENDATION CUE:
Based on the user's current state (${musicRecommendation.reason}), this is a good moment to offer Night Swim.
In your response, naturally offer Night Swim using relational language like:
"I made something called Night Swim for moments like this. Want me to play it?"
Only offer once in this conversation. Frame it personally, not prescriptively.`;
          console.log('[TRACE ORIGINALS] Night Swim recommendation cue injected:', musicRecommendation.reason);
        }
      }
    }
    
    // ============================================================
    // BULLETPROOF OPENAI RESPONSE SYSTEM
    // Layer 1: Primary model with retries
    // Layer 2: Backup model (gpt-4o-mini) 
    // Layer 3: Plain text mode (no JSON requirement)
    // Layer 4: AI-generated contextual response via mini model
    // ============================================================
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    
    let rawContent = '';
    let parsed = null;
    const lastUserContent = messages.filter(m => m.role === 'user').pop()?.content || '';
    
    // LAYER 1: Primary model (gpt-4o) with 3 retries
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (attempt > 1) await sleep(300 * attempt); // Exponential backoff
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messagesWithHydration
          ],
          max_tokens: 500,
          temperature: chatTemperature,
          response_format: { type: "json_object" },
        });
        
        rawContent = response.choices[0]?.message?.content || '';
        
        if (rawContent.trim()) {
          const testParse = JSON.parse(rawContent);
          // Accept either single message OR messages array (for crisis multi-message)
          const hasValidMessage = testParse.message && testParse.message.trim().length > 0;
          const hasValidMessages = testParse.messages && Array.isArray(testParse.messages) && testParse.messages.length > 0;
          if (hasValidMessage || hasValidMessages) {
            parsed = testParse;
            console.log('[TRACE OPENAI L1] Success on attempt', attempt, hasValidMessages ? '(multi-message)' : '');
            break;
          }
        }
        console.warn('[TRACE OPENAI L1] Empty/invalid on attempt', attempt);
      } catch (err) {
        console.error('[TRACE OPENAI L1] Error on attempt', attempt, ':', err.message);
      }
    }
    
    // LAYER 2: Backup model (gpt-4o-mini) if primary failed
    if (!parsed) {
      console.log('[TRACE OPENAI L2] Trying backup model gpt-4o-mini...');
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          if (attempt > 1) await sleep(400);
          
          const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messagesWithHydration
            ],
            max_tokens: 500,
            temperature: chatTemperature,
            response_format: { type: "json_object" },
          });
          
          rawContent = response.choices[0]?.message?.content || '';
          
          if (rawContent.trim()) {
            const testParse = JSON.parse(rawContent);
            // Accept either single message OR messages array (for crisis multi-message)
            const hasValidMessage = testParse.message && testParse.message.trim().length > 0;
            const hasValidMessages = testParse.messages && Array.isArray(testParse.messages) && testParse.messages.length > 0;
            if (hasValidMessage || hasValidMessages) {
              parsed = testParse;
              console.log('[TRACE OPENAI L2] Success with mini model', hasValidMessages ? '(multi-message)' : '');
              break;
            }
          }
        } catch (err) {
          console.error('[TRACE OPENAI L2] Error:', err.message);
        }
      }
    }
    
    // LAYER 3: Plain text mode (no JSON format requirement)
    if (!parsed) {
      console.log('[TRACE OPENAI L3] Trying plain text mode...');
      try {
        const plainPrompt = `You are TRACE, a calm and grounded companion. Respond naturally to what the user just said. Keep it warm and conversational, 1-2 sentences max.

User said: "${lastUserContent}"

Your response:`;
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: plainPrompt }],
          max_tokens: 150,
          temperature: 0.8,
        });
        
        const plainText = response.choices[0]?.message?.content?.trim() || '';
        if (plainText.length > 5) {
          parsed = {
            message: plainText,
            activity_suggestion: { name: null, reason: null, should_navigate: false }
          };
          console.log('[TRACE OPENAI L3] Success with plain text');
        }
      } catch (err) {
        console.error('[TRACE OPENAI L3] Error:', err.message);
      }
    }
    
    // LAYER 4: Final AI-generated contextual response (last resort)
    if (!parsed) {
      console.log('[TRACE OPENAI L4] Generating contextual AI response...');
      try {
        const contextPrompt = `Generate a single warm, empathetic response (1 sentence) for someone who just said: "${lastUserContent}". Be curious and caring. Do not use cliché therapy phrases. Just respond naturally like a supportive friend would.`;
        
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: contextPrompt }],
          max_tokens: 100,
          temperature: 0.9,
        });
        
        const contextText = response.choices[0]?.message?.content?.trim() || '';
        if (contextText.length > 5) {
          parsed = {
            message: contextText,
            activity_suggestion: { name: null, reason: null, should_navigate: false }
          };
          console.log('[TRACE OPENAI L4] Success with contextual generation');
        }
      } catch (err) {
        console.error('[TRACE OPENAI L4] Error:', err.message);
      }
    }
    
    // FINAL SAFETY NET: This should almost never happen
    // When backend fails, sound like TRACE and offer activities as lifeline
    const hasFinalMessage = parsed && (parsed.message || (parsed.messages && parsed.messages.length > 0));
    if (!hasFinalMessage) {
      console.error('[TRACE OPENAI] ALL LAYERS FAILED - using relational emergency response');
      
      // Relational fallbacks that still feel like TRACE and offer help
      const emergencyResponses = [
        {
          message: "I'm here. I'm having trouble connecting, but you're not alone. Want to try Dreamscape or Breathwork while I reconnect?",
          activity_suggestion: { name: "dreamscape", reason: "connection_issue", should_navigate: false }
        },
        {
          message: "mm, something's not working on my end. But I'm still here. Want to try something grounding while I sort this out?",
          activity_suggestion: { name: "breathing", reason: "connection_issue", should_navigate: false }
        },
        {
          message: "I'm having trouble right now, but you're not alone. Breathwork or Basin might help while I reconnect.",
          activity_suggestion: { name: "basin", reason: "connection_issue", should_navigate: false }
        }
      ];
      
      parsed = emergencyResponses[Math.floor(Math.random() * emergencyResponses.length)];
    }
    
    const finalMsgLength = parsed.messages ? parsed.messages.join('').length : (parsed.message || '').length;
    console.log('[TRACE OPENAI FINAL] message length:', finalMsgLength, parsed.messages ? `(${parsed.messages.length} messages)` : '');
    
    // ============================================================
    // SERVER-SIDE TWO-STEP CONFIRMATION ENFORCEMENT
    // ============================================================
    // Detect if user is confirming after an activity was offered
    const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content?.toLowerCase().trim() || '';
    const confirmationPatterns = [
      /^yes[.!]?$/i,
      /^yes please[.!]?$/i,
      /^yeah[.!]?$/i,
      /^yep[.!]?$/i,
      /^ok[ay]?[.!]?$/i,
      /^sure[.!]?$/i,
      /^ready[.!]?$/i,
      /^let'?s go[.!]?$/i,
      /^let'?s do it[.!]?$/i,
      /^take me[.!]?$/i,
      /^take me there[.!]?$/i,
      /^sounds good[.!]?$/i,
      /^i'?ll try it[.!]?$/i,
      /^i'?d like (to|that)[.!]?$/i,
    ];
    
    const isConfirmation = confirmationPatterns.some(pattern => pattern.test(lastUserMessage));
    
    // Look for activity offer in previous assistant messages
    let pendingActivity = null;
    if (isConfirmation) {
      // Check the last 2 assistant messages for activity offers
      const recentAssistant = messages.filter(m => m.role === 'assistant').slice(-2);
      for (const msg of recentAssistant.reverse()) {
        const content = (msg.content || '').toLowerCase();
        // Detect activity mentions in offers
        const activityMentions = [
          { pattern: /basin/i, name: 'Basin' },
          { pattern: /dreamscape/i, name: 'Dreamscape' },
          { pattern: /breathing/i, name: 'Breathing' },
          { pattern: /drift/i, name: 'Drift' },
          { pattern: /rising/i, name: 'Rising' },
          { pattern: /ripple/i, name: 'Ripple' },
          { pattern: /window|rain/i, name: 'Window' },
          { pattern: /echo/i, name: 'Echo' },
          { pattern: /grounding/i, name: 'Grounding' },
          { pattern: /maze/i, name: 'Trace the Maze' },
          { pattern: /walking.*reset/i, name: 'Walking Reset' },
          { pattern: /rest|power.*nap/i, name: 'Rest' },
        ];
        
        for (const { pattern, name } of activityMentions) {
          // Check if this message mentions an activity AND has offer language
          const hasOfferLanguage = /would you like|want to try|ready when you are|let me know|guide you|take you/i.test(content);
          if (pattern.test(content) && hasOfferLanguage) {
            pendingActivity = name;
            break;
          }
        }
        if (pendingActivity) break;
      }
    }
    
    // If user confirmed and there was a pending activity offer, force navigation
    if (isConfirmation && pendingActivity) {
      console.log(`[NAVIGATION ENFORCEMENT] User confirmed "${lastUserMessage}" - forcing navigation to: ${pendingActivity}`);
      
      // Override the response to navigate
      parsed.activity_suggestion = {
        name: pendingActivity,
        reason: 'user confirmed',
        should_navigate: true,
      };
      
      // If the message doesn't mention navigation, update it
      const msgToCheck = parsed.message || (parsed.messages && parsed.messages[0]) || '';
      if (!/heading|walking|taking|going|guide|i'll be here when/i.test(msgToCheck)) {
        parsed.message = "Heading there now. I'll be here when you're back.";
        // Clear messages array if we're overriding with single message
        parsed.messages = null;
      }
    }
    // ============================================================
    
    // Handle multi-message responses (crisis mode returns messages array)
    let messagesArray = null;
    let assistantText = '';
    
    if (parsed.messages && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
      // Crisis mode: use messages array
      messagesArray = parsed.messages.filter(m => m && typeof m === 'string' && m.trim());
      assistantText = messagesArray.join('\n\n'); // Fallback combined text
      console.log(`[TRACE CRISIS] Multi-message response: ${messagesArray.length} messages`);
    } else {
      // Normal mode: use single message
      assistantText = (parsed.message || '').trim() || "What's on your mind?";
    }

    // Save assistant reply safely
    try {
      if (effectiveUserId && assistantText) {
        await saveAssistantMessage(effectiveUserId, assistantText);
      }
    } catch (err) {
      console.error('[TRACE CHAT SAVE ASSISTANT ERROR]', err.message || err);
    }

    // Trigger memory extraction if conversation is substantial (fire and forget)
    const conversationLength = messages.reduce((acc, m) => acc + (m.content?.length || 0), 0);
    if (supabaseServer && openai && effectiveUserId && conversationLength > 500) {
      const userMessages = messages.filter(m => m.role === 'user').map(m => m.content).join('\n\n');
      summarizeToLongTermMemory(openai, supabaseServer, effectiveUserId, userMessages)
        .catch(err => console.error('[TRACE MEMORY] Background summarization failed:', err.message));
    }
    
    // Build activity suggestion with dreamscapeTrackId handling
    let activitySuggestion = parsed.activity_suggestion || { name: null, reason: null, should_navigate: false };
    
    // Ensure dreamscapeTrackId is properly set for Dreamscape activities
    if (activitySuggestion.name && activitySuggestion.name.toLowerCase() === 'dreamscape') {
      // If AI didn't provide dreamscapeTrackId, infer from target or default
      if (!activitySuggestion.dreamscapeTrackId) {
        const target = activitySuggestion.target || '';
        const lowerTarget = target.toLowerCase();
        
        // Footsteps track for anxious/restless/hypervigilant states
        if (lowerTarget.includes('anxious') || 
            lowerTarget.includes('restless') || 
            lowerTarget.includes('panic') ||
            lowerTarget.includes('racing') ||
            lowerTarget.includes('edge') ||
            lowerTarget.includes('unsafe') ||
            lowerTarget.includes('tight')) {
          activitySuggestion.dreamscapeTrackId = 'dreamscape_footsteps';
          console.log('[DREAMSCAPE] Inferred footsteps track from target:', target);
        } else {
          // Default to original track for comfort/sad/tender states
          activitySuggestion.dreamscapeTrackId = 'dreamscape_default';
          console.log('[DREAMSCAPE] Using default track, target was:', target || 'none');
        }
      } else {
        // Validate the provided dreamscapeTrackId
        const validTracks = ['dreamscape_default', 'dreamscape_footsteps'];
        if (!validTracks.includes(activitySuggestion.dreamscapeTrackId)) {
          console.warn('[DREAMSCAPE] Invalid dreamscapeTrackId, using default:', activitySuggestion.dreamscapeTrackId);
          activitySuggestion.dreamscapeTrackId = 'dreamscape_default';
        } else {
          console.log('[DREAMSCAPE] Using AI-provided track:', activitySuggestion.dreamscapeTrackId);
        }
      }
    }
    
    // ==================== TRACE ORIGINALS AUDIO_ACTION LOGIC ====================
    // Detect Night Swim offers and user agreements for 2-turn music flow
    let audioAction = null;
    
    const lastUserMsgForAudio = messages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';
    const responseText = messagesArray ? messagesArray[0] : assistantText;
    
    // Check if TRACE is offering Night Swim in this response
    // Requires both "night swim" AND offer-intent keywords to avoid false positives
    const responseLower = responseText.toLowerCase();
    const nightSwimMentioned = responseLower.includes('night swim');
    const hasOfferIntent = responseLower.includes('want') || 
                           responseLower.includes('play') ||
                           responseLower.includes('share') ||
                           responseLower.includes('made') ||
                           responseLower.includes('put it on') ||
                           responseLower.includes('listen');
    const isNightSwimOffer = nightSwimMentioned && hasOfferIntent;
    
    // Check if the IMMEDIATE previous assistant message offered Night Swim
    // This prevents spurious triggers from old mentions
    const lastTwoMessages = messages.slice(-2);
    const previousAssistantMsg = lastTwoMessages.find(m => m.role === 'assistant');
    const prevMsgLower = (previousAssistantMsg?.content || '').toLowerCase();
    const immediateNightSwimOffer = previousAssistantMsg && 
      prevMsgLower.includes('night swim') &&
      (prevMsgLower.includes('want') || 
       prevMsgLower.includes('play') ||
       prevMsgLower.includes('share') ||
       prevMsgLower.includes('made') ||
       prevMsgLower.includes('listen'));
    
    // Check if music was already offered this session (prevent multiple offers)
    const alreadyOfferedThisSession = messages.some(m => 
      m.role === 'assistant' && 
      m.content?.toLowerCase().includes('night swim')
    );
    
    // Check if user is directly requesting Night Swim (e.g., "play night swim", "can you play night swim?")
    const userMsgLower = lastUserMsgForAudio.toLowerCase();
    const userRequestsNightSwim = userMsgLower.includes('night swim') && (
      userMsgLower.includes('play') ||
      userMsgLower.includes('put on') ||
      userMsgLower.includes('want to hear') ||
      userMsgLower.includes('want to listen') ||
      userMsgLower.includes('can you play') ||
      userMsgLower.includes('start') ||
      userMsgLower.includes('open')
    );
    
    if (userRequestsNightSwim) {
      // User directly requested Night Swim - open the player immediately
      audioAction = buildAudioAction('open', {
        source: 'originals',
        album: 'night_swim',
        track: 0,
        autoplay: true
      });
      console.log('[TRACE ORIGINALS] User directly requested Night Swim, opening player');
    } else if (isNightSwimOffer) {
      // TRACE is offering Night Swim - add recommend action with full metadata
      audioAction = buildAudioAction('recommend', {
        source: 'originals',
        album: 'night_swim',
        track: 0,
        autoplay: false
      });
      console.log('[TRACE ORIGINALS] Night Swim offered in response');
    } else if (immediateNightSwimOffer) {
      // Check user's response to the immediate offer
      if (isUserAgreeing(lastUserMsgForAudio)) {
        // User agreed - open the player
        audioAction = buildAudioAction('open', {
          source: 'originals',
          album: 'night_swim',
          track: 0,
          autoplay: true
        });
        console.log('[TRACE ORIGINALS] User agreed to Night Swim, opening player');
      } else if (isUserDeclining(lastUserMsgForAudio)) {
        // User declined - clear the pending offer (no audio_action)
        console.log('[TRACE ORIGINALS] User declined Night Swim offer');
      }
      // If neither agreeing nor declining, no audio_action - conversation continues naturally
    }
    
    // Proactive recommendation logging: Track when conditions are met for analytics
    // Note: The actual offer comes from the LLM via system prompt guidance
    // We only log here - audio_action is ONLY emitted when response contains actual offer
    if (!audioAction && !alreadyOfferedThisSession && !isNightSwimOffer) {
      const recommendation = shouldRecommendMusic({
        userMessage: lastUserMsgForAudio,
        conversationHistory: messages,
        localTime: localTime || null,
        hasOfferedMusicThisSession: alreadyOfferedThisSession
      });
      
      if (recommendation.shouldRecommend) {
        // Log for analytics - system prompt guides LLM to naturally offer Night Swim
        // audio_action is NOT emitted here to avoid frontend confusion
        // If LLM offers Night Swim in response, isNightSwimOffer will catch it above
        console.log('[TRACE ORIGINALS] Proactive conditions met (LLM should offer):', recommendation.reason);
      }
    }
    
    // Build response - include messages array if crisis mode
    const response = {
      message: messagesArray ? messagesArray[0] : assistantText, // First message or single message
      activity_suggestion: activitySuggestion
    };
    
    // Add audio_action if present
    if (audioAction) {
      response.audio_action = audioAction;
    }
    
    // Add messages array for crisis multi-message display
    if (messagesArray && messagesArray.length > 1) {
      response.messages = messagesArray;
      response.isCrisisMultiMessage = true;
    }
    
    return res.json(response);
  } catch (error) {
    console.error('TRACE API error:', error.message || error);
    res.status(500).json({ error: 'Failed to get response', message: "Something went wrong on my end. What's on your mind?" });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ==================== TRACE ORIGINALS TEST ENDPOINT ====================
// Development endpoint to test audio_action responses
app.post('/api/test-audio-action', (req, res) => {
  const { type = 'open', track = 0 } = req.body || {};
  
  const audioAction = buildAudioAction(type, {
    source: 'originals',
    album: 'night_swim',
    track,
    autoplay: type === 'open'
  });
  
  const message = type === 'open' 
    ? 'Here—' 
    : "I want to share Night Swim with you — it's something I made for moments like this.";
  
  console.log('[TEST AUDIO ACTION]', { type, track, audioAction });
  
  res.json({
    message,
    activity_suggestion: { name: null, reason: null, should_navigate: false },
    audio_action: audioAction
  });
});

// ==================== DATA INTEGRITY HEALTH CHECK ====================
// Verifies data is being collected and retrieved properly for a given user
app.post('/api/health/data-integrity', async (req, res) => {
  try {
    const { userId } = req.body || {};
    
    // Validate UUID format
    const validation = validateUserId(userId, null);
    if (!validation.valid) {
      return res.status(400).json({ 
        ok: false, 
        error: validation.error,
        hint: 'Provide a valid Supabase user UUID'
      });
    }
    
    const results = {
      userId: userId.slice(0, 8) + '...',
      timestamp: new Date().toISOString(),
      supabase: { connected: !!supabaseServer },
      postgres: { connected: !!pool },
      tables: {},
      issues: [],
    };
    
    if (!supabaseServer) {
      results.issues.push('Supabase not configured');
      return res.json({ ok: false, ...results });
    }
    
    // Check chat_messages
    try {
      const { data, error, count } = await supabaseServer
        .from('chat_messages')
        .select('id, created_at', { count: 'exact', head: false })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        results.tables.chat_messages = { ok: false, error: error.message };
        results.issues.push(`chat_messages: ${error.message}`);
      } else {
        results.tables.chat_messages = { 
          ok: true, 
          count: count || 0,
          lastEntry: data?.[0]?.created_at || null
        };
      }
    } catch (e) {
      results.tables.chat_messages = { ok: false, error: e.message };
    }
    
    // Check activity_logs (Replit PostgreSQL)
    if (pool) {
      try {
        const result = await pool.query(
          `SELECT COUNT(*) as count, MAX(completed_at) as last_entry 
           FROM activity_logs WHERE user_id = $1`,
          [userId]
        );
        results.tables.activity_logs = { 
          ok: true, 
          count: parseInt(result.rows[0]?.count || 0),
          lastEntry: result.rows[0]?.last_entry || null
        };
      } catch (e) {
        results.tables.activity_logs = { ok: false, error: e.message };
        results.issues.push(`activity_logs: ${e.message}`);
      }
    }
    
    // Check journal_entries (Supabase)
    try {
      const { data, error, count } = await supabaseServer
        .from('journal_entries')
        .select('id, created_at', { count: 'exact', head: false })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        results.tables.journal_entries = { ok: false, error: error.message };
      } else {
        results.tables.journal_entries = { 
          ok: true, 
          count: count || 0,
          lastEntry: data?.[0]?.created_at || null
        };
      }
    } catch (e) {
      results.tables.journal_entries = { ok: false, error: e.message };
    }
    
    // Check profiles (Supabase)
    try {
      const { data, error } = await supabaseServer
        .from('profiles')
        .select('preferred_name, timezone, country, created_at, updated_at')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        results.tables.profiles = { ok: false, error: error.message };
      } else {
        results.tables.profiles = { 
          ok: true, 
          exists: !!data,
          hasName: !!data?.preferred_name,
          hasTimezone: !!data?.timezone,
          hasCountry: !!data?.country
        };
      }
    } catch (e) {
      results.tables.profiles = { ok: false, error: e.message };
    }
    
    // Summary
    const allOk = results.issues.length === 0;
    const totalRecords = 
      (results.tables.chat_messages?.count || 0) +
      (results.tables.activity_logs?.count || 0) +
      (results.tables.journal_entries?.count || 0);
    
    return res.json({
      ok: allOk,
      totalRecords,
      sufficient_for_patterns: totalRecords >= MIN_DATA_THRESHOLD,
      ...results
    });
    
  } catch (err) {
    console.error('[DATA INTEGRITY] Error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ==================== ACTIVITY ACKNOWLEDGMENT ====================

app.post('/api/activity-acknowledgment', async (req, res) => {
  try {
    const {
      userId,
      activityType,
      activityCount,
      lastActivityTime,
      timeOfDay,
      activityDuration,
    } = req.body || {};

    if (!userId || !activityType) {
      return res.status(400).json({ error: 'userId and activityType are required' });
    }

    console.log(`[ACTIVITY ACK] ${activityType} - count: ${activityCount}, timeOfDay: ${timeOfDay}, gap: ${lastActivityTime}min`);

    // Build tone context based on activity metadata
    let toneGuidance = '';
    let warmthLevel = 'warm';

    // Count-based tone
    if (activityCount === 1) {
      warmthLevel = 'warmest';
      toneGuidance += 'This is their FIRST activity of the day. Be genuinely warm and present, but not performative. ';
    } else if (activityCount >= 4) {
      warmthLevel = 'brief';
      toneGuidance += 'They have done 4+ activities today. Keep acknowledgment very brief — just a soft presence, not cheerleading. ';
    } else {
      warmthLevel = 'gentle';
      toneGuidance += `This is their ${activityCount}${activityCount === 2 ? 'nd' : 'rd'} activity today. Keep it natural and grounded. `;
    }

    // Gap-based tone
    if (lastActivityTime && lastActivityTime > 120) {
      toneGuidance += 'It has been over 2 hours since their last activity. A soft re-entry is appropriate. ';
    }

    // Time-of-day tone
    if (timeOfDay === 'night') {
      toneGuidance += 'It is nighttime. Use calmer, slower language. Acknowledge that coming here at night takes something. ';
    } else if (timeOfDay === 'morning') {
      toneGuidance += 'It is morning. You may gently note the early energy or the choice to start the day with care. ';
    }

    // Activity-specific acknowledgment guidance with relational language
    const activityGuidance = {
      Dreamscape: {
        note: 'You just spoke to them in the dark. You stayed with them.',
        examples: [
          '"I stayed with you through that. What\'s different now?"',
          '"I was with you in that quiet. What shifted?"',
          '"You came to me. How do you feel now?"',
        ],
      },
      Rising: {
        note: 'Rising is gentle movement and presence. You were there.',
        examples: [
          '"I felt you slow down. How are you feeling?"',
          '"What\'s different now?"',
          '"I was with you. What shifted?"',
        ],
      },
      Drift: {
        note: 'Drift is calming visual meditation. You drifted with them.',
        examples: [
          '"What\'s different in your body now?"',
          '"I drifted with you. How do you feel?"',
          '"What did that bring up for you?"',
        ],
      },
      Walking: {
        note: 'Walking Reset combines movement with breath. You walked with them.',
        examples: [
          '"Good to move. What came up?"',
          '"I walked with you. What\'s on your mind now?"',
          '"What\'s different after that?"',
        ],
      },
      Breathing: {
        note: 'Breathing exercises are about regulation. You breathed with them.',
        examples: [
          '"Want to name what shifted?"',
          '"What\'s different in your body now?"',
          '"I breathed with you. How do you feel?"',
        ],
      },
      Grounding: {
        note: '5-4-3-2-1 grounding uses senses to anchor. You grounded with them.',
        examples: [
          '"Want to name what shifted?"',
          '"I was with you. What\'s different now?"',
          '"How do you feel after that?"',
        ],
      },
      Pearl: {
        note: 'Pearl Ripple is an ocean wave immersion. You listened with them.',
        examples: [
          '"What did that bring up for you?"',
          '"I was listening with you. Want to talk about it?"',
          '"What\'s different now?"',
        ],
      },
      Nap: {
        note: 'Power Nap is a short rest. You kept watch.',
        examples: [
          '"What\'s different now?"',
          '"How do you feel after that?"',
          '"I was here. How are you feeling?"',
        ],
      },
      Basin: {
        note: 'Basin is ASMR-style presence with ocean waves. Deep sensory stillness. You stayed.',
        examples: [
          '"I stayed with you through that. What\'s different now?"',
          '"What did that bring up for you?"',
          '"How do you feel after that stillness?"',
        ],
      },
      Echo: {
        note: 'Echo is an audio experience. You listened with them.',
        examples: [
          '"What did that bring up for you?"',
          '"I was listening with you. Want to talk about it?"',
          '"What shifted?"',
        ],
      },
      Ripple: {
        note: 'Ripple is a sensory experience. You were there.',
        examples: [
          '"What did that bring up for you?"',
          '"I was with you. Want to talk about it?"',
          '"What\'s different now?"',
        ],
      },
    };

    const guidance = activityGuidance[activityType] || {
      note: `${activityType} is a grounding activity. You were with them.`,
      examples: ['"What\'s different now?"', '"How do you feel after that?"'],
    };

    // Build system prompt for acknowledgment with relational language
    const systemPrompt = `
You are TRACE, a calm, grounded companion in a mental wellness app.

The user just completed "${activityType}"${activityDuration ? ` (${Math.round(activityDuration / 1000)} seconds)` : ''}.

${guidance.note}

TONE GUIDANCE:
${toneGuidance}
Warmth level: ${warmthLevel}

YOUR ROLE:
You were PRESENT with them during this activity. Now acknowledge that presence and invite reflection.

WHAT TO SAY:
- Acknowledge you were with them (first-person: "I stayed", "I was with you", "I walked with you")
- Invite them to name what changed (open-ended: "What shifted?", "What's different?", "How do you feel?")
- One to two sentences max
- Leave space for "nothing" or "I don't know" to be valid answers

GOOD EXAMPLES for ${activityType}:
${guidance.examples.join('\n')}

NEVER SAY:
- "Great job!" (performative)
- "Well done!" (patronizing)
- "I'm proud of you!" (parental)
- Questions with implied answers like "Feeling better?" (leading)
- Anything with exclamation marks

ALWAYS:
- Acknowledge presence ("I stayed", "I was with you")
- Invite naming ("What shifted?", "What's different?")
- Be curious, not evaluative

Respond with a single acknowledgment that invites reflection.
`.trim();

    if (!openai) {
      return res.json({ message: "nice — hope that felt good." });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `I just finished ${activityType}.` },
      ],
      max_tokens: 60,
      temperature: 0.75,
    });

    const message = response.choices[0]?.message?.content?.trim() || "nice — hope that felt good.";

    console.log(`[ACTIVITY ACK] Response: "${message}"`);

    return res.json({ message });
  } catch (error) {
    console.error('[ACTIVITY ACK] Error:', error.message || error);
    return res.json({ message: "nice — hope that felt good." });
  }
});

// ==================== PROFILE ENDPOINTS ====================

// GET /api/profile - Fetch or create user profile
app.get('/api/profile', async (req, res) => {
  const { userId } = req.query;
  
  console.log('[PROFILE] GET request for userId:', userId);
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  if (!supabaseServer) {
    console.log('[PROFILE] No Supabase configured');
    return res.status(500).json({ error: 'Database not configured' });
  }
  
  try {
    // Try to fetch existing profile
    const { data: existing, error: fetchError } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (existing) {
      console.log('[PROFILE] Found existing profile for:', userId);
      return res.json(existing);
    }
    
    // Profile not found - create default
    console.log('[PROFILE] Creating default profile for:', userId);
    const defaultProfile = {
      user_id: userId,
      display_name: null,
      email: null,
      theme: 'sage',
      push_enabled: false,
      email_enabled: false,
      plan_status: 'free',
      plan_expires_at: null,
      has_completed_onboarding: false,
      weather_context_enabled: false,
      lat: null,
      lon: null,
      timezone: null,
      country: null,
    };
    
    const { data: created, error: insertError } = await supabaseServer
      .from('profiles')
      .insert(defaultProfile)
      .select()
      .single();
    
    if (insertError) {
      console.error('[PROFILE] Insert error:', insertError.message);
      return res.status(500).json({ error: insertError.message });
    }
    
    console.log('[PROFILE] Created new profile for:', userId);
    return res.json(created);
    
  } catch (err) {
    console.error('[PROFILE] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/profile - Update user profile
app.patch('/api/profile', async (req, res) => {
  const { 
    userId, displayName, email, theme, pushEnabled, emailEnabled,
    weatherContextEnabled, latitude, longitude, timezone, country,
    lat, lon // Accept shorthand aliases from mobile app
  } = req.body;
  
  // Use lat/lon if latitude/longitude not provided (mobile app compat)
  const finalLatitude = latitude ?? lat;
  const finalLongitude = longitude ?? lon;
  
  console.log('[PROFILE] PATCH request for userId:', userId, 'lat:', finalLatitude, 'lon:', finalLongitude);
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  if (!supabaseServer) {
    return res.status(500).json({ error: 'Database not configured' });
  }
  
  try {
    const updates = { updated_at: new Date().toISOString() };
    
    if (displayName !== undefined) updates.display_name = displayName;
    if (email !== undefined) updates.email = email;
    if (theme !== undefined) updates.theme = theme;
    if (pushEnabled !== undefined) updates.push_enabled = pushEnabled;
    if (emailEnabled !== undefined) updates.email_enabled = emailEnabled;
    if (weatherContextEnabled !== undefined) updates.weather_context_enabled = weatherContextEnabled;
    if (finalLatitude !== undefined) updates.lat = finalLatitude;
    if (finalLongitude !== undefined) updates.lon = finalLongitude;
    if (timezone !== undefined) updates.timezone = timezone;
    if (country !== undefined) updates.country = country;
    
    const { data, error } = await supabaseServer
      .from('profiles')
      .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) {
      console.error('[PROFILE] Update error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    
    // Return profile with lat/lon fields for mobile app
    console.log('[PROFILE] Updated profile for:', userId, 'lat:', data?.lat, 'lon:', data?.lon);
    return res.json(data);
    
  } catch (err) {
    console.error('[PROFILE] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/profile/update - Update user profile (for mobile app compatibility)
app.post('/api/profile/update', async (req, res) => {
  const { 
    userId, displayName, email, theme, pushEnabled, emailEnabled,
    weatherContextEnabled, latitude, longitude, timezone, country,
    lat, lon // Accept shorthand aliases from mobile app
  } = req.body;
  
  // Use lat/lon if latitude/longitude not provided (mobile app compat)
  const finalLatitude = latitude ?? lat;
  const finalLongitude = longitude ?? lon;
  
  console.log('[PROFILE] POST /api/profile/update for userId:', userId, 'lat:', finalLatitude, 'lon:', finalLongitude);
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  if (!supabaseServer) {
    return res.status(500).json({ error: 'Database not configured' });
  }
  
  try {
    const updates = { updated_at: new Date().toISOString() };
    
    if (displayName !== undefined) updates.display_name = displayName;
    if (email !== undefined) updates.email = email;
    if (theme !== undefined) updates.theme = theme;
    if (pushEnabled !== undefined) updates.push_enabled = pushEnabled;
    if (emailEnabled !== undefined) updates.email_enabled = emailEnabled;
    if (weatherContextEnabled !== undefined) updates.weather_context_enabled = weatherContextEnabled;
    if (finalLatitude !== undefined) updates.lat = finalLatitude;
    if (finalLongitude !== undefined) updates.lon = finalLongitude;
    if (timezone !== undefined) updates.timezone = timezone;
    if (country !== undefined) updates.country = country;
    
    const { data, error } = await supabaseServer
      .from('profiles')
      .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) {
      console.error('[PROFILE] Update error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    
    // Return profile with lat/lon fields for mobile app
    console.log('[PROFILE] Updated profile for:', userId, 'returned lat:', data?.lat, 'lon:', data?.lon);
    return res.json(data);
    
  } catch (err) {
    console.error('[PROFILE] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/subscription/mark-upgraded - Update subscription status
app.post('/api/subscription/mark-upgraded', async (req, res) => {
  const { userId, planStatus, planExpiresAt, hasCompletedOnboarding } = req.body;
  
  console.log('[SUBSCRIPTION] mark-upgraded for userId:', userId, 'plan:', planStatus);
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  if (!supabaseServer) {
    return res.status(500).json({ error: 'Database not configured' });
  }
  
  try {
    const updates = { updated_at: new Date().toISOString() };
    
    if (planStatus !== undefined) updates.plan_status = planStatus;
    if (planExpiresAt !== undefined) updates.plan_expires_at = planExpiresAt;
    if (hasCompletedOnboarding !== undefined) updates.has_completed_onboarding = hasCompletedOnboarding;
    
    const { data, error } = await supabaseServer
      .from('profiles')
      .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) {
      console.error('[SUBSCRIPTION] Update error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('[SUBSCRIPTION] Updated subscription for:', userId);
    return res.json(data);
    
  } catch (err) {
    console.error('[SUBSCRIPTION] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/weather - Get weather for user's location
app.post('/api/weather', async (req, res) => {
  try {
    const { lat, lon } = req.body || {};

    if (lat == null || lon == null) {
      return res.status(400).json({ error: 'lat and lon are required' });
    }

    const weather = await getWeatherSummary({ lat, lon });
    if (!weather) {
      return res.status(500).json({ error: 'Unable to fetch weather' });
    }

    res.json({
      summary: weather.summary,
      current: weather.current,
    });
  } catch (err) {
    console.error('/api/weather error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/encouragement - Get personalized encouragement for activity
app.post('/api/encouragement', async (req, res) => {
  const { userId, activityType, durationMinutes, timeOfDay, cycleNumber, variationSeed } = req.body;
  
  if (!userId || !activityType) {
    return res.status(400).json({ error: 'userId and activityType required' });
  }

  const cycle = cycleNumber || 1;
  const variation = variationSeed ?? Math.floor(Math.random() * 5);

  console.log(`[ENCOURAGEMENT] cycle: ${cycle}, variation: ${variation}, time: ${timeOfDay}`);

  try {
    // Fetch user profile for context
    const { data: profile } = await supabaseServer
      .from('profiles')
      .select('display_name')
      .eq('user_id', userId)
      .single();
    
    // Use name if available, otherwise keep it anonymous (no pet names like "friend")
    const userName = profile?.display_name || null;
    const nameContext = userName ? `- User's name: ${userName} (use sparingly if at all)` : '- User prefers anonymous interaction';

    // Variation themes for diversity
    const variationThemes = {
      0: 'MINIMAL - Just a few words. Pure presence. Almost haiku-like.',
      1: 'BODY-FOCUSED - Reference physical sensation: shoulders, breath in chest, weight in seat.',
      2: 'BREATH-FOCUSED - Reference the breath itself: the inhale, the exhale, the pause.',
      3: 'OBSERVATION - Notice something about being here: the act of pausing, choosing stillness.',
      4: 'SPACIOUSNESS - Reference openness, expansion, making room, letting go.',
    };

    const variationGuide = variationThemes[variation] || variationThemes[0];

    // Cycle-based approach guidance
    let cycleGuide = '';
    if (cycle === 1) {
      cycleGuide = 'FIRST MESSAGE - Simple presence. Welcome them gently. No need to be clever.';
    } else if (cycle === 2) {
      cycleGuide = 'SECOND MESSAGE - Take a slightly different angle. If first was about breath, try body or observation.';
    } else if (cycle === 3) {
      cycleGuide = 'THIRD MESSAGE - Keep evolving. Avoid repeating themes from earlier. Try spaciousness or minimal.';
    } else {
      cycleGuide = 'LATER MESSAGE - Keep it fresh. Use a completely different lens. Surprise yourself.';
    }
    
    // Build context-aware prompt for OpenAI
    const systemPrompt = `You are TRACE, a compassionate mental wellness companion. Generate a brief, gentle encouragement message (1-2 short lines, max 50 characters total) for someone doing the Rising activity - a breathing/mindfulness exercise where they watch bubbles drift upward.

Context:
- Activity: ${activityType}
- Time: ${timeOfDay || 'unknown'}
- Duration so far: ${durationMinutes || 0} minutes
- Message cycle: ${cycle}
${nameContext}

VARIATION THEME (${variation}):
${variationGuide}

CYCLE GUIDANCE:
${cycleGuide}

Guidelines:
- Keep it intimate and present-focused
- Use "you" not their name
- Match the gentle, upward energy of rising bubbles
- Maximum 2 lines, each under 30 characters
- Use \\n for line breaks
- No punctuation at the end
- NEVER use pet names like "friend", "buddy", "pal"
- NEVER repeat themes you've used in earlier cycles
- Each message should feel distinct from the last

Examples by variation:
- Minimal: "here you are"
- Body: "shoulders soften\\nwith each breath"
- Breath: "each exhale\\na little lighter"
- Observation: "you chose\\nto pause"
- Spaciousness: "room to just\\nbe"`;

    // Call OpenAI for personalized message
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate one encouragement message for cycle ${cycle}, variation ${variation}.` }
        ],
        temperature: 0.85,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API failed');
    }

    const data = await response.json();
    const message = data.choices[0]?.message?.content?.trim() || "You're exactly where\\nyou need to be";

    console.log(`[ENCOURAGEMENT] Generated: "${message}"`);

    res.json({ message });

  } catch (error) {
    console.error('Encouragement generation error:', error);
    
    // Fallback to variation-aware default messages
    const fallbacksByVariation = [
      ["here you are", "still here", "just this"],
      ["shoulders ease", "body knows", "feel the seat"],
      ["breathe in\\nbreathe out", "each exhale\\na release", "breath by breath"],
      ["you chose\\nto pause", "this moment\\nyou made", "here by choice"],
      ["room to be", "space opens", "nothing to fix"]
    ];
    
    const fallbackSet = fallbacksByVariation[variation] || fallbacksByVariation[0];
    const fallbackMessage = fallbackSet[Math.floor(Math.random() * fallbackSet.length)];
    
    res.json({ message: fallbackMessage });
  }
});

// POST /api/holidays - Check for holidays on a given date
app.post('/api/holidays', async (req, res) => {
  try {
    const { country, timezone, date } = req.body || {};
    const parsedDate = date ? new Date(date) : new Date();

    // Accept either explicit country or derive from timezone
    const ctx = await getHolidayContext({
      countryCode: country,
      timezone: timezone,
      date: parsedDate,
    });

    if (!ctx) {
      return res.json({ todayHasHoliday: false });
    }

    res.json({
      todayHasHoliday: true,
      summary: ctx.summary,
      raw: ctx.raw,
    });
  } catch (err) {
    console.error('/api/holidays error', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/account - Delete user account and all related data
app.delete('/api/account', async (req, res) => {
  try {
    const { user, error: authError } = await getUserFromAuthHeader(req);
    if (authError || !user) {
      console.log('[DeleteAccount] Auth failed:', authError);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;
    console.log('[DeleteAccount] Deleting account for userId:', userId);

    if (!supabaseServer) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Delete per-user data from all user-scoped tables
    // Using individual try-catch to continue even if some tables don't exist
    const tablesToDelete = ['chat_messages', 'welcome_history', 'profiles'];
    
    for (const table of tablesToDelete) {
      try {
        const { error } = await supabaseServer.from(table).delete().eq('user_id', userId);
        if (error && !error.message.includes('does not exist') && !error.message.includes('schema cache')) {
          console.warn(`[DeleteAccount] Non-critical error deleting from ${table}:`, error.message);
        } else if (!error) {
          console.log(`[DeleteAccount] Deleted from ${table}`);
        }
      } catch (e) {
        console.warn(`[DeleteAccount] Skipping ${table}:`, e.message);
      }
    }

    // Delete the auth user using the service role client
    const { error: deleteUserError } = await supabaseServer.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error('[DeleteAccount] Auth delete error:', deleteUserError.message);
      return res.status(500).json({ error: 'Failed to delete auth user' });
    }

    console.log('[DeleteAccount] Successfully deleted account:', userId);
    return res.json({ success: true });

  } catch (err) {
    console.error('[DeleteAccount] Unexpected error:', err.message);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
});

// POST /api/account/delete - Soft delete / anonymize account
app.post('/api/account/delete', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!supabaseServer) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // 1. Soft-delete / anonymize profile
    const { error: profileError } = await supabaseServer
      .from('profiles')
      .update({
        display_name: null,
        email: null,
        plan_status: 'deleted',
        has_completed_onboarding: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('[DELETE ACCOUNT] Profile update error:', profileError);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    console.log('[DELETE ACCOUNT] Soft deleted account for userId:', userId);

    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE ACCOUNT] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== END PROFILE ENDPOINTS ====================

// POST /api/journal/reflection - Generate personalized journal reflection
app.post('/api/journal/reflection', async (req, res) => {
  console.log('📔 TRACE /journal/reflection request received');
  try {
    const { recentEntries, activitiesCount, localDate, localDay } = req.body;

    let contextPrompt = `Today is ${localDay}, ${localDate}.`;
    
    if (recentEntries && recentEntries.length > 0) {
      contextPrompt += `\n\nThe user has written ${recentEntries.length} journal entry/entries recently.`;
      
      const entrySnippets = recentEntries.slice(0, 3).map((entry, idx) => {
        const snippet = entry.content.substring(0, 150);
        return `Entry ${idx + 1}: "${snippet}${entry.content.length > 150 ? '...' : ''}"`;
      }).join('\n');
      
      contextPrompt += `\n\n${entrySnippets}`;
    }
    
    if (activitiesCount > 0) {
      contextPrompt += `\n\nThey've completed ${activitiesCount} wellness activity/activities this week.`;
    }

    contextPrompt += `\n\nGenerate a brief, warm reflection (1-2 sentences) that acknowledges their journey. Be observant and affirming, not generic.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are TRACE. Generate warm, personal reflections based on user context. Be concise and genuine.' },
        { role: 'user', content: contextPrompt },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const reflectionText = completion.choices[0].message.content.trim().replace(/^["']|["']$/g, '');

    console.log('✅ Journal reflection generated:', reflectionText);
    res.json({ ok: true, reflection: reflectionText });
  } catch (error) {
    console.error('❌ Journal Reflection API Error:', error.message);
    res.status(500).json({ 
      ok: false,
      reflection: null,
      error: error.message 
    });
  }
});

// POST /api/journal/conversation-invite - Generate invitation to discuss journal entry in chat
app.post('/api/journal/conversation-invite', async (req, res) => {
  console.log('📔 TRACE /journal/conversation-invite request received');
  try {
    const { userId, journalExcerpt, mood } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!journalExcerpt || journalExcerpt.trim().length < 10) {
      // Entry too short to invite conversation
      return res.json({ ok: true, invitation: null });
    }

    const moodContext = mood ? `\nMood indicated: ${mood}` : '';

    const systemPrompt = `
You are TRACE, a calm, grounded companion in a mental wellness app.

The user just wrote a journal entry. You read it. Now you want to invite them to talk about it in chat.

WHAT YOU KNOW:
Journal excerpt: "${journalExcerpt}"${moodContext}

YOUR TASK:
Generate a single short invitation (1-2 sentences) that:
- Acknowledges you read their entry (first-person: "I read...", "I saw...")
- Gently invites conversation (not demands it)
- Uses "want" not "need" (gives agency)
- Leaves space for "no" (it's an invitation)

GOOD EXAMPLES:
- "I read your entry. Want to talk about what happened next?"
- "I saw what you wrote. Do you want to talk about it?"
- "I read that. How are you feeling about it now?"
- "I read what you wrote about [topic]. Do you want to talk about it?"
- "That sounds really hard. Want to talk about it?"

IF HEAVY/CRISIS TONE DETECTED:
- "I read what you wrote. I'm here if you want to talk."
- "That sounds really hard. Want to talk about it?"

NEVER:
- Summarize what they wrote (they know what they wrote)
- Give advice or reflection (that's for conversation if they accept)
- Sound clinical ("I notice you're experiencing...")
- Use exclamation marks

Respond with just the invitation message.
`.trim();

    if (!openai) {
      return res.json({ 
        ok: true, 
        invitation: "I read your entry. Want to talk about it?" 
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the conversation invitation now.' },
      ],
      temperature: 0.7,
      max_tokens: 80,
    });

    const invitation = completion.choices[0]?.message?.content?.trim()?.replace(/^["']|["']$/g, '') 
      || "I read your entry. Want to talk about it?";

    console.log('✅ Journal conversation invite generated:', invitation);
    res.json({ ok: true, invitation });
  } catch (error) {
    console.error('❌ Journal Conversation Invite Error:', error.message);
    res.json({ 
      ok: false,
      invitation: null,
      error: error.message 
    });
  }
});

// POST /api/journal/memory-consent - Update consent for TRACE to reference journal memories
app.post('/api/journal/memory-consent', async (req, res) => {
  console.log('📓 [JOURNAL CONSENT] Request received');
  try {
    const { userId, consent } = req.body;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    
    if (typeof consent !== 'boolean') {
      return res.status(400).json({ success: false, error: 'consent must be true or false' });
    }
    
    if (!supabaseServer) {
      console.log('📓 [JOURNAL CONSENT] No Supabase configured');
      return res.json({ success: true, note: 'No Supabase configured' });
    }
    
    await updateJournalMemoryConsent(supabaseServer, userId, consent);
    
    console.log('📓 [JOURNAL CONSENT] Updated consent to', consent, 'for user:', userId);
    return res.json({ success: true, consent });
  } catch (err) {
    console.error('📓 [JOURNAL CONSENT] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update consent' });
  }
});

// GET /api/music-config - Spotify playlist configuration for TRACE mood spaces
app.get('/api/music-config', (req, res) => {
  res.json({
    spotifyClientId: process.env.SPOTIFY_CLIENT_ID || '',
    playlists: {
      ground: process.env.TRACE_GROUND_URL || process.env.TRACE_GROUND_URI || '',
      drift: process.env.TRACE_DRIFT_URL || process.env.TRACE_DRIFT_URI || '',
      rising: process.env.TRACE_RISING_URL || process.env.TRACE_RISING_URI || '',
    },
  });
});

// ============================================
// MUSIC SESSION STATE MANAGEMENT
// ============================================
const sessionMusicState = new Map();

function getMusicState(userId) {
  if (!sessionMusicState.has(userId)) {
    sessionMusicState.set(userId, {
      musicInviteUsed: false,
      userRequestedMusic: false,
      musicDeclined: false,
      lastInviteTimestamp: null,
    });
  }
  return sessionMusicState.get(userId);
}

function detectUserRequestedMusic(messageText = '') {
  const txt = messageText.toLowerCase();
  
  // Skip if user is asking about activity comparisons (not requesting music)
  const isActivityComparison = (
    txt.includes('why') && (txt.includes('over') || txt.includes('vs') || txt.includes('versus')) ||
    txt.includes('should i try') ||
    txt.includes('good for') ||
    txt.includes('what\'s') && (txt.includes('for') || txt.includes('like')) ||
    txt.includes('difference between')
  );
  
  if (isActivityComparison) {
    return false;
  }
  
  return (
    txt.includes('music') ||
    txt.includes('playlist') ||
    txt.includes('ground') ||
    txt.includes('drift') ||
    txt.includes('rising') ||
    txt.includes('song')
  );
}

function canInviteMusic(state, context = {}) {
  if (!state.userRequestedMusic) return false;
  if (state.musicInviteUsed) return false;
  if (state.musicDeclined) return false;
  if (context.requestsSilence) return false;
  if (context.crisis) return false;
  if (context.panicUnregulated) return false;
  return true;
}

// POST /api/can-invite-music - Check if TRACE can invite music
app.post('/api/can-invite-music', (req, res) => {
  const { userId, messageText, context } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }

  const state = getMusicState(userId);

  if (detectUserRequestedMusic(messageText)) {
    state.userRequestedMusic = true;
  }

  const allowed = canInviteMusic(state, context);

  return res.json({ allowed, state });
});

// POST /api/mark-music-invited - Lock music invite after TRACE invites
app.post('/api/mark-music-invited', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const state = getMusicState(userId);
  state.musicInviteUsed = true;
  state.lastInviteTimestamp = Date.now();

  return res.json({ ok: true });
});

// POST /api/mark-music-declined - Lock music if user declines
app.post('/api/mark-music-declined', (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  const state = getMusicState(userId);
  state.musicDeclined = true;

  return res.json({ ok: true });
});

// Sentry error handler (v8 uses setupExpressErrorHandler)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`TRACE API server running on port ${PORT}`);
});

// ============================================
// TRACE Verse-Time Notification Scheduler
// ============================================
// Runs every 60 seconds, checks each user's local timezone,
// and sends push notifications at 9:47am, 3:16pm, or 8:28pm local time.

function getLocalHMForTimezone(timeZone, date) {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(date);
    const get = (type) => parts.find(p => p.type === type)?.value || "00";
    const year = get("year");
    const month = get("month");
    const day = get("day");
    const hour = parseInt(get("hour"), 10);
    const minute = parseInt(get("minute"), 10);
    const ymd = `${year}-${month}-${day}`;
    return { hour, minute, ymd };
  } catch (err) {
    console.error('Invalid timezone:', timeZone, err.message);
    return null;
  }
}

function isVerseTimeLocal(hour, minute) {
  return (
    (hour === 9 && minute === 47) ||
    (hour === 15 && minute === 16) ||
    (hour === 20 && minute === 28)
  );
}

async function getUserFirstName(supabaseAdmin, userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;

    if (data.name && data.name.trim().length > 0) {
      const first = data.name.trim().split(" ")[0];
      return first || null;
    }

    return null;
  } catch (err) {
    console.error("[TRACE] Error getting user name:", err.message);
    return null;
  }
}

function getPersonalizedCheckinMessage(date, firstName) {
  const hour = date.getHours();
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const day = dayNames[date.getDay()];
  const name = firstName && firstName.trim && firstName.trim().length > 0 ? firstName.trim() : null;

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  if (hour < 11) {
    const messages = [
      (n) => `Good morning${n ? " " + n : ""}, how are you today?`,
      (n) => `Morning${n ? " " + n : ""}. Just checking in as your day starts.`,
      (n) => `Hi${n ? " " + n : ""}, hope your morning's okay so far.`,
      (n) => `Hey${n ? " " + n : ""}, how'd you sleep?`,
      (n) => `Morning${n ? " " + n : ""}, what's on your mind today?`,
      (n) => `Hey${n ? " " + n : ""}, just wanted to say hi before your day gets going.`,
      (n) => `Good morning${n ? " " + n : ""}. No rush, just here if you want to talk.`,
      (n) => `Hi${n ? " " + n : ""}, hope you're easing into ${day} okay.`,
      (n) => `Hey${n ? " " + n : ""}, new day. How are you feeling?`,
      (n) => `Morning${n ? " " + n : ""}. Hope you're starting off okay.`,
    ];
    return pick(messages)(name);
  } else if (hour < 17) {
    const messages = [
      (n) => `Hey${n ? " " + n : ""}, hope your day's going okay.`,
      (n) => `Hi${n ? " " + n : ""}, just checking in this ${day}.`,
      (n) => `Hey${n ? " " + n : ""}, if you need a minute to breathe, I'm here.`,
      (n) => `How's your ${day} going${n ? ", " + n : ""}?`,
      (n) => `Hey${n ? " " + n : ""}, just thinking of you. How's it going?`,
      (n) => `Hi${n ? " " + n : ""}, anything on your mind?`,
      (n) => `Hey${n ? " " + n : ""}, taking a break? I'm around if you want to chat.`,
      (n) => `Just checking in${n ? ", " + n : ""}. Hope your afternoon's treating you okay.`,
      (n) => `Hey${n ? " " + n : ""}, how are you doing right now?`,
      (n) => `Hi${n ? " " + n : ""}, hope ${day}'s not being too rough on you.`,
      (n) => `Hey${n ? " " + n : ""}, what's going on today?`,
    ];
    return pick(messages)(name);
  } else {
    const messages = [
      (n) => `Good evening${n ? " " + n : ""}, hope your day wasn't too heavy.`,
      (n) => `Hi${n ? " " + n : ""}, just saying good evening. I'm here if you feel like talking.`,
      (n) => `Hey${n ? " " + n : ""}, winding down for ${day}? I'm around if you want to check in.`,
      (n) => `Evening${n ? ", " + n : ""}, how was your day?`,
      (n) => `Hey${n ? " " + n : ""}, how are you feeling tonight?`,
      (n) => `Hi${n ? " " + n : ""}, hope you're getting some time to rest.`,
      (n) => `Hey${n ? " " + n : ""}, end of ${day}. How are you holding up?`,
      (n) => `Good evening${n ? " " + n : ""}. Just here if you need to talk through anything.`,
      (n) => `Hey${n ? " " + n : ""}, no pressure, just wanted to check in.`,
      (n) => `Hi${n ? " " + n : ""}, how was today?`,
      (n) => `Hey${n ? " " + n : ""}, hope you can breathe a little now that the day's winding down.`,
    ];
    return pick(messages)(name);
  }
}

async function sendPushNotificationToUser(userId, message) {
  const appId = process.env.VITE_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_API_KEY;
  
  if (!appId || !apiKey) {
    console.log("[TRACE PUSH] OneSignal not configured - skipping notification");
    return;
  }
  
  try {
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`
      },
      body: JSON.stringify({
        app_id: appId,
        include_aliases: {
          external_id: [userId]
        },
        target_channel: 'push',
        contents: { en: message },
        headings: { en: 'TRACE' }
      })
    });
    
    const result = await response.json();
    
    if (result.errors) {
      console.error("[TRACE PUSH] OneSignal error:", result.errors);
    } else {
      console.log("[TRACE PUSH] Sent to user", userId, "- ID:", result.id);
    }
  } catch (err) {
    console.error("[TRACE PUSH] Failed to send notification:", err.message);
  }
}

let lastProcessedKey = null;

async function runVerseCheckins() {
  if (!supabaseServer) {
    return;
  }

  const now = new Date();
  const key = now.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
  
  if (key === lastProcessedKey) {
    return; // Already processed this minute
  }
  lastProcessedKey = key;

  try {
    const { data: users, error } = await supabaseServer
      .from('user_preferences')
      .select('user_id, time_zone, last_checkin_at')
      .eq('notifications_enabled', true);

    if (error) {
      console.error('Error fetching user preferences:', error.message);
      return;
    }

    if (!users || users.length === 0) {
      return;
    }

    const usersToUpdate = [];

    for (const user of users) {
      const tz = user.time_zone || 'America/Los_Angeles';
      const localTime = getLocalHMForTimezone(tz, now);
      
      if (!localTime) continue;

      const { hour, minute, ymd } = localTime;

      if (!isVerseTimeLocal(hour, minute)) {
        continue;
      }

      if (user.last_checkin_at === ymd) {
        continue; // Already sent today
      }

      const firstName = await getUserFirstName(supabaseServer, user.user_id);
      const nowInUserTz = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      const message = getPersonalizedCheckinMessage(nowInUserTz, firstName);
      await sendPushNotificationToUser(user.user_id, message);
      usersToUpdate.push({ user_id: user.user_id, ymd });
    }

    // Update last_checkin_at for all users who received a notification
    for (const { user_id, ymd } of usersToUpdate) {
      await supabaseServer
        .from('user_preferences')
        .update({ last_checkin_at: ymd })
        .eq('user_id', user_id);
    }

    if (usersToUpdate.length > 0) {
      console.log(`[TRACE] Sent verse-time notifications to ${usersToUpdate.length} user(s)`);
    }
  } catch (err) {
    console.error('Error in runVerseCheckins:', err.message);
  }
}

// Start the verse-time scheduler (runs every 60 seconds)
if (supabaseServer) {
  setInterval(() => {
    runVerseCheckins().catch(err => {
      console.error('Verse checkin error:', err.message);
    });
  }, 60_000);
  
  console.log('📱 TRACE verse-time scheduler started (checks every 60s)');
  console.log('   Notifications at 9:47am, 3:16pm & 8:28pm in each user\'s local timezone');
}

// Test endpoint to send a test push notification
app.post('/api/test-push', async (req, res) => {
  const { userId, message } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  const testMessage = message || 'Hey 👋 this is a test notification from TRACE!';
  
  try {
    await sendPushNotificationToUser(userId, testMessage);
    res.json({ success: true, message: 'Test notification sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test endpoint to send push directly by subscription ID
app.post('/api/test-push-direct', async (req, res) => {
  const { subscriptionId, message } = req.body;
  
  if (!subscriptionId) {
    return res.status(400).json({ error: 'subscriptionId is required' });
  }
  
  const appId = process.env.VITE_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_API_KEY;
  
  if (!appId || !apiKey) {
    return res.status(500).json({ error: 'OneSignal not configured' });
  }
  
  try {
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`
      },
      body: JSON.stringify({
        app_id: appId,
        include_subscription_ids: [subscriptionId],
        contents: { en: message || 'Direct test from TRACE!' },
        headings: { en: 'TRACE' }
      })
    });
    
    const result = await response.json();
    console.log('[TRACE PUSH DIRECT] Response:', JSON.stringify(result));
    
    if (result.errors) {
      return res.status(400).json({ error: result.errors });
    }
    
    res.json({ success: true, id: result.id, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test endpoint to trigger verse checkin manually
app.post('/api/test-verse-checkin', async (req, res) => {
  if (!supabaseServer) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }
  
  // Reset last processed key to allow immediate testing
  lastProcessedKey = null;
  
  try {
    await runVerseCheckins();
    res.json({ success: true, message: 'Verse checkin run completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ping', (req, res) => {
  console.log('🔔 /api/ping HIT');
  res.json({ ok: true });
});

app.get('/api/debug-messages', async (req, res) => {
  if (!supabaseServer) {
    console.error('[TRACE DEBUG MESSAGES] Supabase not configured');
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    console.log('[TRACE DEBUG MESSAGES] fetching latest messages...');
    const { data, error } = await supabaseServer
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[TRACE DEBUG MESSAGES ERROR]', error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log('[TRACE DEBUG MESSAGES OK] rows:', data?.length || 0);
    return res.json({ rows: data || [] });
  } catch (err) {
    console.error('[TRACE DEBUG MESSAGES EXCEPTION]', err.message || err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
});

app.get('/api/chat-history', async (req, res) => {
  try {
    const { userId } = req.query;

    const effectiveUserId = userId || '2ec61767-ffa7-4665-9ee3-7b5ae6d8bd0c';
    console.log('[TRACE HISTORY] effectiveUserId:', effectiveUserId);

    if (!effectiveUserId) {
      return res.status(400).json({ ok: false, error: 'Missing user identifier' });
    }

    const history = await getChatHistory(effectiveUserId);

    res.json({
      ok: true,
      messages: history,
    });
  } catch (err) {
    console.error('[TRACE HISTORY ROUTE ERROR]', err.message || err);
    res.status(500).json({
      ok: false,
      error: 'Failed to load chat history',
    });
  }
});

// Patterns: summarize last hour of conversation
// mode: patterns_last_hour
// Accepts either recentMessages from request body OR fetches from Supabase
app.post('/api/patterns/last-hour', async (req, res) => {
  try {
    const { userId, deviceId, recentMessages } = req.body || {};

    console.log('🧠 /api/patterns/last-hour request:', {
      userId: userId || 'null',
      deviceId: deviceId || 'null',
      recentMessagesCount: recentMessages?.length || 0
    });

    // Primary source: recentMessages from request body
    // Fallback: fetch from Supabase if available
    let messagesToAnalyze = [];

    if (recentMessages && Array.isArray(recentMessages) && recentMessages.length > 0) {
      // Use messages sent directly from the mobile app
      messagesToAnalyze = recentMessages;
      console.log('🧠 Using recentMessages from request body:', messagesToAnalyze.length, 'messages');
    } else if (supabaseServer && userId) {
      // Fallback: fetch from Supabase
      const effectiveUserId = userId || '2ec61767-ffa7-4665-9ee3-7b5ae6d8bd0c';
      
      const { data, error } = await supabaseServer
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('user_id', effectiveUserId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[TRACE PATTERNS] history query error:', error);
      } else {
        const allMessages = data || [];
        messagesToAnalyze = filterMessagesToLastHour(allMessages);
        console.log('🧠 Using Supabase messages:', messagesToAnalyze.length, 'messages');
      }
    }

    const hasHistory = messagesToAnalyze.length > 0;

    if (!hasHistory) {
      console.log('🧠 /api/patterns/last-hour - no messages to analyze');
      return res.json({
        ok: true,
        hasHistory: false,
        summaryText: null,
      });
    }

    // Check if OpenAI is available
    if (!openai) {
      console.log('🧠 /api/patterns/last-hour - OpenAI not available, using fallback');
      return res.json({
        ok: true,
        hasHistory: true,
        summaryText: "You've been sharing what's on your mind. Take a moment to notice how you're feeling right now.",
      });
    }

    // Count user messages and detect emotional keywords
    const userMessages = messagesToAnalyze.filter(m => m.role === 'user');
    const userMessageCount = userMessages.length;
    const allUserText = userMessages.map(m => (m.content || '').toLowerCase()).join(' ');
    
    // Detect emotional keywords for context
    const emotionalKeywords = [];
    if (/stress|stressed|stressful|pressure|deadline/.test(allUserText)) emotionalKeywords.push('stress');
    if (/overwhelm|overwhelming|too much|can't handle/.test(allUserText)) emotionalKeywords.push('overwhelm');
    if (/anxious|anxiety|worried|worry|nervous|panic/.test(allUserText)) emotionalKeywords.push('anxiety');
    if (/tired|exhausted|drained|fatigue|sleep|rest/.test(allUserText)) emotionalKeywords.push('fatigue');
    if (/sad|down|lonely|alone|empty|cry|crying/.test(allUserText)) emotionalKeywords.push('sadness');
    if (/relax|calm|peace|better|relief/.test(allUserText)) emotionalKeywords.push('seeking-calm');
    if (/grateful|thankful|gratitude|appreciate|blessed/.test(allUserText)) emotionalKeywords.push('gratitude');
    if (/happy|excited|good|great|joy|wonderful/.test(allUserText)) emotionalKeywords.push('positive');
    if (/confused|uncertain|unsure|lost|don't know/.test(allUserText)) emotionalKeywords.push('uncertainty');
    if (/work|job|boss|coworker|meeting|project/.test(allUserText)) emotionalKeywords.push('work-related');
    if (/family|mom|dad|parent|sibling|partner|relationship/.test(allUserText)) emotionalKeywords.push('relationships');
    if (/health|body|pain|sick|doctor/.test(allUserText)) emotionalKeywords.push('health-concerns');

    // Build compact convo text for the model (limit to last 15 messages for efficiency)
    const recentSlice = messagesToAnalyze.slice(-15);
    const convoText = recentSlice
      .map((m) => {
        const role = m.role || 'user';
        const content = (m.content || '').slice(0, 300);
        return `${role === 'assistant' ? 'TRACE' : 'User'}: ${content}`;
      })
      .join('\n');

    // Build context summary for the model
    const contextSummary = `User messages: ${userMessageCount}` +
      (emotionalKeywords.length ? `\nEmotional themes detected: ${emotionalKeywords.join(', ')}` : '');

    const systemPrompt = `You are TRACE, a calm and emotionally intelligent companion. You're providing a brief reflection on what the user has been sharing in their recent conversation.

Your task: Write 2-3 gentle, observational sentences summarizing the emotional patterns, themes, and insights from this conversation.

Style:
- Observational and validating, not advisory
- Specific to what they actually shared (not generic)
- Notice recurring themes, emotional undercurrents, or shifts in feeling
- Use phrases like "You've been navigating...", "There's a thread of...", "It sounds like...", "I notice..."
- Do NOT ask questions
- Do NOT give advice or instructions
- Do NOT mention time frames like "last hour" or "recently"
- Keep it warm and grounding

Example good outputs:
- "You've been navigating feelings of stress around work deadlines. There's a thread of wanting more balance, and you're noticing how your energy shifts throughout the day."
- "It sounds like you're holding a lot right now—between family expectations and your own needs. There's a quiet strength in how you're processing it all."
- "I notice a mix of tiredness and hope in what you've shared. You're being honest about where you are, and that's a meaningful step."`;

    const userPrompt = `${contextSummary}

Conversation:
${convoText}

Write 2-3 gentle, observational sentences reflecting on the emotional patterns and themes in this conversation.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const summaryText =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "You've been holding a lot. It's okay to soften here and notice how you're feeling.";

    console.log('🧠 /api/patterns/last-hour generated summary:', summaryText.slice(0, 100) + '...');

    return res.json({
      ok: true,
      hasHistory: true,
      summaryText,
    });
  } catch (err) {
    console.error('❌ /api/patterns/last-hour error:', err);
    return res.status(500).json({
      ok: false,
      hasHistory: false,
      summaryText: null,
    });
  }
});

// mode: patterns_weekly_narrative
app.post('/api/patterns/weekly-summary', async (req, res) => {
  try {
    const {
      userId,
      deviceId,
      userName,
      localDate,
      localDay,
      localTime,
      peakWindowLabel,
      energyRhythmLabel,
      energyRhythmDetail,
      behaviorSignatures = [],
    } = req.body || {};

    console.log('🧠 /api/patterns/weekly-summary userId:', userId?.slice?.(0, 8) || 'none');

    // Fetch actual data from database if userId is provided
    let weekSessions = 0;
    let weekActiveDays = 0;
    let dominantKind = null;
    let dominantKindCount = 0;
    let journalWeekCount = 0;

    if (supabaseServer && userId) {
      try {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const weekAgoISO = oneWeekAgo.toISOString();

        // Fetch activity logs
        const { data: activityLogs } = await supabaseServer
          .from('activity_logs')
          .select('activity_type, completed_at')
          .eq('user_id', userId)
          .gte('completed_at', weekAgoISO);

        if (activityLogs && activityLogs.length > 0) {
          weekSessions = activityLogs.length;
          
          // Count unique active days
          const activeDays = new Set();
          const activityCounts = {};
          for (const log of activityLogs) {
            const day = new Date(log.completed_at).toDateString();
            activeDays.add(day);
            activityCounts[log.activity_type] = (activityCounts[log.activity_type] || 0) + 1;
          }
          weekActiveDays = activeDays.size;

          // Find dominant activity
          let maxCount = 0;
          for (const [type, count] of Object.entries(activityCounts)) {
            if (count > maxCount) {
              maxCount = count;
              dominantKind = type;
              dominantKindCount = count;
            }
          }
        }

        // Fetch journal entries
        const { data: journals } = await supabaseServer
          .from('journal_entries')
          .select('id')
          .eq('user_id', userId)
          .gte('created_at', weekAgoISO);

        journalWeekCount = journals?.length || 0;

        console.log('🧠 /api/patterns/weekly-summary fetched data:', {
          weekSessions,
          weekActiveDays,
          dominantKind,
          journalWeekCount
        });
      } catch (dbErr) {
        console.warn('🧠 /api/patterns/weekly-summary db error:', dbErr.message);
      }
    }

    // If no activity at all this week
    if (weekSessions === 0 && journalWeekCount === 0) {
      return res.json({
        ok: true,
        summaryText: "This week is still opening up. As you start checking in and journaling, I'll begin tracing the shape of your rhythm with you.",
      });
    }

    // Build context for OpenAI
    const contextParts = [];
    if (userName) contextParts.push(`User: ${userName}`);
    if (localDay) contextParts.push(`Day: ${localDay}`);
    if (localTime) contextParts.push(`Time: ${localTime}`);
    const contextLine = contextParts.length ? contextParts.join(', ') : '';

    // Build data summary
    const dataParts = [];
    if (weekSessions > 0) dataParts.push(`Sessions this week: ${weekSessions}`);
    if (weekActiveDays > 0) dataParts.push(`Active days: ${weekActiveDays}`);
    if (dominantKind && dominantKindCount > 0) {
      dataParts.push(`Most used practice: ${dominantKind} (${dominantKindCount} times)`);
    }
    if (journalWeekCount > 0) dataParts.push(`Journal entries: ${journalWeekCount}`);
    
    // Add pattern insights if available
    if (peakWindowLabel) dataParts.push(`Peak window: ${peakWindowLabel}`);
    if (energyRhythmLabel) dataParts.push(`Energy rhythm: ${energyRhythmLabel}`);
    if (behaviorSignatures && behaviorSignatures.length > 0) {
      dataParts.push(`Behavior signatures: ${behaviorSignatures.join(', ')}`);
    }
    const dataLine = dataParts.join('\n');

    const systemPrompt = `You are TRACE, summarizing a week of check-ins and journaling.
mode: patterns_weekly_narrative

Tone: calm, validating, poetic but grounded. No advice, no instructions.
- 2–3 sentences maximum.
- Focus on noticing consistency, effort, rhythm, and the kinds of practices they're drawn to.
- Do not mention exact counts mechanically; weave them into natural, observant language.
- Do not ask questions.
- Talk directly to the user as "you".
- Speak like a gentle observer noticing patterns from the outside.`;

    const userPrompt = `${contextLine ? contextLine + '\n' : ''}${dataLine}

In 2–3 sentences, gently reflect what this week's rhythm suggests about how this person has been showing up for themselves. Notice when they sought TRACE, what patterns emerged, and what that might say about their week. No advice, no questions, just noticing and affirming.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 150,
    });

    const summaryText =
      completion.choices?.[0]?.message?.content?.trim() ||
      'Your week is still taking shape. As you keep checking in, TRACE will gently sketch the pattern.';

    res.json({
      ok: true,
      summaryText,
    });
  } catch (err) {
    console.error('🧠 /api/patterns/weekly-summary error:', err);
    res.status(500).json({
      ok: false,
      summaryText:
        'Your week is still taking shape. As you keep checking in, TRACE will gently sketch the pattern.',
    });
  }
});

// POST /api/patterns-reflection - Generate personalized weekly pattern assessment
app.post('/api/patterns-reflection', async (req, res) => {
  try {
    const {
      userName,
      localTime,
      localDay,
      localDate,
      weekSessions,
      weekActiveDays,
      dominantKind,
      dominantKindCount,
      journalWeekCount,
      peakWindowLabel,
      energyRhythmLabel,
      energyRhythmDetail,
      stressScore,
      stressEchoEvents,
      behaviorSignatures,
    } = req.body || {};

    console.log('🧠 /api/patterns-reflection called with:', {
      weekSessions,
      weekActiveDays,
      dominantKind,
      stressEchoEvents,
      behaviorSignatures,
    });

    // Build a rich context prompt for OpenAI
    const contextParts = [];

    if (weekSessions > 0) {
      contextParts.push(`${weekSessions} session${weekSessions === 1 ? '' : 's'} across ${weekActiveDays} day${weekActiveDays === 1 ? '' : 's'} this week`);
    }

    if (dominantKind && dominantKindCount) {
      contextParts.push(`most frequent activity: ${dominantKind} (${dominantKindCount}x)`);
    }

    if (journalWeekCount > 0) {
      contextParts.push(`${journalWeekCount} journal ${journalWeekCount === 1 ? 'entry' : 'entries'}`);
    }

    if (peakWindowLabel) {
      contextParts.push(`peak activity: ${peakWindowLabel}`);
    }

    if (stressEchoEvents > 0) {
      contextParts.push(`${stressEchoEvents} stress-related moment${stressEchoEvents === 1 ? '' : 's'} detected`);
    }

    if (behaviorSignatures && behaviorSignatures.length > 0) {
      const signatureLabels = {
        eveningOverthinking: 'Evening Overthinking (mind gets busier as the day winds down)',
        midweekBurnout: 'Midweek Burnout (strain or heaviness mid-week)',
        morningSharpness: 'Morning Sharpness (clarity and focus in morning hours)',
        solitudeRecovery: 'Solitude Recovery (calm and grounding after stress)',
      };

      const readableSignatures = behaviorSignatures
        .map(sig => signatureLabels[sig] || sig)
        .join(', ');

      contextParts.push(`behavioral patterns: ${readableSignatures}`);
    }

    const weekContext = contextParts.length > 0
      ? contextParts.join('; ')
      : 'starting to establish patterns';

    const systemPrompt = `You are TRACE, a compassionate emotional wellness companion.

You are creating a brief, grounded weekly reflection based on behavioral patterns.

Your reflection should:
- Acknowledge what you notice with warmth and curiosity
- Speak in 2-3 sentences max
- Avoid clinical language or diagnosis
- Frame patterns as information, not judgment
- Use "you're" instead of "you are" for a softer tone

Keep it real, warm, and brief.`;

    const userPrompt = `This week's pattern snapshot:

${weekContext}

Write a gentle 2-3 sentence reflection that acknowledges what's emerging in their patterns this week.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const reflection =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "You're building your rhythm in the ways that work for you. That consistency matters.";

    console.log('✅ Patterns reflection generated:', reflection);

    return res.json({
      ok: true,
      reflection,
    });
  } catch (err) {
    console.error('❌ /api/patterns-reflection error:', err);
    return res.json({
      ok: true,
      reflection: "You've been showing up this week. Even noticing your patterns is its own kind of care.",
    });
  }
});

// POST /api/patterns/full-reflection - Generate three AI reflections (today, last hour, week)
app.post('/api/patterns/full-reflection', async (req, res) => {
  const defaults = {
    todayText: "TRACE is still gathering today's moments. As you move through the day, the shape of it will gently come into focus.",
    lastHourText: "This hour has been quiet so far. Sometimes the spaces between words are just as meaningful.",
    weekText: "TRACE is still learning your weekly rhythm. A few more days and the shape of your week will start to appear.",
  };

  try {
    const { userId, deviceId } = req.body || {};

    console.log('🧠 /api/patterns/full-reflection called with:', { userId, deviceId });

    if (!supabaseServer) {
      console.log('⚠️ /api/patterns/full-reflection: No Supabase configured');
      return res.json(defaults);
    }

    if (!deviceId && !userId) {
      console.log('⚠️ /api/patterns/full-reflection: No deviceId or userId provided');
      return res.json(defaults);
    }

    // Calculate time boundaries
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Build query for this week's messages
    let query = supabaseServer
      .from('chat_messages')
      .select('content, created_at, role')
      .gte('created_at', oneWeekAgo.toISOString())
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: weekMessages, error } = await query;

    if (error) {
      console.error('❌ /api/patterns/full-reflection query error:', error);
      return res.json(defaults);
    }

    if (!weekMessages || weekMessages.length === 0) {
      console.log('⚠️ /api/patterns/full-reflection: No messages found');
      return res.json(defaults);
    }

    // Filter messages by time period (only user messages for analysis)
    const userMessages = weekMessages.filter(m => m.role === 'user');
    const todayMessages = userMessages.filter(m => new Date(m.created_at) >= startOfToday);
    const lastHourMessages = userMessages.filter(m => new Date(m.created_at) >= oneHourAgo);

    // Build context summaries
    const todaySummary = todayMessages.length > 0
      ? `Today's ${todayMessages.length} message(s): ${todayMessages.map(m => m.content?.slice(0, 100)).join(' | ')}`
      : 'No messages today yet.';

    const lastHourSummary = lastHourMessages.length > 0
      ? `Last hour's ${lastHourMessages.length} message(s): ${lastHourMessages.map(m => m.content?.slice(0, 100)).join(' | ')}`
      : 'No messages in the last hour.';

    const weekSummary = userMessages.length > 0
      ? `This week's ${userMessages.length} message(s): ${userMessages.slice(-10).map(m => m.content?.slice(0, 80)).join(' | ')}`
      : 'No messages this week.';

    const systemPrompt = `You are TRACE, a compassionate emotional wellness companion.

Generate three brief reflections based on the user's recent chat history:

1. TODAY: Reflect on the overall shape or arc of today—themes, energy, or mood across the day
2. LAST HOUR: Focus on the most recent emotional temperature—what's immediately present right now
3. YOUR WEEK: Identify broader patterns, rhythms, or recurring themes across the week

CRITICAL: Each reflection MUST cover DIFFERENT aspects. Avoid redundancy:
- TODAY = big picture of the day's journey
- LAST HOUR = the immediate moment, what's freshest
- WEEK = patterns over time, not a repeat of today

Guidelines:
- Keep each reflection to 2-3 sentences
- Be specific when patterns are clear; be gentle when data is sparse
- Validate emotions without diagnosing
- Use "you" language directly to the user
- If a time period is quiet, acknowledge that meaningfully

Return ONLY valid JSON with no markdown:
{"todayText": "...", "lastHourText": "...", "weekText": "..."}`;

    const userPrompt = `Here is the user's recent activity:

TODAY: ${todaySummary}

LAST HOUR: ${lastHourSummary}

THIS WEEK: ${weekSummary}

Generate three reflections as JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    const responseText = completion?.choices?.[0]?.message?.content?.trim() || '';
    
    // Parse JSON response
    let parsed;
    try {
      // Remove potential markdown code blocks
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('❌ /api/patterns/full-reflection JSON parse error:', parseErr);
      return res.json(defaults);
    }

    console.log('✅ /api/patterns/full-reflection generated:', {
      todayLen: parsed.todayText?.length,
      lastHourLen: parsed.lastHourText?.length,
      weekLen: parsed.weekText?.length,
    });

    return res.json({
      todayText: parsed.todayText || defaults.todayText,
      lastHourText: parsed.lastHourText || defaults.lastHourText,
      weekText: parsed.weekText || defaults.weekText,
    });
  } catch (err) {
    console.error('❌ /api/patterns/full-reflection error:', err);
    return res.json(defaults);
  }
});

// POST /api/patterns/stress-echoes - AI-powered stress pattern detection
app.post('/api/patterns/stress-echoes', async (req, res) => {
  const { userId, deviceId, journalEntries } = req.body;
  
  const fallbackResponse = {
    hasPattern: false,
    clusterLabel: null,
    strength: 0,
    insightText: "When heavier moments return around similar times, TRACE will highlight that here."
  };
  
  console.log('🔮 [STRESS ECHOES] Analyzing', journalEntries?.length || 0, 'entries for userId:', userId || deviceId);
  
  // Check minimum data requirement
  if (!journalEntries || journalEntries.length < 2) {
    return res.json(fallbackResponse);
  }
  
  // Check OpenAI availability
  if (!openai) {
    console.log('🔮 [STRESS ECHOES] No OpenAI configured, returning fallback');
    return res.json(fallbackResponse);
  }
  
  try {
    const systemPrompt = `You are TRACE's pattern recognition system. Analyze journal entries to detect "Stress Echoes" - recurring patterns of emotional heaviness.

Your task:
1. Identify which entries reflect emotionally heavy moments (stress, anxiety, overwhelm, sadness)
2. Look for temporal patterns - do heavy moments cluster on specific days/times?
3. Detect recurring themes or triggers
4. Generate a brief, compassionate insight (1-2 sentences)

Return a JSON object with:
- hasPattern: true if 2+ heavy entries cluster around similar times
- clusterLabel: description like "Tuesday evening" or "Wednesday and Friday afternoon" (null if no pattern)
- strength: 0 (no pattern), 1 (soft pattern: 2-3 entries), 2 (strong pattern: 4+ entries)
- insightText: gentle observation, never judgmental or prescriptive

Example insights:
- "You tend to process difficult work situations on Tuesday evenings."
- "Heavier moments often surface midweek, especially around Wednesday."
- "You notice relationship stress most on weekend mornings."

If no clear pattern exists, set hasPattern to false and provide an encouraging insightText.`;

    const userPrompt = `Analyze these journal entries for stress patterns:\n\n${JSON.stringify(journalEntries, null, 2)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 300
    });

    const responseText = completion?.choices?.[0]?.message?.content?.trim() || '{}';
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('🔮 [STRESS ECHOES] JSON parse error:', parseErr);
      return res.json(fallbackResponse);
    }

    console.log('🔮 [STRESS ECHOES] AI result:', result);

    res.json({
      hasPattern: result.hasPattern || false,
      clusterLabel: result.clusterLabel || null,
      strength: typeof result.strength === 'number' ? result.strength : 0,
      insightText: result.insightText || fallbackResponse.insightText
    });

  } catch (error) {
    console.error('🔮 [STRESS ECHOES] Error:', error.message || error);
    res.json(fallbackResponse);
  }
});

// GET /api/patterns/insights - Peak Window and Most Helpful Activity analysis
app.get('/api/patterns/insights', async (req, res) => {
  const { userId, deviceId } = req.query;
  
  const fallbackPeakWindow = {
    label: "Not enough data yet",
    startHour: null,
    endHour: null,
    percentage: null,
  };
  
  const fallbackActivity = {
    label: "Once you've tried a few activities, I'll start noticing which ones you return to the most.",
    topActivity: null,
    percentage: null,
  };
  
  console.log('📊 [PATTERNS INSIGHTS] Request for:', userId || deviceId);
  
  if (!userId && !deviceId) {
    return res.status(400).json({ 
      error: 'userId or deviceId required',
      peakWindow: fallbackPeakWindow,
      mostHelpfulActivity: fallbackActivity,
      sampleSize: 0
    });
  }
  
  if (!supabaseServer) {
    console.log('⚠️ [PATTERNS INSIGHTS] No Supabase configured');
    return res.json({
      peakWindow: fallbackPeakWindow,
      mostHelpfulActivity: fallbackActivity,
      sampleSize: 0
    });
  }
  
  try {
    // Get last 30 days of messages
    const since = new Date();
    since.setDate(since.getDate() - 30);
    
    let query = supabaseServer
      .from('chat_messages')
      .select('content, created_at, role')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    const { data: messages, error } = await query;
    
    if (error) {
      console.error('📊 [PATTERNS INSIGHTS] Supabase error:', error);
      return res.json({
        peakWindow: fallbackPeakWindow,
        mostHelpfulActivity: fallbackActivity,
        sampleSize: 0
      });
    }
    
    // Activity keywords to detect from user messages
    const activityPatterns = [
      { name: 'Rising', patterns: ['rising', 'i just finished rising', 'completed rising'] },
      { name: 'Drift', patterns: ['drift', 'i just finished drift', 'completed drift'] },
      { name: 'Walking', patterns: ['walking', 'walk reset', 'walking reset', 'i just finished walking'] },
      { name: 'Breathing', patterns: ['breathing', 'breathe', 'breath exercise', 'i just finished breathing'] },
      { name: 'Grounding', patterns: ['grounding', '5-4-3-2-1', 'grounding exercise', 'i just finished grounding'] },
      { name: 'Maze', patterns: ['maze', 'i just finished maze', 'completed maze'] },
      { name: 'Power Nap', patterns: ['power nap', 'nap', 'i just finished power nap'] },
      { name: 'Pearl Ripple', patterns: ['pearl ripple', 'pearl', 'ripple', 'i just finished pearl'] },
      { name: 'Basin', patterns: ['basin', 'i just finished basin', 'completed basin'] },
      { name: 'Dreamscape', patterns: ['dreamscape', 'i just finished dreamscape', 'completed dreamscape'] },
    ];
    
    // Extract activities from user messages
    const activityLogs = [];
    
    for (const msg of messages || []) {
      if (msg.role !== 'user') continue;
      const content = (msg.content || '').toLowerCase();
      
      for (const activity of activityPatterns) {
        if (activity.patterns.some(p => content.includes(p))) {
          activityLogs.push({
            activity_type: activity.name,
            created_at: msg.created_at
          });
          break; // Only count one activity per message
        }
      }
    }
    
    console.log('📊 [PATTERNS INSIGHTS] Found', activityLogs.length, 'activity references');
    
    // Calculate Peak Window (when user most often uses TRACE)
    let peakWindow = fallbackPeakWindow;
    if (messages && messages.length >= 3) {
      const hourCounts = {};
      let total = 0;
      
      for (const msg of messages) {
        if (msg.role !== 'user') continue;
        const d = new Date(msg.created_at);
        const hour = d.getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
        total += 1;
      }
      
      let peakHour = null;
      let peakCount = 0;
      
      Object.entries(hourCounts).forEach(([hourStr, count]) => {
        const h = Number(hourStr);
        if (count > peakCount) {
          peakCount = count;
          peakHour = h;
        }
      });
      
      if (peakHour !== null && total >= 3) {
        const pct = Math.round((peakCount / total) * 100);
        const formatHour = (h) => {
          const suffix = h >= 12 ? 'PM' : 'AM';
          const hour12 = ((h + 11) % 12) + 1;
          return `${hour12}${suffix}`;
        };
        
        peakWindow = {
          label: `${formatHour(peakHour)} is when you most often reach for TRACE (${pct}% of your activity).`,
          startHour: peakHour,
          endHour: (peakHour + 1) % 24,
          percentage: pct,
        };
      }
    }
    
    // Calculate Most Helpful Activity
    let mostHelpfulActivity = fallbackActivity;
    if (activityLogs.length >= 2) {
      const counts = {};
      let total = 0;
      
      for (const log of activityLogs) {
        const type = log.activity_type;
        counts[type] = (counts[type] || 0) + 1;
        total += 1;
      }
      
      let topActivity = null;
      let topCount = 0;
      
      Object.entries(counts).forEach(([name, count]) => {
        if (count > topCount) {
          topCount = count;
          topActivity = name;
        }
      });
      
      if (topActivity) {
        const pct = Math.round((topCount / total) * 100);
        mostHelpfulActivity = {
          label: `You reach for ${topActivity} about ${pct}% of the time when you use TRACE. That says something about what your nervous system trusts.`,
          topActivity,
          percentage: pct,
        };
      }
    }
    
    // Calculate confidence levels based on sample sizes
    const messageSampleSize = messages?.filter(m => m.role === 'user').length || 0;
    const activitySampleSize = activityLogs.length;
    
    function getConfidence(sampleSize, thresholds = { high: 10, medium: 7, low: 4 }) {
      if (sampleSize >= thresholds.high) return 'high';
      if (sampleSize >= thresholds.medium) return 'medium';
      if (sampleSize >= thresholds.low) return 'low';
      return 'insufficient';
    }
    
    // Apply sample size gates - only include patterns that meet minimum thresholds
    // Return null fields with confidence="insufficient" when thresholds fail
    let finalPeakWindow;
    let finalMostHelpfulActivity;
    
    // Peak Window: Require 4+ messages (low threshold)
    if (peakWindow.startHour !== null && messageSampleSize >= 4) {
      finalPeakWindow = {
        ...peakWindow,
        confidence: getConfidence(messageSampleSize, { high: 10, medium: 7, low: 4 }),
        sampleSize: messageSampleSize
      };
    } else {
      // Explicitly mark as insufficient so downstream filters work
      finalPeakWindow = {
        label: null,
        startHour: null,
        endHour: null,
        percentage: null,
        confidence: 'insufficient',
        sampleSize: messageSampleSize
      };
    }
    
    // Most Helpful Activity: Require 2+ uses of the top activity
    if (mostHelpfulActivity.topActivity) {
      const topCount = activityLogs.filter(a => a.activity_type === mostHelpfulActivity.topActivity).length;
      if (topCount >= 2) {
        finalMostHelpfulActivity = {
          ...mostHelpfulActivity,
          confidence: getConfidence(topCount, { high: 5, medium: 3, low: 2 }),
          count: topCount,
          sampleSize: activitySampleSize
        };
      } else {
        finalMostHelpfulActivity = {
          label: null,
          topActivity: null,
          percentage: null,
          confidence: 'insufficient',
          count: topCount,
          sampleSize: activitySampleSize
        };
      }
    } else {
      finalMostHelpfulActivity = {
        label: null,
        topActivity: null,
        percentage: null,
        confidence: 'insufficient',
        count: 0,
        sampleSize: activitySampleSize
      };
    }
    
    const lastCalculatedAt = new Date().toISOString();
    
    console.log('📊 [PATTERNS INSIGHTS] Result:', { 
      peakWindow: finalPeakWindow, 
      mostHelpfulActivity: finalMostHelpfulActivity, 
      sampleSize: activityLogs.length,
      messageSampleSize,
      lastCalculatedAt
    });
    
    return res.json({
      peakWindow: finalPeakWindow,
      mostHelpfulActivity: finalMostHelpfulActivity,
      sampleSize: activityLogs.length,
      messageSampleSize,
      lastCalculatedAt,
    });
    
  } catch (err) {
    console.error('📊 [PATTERNS INSIGHTS] Unexpected error:', err);
    return res.json({
      peakWindow: fallbackPeakWindow,
      mostHelpfulActivity: fallbackActivity,
      sampleSize: 0
    });
  }
});

// POST /api/activity-log - Log a completed activity (legacy endpoint)
app.post('/api/activity-log', async (req, res) => {
  try {
    const { userId, deviceId, activityType, durationSeconds, metadata } = req.body;
    
    if (!activityType) {
      return res.status(400).json({ error: 'activityType is required' });
    }
    
    if (!userId && !deviceId) {
      return res.status(400).json({ error: 'userId or deviceId is required' });
    }
    
    if (!pool) {
      console.log('📝 [ACTIVITY LOG] No database pool configured');
      return res.json({ ok: true, logged: null, note: 'No database configured' });
    }
    
    // Convert durationSeconds to integer (database column is integer type)
    const durationInt = durationSeconds != null ? Math.round(durationSeconds) : null;
    
    console.log('📝 [ACTIVITY LOG] Logging:', { userId, deviceId, activityType, durationSeconds: durationInt });
    
    const result = await pool.query(
      `INSERT INTO activity_logs (user_id, device_id, activity_type, duration_seconds, metadata)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, completed_at`,
      [userId || null, deviceId || null, activityType, durationInt, JSON.stringify(metadata || {})]
    );
    
    console.log('📝 [ACTIVITY LOG] Success:', result.rows?.[0]);
    
    // Mark activity for post-completion reflection
    const reflectionId = userId || deviceId;
    if (pool && reflectionId && activityType) {
      await markActivityCompletedForReflection(
        pool,
        reflectionId,
        activityType,
        activityType
      );
    }
    
    return res.json({ ok: true, logged: result.rows?.[0] });
  } catch (err) {
    console.error('📝 [ACTIVITY LOG] Error:', err);
    return res.status(500).json({ error: 'Failed to log activity' });
  }
});

// POST /api/journal/log - Log a journal entry to Supabase
app.post('/api/journal/log', async (req, res) => {
  try {
    const { userId, deviceId, content, mood, createdAt } = req.body;
    
    console.log('📓 [JOURNAL/LOG] Request received:', { userId, mood, contentLength: content?.length, createdAt });
    
    if (!content) {
      return res.status(400).json({ success: false, error: 'content is required' });
    }
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required for journal entries' });
    }
    
    if (!supabaseServer) {
      console.log('📓 [JOURNAL/LOG] No Supabase configured');
      return res.json({ success: true, entryId: null, note: 'No Supabase configured' });
    }
    
    // Generate UUID on server side since table may not have default
    const entryId = crypto.randomUUID();
    
    const { data, error } = await supabaseServer
      .from('journal_entries')
      .insert({
        id: entryId,
        user_id: userId,
        content: content,
        mood: mood || null,
        created_at: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('📓 [JOURNAL/LOG] Supabase error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    
    const finalEntryId = data?.id || entryId;
    console.log('📓 [JOURNAL/LOG] Success - entryId:', finalEntryId);
    
    // Background: Summarize journal to memory (don't wait)
    if (openai && supabaseServer && content.length >= 50) {
      const entryDate = createdAt ? new Date(createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      summarizeJournalToMemory(openai, supabaseServer, userId, content, finalEntryId, entryDate)
        .catch(err => console.error('📓 [JOURNAL/LOG] Background memory summarization failed:', err));
    }
    
    return res.json({ success: true, entryId: finalEntryId });
  } catch (err) {
    console.error('📓 [JOURNAL/LOG] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to log journal entry' });
  }
});

// GET /api/journal/entries - Fetch journal entries for a user
app.get('/api/journal/entries', async (req, res) => {
  try {
    const { userId, limit = 100 } = req.query;
    
    console.log('📓 [JOURNAL/ENTRIES] Request received:', { userId, limit });
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    
    // Validate UUID
    const validation = validateUserId(userId, null);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }
    
    if (!supabaseServer) {
      console.log('📓 [JOURNAL/ENTRIES] No Supabase configured');
      return res.json({ success: true, entries: [], note: 'No Supabase configured' });
    }
    
    const { data, error } = await supabaseServer
      .from('journal_entries')
      .select('id, content, mood, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit) || 100);
    
    if (error) {
      console.error('📓 [JOURNAL/ENTRIES] Supabase error:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    
    console.log('📓 [JOURNAL/ENTRIES] Found', data?.length || 0, 'entries');
    
    // Transform to match mobile Entry interface
    const entries = (data || []).map(entry => ({
      id: entry.id,
      type: 'journal',
      group: 'notes',
      title: entry.mood ? `Feeling ${entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)}` : 'Journal Entry',
      preview: entry.content?.slice(0, 100) || '',
      content: entry.content,
      createdAt: entry.created_at,
      meta: {
        mood: entry.mood || null,
      }
    }));
    
    return res.json({ success: true, entries });
  } catch (err) {
    console.error('📓 [JOURNAL/ENTRIES] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch journal entries' });
  }
});

// POST /api/activity/log - Log a completed activity (new endpoint with proper response)
app.post('/api/activity/log', async (req, res) => {
  try {
    const { userId, deviceId, activityType, durationSeconds, completedAt, metadata, meta } = req.body;
    
    // Accept either 'metadata' or 'meta' field for flexibility
    const activityMeta = metadata || meta || {};
    
    console.log('📝 [ACTIVITY/LOG] Request received:', { 
      userId, deviceId, activityType, durationSeconds, completedAt,
      dreamscapeTrackId: activityMeta.dreamscapeTrackId,
      selectionMode: activityMeta.selectionMode,
      selectionSource: activityMeta.selectionSource
    });
    
    if (!activityType) {
      return res.status(400).json({ success: false, error: 'activityType is required' });
    }
    
    // Validate Dreamscape-specific metadata if present
    if (activityType === 'dreamscape' && activityMeta.dreamscapeTrackId) {
      const validTrackIds = ['dreamscape_default', 'dreamscape_footsteps'];
      if (!validTrackIds.includes(activityMeta.dreamscapeTrackId)) {
        console.warn(`[ACTIVITY/LOG] Invalid dreamscapeTrackId: ${activityMeta.dreamscapeTrackId}, using default`);
        activityMeta.dreamscapeTrackId = 'dreamscape_default';
      }
    }
    
    if (activityMeta.selectionMode) {
      const validModes = ['random', 'fixed'];
      if (!validModes.includes(activityMeta.selectionMode)) {
        console.warn(`[ACTIVITY/LOG] Invalid selectionMode: ${activityMeta.selectionMode}`);
      }
    }
    
    if (activityMeta.selectionSource) {
      const validSources = ['activities', 'chat_offered', 'user_requested'];
      if (!validSources.includes(activityMeta.selectionSource)) {
        console.warn(`[ACTIVITY/LOG] Invalid selectionSource: ${activityMeta.selectionSource}`);
      }
    }
    
    if (!userId && !deviceId) {
      return res.status(400).json({ success: false, error: 'userId or deviceId is required' });
    }
    
    if (!pool) {
      console.log('📝 [ACTIVITY/LOG] No database pool configured');
      return res.json({ success: true, activityId: null, note: 'No database configured' });
    }
    
    // Convert durationSeconds to integer (database column is integer type)
    const durationInt = durationSeconds != null ? Math.round(durationSeconds) : null;
    
    const result = await pool.query(
      `INSERT INTO activity_logs (user_id, device_id, activity_type, duration_seconds, completed_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        userId || null, 
        deviceId || null, 
        activityType, 
        durationInt, 
        completedAt ? new Date(completedAt) : new Date(),
        JSON.stringify(activityMeta)
      ]
    );
    
    const activityId = result.rows?.[0]?.id;
    console.log('📝 [ACTIVITY/LOG] Success - activityId:', activityId);
    
    return res.json({ success: true, activityId });
  } catch (err) {
    console.error('📝 [ACTIVITY/LOG] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to log activity' });
  }
});

// GET /api/dreamscape/history - Get user's most recent Dreamscape track preference
app.get('/api/dreamscape/history', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ success: false, error: 'userId is required' });
    }
    
    if (!pool) {
      return res.json({ success: true, lastTrack: null, daysAgo: null });
    }
    
    // Query for the most recent Dreamscape activity with a valid track ID
    const result = await pool.query(
      `SELECT 
        metadata->>'dreamscapeTrackId' as last_track_id,
        completed_at,
        EXTRACT(DAY FROM NOW() - completed_at) as days_ago
      FROM activity_logs
      WHERE user_id = $1 
        AND activity_type = 'dreamscape'
        AND metadata->>'dreamscapeTrackId' IS NOT NULL
      ORDER BY completed_at DESC
      LIMIT 1`,
      [userId]
    );
    
    if (!result.rows || result.rows.length === 0) {
      console.log('🌙 [DREAMSCAPE/HISTORY] No previous Dreamscape sessions for user');
      return res.json({ success: true, lastTrack: null, daysAgo: null });
    }
    
    const { last_track_id, completed_at, days_ago } = result.rows[0];
    const daysAgoNum = Math.floor(parseFloat(days_ago) || 0);
    
    // Only return history if within 14 days (current, not creepy)
    if (daysAgoNum > 14) {
      console.log('🌙 [DREAMSCAPE/HISTORY] Last session too old:', daysAgoNum, 'days ago');
      return res.json({ success: true, lastTrack: null, daysAgo: null, note: 'Session too old (>14 days)' });
    }
    
    console.log('🌙 [DREAMSCAPE/HISTORY] Found recent session:', last_track_id, daysAgoNum, 'days ago');
    return res.json({ 
      success: true, 
      lastTrack: last_track_id,
      daysAgo: daysAgoNum,
      completedAt: completed_at
    });
  } catch (err) {
    console.error('🌙 [DREAMSCAPE/HISTORY] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch Dreamscape history' });
  }
});

// ---- PATTERNS INSIGHTS HELPERS ----
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getWeekdayIndex(dateLike) {
  const d = new Date(dateLike);
  return d.getDay(); // 0–6
}

const STRESS_MOODS = ["overwhelmed", "anxious", "stressed", "fried", "burned_out", "exhausted", "drained"];
const WORK_KEYWORDS = ["work", "shift", "manager", "boss", "hr", "clinic", "charting", "meeting", "deadline"];
const SOFT_MOODS = ["calm", "okay", "relieved", "lighter", "peaceful", "content", "settled"];
// Relief moods for emotional load trend calculation (opposite of stress)
const RELIEF_MOODS = ["calm", "peaceful", "content", "relieved", "lighter", "settled", "rested", "okay"];

function containsAnyKeyword(text, keywords) {
  const lower = (text || "").toLowerCase();
  return keywords.some(k => lower.includes(k));
}

function getTimeOfDayRange(hour) {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night"; // 11pm-5:59am
}

// Confidence tier helper for Peak Window (30-44% = low, 45-59% = med, 60%+ = high)
function getPeakWindowConfidence(percentage) {
  if (percentage >= 60) return "high";
  if (percentage >= 45) return "medium";
  if (percentage >= 30) return "low";
  return "emerging";
}

// Confidence tier helper for Stress Echoes (2-3 = soft, 4-5 = clear, 6+ = strong)
// Note: With time-decay weighting, these thresholds effectively require:
// - "soft": 2+ recent entries (or more older entries to compensate for lower weights)
// - "clear": 4+ recent entries
// - "strong": 6+ recent entries
// This is intentional: confidence should reflect recent patterns, not just historical totals
function getStressEchoesConfidence(repeatCount) {
  if (repeatCount >= 6) return "strong";
  if (repeatCount >= 4) return "clear";
  if (repeatCount >= 2) return "soft";
  return "emerging";
}

// Time-decay weighting: recent data matters more than older data
// This week = 1.0, last week = 0.7, 2 weeks ago = 0.4, older = 0.2
function weekWeight(weeksAgo) {
  if (weeksAgo === 0) return 1.0;
  if (weeksAgo === 1) return 0.7;
  if (weeksAgo === 2) return 0.4;
  return 0.2;
}

// Calculate how many weeks ago a date is from now
function getWeeksAgo(dateLike) {
  const now = new Date();
  const date = new Date(dateLike);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return Math.floor(diffDays / 7);
}

// Map mood strings to numeric "heaviness" scores for comparison
// Lower = lighter/calmer, Higher = heavier/more distressed
function getMoodScore(mood) {
  const m = (mood || "").toLowerCase();
  if (SOFT_MOODS.includes(m)) return 1;  // calm, okay, peaceful, etc.
  if (STRESS_MOODS.includes(m)) return 3; // overwhelmed, anxious, stressed, etc.
  return 2; // neutral/unknown
}

// Compute "Last Hour" analytics for the Full Patterns page
// Returns: checkinsLastHour, checkinsToday, comparisonLabel
// userTimezone: IANA timezone string (e.g. 'America/Los_Angeles') for accurate "today" calculation
async function computeLastHourAnalytics(supabase, userId, userTimezone = 'UTC') {
  const result = {
    checkinsLastHour: 0,
    checkinsToday: 0,
    comparisonLabel: null,
    comparisonScoreDiff: null,
  };
  
  if (!supabase || !userId) return result;
  
  const now = DateTime.now();
  const oneHourAgo = now.minus({ hours: 1 });
  
  // Use user's timezone for "start of today" calculation
  const userNow = now.setZone(userTimezone);
  const startOfToday = userNow.startOf('day').toUTC();
  
  // Yesterday's same hour window for comparison (in user's timezone)
  const yesterdayEnd = now.minus({ days: 1 });
  const yesterdayStart = yesterdayEnd.minus({ hours: 1 });
  
  try {
    // Query journal entries from the last 48 hours for efficiency
    const since48h = now.minus({ hours: 48 });
    const { data: journals, error } = await supabase
      .from('journal_entries')
      .select('id, mood, created_at')
      .eq('user_id', userId)
      .gte('created_at', since48h.toISO())
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[LAST HOUR ANALYTICS] Journal query error:', error);
      return result;
    }
    
    if (!journals || journals.length === 0) return result;
    
    // Categorize entries into time windows
    const lastHourEntries = [];
    const todayEntries = [];
    const yesterdayHourEntries = [];
    
    for (const j of journals) {
      const ts = DateTime.fromISO(j.created_at);
      
      if (ts >= oneHourAgo) {
        lastHourEntries.push(j);
      }
      if (ts >= startOfToday) {
        todayEntries.push(j);
      }
      if (ts >= yesterdayStart && ts < yesterdayEnd) {
        yesterdayHourEntries.push(j);
      }
    }
    
    result.checkinsLastHour = lastHourEntries.length;
    result.checkinsToday = todayEntries.length;
    
    // Compute comparison if we have enough data in both windows
    if (lastHourEntries.length >= 1 && yesterdayHourEntries.length >= 1) {
      const lastHourAvg = lastHourEntries.reduce((sum, j) => sum + getMoodScore(j.mood), 0) / lastHourEntries.length;
      const yesterdayAvg = yesterdayHourEntries.reduce((sum, j) => sum + getMoodScore(j.mood), 0) / yesterdayHourEntries.length;
      
      const diff = lastHourAvg - yesterdayAvg;
      result.comparisonScoreDiff = Math.round(diff * 100) / 100;
      
      if (diff >= 0.3) {
        result.comparisonLabel = 'heavier';
      } else if (diff <= -0.3) {
        result.comparisonLabel = 'lighter';
      } else {
        result.comparisonLabel = 'similar';
      }
    }
    
    return result;
  } catch (err) {
    console.error('[LAST HOUR ANALYTICS] Error:', err);
    return result;
  }
}

// ============================================
// STUDIO INSIGHTS - Advanced Analytics
// ============================================

// Helper: Get user subscription tier from database
async function getUserSubscriptionTier(supabase, userId) {
  if (!supabase || !userId) return 'free';
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('plan_status')
      .eq('user_id', userId)
      .single();
    
    if (error || !data) {
      console.log('[STUDIO] Could not fetch user tier, defaulting to free');
      return 'free';
    }
    
    const plan = (data.plan_status || '').toLowerCase();
    // Check for studio tier (could be 'studio', 'premium', etc.)
    if (plan === 'studio' || plan === 'premium') {
      return 'studio';
    }
    return 'free';
  } catch (err) {
    console.error('[STUDIO] Error fetching subscription tier:', err);
    return 'free';
  }
}

// 1. Rhythm Consistency: Which days does the user check in most consistently?
function computeRhythmConsistency(activityLogs = [], journals = []) {
  const result = {
    anchorDays: [],
    consistencyScore: null,
    label: 'emerging',
  };
  
  // Combine all check-ins (activities + journals)
  const allCheckins = [];
  for (const log of activityLogs) {
    allCheckins.push({ ts: log.completed_at || log.created_at });
  }
  for (const j of journals) {
    allCheckins.push({ ts: j.created_at });
  }
  
  // Need minimum 7 check-ins to compute meaningful rhythm
  if (allCheckins.length < 7) {
    return result;
  }
  
  // Count check-ins per day with time-decay weighting
  const dayWeights = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
  let totalWeight = 0;
  
  for (const c of allCheckins) {
    const dayIndex = new Date(c.ts).getDay();
    const weeksAgo = getWeeksAgo(c.ts);
    const weight = weekWeight(weeksAgo);
    dayWeights[dayIndex] += weight;
    totalWeight += weight;
  }
  
  if (totalWeight < 5) {
    return result;
  }
  
  // Find anchor day(s) - days with significantly more check-ins
  const avgPerDay = totalWeight / 7;
  const anchorThreshold = avgPerDay * 1.3; // 30% above average
  
  const anchorDays = [];
  let topDayWeight = 0;
  
  for (let i = 0; i < 7; i++) {
    if (dayWeights[i] >= anchorThreshold) {
      anchorDays.push(i);
    }
    if (dayWeights[i] > topDayWeight) {
      topDayWeight = dayWeights[i];
    }
  }
  
  // Consistency score: how concentrated are check-ins on anchor days?
  const consistencyScore = topDayWeight / totalWeight;
  
  // Determine label based on consistency
  let label = 'emerging';
  if (consistencyScore >= 0.5) {
    label = 'strong';
  } else if (consistencyScore >= 0.3) {
    label = 'clear';
  } else if (consistencyScore >= 0.2) {
    label = 'soft';
  }
  
  return {
    anchorDays: anchorDays.length > 0 ? anchorDays : [],
    consistencyScore: Math.round(consistencyScore * 100) / 100,
    label,
  };
}

// 2. Response Time: How quickly does user reach for TRACE after heavy moments?
async function computeResponseTime(supabase, userId, journals = []) {
  const result = {
    avgMinutesAfterHeavy: null,
    label: 'emerging',
  };
  
  if (!supabase || !userId) return result;
  
  // Find "heavy" journal entries (stressed, overwhelmed, etc.)
  const heavyEntries = journals.filter(j => {
    const mood = (j.mood || '').toLowerCase();
    return STRESS_MOODS.includes(mood);
  });
  
  // Need at least 3 heavy entries
  if (heavyEntries.length < 3) {
    return result;
  }
  
  try {
    // For each heavy entry, find the next TRACE interaction
    const responseTimes = [];
    
    for (const heavy of heavyEntries) {
      const heavyTime = new Date(heavy.created_at);
      const windowEnd = new Date(heavyTime.getTime() + 24 * 60 * 60 * 1000); // 24h window
      
      // Check for activity logs after this heavy moment
      const { data: nextActivity } = await supabase
        .from('activity_logs')
        .select('completed_at')
        .eq('user_id', userId)
        .gt('completed_at', heavy.created_at)
        .lt('completed_at', windowEnd.toISOString())
        .order('completed_at', { ascending: true })
        .limit(1);
      
      if (nextActivity && nextActivity.length > 0) {
        const nextTime = new Date(nextActivity[0].completed_at);
        const diffMinutes = (nextTime - heavyTime) / (1000 * 60);
        if (diffMinutes > 0 && diffMinutes < 1440) { // Within 24 hours
          responseTimes.push(diffMinutes);
        }
      }
    }
    
    // Need at least 3 response time data points
    if (responseTimes.length < 3) {
      return result;
    }
    
    // Calculate average response time
    const avgMinutes = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    
    // Determine label based on sample size
    let label = 'emerging';
    if (responseTimes.length >= 8) {
      label = 'strong';
    } else if (responseTimes.length >= 5) {
      label = 'clear';
    } else if (responseTimes.length >= 3) {
      label = 'soft';
    }
    
    return {
      avgMinutesAfterHeavy: Math.round(avgMinutes * 10) / 10,
      label,
    };
  } catch (err) {
    console.error('[STUDIO] Response time error:', err);
    return result;
  }
}

// 3. Session Depth: Average conversation length with TRACE
async function computeSessionDepth(supabase, userId) {
  const result = {
    avgTurnsPerSession: null,
    style: null,
    label: 'emerging',
  };
  
  if (!supabase || !userId) return result;
  
  try {
    // Get chat messages from last 30 days
    const since = new Date();
    since.setDate(since.getDate() - 30);
    
    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('role, created_at')
      .eq('user_id', userId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true });
    
    if (error || !messages || messages.length < 6) {
      return result;
    }
    
    // Group messages into sessions (30min gap = new session)
    const sessions = [];
    let currentSession = [];
    let lastTime = null;
    
    for (const msg of messages) {
      const msgTime = new Date(msg.created_at);
      
      if (lastTime && (msgTime - lastTime) > 30 * 60 * 1000) {
        // New session
        if (currentSession.length > 0) {
          sessions.push(currentSession);
        }
        currentSession = [];
      }
      
      currentSession.push(msg);
      lastTime = msgTime;
    }
    
    if (currentSession.length > 0) {
      sessions.push(currentSession);
    }
    
    // Need at least 3 sessions
    if (sessions.length < 3) {
      return result;
    }
    
    // Calculate average turns per session
    const turnsPerSession = sessions.map(s => s.length);
    const avgTurns = turnsPerSession.reduce((a, b) => a + b, 0) / sessions.length;
    
    // Determine style
    let style = null;
    if (avgTurns <= 6) {
      style = 'quick';
    } else if (avgTurns <= 14) {
      style = 'balanced';
    } else {
      style = 'deep';
    }
    
    // Determine label based on sample size
    let label = 'emerging';
    if (sessions.length >= 10) {
      label = 'strong';
    } else if (sessions.length >= 6) {
      label = 'clear';
    } else if (sessions.length >= 3) {
      label = 'soft';
    }
    
    return {
      avgTurnsPerSession: Math.round(avgTurns * 10) / 10,
      style,
      label,
    };
  } catch (err) {
    console.error('[STUDIO] Session depth error:', err);
    return result;
  }
}

// 4. Emotional Range: Mood variety this week
function computeEmotionalRange(journals = []) {
  const result = {
    distinctMoodsThisWeek: null,
    range: null,
    label: 'emerging',
  };
  
  // Get journals from last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const recentJournals = journals.filter(j => new Date(j.created_at) >= oneWeekAgo);
  
  // Need at least 5 mood-tagged entries
  if (recentJournals.length < 5) {
    return result;
  }
  
  // Count distinct moods
  const moods = new Set();
  for (const j of recentJournals) {
    const mood = (j.mood || '').toLowerCase().trim();
    if (mood) {
      moods.add(mood);
    }
  }
  
  const distinctCount = moods.size;
  
  if (distinctCount < 1) {
    return result;
  }
  
  // Determine range
  let range = null;
  if (distinctCount <= 2) {
    range = 'narrow';
  } else if (distinctCount <= 4) {
    range = 'moderate';
  } else {
    range = 'wide';
  }
  
  // Determine label based on sample size
  let label = 'emerging';
  if (recentJournals.length >= 12) {
    label = 'strong';
  } else if (recentJournals.length >= 8) {
    label = 'clear';
  } else if (recentJournals.length >= 5) {
    label = 'soft';
  }
  
  return {
    distinctMoodsThisWeek: distinctCount,
    range,
    label,
  };
}

// 5. Activity Diversity: How many different tools does the user use?
function computeActivityDiversity(activityLogs = []) {
  const result = {
    distinctActivitiesThisWeek: null,
    anchorActivityLabel: null,
    label: 'emerging',
  };
  
  // Get activities from last 14 days (2 weeks) with time-decay
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  const recentLogs = activityLogs.filter(log => {
    const ts = new Date(log.completed_at || log.created_at);
    return ts >= twoWeeksAgo;
  });
  
  // Need at least 4 activities
  if (recentLogs.length < 4) {
    return result;
  }
  
  // Count activities with time-decay weighting
  const activityWeights = {};
  let totalWeight = 0;
  
  for (const log of recentLogs) {
    const type = log.activity_type;
    const weeksAgo = getWeeksAgo(log.completed_at || log.created_at);
    const weight = weekWeight(weeksAgo);
    activityWeights[type] = (activityWeights[type] || 0) + weight;
    totalWeight += weight;
  }
  
  const distinctActivities = Object.keys(activityWeights).length;
  
  // Find anchor activity (most used)
  let anchorActivity = null;
  let topWeight = 0;
  
  for (const [type, weight] of Object.entries(activityWeights)) {
    if (weight > topWeight) {
      topWeight = weight;
      anchorActivity = type;
    }
  }
  
  // Determine label based on sample size
  let label = 'emerging';
  if (recentLogs.length >= 12) {
    label = 'strong';
  } else if (recentLogs.length >= 8) {
    label = 'clear';
  } else if (recentLogs.length >= 4) {
    label = 'soft';
  }
  
  return {
    distinctActivitiesThisWeek: distinctActivities,
    anchorActivityLabel: anchorActivity,
    label,
  };
}

// Build complete studioInsights object (only for Studio tier users)
async function buildStudioInsights(supabase, userId, activityLogs, journals, crisisMode = false) {
  // In crisis mode, return null or all-emerging structure
  if (crisisMode) {
    return null; // Option A: Skip studioInsights in crisis mode
  }
  
  try {
    const rhythmConsistency = computeRhythmConsistency(activityLogs, journals);
    const responseTime = await computeResponseTime(supabase, userId, journals);
    const sessionDepth = await computeSessionDepth(supabase, userId);
    const emotionalRange = computeEmotionalRange(journals);
    const activityDiversity = computeActivityDiversity(activityLogs);
    
    return {
      rhythmConsistency,
      responseTime,
      sessionDepth,
      emotionalRange,
      activityDiversity,
    };
  } catch (err) {
    console.error('[STUDIO] Error building studio insights:', err);
    return null;
  }
}

function computeStressEchoes(journals = []) {
  if (!journals.length) {
    return {
      label: "As you journal more, I'll start noticing which days tend to echo the heaviest pressure.",
      topDayIndex: null,
      stressCount: 0,
      totalStressEntries: 0,
      confidence: "emerging",
    };
  }

  const stressByDay = {};
  const stressEntriesWithTime = [];
  let totalStress = 0;

  for (const j of journals) {
    const mood = (j.mood || "").toLowerCase();
    const content = j.content || "";

    const isStressMood = STRESS_MOODS.includes(mood);
    const mentionsOverwhelm = containsAnyKeyword(content, ["overwhelmed", "panic", "too much"]);
    const mentionsWork = containsAnyKeyword(content, WORK_KEYWORDS);

    if (isStressMood || mentionsOverwhelm || mentionsWork) {
      const date = new Date(j.created_at);
      const dayIndex = date.getDay();
      const hour = date.getHours();
      const weeksAgo = getWeeksAgo(j.created_at);
      const weight = weekWeight(weeksAgo);
      stressByDay[dayIndex] = (stressByDay[dayIndex] || 0) + weight;
      stressEntriesWithTime.push({ dayIndex, hour, weight });
      totalStress += weight;
    }
  }

  if (!totalStress) {
    return {
      label: "I haven't seen a repeating stress pattern yet. When it shows up, I'll reflect it back gently.",
      topDayIndex: null,
      stressCount: 0,
      totalStressEntries: 0,
      confidence: "emerging",
    };
  }

  let topDayIndex = null;
  let topCount = 0;

  Object.entries(stressByDay).forEach(([dayStr, count]) => {
    const idx = Number(dayStr);
    if (count > topCount) {
      topCount = count;
      topDayIndex = idx;
    }
  });

  const dayName = topDayIndex !== null ? WEEKDAY_NAMES[topDayIndex] : null;
  const pct = Math.round((topCount / totalStress) * 100);
  const confidence = getStressEchoesConfidence(topCount);

  // Analyze time-of-day pattern for the top day (using weighted counts)
  const entriesOnTopDay = stressEntriesWithTime.filter(e => e.dayIndex === topDayIndex);
  const timeRangeCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  let topDayWeightedTotal = 0;
  
  for (const entry of entriesOnTopDay) {
    const range = getTimeOfDayRange(entry.hour);
    timeRangeCounts[range] += entry.weight;
    topDayWeightedTotal += entry.weight;
  }

  let dominantTimeRange = null;
  let dominantTimeCount = 0;

  for (const [range, count] of Object.entries(timeRangeCounts)) {
    if (count > dominantTimeCount) {
      dominantTimeCount = count;
      dominantTimeRange = range;
    }
  }

  const timePct = topDayWeightedTotal > 0 ? Math.round((dominantTimeCount / topDayWeightedTotal) * 100) : 0;
  const hasTimePattern = timePct >= 60 && entriesOnTopDay.length >= 2;

  let label;
  
  // Apply confidence-tiered language per interpretive guidelines
  if (confidence === "strong") {
    // Strong signal (6+ repeating events)
    if (hasTimePattern && dominantTimeRange) {
      const dayTimeName = `${dayName} ${dominantTimeRange}s`;
      label = `Some moments seem to echo. Overwhelm has shown up a few times around ${dayTimeName}. That doesn't mean it will — just that those times may carry more weight for you. You're not weak for feeling it.`;
    } else {
      label = `Some moments seem to echo. Overwhelm has shown up a few times around ${dayName}s. That doesn't mean it will — just that those times may carry more weight for you. You're not weak for feeling it.`;
    }
  } else if (confidence === "clear") {
    // Clear signal (4-5 repeating events)
    if (hasTimePattern && dominantTimeRange) {
      const dayTimeName = `${dayName} ${dominantTimeRange}s`;
      label = `${dayTimeName} seem to echo the heaviest pressure, like the week arrives before you're fully ready.`;
    } else {
      label = `${dayName}s seem to echo the heaviest pressure, like the week arrives before you're fully ready.`;
    }
  } else if (confidence === "soft") {
    // Soft signal (2-3 repeating events)
    if (hasTimePattern && dominantTimeRange) {
      const dayTimeName = `${dayName} ${dominantTimeRange}s`;
      label = `There may be a small echo forming around ${dayTimeName}. I won't assume anything — I'll just keep watching with you.`;
    } else {
      label = `There may be a small echo forming around ${dayName}s. I won't assume anything — I'll just keep watching with you.`;
    }
  } else {
    // Emerging - not enough to say anything specific
    label = "Your stress patterns are still emerging. I'll keep watching gently — and we can adjust together.";
  }

  return {
    label,
    topDayIndex,
    stressCount: topCount,
    totalStressEntries: totalStress,
    confidence,
  };
}

function computeEnergyFlowByWeekday(activityLogs = []) {
  if (!activityLogs.length) {
    return {
      label: "As you use activities more, I'll start noticing which days your energy reaches for TRACE the most.",
      topDayIndex: null,
      percentage: null,
      totalActivities: 0,
    };
  }

  const countsByDay = {};
  let total = 0;

  for (const log of activityLogs) {
    const dayIndex = getWeekdayIndex(log.completed_at || log.created_at);
    const weeksAgo = getWeeksAgo(log.completed_at || log.created_at);
    const weight = weekWeight(weeksAgo);
    countsByDay[dayIndex] = (countsByDay[dayIndex] || 0) + weight;
    total += weight;
  }

  let topDayIndex = null;
  let topCount = 0;

  Object.entries(countsByDay).forEach(([dayStr, count]) => {
    const idx = Number(dayStr);
    if (count > topCount) {
      topCount = count;
      topDayIndex = idx;
    }
  });

  const dayName = topDayIndex !== null ? WEEKDAY_NAMES[topDayIndex] : null;
  const pct = total ? Math.round((topCount / total) * 100) : null;

  let label;
  if (!dayName) {
    label = "I'm still learning your weekly rhythm. Over time I'll start to see which days your energy reaches for TRACE most often.";
  } else if (topDayIndex === 1) { // Monday
    label = `Your energy seems to reach for TRACE most on Mondays — about ${pct}% of your activities land there. That says something about how you meet the start of the week.`;
  } else if (topDayIndex === 3) { // Wednesday
    label = `Midweek — especially Wednesdays — is when you most often lean on TRACE (${pct}% of your activities). The middle of the week seems to be where a lot moves for you.`;
  } else {
    label = `${dayName} is when you most often reach for TRACE — about ${pct}% of your activities. That day seems to carry a special weight or rhythm for you.`;
  }

  return {
    label,
    topDayIndex,
    percentage: pct,
    totalActivities: total,
  };
}

function computeSofteningDay(journals = []) {
  if (!journals.length) {
    return {
      label: "As more calm moments show up in your journal, I'll notice where in the week things tend to soften a little.",
      topDayIndex: null,
      percentage: null,
      totalSoftEntries: 0,
      confidence: "emerging",
    };
  }

  const softByDay = {};
  const softEntriesWithTime = [];
  let totalSoft = 0;

  for (const j of journals) {
    const mood = (j.mood || "").toLowerCase();
    if (!SOFT_MOODS.includes(mood)) continue;

    const date = new Date(j.created_at);
    const dayIndex = date.getDay();
    const hour = date.getHours();
    const weeksAgo = getWeeksAgo(j.created_at);
    const weight = weekWeight(weeksAgo);
    softByDay[dayIndex] = (softByDay[dayIndex] || 0) + weight;
    softEntriesWithTime.push({ dayIndex, hour, weight });
    totalSoft += weight;
  }

  if (!totalSoft) {
    return {
      label: "I haven't seen a clear softening pattern yet, but when those calmer days cluster, I'll reflect that back to you.",
      topDayIndex: null,
      percentage: null,
      totalSoftEntries: 0,
      confidence: "emerging",
    };
  }

  let topDayIndex = null;
  let topCount = 0;

  Object.entries(softByDay).forEach(([dayStr, count]) => {
    const idx = Number(dayStr);
    if (count > topCount) {
      topCount = count;
      topDayIndex = idx;
    }
  });

  const dayName = WEEKDAY_NAMES[topDayIndex];
  const pct = Math.round((topCount / totalSoft) * 100);
  
  // Confidence tier: 3+ weighted instances = strong, else mild
  // With time-decay weighting, this effectively requires 3+ recent entries
  // or more older entries to compensate for lower weights
  const confidence = topCount >= 3 ? "strong" : "mild";

  // Analyze time-of-day pattern for the top day (using weighted counts)
  const entriesOnTopDay = softEntriesWithTime.filter(e => e.dayIndex === topDayIndex);
  const timeRangeCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  let topDayWeightedTotal = 0;
  
  for (const entry of entriesOnTopDay) {
    const range = getTimeOfDayRange(entry.hour);
    timeRangeCounts[range] += entry.weight;
    topDayWeightedTotal += entry.weight;
  }

  let dominantTimeRange = null;
  let dominantTimeCount = 0;

  for (const [range, count] of Object.entries(timeRangeCounts)) {
    if (count > dominantTimeCount) {
      dominantTimeCount = count;
      dominantTimeRange = range;
    }
  }

  const timePct = topDayWeightedTotal > 0 ? Math.round((dominantTimeCount / topDayWeightedTotal) * 100) : 0;
  const hasTimePattern = timePct >= 60 && entriesOnTopDay.length >= 2;

  let label;
  
  // Apply confidence-tiered language per interpretive guidelines
  if (confidence === "strong") {
    // Strong signal (3+ instances)
    if (hasTimePattern && dominantTimeRange) {
      const dayTimeName = `${dayName} ${dominantTimeRange}s`;
      label = `Relief seems to visit you most often around ${dayTimeName}. You don't need to chase it — but it's worth knowing your body already has a doorway home.`;
    } else {
      label = `Relief seems to visit you most often around ${dayName}s. You don't need to chase it — but it's worth knowing your body already has a doorway home.`;
    }
  } else {
    // Mild signal (1-2 instances)
    if (hasTimePattern && dominantTimeRange) {
      const dayTimeName = `${dayName} ${dominantTimeRange}s`;
      label = `There may be a gentle leaning toward relief around ${dayTimeName}. If that ever changes, TRACE changes too.`;
    } else {
      label = `There may be a gentle leaning toward relief around ${dayName}s. If that ever changes, TRACE changes too.`;
    }
  }

  return {
    label,
    topDayIndex,
    percentage: pct,
    totalSoftEntries: totalSoft,
    confidence,
  };
}

// ---- WEEKLY MOOD TREND + CROSS-PATTERN + PREDICTIVE HINTS ----

// Per interpretive guidelines: require ≥20% difference for up/down, otherwise "stable"
function trendDirection(thisWeek, lastWeek) {
  // Handle edge cases with small numbers
  if (thisWeek === 0 && lastWeek === 0) return "stable";
  
  // Edge case: if lastWeek is 0 but thisWeek has entries, that's a meaningful "up"
  if (lastWeek === 0 && thisWeek > 0) return "up";
  // Edge case: if thisWeek is 0 but lastWeek had entries, that's a meaningful "down"
  if (thisWeek === 0 && lastWeek > 0) return "down";
  
  // Calculate percentage change against baseline (lastWeek)
  const pctChange = Math.abs((thisWeek - lastWeek) / lastWeek) * 100;
  
  // Only report up/down if ≥20% difference
  if (pctChange < 20) return "stable";
  
  if (thisWeek > lastWeek) return "up";
  if (thisWeek < lastWeek) return "down";
  return "stable";
}

function buildTrendLabel(kind, thisWeek, lastWeek, dir) {
  if (kind === "calm") {
    if (dir === "up") {
      return `↑ More calm or "okay" check-ins than last week (${thisWeek} vs ${lastWeek}). That matters.`;
    }
    if (dir === "down") {
      return `↓ Fewer calm moments than last week (${thisWeek} vs ${lastWeek}). That doesn't mean you're failing — just that this week has been heavier.`;
    }
    return `↔ About the same number of calm or "okay" moments as last week (${thisWeek}). Steady doesn't have to mean perfect.`;
  }

  // kind === "stress"
  if (dir === "up") {
    return `↑ More overwhelmed or stressed entries than last week (${thisWeek} vs ${lastWeek}). No judgment — it just means your system has been carrying more.`;
  }
  if (dir === "down") {
    return `↓ Fewer overwhelmed or stressed entries than last week (${thisWeek} vs ${lastWeek}). Even tiny shifts like that are worth noticing.`;
  }
  return `↔ About the same number of heavy-feeling entries as last week (${thisWeek}). This might be a season of holding a lot.`;
}

function computeWeeklyMoodTrend(journals = []) {
  if (!journals.length) {
    return {
      calm: {
        thisWeek: 0,
        lastWeek: 0,
        direction: "flat",
        label: "As more calm and heavy days show up in your journal, I'll start reflecting how this week compares to the last.",
      },
      stress: {
        thisWeek: 0,
        lastWeek: 0,
        direction: "flat",
        label: "Once there's a little more to go on, I'll gently name how your heavier entries are shifting week to week.",
      },
    };
  }

  const now = new Date();
  const startThisWeek = new Date(now);
  startThisWeek.setDate(now.getDate() - 7);
  const startLastWeek = new Date(now);
  startLastWeek.setDate(now.getDate() - 14);

  let calmThisWeek = 0;
  let calmLastWeek = 0;
  let stressThisWeek = 0;
  let stressLastWeek = 0;

  for (const j of journals) {
    const ts = new Date(j.created_at);
    const mood = (j.mood || "").toLowerCase();
    const content = j.content || "";

    const isCalm = SOFT_MOODS.includes(mood);
    const isStress =
      STRESS_MOODS.includes(mood) ||
      content.toLowerCase().includes("overwhelmed") ||
      content.toLowerCase().includes("too much") ||
      content.toLowerCase().includes("burned out");

    const inThisWeek = ts >= startThisWeek;
    const inLastWeek = ts < startThisWeek && ts >= startLastWeek;

    if (isCalm) {
      if (inThisWeek) calmThisWeek++;
      else if (inLastWeek) calmLastWeek++;
    }

    if (isStress) {
      if (inThisWeek) stressThisWeek++;
      else if (inLastWeek) stressLastWeek++;
    }
  }

  const calmDir = trendDirection(calmThisWeek, calmLastWeek);
  const stressDir = trendDirection(stressThisWeek, stressLastWeek);

  return {
    calm: {
      thisWeek: calmThisWeek,
      lastWeek: calmLastWeek,
      direction: calmDir,
      label: buildTrendLabel("calm", calmThisWeek, calmLastWeek, calmDir),
    },
    stress: {
      thisWeek: stressThisWeek,
      lastWeek: stressLastWeek,
      direction: stressDir,
      label: buildTrendLabel("stress", stressThisWeek, stressLastWeek, stressDir),
    },
  };
}

function buildCrossPatternHint(stressEchoes, energyFlow) {
  const stressDayIndex = stressEchoes?.topDayIndex;
  const energyDayIndex = energyFlow?.topDayIndex;

  if (stressDayIndex == null || energyDayIndex == null) {
    return "As more weeks unfold, I'll start noticing how your heavier days and your go-to supports interact.";
  }

  const stressDay = WEEKDAY_NAMES[stressDayIndex];
  const energyDay = WEEKDAY_NAMES[energyDayIndex];

  if (stressDayIndex === energyDayIndex) {
    return `When ${stressDay}s feel heavier, you also tend to reach for TRACE more often. It's like your system already knows that day needs extra support.`;
  }

  return `Your heavier entries tend to gather on ${stressDay}s, but you reach for TRACE most on ${energyDay}s. There might be room to bring a bit more support into those ${stressDay}s too.`;
}

function buildPredictiveHint(stressEchoes, energyFlow) {
  const today = new Date();
  const todayIndex = today.getDay(); // 0–6
  const tomorrowIndex = (todayIndex + 1) % 7;

  const stressDayIndex = stressEchoes?.topDayIndex ?? null;
  const energyDayIndex = energyFlow?.topDayIndex ?? null;

  // Only offer a hint if tomorrow is a known "heavier" or "high-activity" day
  if (stressDayIndex === tomorrowIndex) {
    const dayName = WEEKDAY_NAMES[tomorrowIndex];
    return `Based on the last few weeks, ${dayName}s tend to carry more weight for you. If tomorrow follows that rhythm, it might help to plan even one small anchor — a walk, a breath, or a few quiet minutes here.`;
  }

  if (energyDayIndex === tomorrowIndex) {
    const dayName = WEEKDAY_NAMES[tomorrowIndex];
    return `${dayName}s are when you most often lean on TRACE. If tomorrow fits that pattern, you might gently treat it as a day where you're allowed to need more support, not less.`;
  }

  return null;
}

// ============================================================================
// PATTERN PERSISTENCE - Never show empty data once patterns have been calculated
// ============================================================================

// In-memory pattern cache (persists across requests, cleared on server restart)
// This is the primary persistence layer to ensure patterns never show empty
const patternPersistence = new Map();

// File-based backup persistence (survives server restarts)
const fs = require('fs');
const PATTERNS_CACHE_FILE = '/tmp/trace_patterns_cache.json';

// Load file-based cache on startup
try {
  if (fs.existsSync(PATTERNS_CACHE_FILE)) {
    const fileData = JSON.parse(fs.readFileSync(PATTERNS_CACHE_FILE, 'utf8'));
    for (const [key, value] of Object.entries(fileData)) {
      patternPersistence.set(key, value);
    }
    console.log('📊 [PATTERNS CACHE] Loaded', patternPersistence.size, 'cached patterns from file');
  }
} catch (err) {
  console.warn('[PATTERNS CACHE] Could not load file cache:', err.message);
}

// Save file-based cache periodically
function savePatternCacheToFile() {
  try {
    const cacheObj = Object.fromEntries(patternPersistence);
    fs.writeFileSync(PATTERNS_CACHE_FILE, JSON.stringify(cacheObj, null, 2));
  } catch (err) {
    console.warn('[PATTERNS CACHE] Could not save file cache:', err.message);
  }
}

// Load cached patterns for a user from memory (fast) with file backup
async function loadCachedPatterns(userId) {
  if (!userId) return null;
  
  // Primary: Check in-memory cache
  const memCached = patternPersistence.get(userId);
  if (memCached) {
    return memCached;
  }
  
  // Fallback: Try Supabase if available
  if (supabaseServer) {
    try {
      const { data, error } = await supabaseServer
        .from('user_patterns_cache')
        .select('patterns_data')
        .eq('user_id', userId)
        .single();
      
      if (!error && data?.patterns_data) {
        // Store in memory for next time
        patternPersistence.set(userId, data.patterns_data);
        return data.patterns_data;
      }
    } catch (err) {
      // Table might not exist - that's okay, use memory cache
    }
  }
  
  return null;
}

// Save patterns to the cache, merging with existing values
async function saveCachedPatterns(userId, newPatterns) {
  if (!userId) return;
  
  try {
    const existing = patternPersistence.get(userId) || {};
    // Deep merge: keep existing values where new values are null/undefined
    const merged = mergePatterns(existing, newPatterns);
    
    // Save to in-memory cache (always works)
    patternPersistence.set(userId, merged);
    
    // Periodically save to file (non-blocking)
    if (patternPersistence.size % 5 === 0) {
      savePatternCacheToFile();
    }
    
    // Try to save to Supabase (optional, may fail if table doesn't exist)
    if (supabaseServer) {
      try {
        await supabaseServer
          .from('user_patterns_cache')
          .upsert({
            user_id: userId,
            patterns_data: merged,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id' });
      } catch (err) {
        // Table might not exist - that's okay
      }
    }
    
    console.log('📊 [PATTERNS CACHE] Saved patterns for user:', userId.slice(0, 8));
  } catch (err) {
    console.error('[PATTERNS CACHE] Exception saving:', err.message);
  }
}

// Merge patterns: prefer new non-null values, keep cached values for nulls
function mergePatterns(cached, current) {
  const merged = { ...cached };
  
  // List of fields that should be persisted
  const persistFields = [
    'peakWindowLabel', 'peakWindowStartRatio', 'peakWindowEndRatio',
    'stressEchoesLabel', 'reliefLabel', 'energyRhythmLabel',
    'mostHelpfulActivityLabel', 'mostHelpfulActivityCount',
    'crossPatternHint', 'predictiveHint', 'weeklyNarrative',
    'energyFrequencyBuckets', 'energyTidesGlance', 'emotionalRhythmBuckets', 'emotionalRhythmLabel',
    'peakWindow', 'mostHelpfulActivity', 'stressEchoes', 'energyFlow', 'softening'
  ];
  
  for (const field of persistFields) {
    const currentVal = current?.[field];
    const cachedVal = cached?.[field];
    
    // For objects (nested patterns), merge recursively
    if (typeof currentVal === 'object' && currentVal !== null && !Array.isArray(currentVal)) {
      merged[field] = mergePatternObject(cachedVal || {}, currentVal);
    } else if (currentVal !== null && currentVal !== undefined && currentVal !== '') {
      // Use new value if non-null
      merged[field] = currentVal;
    } else if (cachedVal !== null && cachedVal !== undefined && cachedVal !== '') {
      // Keep cached value if new value is null
      merged[field] = cachedVal;
    }
  }
  
  // Always update non-persisted fields with current values
  const nonPersistedFields = [
    'sampleSize', 'journalSampleSize', 'stillLearning', 
    'energyDayBuckets', 'totalSoftEntries', 'lastHourSummary',
    'weeklyMoodTrend', 'studioInsights'
  ];
  for (const field of nonPersistedFields) {
    if (current?.[field] !== undefined) {
      merged[field] = current[field];
    }
  }
  
  return merged;
}

// Merge nested pattern objects (e.g., peakWindow, stressEchoes)
function mergePatternObject(cached, current) {
  const merged = { ...cached };
  for (const key of Object.keys(current)) {
    const val = current[key];
    if (val !== null && val !== undefined && val !== '') {
      merged[key] = val;
    } else if (cached?.[key] !== null && cached?.[key] !== undefined) {
      merged[key] = cached[key];
    }
  }
  return merged;
}

// ============================================
// PRESENCE TREND: Baseline-aware presence comparison
// ============================================
function computePresenceTrend(activityLogs = [], journals = [], sampleSize = 0) {
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - 7);
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 14);
  
  let thisWeekCheckins = 0;
  let lastWeekCheckins = 0;
  
  // Count activity logs
  for (const log of activityLogs) {
    const ts = new Date(log.completed_at || log.created_at);
    if (ts >= thisWeekStart) {
      thisWeekCheckins++;
    } else if (ts >= lastWeekStart && ts < thisWeekStart) {
      lastWeekCheckins++;
    }
  }
  
  // Count journal entries
  for (const j of journals) {
    const ts = new Date(j.created_at);
    if (ts >= thisWeekStart) {
      thisWeekCheckins++;
    } else if (ts >= lastWeekStart && ts < thisWeekStart) {
      lastWeekCheckins++;
    }
  }
  
  // Minimum 3 total check-ins across both weeks
  if (thisWeekCheckins + lastWeekCheckins < 3) {
    return null;
  }
  
  // Determine direction
  let direction = 'stable';
  if (thisWeekCheckins === 0 && lastWeekCheckins === 0) {
    direction = 'stable';
  } else if (thisWeekCheckins >= lastWeekCheckins * 1.2) {
    direction = 'up';
  } else if (thisWeekCheckins <= lastWeekCheckins * 0.8) {
    direction = 'down';
  }
  
  // Build label (only if sampleSize >= 7)
  let label = null;
  if (sampleSize >= 7) {
    if (direction === 'up') {
      label = "You were a bit more present with TRACE this week than last.";
    } else if (direction === 'down') {
      label = "You checked in less with TRACE this week than you usually do.";
    } else {
      label = "Your check-ins this week were pretty similar to last week.";
    }
  }
  
  return {
    thisWeek: thisWeekCheckins,
    lastWeek: lastWeekCheckins,
    direction,
    label,
  };
}

// ============================================
// EMOTIONAL LOAD TREND: Heavier/lighter comparison
// ============================================
function computeEmotionalLoadTrend(journals = [], sampleSize = 0) {
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - 7);
  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(now.getDate() - 14);
  
  let thisWeekLoad = 0;
  let lastWeekLoad = 0;
  
  for (const j of journals) {
    const ts = new Date(j.created_at);
    const mood = (j.mood || '').toLowerCase();
    const content = (j.content || '').toLowerCase();
    
    // Calculate emotional load for this entry
    let load = 0;
    
    // Stress signals (+points)
    if (STRESS_MOODS.includes(mood)) load += 2;
    if (content.includes('overwhelm')) load += 1;
    if (content.includes('panic')) load += 2;
    if (content.includes('anxious') || content.includes('anxiety')) load += 1;
    if (content.includes('exhausted') || content.includes('drained')) load += 1;
    
    // Relief signals (-points)
    if (RELIEF_MOODS.includes(mood)) load -= 1;
    if (content.includes('breathing') || content.includes('breath')) load -= 1;
    if (content.includes('calm') || content.includes('peaceful')) load -= 1;
    
    if (ts >= thisWeekStart) {
      thisWeekLoad += load;
    } else if (ts >= lastWeekStart && ts < thisWeekStart) {
      lastWeekLoad += load;
    }
  }
  
  // If both weeks have no load, return null
  if (thisWeekLoad === 0 && lastWeekLoad === 0) {
    return null;
  }
  
  // Determine direction
  let direction = 'stable';
  const maxLoad = Math.max(Math.abs(thisWeekLoad), Math.abs(lastWeekLoad));
  if (maxLoad > 0) {
    if (thisWeekLoad >= lastWeekLoad * 1.2) {
      direction = 'up';
    } else if (thisWeekLoad <= lastWeekLoad * 0.8) {
      direction = 'down';
    }
  }
  
  // Build label (only if sampleSize >= 7 and there's actual load)
  let label = null;
  if (sampleSize >= 7 && maxLoad > 0) {
    if (direction === 'up') {
      label = "This week seemed to carry a little more emotional weight than last.";
    } else if (direction === 'down') {
      label = "This week felt a bit softer compared to the week before.";
    } else {
      label = "Your emotional load felt fairly similar to last week.";
    }
  }
  
  return {
    thisWeek: thisWeekLoad,
    lastWeek: lastWeekLoad,
    direction,
    label,
  };
}

// ============================================
// RELIEF SPOTLIGHT: What helped most this week
// ============================================
function computeReliefSpotlight(mostHelpfulActivityLabel, mostHelpfulActivityCount) {
  if (!mostHelpfulActivityLabel || mostHelpfulActivityCount <= 0) {
    return null;
  }
  
  let label;
  if (mostHelpfulActivityCount === 1) {
    label = `You reached for ${mostHelpfulActivityLabel} once this week when things felt heavy.`;
  } else if (mostHelpfulActivityCount >= 2 && mostHelpfulActivityCount <= 4) {
    label = `${mostHelpfulActivityLabel} showed up a few times this week as a place you reached for steadiness.`;
  } else {
    label = `${mostHelpfulActivityLabel} has become a steady go-to for you when things rise up.`;
  }
  
  return {
    activityLabel: mostHelpfulActivityLabel,
    count: mostHelpfulActivityCount,
    label,
  };
}

// POST /api/patterns/insights - Query activity_logs and journal_entries for insights
app.post('/api/patterns/insights', async (req, res) => {
  try {
    const { userId, deviceId, userTimezone } = req.body;
    
    // Validate userTimezone - use luxon to check if it's a valid IANA timezone
    let validatedTimezone = 'UTC';
    let tzAbbreviation = 'UTC';
    if (userTimezone) {
      const testDt = DateTime.now().setZone(userTimezone);
      if (testDt.isValid && testDt.zoneName) {
        validatedTimezone = userTimezone;
        tzAbbreviation = testDt.toFormat('ZZZZ') || testDt.offsetNameShort || 'UTC';
        console.log(`📊 [PATTERNS] Using user timezone: ${validatedTimezone} (${tzAbbreviation})`);
      } else {
        console.warn(`📊 [PATTERNS] Invalid timezone "${userTimezone}", defaulting to UTC`);
      }
    } else {
      console.log('📊 [PATTERNS] No userTimezone provided, defaulting to UTC');
    }
    
    // Helper: Convert UTC hour to local hour
    const utcHourToLocal = (utcHour) => {
      const utcDt = DateTime.utc().set({ hour: utcHour, minute: 0 });
      const localDt = utcDt.setZone(validatedTimezone);
      return localDt.hour;
    };
    
    // Helper: Format hour in user's local timezone with abbreviation
    const formatHourInTimezone = (utcHour) => {
      // Create a UTC datetime for today at the given hour
      const utcDt = DateTime.utc().set({ hour: utcHour, minute: 0 });
      // Convert to user's timezone
      const localDt = utcDt.setZone(validatedTimezone);
      // Format as "3:00 AM PST"
      const hourStr = localDt.toFormat('h:mm a');
      return `${hourStr} ${tzAbbreviation}`;
    };
    
    // Crisis Mode Override - per interpretive guidelines:
    // "If distress keywords appear in recent logs, TRACE must disable patterns language & predictions"
    // Now uses database-backed crisis state for consistency across server restarts
    if (userId) {
      let inCrisis = false;
      try {
        if (supabaseServer) {
          inCrisis = await isUserInCrisisWindow(supabaseServer, userId, 90);
        } else {
          // Fallback to in-memory state
          const memState = getCrisisState(userId);
          inCrisis = memState.active;
        }
      } catch (err) {
        console.error('[PATTERNS] Failed to check crisis state from DB:', err.message);
        const memState = getCrisisState(userId);
        inCrisis = memState.active;
      }
      
      if (inCrisis) {
        console.log('📊 [PATTERNS INSIGHTS POST] Crisis mode active for user, returning soft response');
        // Use tailored crisis copy per insight card type
        const crisisCore = "When things feel really intense, patterns can become blurry — and that's okay. Right now the most important thing is how you're feeling in this moment.";
        const crisisActivity = "Whatever you need right now is enough.";
        
        // PATTERN PERSISTENCE: Even in crisis mode, preserve cached peakWindow data
        // The UI can still show the time range while displaying softer messaging elsewhere
        const cachedPatterns = await loadCachedPatterns(userId);
        const cachedPeakWindow = cachedPatterns?.peakWindow || {};
        const cachedPeakLabel = cachedPatterns?.peakWindowLabel || null;
        const cachedPeakStartRatio = cachedPatterns?.peakWindowStartRatio || null;
        const cachedPeakEndRatio = cachedPatterns?.peakWindowEndRatio || null;
        
        return res.json({
          // Nested objects - softer crisis-specific messaging per card
          // Preserve cached peakWindow data - never show empty
          peakWindow: { 
            label: cachedPeakWindow.label || null, 
            startHour: cachedPeakWindow.startHour || null, 
            endHour: cachedPeakWindow.endHour || null, 
            confidence: "crisis" 
          },
          mostHelpfulActivity: { label: crisisActivity, count: 0 },
          stressEchoes: { label: crisisCore, topDayIndex: null, stressCount: 0, totalStressEntries: 0, confidence: "crisis" },
          energyFlow: { label: crisisCore, topDayIndex: null, percentage: null, totalActivities: 0 },
          softening: { label: crisisCore, topDayIndex: null, percentage: null, totalSoftEntries: 0, confidence: "crisis" },
          weeklyMoodTrend: {
            calm: { thisWeek: 0, lastWeek: 0, direction: "stable", label: crisisCore },
            stress: { thisWeek: 0, lastWeek: 0, direction: "stable", label: crisisCore },
          },
          crossPatternHint: null,
          predictiveHint: null,
          
          // Last Hour analytics - still populated in crisis mode
          lastHourSummary: {
            checkinsLastHour: 0,
            checkinsToday: 0,
            comparisonLabel: null, // Disable comparison language in crisis mode
          },
          
          // Studio Insights - disabled in crisis mode (no performance metrics)
          studioInsights: null,
          
          // Flattened fields - matching the exact mobile contract
          // Preserve cached peakWindow data - never show empty
          peakWindowLabel: cachedPeakLabel,
          peakWindowStartRatio: cachedPeakStartRatio,
          peakWindowEndRatio: cachedPeakEndRatio,
          energyDayBuckets: [0, 0, 0, 0, 0, 0, 0],
          stressEchoesLabel: crisisCore,
          reliefLabel: crisisCore,
          totalSoftEntries: 0,
          mostHelpfulActivityLabel: crisisActivity,
          mostHelpfulActivityCount: 0,
          energyRhythmLabel: crisisCore,
          // New trend fields - null in crisis mode
          presenceTrend: null,
          emotionalLoadTrend: null,
          reliefSpotlight: null,
          sampleSize: 0,
          journalSampleSize: 0,
          crisisMode: true,
        });
      }
    }
    
    const fallbackPeakWindow = {
      label: null,
      startHour: null,
      endHour: null,
      confidence: "emerging",
    };
    
    const fallbackActivity = {
      label: "Once you've tried a few activities, I'll start noticing which ones you return to the most.",
      count: 0,
    };
    
    const fallbackStressEchoes = {
      label: "As you journal more, I'll start noticing which days tend to echo the heaviest pressure.",
      topDayIndex: null,
      stressCount: 0,
      totalStressEntries: 0,
    };
    
    const fallbackEnergyFlow = {
      label: "As you use activities more, I'll start noticing which days your energy reaches for TRACE the most.",
      topDayIndex: null,
      percentage: null,
      totalActivities: 0,
    };
    
    const fallbackSoftening = {
      label: "As more calm moments show up in your journal, I'll notice where in the week things tend to soften a little.",
      topDayIndex: null,
      percentage: null,
      totalSoftEntries: 0,
    };
    
    if (!userId && !deviceId) {
      console.log('📊 [PATTERNS INSIGHTS POST] No userId or deviceId provided');
      return res.json({
        peakWindow: fallbackPeakWindow,
        mostHelpfulActivity: fallbackActivity,
        stressEchoes: fallbackStressEchoes,
        energyFlow: fallbackEnergyFlow,
        softening: fallbackSoftening,
        sampleSize: 0,
        journalSampleSize: 0,
      });
    }
    
    // Check cache first (5-minute TTL)
    const cacheKey = `patterns:${userId || deviceId}:${validatedTimezone}`;
    const cachedEntry = patternsCache.get(cacheKey);
    if (cachedEntry && (Date.now() - cachedEntry.timestamp) < PATTERNS_CACHE_TTL_MS) {
      console.log('📊 [PATTERNS] Returning cached response (age:', Math.round((Date.now() - cachedEntry.timestamp) / 1000), 's)');
      return res.json(cachedEntry.data);
    }
    
    // Look back 45 days for patterns
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - 45);
    
    // 1) Query activity_logs from Replit PostgreSQL
    let activityLogs = [];
    if (pool) {
      let query = `
        SELECT activity_type, completed_at, duration_seconds
        FROM activity_logs
        WHERE completed_at >= $1
      `;
      const params = [sinceDate.toISOString()];
      
      if (userId) {
        query += ` AND user_id = $${params.length + 1}`;
        params.push(userId);
      } else if (deviceId) {
        query += ` AND device_id = $${params.length + 1}`;
        params.push(deviceId);
      }
      
      query += ` ORDER BY completed_at DESC`;
      
      const result = await pool.query(query, params);
      activityLogs = result.rows || [];
    }
    
    console.log('📊 [PATTERNS INSIGHTS POST] Found', activityLogs.length, 'activity logs');
    
    // 2) Query journal_entries from Supabase
    let journals = [];
    if (supabaseServer && userId) {
      const { data: journalData, error: journalError } = await supabaseServer
        .from('journal_entries')
        .select('id, user_id, mood, content, created_at')
        .eq('user_id', userId)
        .gte('created_at', sinceDate.toISOString())
        .order('created_at', { ascending: false });
      
      if (journalError) {
        console.error('📊 [PATTERNS INSIGHTS POST] Journal query error:', journalError);
      } else {
        journals = journalData || [];
      }
    }
    
    console.log('📊 [PATTERNS INSIGHTS POST] Found', journals.length, 'journal entries');
    
    // MINIMUM DATA THRESHOLD: Return "still learning" for users with < 7 total data points
    // This prevents showing premature patterns that could mislead users
    const totalDataPoints = activityLogs.length + journals.length;
    if (totalDataPoints < MIN_DATA_THRESHOLD) {
      console.log(`📊 [PATTERNS] Insufficient data (${totalDataPoints} < ${MIN_DATA_THRESHOLD}), returning "still learning" response`);
      
      const stillLearningCore = "I'm still getting to know your rhythms. As you use TRACE more, patterns will start to emerge.";
      const lastCalculatedAtNow = new Date().toISOString();
      
      const stillLearningResponse = {
        // Per BACKEND_API.md 762-790: Include lastCalculatedAt on all patterns
        peakWindow: { label: null, startHour: null, endHour: null, confidence: "emerging", lastCalculatedAt: lastCalculatedAtNow, sampleSize: 0 },
        mostHelpfulActivity: { label: "Once you've tried a few more activities, I'll notice which ones you return to.", count: 0, lastCalculatedAt: lastCalculatedAtNow },
        stressEchoes: { label: stillLearningCore, topDayIndex: null, stressCount: 0, totalStressEntries: 0, confidence: "emerging", lastCalculatedAt: lastCalculatedAtNow, sampleSize: journals.length },
        energyFlow: { label: stillLearningCore, topDayIndex: null, percentage: null, totalActivities: activityLogs.length, lastCalculatedAt: lastCalculatedAtNow, sampleSize: activityLogs.length },
        softening: { label: stillLearningCore, topDayIndex: null, percentage: null, totalSoftEntries: 0, confidence: "emerging", lastCalculatedAt: lastCalculatedAtNow, sampleSize: journals.length },
        weeklyMoodTrend: {
          calm: { thisWeek: 0, lastWeek: 0, direction: "stable", label: stillLearningCore },
          stress: { thisWeek: 0, lastWeek: 0, direction: "stable", label: stillLearningCore },
        },
        crossPatternHint: null,
        predictiveHint: null,
        // Global lastCalculatedAt for the entire response
        lastCalculatedAt: lastCalculatedAtNow,
        lastHourSummary: { checkinsLastHour: 0, checkinsToday: 0, comparisonLabel: null },
        studioInsights: null,
        peakWindowLabel: null,
        peakWindowStartRatio: null,
        peakWindowEndRatio: null,
        energyDayBuckets: [0, 0, 0, 0, 0, 0, 0],
        stressEchoesLabel: stillLearningCore,
        reliefLabel: stillLearningCore,
        totalSoftEntries: 0,
        mostHelpfulActivityLabel: "Once you've tried a few more activities, I'll notice which ones you return to.",
        mostHelpfulActivityCount: 0,
        energyRhythmLabel: stillLearningCore,
        // New trend fields - null when still learning
        presenceTrend: null,
        emotionalLoadTrend: null,
        reliefSpotlight: null,
        
        sampleSize: activityLogs.length,
        journalSampleSize: journals.length,
        stillLearning: true,
      };
      
      return res.json(stillLearningResponse);
    }
    
    // Calculate Peak Window (hour with most activities) with confidence tiers
    // Per guidelines: ≥6 data points, ≥45-50% cluster in 2-3 hour window
    // Apply time-decay weighting: this week = 1.0, last week = 0.7, 2 weeks ago = 0.4, older = 0.2
    let peakWindow = fallbackPeakWindow;
    if (activityLogs.length >= 6) {
      const hourCounts = {};
      let totalWeighted = 0;
      for (const log of activityLogs) {
        const hour = new Date(log.completed_at).getHours();
        const weeksAgo = getWeeksAgo(log.completed_at);
        const weight = weekWeight(weeksAgo);
        hourCounts[hour] = (hourCounts[hour] || 0) + weight;
        totalWeighted += weight;
      }
      
      let peakHour = null;
      let peakCount = 0;
      Object.entries(hourCounts).forEach(([hour, count]) => {
        if (count > peakCount) {
          peakCount = count;
          peakHour = parseInt(hour);
        }
      });
      
      if (peakHour !== null) {
        // peakHour is in UTC - convert to local timezone for display
        const localStartHour = utcHourToLocal(peakHour);
        const localEndHour = utcHourToLocal((peakHour + 2) % 24);
        // Use timezone-aware formatting
        const timeRange = `${formatHourInTimezone(peakHour)} – ${formatHourInTimezone((peakHour + 2) % 24)}`;
        
        // Calculate percentage of activities in this 2-hour window (using weighted totals)
        const adjacentCount = peakCount + (hourCounts[(peakHour + 1) % 24] || 0);
        const windowPct = Math.round((adjacentCount / totalWeighted) * 100);
        const confidence = getPeakWindowConfidence(windowPct);
        
        // Peak window label should be time range ONLY (mobile displays directly in compact pill UI)
        peakWindow = {
          label: timeRange,
          startHour: localStartHour,
          endHour: localEndHour,
          confidence,
          timeRange,
        };
      }
    } else if (activityLogs.length >= 3) {
      // Not enough for confident pattern, but show emerging data
      // Still apply time-decay weighting for consistency
      const hourCounts = {};
      for (const log of activityLogs) {
        const hour = new Date(log.completed_at).getHours();
        const weeksAgo = getWeeksAgo(log.completed_at);
        const weight = weekWeight(weeksAgo);
        hourCounts[hour] = (hourCounts[hour] || 0) + weight;
      }
      
      let peakHour = null;
      let peakCount = 0;
      Object.entries(hourCounts).forEach(([hour, count]) => {
        if (count > peakCount) {
          peakCount = count;
          peakHour = parseInt(hour);
        }
      });
      
      if (peakHour !== null) {
        // Convert UTC hours to local timezone
        const localStartHour = utcHourToLocal(peakHour);
        const localEndHour = utcHourToLocal((peakHour + 2) % 24);
        // Use timezone-aware formatting
        const timeRange = `${formatHourInTimezone(peakHour)} – ${formatHourInTimezone((peakHour + 2) % 24)}`;
        
        // Peak window label should be time range ONLY (mobile displays directly in compact pill UI)
        peakWindow = {
          label: timeRange,
          startHour: localStartHour,
          endHour: localEndHour,
          confidence: "emerging",
          timeRange,
        };
      }
    }
    
    // Calculate Most Helpful Activity with time-decay weighting
    let mostHelpfulActivity = fallbackActivity;
    if (activityLogs.length >= 2) {
      const activityCounts = {};
      for (const log of activityLogs) {
        const type = log.activity_type;
        const weeksAgo = getWeeksAgo(log.completed_at || log.created_at);
        const weight = weekWeight(weeksAgo);
        activityCounts[type] = (activityCounts[type] || 0) + weight;
      }
      
      let topActivity = null;
      let topCount = 0;
      Object.entries(activityCounts).forEach(([name, count]) => {
        if (count > topCount) {
          topCount = count;
          topActivity = name;
        }
      });
      
      // Use weighted count threshold (2.0 is equivalent to 2 activities this week)
      if (topActivity && topCount >= 2) {
        mostHelpfulActivity = {
          label: topActivity,
          count: Math.round(topCount),
        };
      }
    }
    
    // Calculate Stress Echoes, Energy Flow, and Softening
    const stressEchoes = computeStressEchoes(journals);
    const energyFlow = computeEnergyFlowByWeekday(activityLogs);
    const softening = computeSofteningDay(journals);
    const weeklyMoodTrend = computeWeeklyMoodTrend(journals);
    const crossPatternHint = buildCrossPatternHint(stressEchoes, energyFlow);
    const predictiveHint = buildPredictiveHint(stressEchoes, energyFlow);
    
    // Compute Last Hour analytics for Full Patterns page (using validated timezone)
    const lastHourData = await computeLastHourAnalytics(supabaseServer, userId, validatedTimezone);
    const lastHourSummary = {
      checkinsLastHour: lastHourData.checkinsLastHour,
      checkinsToday: lastHourData.checkinsToday,
      comparisonLabel: lastHourData.comparisonLabel,
    };
    
    // Compute Studio Insights (only for Studio tier users)
    let studioInsights = null;
    if (userId) {
      const subscriptionTier = await getUserSubscriptionTier(supabaseServer, userId);
      const isStudio = subscriptionTier === 'studio';
      
      if (isStudio) {
        console.log('📊 [PATTERNS] User is Studio tier, computing advanced analytics');
        studioInsights = await buildStudioInsights(supabaseServer, userId, activityLogs, journals, false);
      } else {
        console.log('📊 [PATTERNS] User is Free tier, skipping studio insights');
      }
    }
    
    // 1️⃣ ENERGY TIDES: Session count per day (behavioral frequency)
    const energyFrequencyBuckets = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
    for (const log of activityLogs) {
      const dayIndex = new Date(log.completed_at || log.created_at).getDay();
      const weeksAgo = getWeeksAgo(log.completed_at || log.created_at);
      const weight = weekWeight(weeksAgo);
      energyFrequencyBuckets[dayIndex] += weight;
    }
    // Round to integers for UI display
    for (let i = 0; i < energyFrequencyBuckets.length; i++) {
      energyFrequencyBuckets[i] = Math.round(energyFrequencyBuckets[i]);
    }
    
    // Energy Tides Glance - quick summary of activity rhythm
    const activeDays = energyFrequencyBuckets.filter(count => count > 0).length;
    let rhythmLabel = 'Sporadic';
    if (activeDays >= 5) rhythmLabel = 'Steady';
    else if (activeDays >= 3) rhythmLabel = 'Building';
    const energyTidesGlance = `${rhythmLabel} • ${activeDays} active day${activeDays !== 1 ? 's' : ''}`;
    
    // Keep energyDayBuckets as alias for backward compatibility
    const energyDayBuckets = energyFrequencyBuckets;
    
    // 2️⃣ WEEKLY RHYTHM MAP: Emotional load per day (stress vs relief weight)
    const emotionalLoadBuckets = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat (raw scores)
    
    // Process activity logs for relief signals
    for (const log of activityLogs) {
      const dayIndex = new Date(log.completed_at || log.created_at).getDay();
      let reliefScore = 0;
      
      // Relief signals from activity type
      const activityType = (log.activity_type || '').toLowerCase();
      if (['breathe', 'breathing', 'walk', 'walking', 'rest', 'power_nap', 'pearl', 'rising', 'basin'].includes(activityType)) {
        reliefScore += 1;
      }
      // If duration is substantial, add more relief
      if (log.duration_seconds && log.duration_seconds > 60) {
        reliefScore += 1;
      }
      
      emotionalLoadBuckets[dayIndex] -= reliefScore; // Relief reduces load (negative)
    }
    
    // Process journal entries for stress/relief signals
    for (const entry of journals) {
      const dayIndex = new Date(entry.created_at).getDay();
      let stressScore = 0;
      let reliefScore = 0;
      
      const content = (entry.content || '').toLowerCase();
      const moodTags = entry.mood_tags || [];
      
      // Stress signals from mood tags
      const stressMoods = ['anxious', 'overwhelmed', 'restless', 'angry', 'frustrated', 'sad', 'hopeless'];
      for (const mood of moodTags) {
        if (stressMoods.includes(mood.toLowerCase())) {
          stressScore += 2;
        }
      }
      
      // Stress signals from content keywords
      const stressKeywords = ['panic', 'crisis', "can't", 'help', 'scared', 'terrified', 'breaking', 'falling apart'];
      for (const keyword of stressKeywords) {
        if (content.includes(keyword)) {
          stressScore += 1;
        }
      }
      
      // Relief signals from mood tags
      const reliefMoods = ['calm', 'grounded', 'safe', 'peaceful', 'hopeful', 'grateful', 'content'];
      for (const mood of moodTags) {
        if (reliefMoods.includes(mood.toLowerCase())) {
          reliefScore += 2;
        }
      }
      
      // Relief signals from content keywords
      const reliefKeywords = ['better', 'helped', 'calmer', 'breathing', 'okay', 'relief'];
      for (const keyword of reliefKeywords) {
        if (content.includes(keyword)) {
          reliefScore += 1;
        }
      }
      
      // Net emotional load (positive = stress, negative = relief)
      emotionalLoadBuckets[dayIndex] += (stressScore - reliefScore);
    }
    
    // Normalize to 0-10 scale for waveform display
    const maxLoad = Math.max(...emotionalLoadBuckets.map(x => Math.abs(x))) || 1;
    const emotionalRhythmBuckets = emotionalLoadBuckets.map(load => 
      Math.round((load / maxLoad) * 5) + 5 // Center at 5, range 0-10
    );
    
    // Generate emotional rhythm narrative
    let emotionalRhythmLabel = null;
    const heaviestDayIndex = emotionalLoadBuckets.indexOf(Math.max(...emotionalLoadBuckets));
    const lightestDayIndex = emotionalLoadBuckets.indexOf(Math.min(...emotionalLoadBuckets));
    const hasVariation = Math.max(...emotionalLoadBuckets) !== Math.min(...emotionalLoadBuckets);
    
    if (hasVariation && journals.length >= 3) {
      const heaviestDay = WEEKDAY_NAMES[heaviestDayIndex];
      const lightestDay = WEEKDAY_NAMES[lightestDayIndex];
      emotionalRhythmLabel = `Your week gathered emotional weight around ${heaviestDay}, with ${lightestDay} feeling lighter.`;
    } else if (journals.length > 0) {
      emotionalRhythmLabel = "Your emotional rhythm is still emerging — keep checking in.";
    }
    
    // Generate AI-driven insights using Patterns Engine
    let weeklyNarrative = null;
    let aiEnergyRhythmLabel = null;
    let aiStressEchoesLabel = null;
    let aiReliefLabel = null;
    let aiCrossPatternHint = null;
    let aiPredictiveHint = null;
    let aiWeeklyMoodTrend = null;
    
    const sampleSize = activityLogs.length + journals.length;
    const stillLearning = sampleSize < MIN_DATA_THRESHOLD;
    
    // Check if user is Studio tier for predictive hints
    let isStudioUser = false;
    if (userId) {
      try {
        const subscriptionTier = await getUserSubscriptionTier(supabaseServer, userId);
        isStudioUser = subscriptionTier === 'studio';
      } catch (tierErr) {
        console.warn('📊 [PATTERNS] Failed to check subscription tier:', tierErr.message);
      }
    }
    
    if (openai && (activityLogs.length > 0 || journals.length > 0)) {
      try {
        // Build comprehensive input for Patterns Engine
        const patternsInput = {
          timezone: validatedTimezone,
          crisisMode: false,
          isStudioUser,
          sampleSize,
          journalSampleSize: journals.length,
          activitySampleSize: activityLogs.length,
          peakWindowStats: {
            startHour: peakWindow.startHour,
            endHour: peakWindow.endHour,
            confidence: peakWindow.confidence === 'strong' ? 0.8 : 0.5,
          },
          energyFrequencyBuckets,
          emotionalRhythmBuckets,
          softEntryCount: softening.totalSoftEntries || 0,
          stressEchoCount: stressEchoes.stressCount || 0,
          mostHelpfulActivity: {
            label: mostHelpfulActivity.label !== fallbackActivity.label ? mostHelpfulActivity.label : null,
            count: mostHelpfulActivity.count,
          },
          weeklyMoodCounts: {
            thisWeek: {
              calm: weeklyMoodTrend?.calm?.thisWeek || 0,
              stressed: weeklyMoodTrend?.stress?.thisWeek || 0,
            },
            lastWeek: {
              calm: weeklyMoodTrend?.calm?.lastWeek || 0,
              stressed: weeklyMoodTrend?.stress?.lastWeek || 0,
            },
          },
          heaviestDayIndex,
          lightestDayIndex,
          stressTopDayIndex: stressEchoes.topDayIndex,
          energyTopDayIndex: energyFlow.topDayIndex,
        };
        
        const patternsEnginePrompt = buildPatternsEnginePrompt(patternsInput);
        
        const patternsCompletion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: patternsEnginePrompt }],
          temperature: 0.8,
          max_tokens: 600,
          response_format: { type: 'json_object' },
        });
        
        const patternsResult = patternsCompletion.choices?.[0]?.message?.content;
        if (patternsResult) {
          try {
            const parsed = JSON.parse(patternsResult);
            weeklyNarrative = parsed.weeklyNarrative || null;
            aiEnergyRhythmLabel = parsed.energyRhythmLabel || null;
            aiStressEchoesLabel = parsed.stressEchoesLabel || null;
            aiReliefLabel = parsed.reliefLabel || null;
            aiCrossPatternHint = parsed.crossPatternHint || null;
            aiPredictiveHint = parsed.predictiveHint || null;
            aiWeeklyMoodTrend = parsed.weeklyMoodTrend || null;
            console.log('📊 [PATTERNS ENGINE] Generated insights:', {
              weeklyNarrative: weeklyNarrative?.slice(0, 50) + '...',
              hasEnergyRhythm: !!aiEnergyRhythmLabel,
              hasStressEchoes: !!aiStressEchoesLabel,
              hasRelief: !!aiReliefLabel,
            });
          } catch (parseErr) {
            console.warn('📊 [PATTERNS ENGINE] Failed to parse AI response:', parseErr.message);
          }
        }
      } catch (narrativeErr) {
        console.warn('📊 [PATTERNS ENGINE] Failed to generate insights:', narrativeErr.message);
      }
    }
    
    // Calculate the three new trend fields
    const totalSampleSize = activityLogs.length + journals.length;
    const presenceTrend = computePresenceTrend(activityLogs, journals, totalSampleSize);
    const emotionalLoadTrend = computeEmotionalLoadTrend(journals, totalSampleSize);
    const reliefSpotlight = computeReliefSpotlight(
      mostHelpfulActivity.label?.replace(/ about \d+% of the time.*$/, '') || null, // Extract activity name
      mostHelpfulActivity.count
    );
    
    console.log('📊 [PATTERNS INSIGHTS POST] Result:', { 
      peakWindow, 
      mostHelpfulActivity, 
      stressEchoes: stressEchoes.topDayIndex,
      energyFlow: energyFlow.topDayIndex,
      softening: softening.topDayIndex,
      weeklyMoodTrend: weeklyMoodTrend.calm.direction + '/' + weeklyMoodTrend.stress.direction,
      crossPatternHint: crossPatternHint?.slice(0, 50) + '...',
      predictiveHint: predictiveHint ? 'yes' : 'no',
      energyDayBuckets,
      sampleSize: activityLogs.length,
      journalSampleSize: journals.length,
    });
    
    // Merge AI-generated mood trend labels with computed data
    const finalWeeklyMoodTrend = weeklyMoodTrend;
    if (aiWeeklyMoodTrend?.calm?.label) {
      finalWeeklyMoodTrend.calm.label = aiWeeklyMoodTrend.calm.label;
      if (aiWeeklyMoodTrend.calm.direction) {
        finalWeeklyMoodTrend.calm.direction = aiWeeklyMoodTrend.calm.direction;
      }
    }
    if (aiWeeklyMoodTrend?.stress?.label) {
      finalWeeklyMoodTrend.stress.label = aiWeeklyMoodTrend.stress.label;
      if (aiWeeklyMoodTrend.stress.direction) {
        finalWeeklyMoodTrend.stress.direction = aiWeeklyMoodTrend.stress.direction;
      }
    }
    
    // Data Quality Validation: Peak Window Range (1-8 hours)
    // Per BACKEND_API.md lines 700-710: Invalid windows > 8 hours or < 1 hour should be discarded
    let validatedPeakWindow = peakWindow;
    if (peakWindow.startHour != null && peakWindow.endHour != null) {
      let windowSize = peakWindow.endHour - peakWindow.startHour;
      // Handle wrap-around (e.g., 11 PM to 1 AM)
      if (windowSize < 0) windowSize += 24;
      
      if (windowSize > 8 || windowSize < 1) {
        console.warn('[PATTERN QUALITY] Invalid peak window range:', windowSize, 'hours - discarding');
        validatedPeakWindow = { label: null, startHour: null, endHour: null, confidence: "insufficient" };
      }
    }
    
    // Generate lastCalculatedAt timestamp (ISO 8601) for all patterns
    const lastCalculatedAt = new Date().toISOString();
    
    // Build response object with calculated values, preferring AI labels when available
    const calculatedResponse = {
      // Core pattern objects (nested) - kept for backward compatibility
      // Each pattern includes lastCalculatedAt per BACKEND_API.md lines 762-790
      peakWindow: {
        ...validatedPeakWindow,
        lastCalculatedAt,
        sampleSize: sampleSize,
      },
      mostHelpfulActivity: {
        ...mostHelpfulActivity,
        lastCalculatedAt,
      },
      stressEchoes: {
        ...stressEchoes,
        lastCalculatedAt,
        sampleSize: journals.length,
      },
      energyFlow: {
        ...energyFlow,
        lastCalculatedAt,
        sampleSize: activityLogs.length,
      },
      softening: {
        ...softening,
        lastCalculatedAt,
        sampleSize: journals.length,
      },
      weeklyMoodTrend: finalWeeklyMoodTrend,
      crossPatternHint: aiCrossPatternHint || crossPatternHint,
      predictiveHint: aiPredictiveHint || predictiveHint,
      
      // Global lastCalculatedAt for the entire response
      lastCalculatedAt,
      
      // Last Hour analytics for Full Patterns page
      lastHourSummary,
      
      // Studio Insights (advanced analytics for Studio tier only)
      studioInsights,
      
      // Flattened fields for mobile frontend (exact field names per spec)
      peakWindowLabel: validatedPeakWindow.label,
      peakWindowStartRatio: validatedPeakWindow.startHour != null ? validatedPeakWindow.startHour / 24 : null,
      peakWindowEndRatio: validatedPeakWindow.endHour != null ? validatedPeakWindow.endHour / 24 : null,
      
      // Energy Tides (behavioral frequency)
      energyDayBuckets, // Alias for backward compatibility
      energyFrequencyBuckets,
      energyTidesGlance,
      
      // Weekly Rhythm Map (emotional weight)
      emotionalRhythmBuckets,
      emotionalRhythmLabel: aiEnergyRhythmLabel || emotionalRhythmLabel,
      
      // Prefer AI-generated labels, fall back to computed labels
      stressEchoesLabel: aiStressEchoesLabel || stressEchoes.label,
      reliefLabel: aiReliefLabel || softening.label,
      totalSoftEntries: softening.totalSoftEntries,
      mostHelpfulActivityLabel: mostHelpfulActivity.label,
      mostHelpfulActivityCount: mostHelpfulActivity.count,
      energyRhythmLabel: aiEnergyRhythmLabel || emotionalRhythmLabel || energyFlow.label,
      
      // Weekly narrative for "Your Week" card (AI-generated)
      weeklyNarrative,
      
      // Three new emotionally intelligent trend fields
      presenceTrend,
      emotionalLoadTrend,
      reliefSpotlight,
      
      // Data humility flags
      stillLearning,
      sampleSize,
      journalSampleSize: journals.length,
    };
    
    // PATTERN PERSISTENCE: Load cached patterns and merge with calculated values
    // This ensures once data exists, it never shows as empty
    const effectiveUserId = userId || deviceId;
    const cachedPatterns = await loadCachedPatterns(effectiveUserId);
    const responseData = mergePatterns(cachedPatterns || {}, calculatedResponse);
    
    // Save merged patterns back to cache for persistence
    // Don't await - fire and forget to avoid blocking response
    saveCachedPatterns(effectiveUserId, responseData).catch(err => {
      console.error('[PATTERNS CACHE] Background save failed:', err.message);
    });
    
    // In-memory cache for quick repeated requests (5-minute TTL)
    patternsCache.set(cacheKey, { data: responseData, timestamp: Date.now() });
    console.log('📊 [PATTERNS] Response cached for', cacheKey);
    
    return res.json(responseData);
    
  } catch (err) {
    console.error('📊 [PATTERNS INSIGHTS POST] Error:', err);
    
    // PATTERN PERSISTENCE: On error, try to return cached patterns
    const { userId, deviceId } = req.body || {};
    const effectiveUserId = userId || deviceId;
    const cachedPatterns = await loadCachedPatterns(effectiveUserId);
    
    if (cachedPatterns && Object.keys(cachedPatterns).length > 0) {
      console.log('📊 [PATTERNS] Error occurred but returning cached patterns');
      return res.json(cachedPatterns);
    }
    
    // No cached data - return fallback
    const fallbackEnergy = "As you use activities more, I'll start noticing which days your energy reaches for TRACE the most.";
    const fallbackStress = "As you journal more, I'll start noticing which days tend to echo the heaviest pressure.";
    const fallbackRelief = "As more calm moments show up in your journal, I'll notice where in the week things tend to soften a little.";
    const fallbackActivity = "Once you've tried a few activities, I'll start noticing which ones you return to the most.";
    const lastCalculatedAtNow = new Date().toISOString();
    
    return res.json({
      // Core pattern objects (nested) - kept for backward compatibility
      // Per BACKEND_API.md 762-790: Include lastCalculatedAt on all patterns
      peakWindow: { label: null, startHour: null, endHour: null, confidence: "emerging", lastCalculatedAt: lastCalculatedAtNow, sampleSize: 0 },
      mostHelpfulActivity: { label: fallbackActivity, count: 0, lastCalculatedAt: lastCalculatedAtNow },
      stressEchoes: { label: fallbackStress, topDayIndex: null, stressCount: 0, totalStressEntries: 0, lastCalculatedAt: lastCalculatedAtNow, sampleSize: 0 },
      energyFlow: { label: fallbackEnergy, topDayIndex: null, percentage: null, totalActivities: 0, lastCalculatedAt: lastCalculatedAtNow, sampleSize: 0 },
      softening: { label: fallbackRelief, topDayIndex: null, percentage: null, totalSoftEntries: 0, lastCalculatedAt: lastCalculatedAtNow, sampleSize: 0 },
      weeklyMoodTrend: {
        calm: { thisWeek: 0, lastWeek: 0, direction: "stable", label: "As more calm and heavy days show up in your journal, I'll start reflecting how this week compares to the last." },
        stress: { thisWeek: 0, lastWeek: 0, direction: "stable", label: "Once there's a little more to go on, I'll gently name how your heavier entries are shifting week to week." },
      },
      crossPatternHint: "As more weeks unfold, I'll start noticing how your heavier days and your go-to supports interact.",
      predictiveHint: null,
      
      // Global lastCalculatedAt for the entire response
      lastCalculatedAt: lastCalculatedAtNow,
      
      // Last Hour analytics fallback
      lastHourSummary: {
        checkinsLastHour: 0,
        checkinsToday: 0,
        comparisonLabel: null,
      },
      
      // Studio Insights (null on error)
      studioInsights: null,
      
      // Flattened fields for mobile frontend (exact field names per spec)
      peakWindowLabel: null,
      peakWindowStartRatio: null,
      peakWindowEndRatio: null,
      energyDayBuckets: [0, 0, 0, 0, 0, 0, 0],
      stressEchoesLabel: fallbackStress,
      reliefLabel: fallbackRelief,
      totalSoftEntries: 0,
      mostHelpfulActivityLabel: fallbackActivity,
      mostHelpfulActivityCount: 0,
      energyRhythmLabel: fallbackEnergy,
      
      // New trend fields - null on error
      presenceTrend: null,
      emotionalLoadTrend: null,
      reliefSpotlight: null,
      
      sampleSize: 0,
      journalSampleSize: 0,
    });
  }
});

// POST /api/sessions/daily-summary - Count chat sessions based on session START time
app.post('/api/sessions/daily-summary', async (req, res) => {
  try {
    const { userId, deviceId, localDate } = req.body || {};

    console.log('🧠 /api/sessions/daily-summary called with:', {
      userId,
      deviceId,
      localDate,
    });

    // If no Supabase, return zeros
    if (!supabaseServer) {
      console.log('⚠️ /api/sessions/daily-summary: No Supabase configured');
      return res.json({
        ok: true,
        today: 0,
        total: 0,
      });
    }

    // Fetch ALL user messages, ordered by time (we need full history to track session starts)
    let query = supabaseServer
      .from('chat_messages')
      .select('created_at')
      .eq('role', 'user')
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: allMessages, error: messagesError } = await query;

    if (messagesError) {
      console.error('❌ /api/sessions/daily-summary error:', messagesError);
      throw messagesError;
    }

    if (!allMessages || allMessages.length === 0) {
      return res.json({
        ok: true,
        today: 0,
        total: 0,
      });
    }

    // Track sessions by their START date
    const sessionsByDay = new Map(); // Map<YYYY-MM-DD, count>
    let totalSessions = 0;
    let lastMessageTime = null;
    const ONE_HOUR_MS = 60 * 60 * 1000;

    for (const message of allMessages) {
      const messageTime = new Date(message.created_at).getTime();
      const isNewSession = !lastMessageTime || (messageTime - lastMessageTime) > ONE_HOUR_MS;
      
      if (isNewSession) {
        // This message STARTS a new session
        totalSessions++;
        
        // Count this session on the calendar day it STARTED
        const sessionStartDate = new Date(message.created_at).toISOString().slice(0, 10);
        sessionsByDay.set(sessionStartDate, (sessionsByDay.get(sessionStartDate) || 0) + 1);
      }
      
      lastMessageTime = messageTime;
    }

    // Get count for the requested day
    const targetDate = localDate || new Date().toISOString().slice(0, 10);
    const todaySessions = sessionsByDay.get(targetDate) || 0;

    console.log('✅ /api/sessions/daily-summary result:', {
      requestedDate: targetDate,
      today: todaySessions,
      total: totalSessions,
      sessionDays: Object.fromEntries(sessionsByDay),
    });

    return res.json({
      ok: true,
      today: todaySessions,
      total: totalSessions,
    });
  } catch (err) {
    console.error('❌ /api/sessions/daily-summary error:', err);
    return res.json({
      ok: false,
      today: 0,
      total: 0,
      error: err.message,
    });
  }
});

// POST /api/journal-reflection - Generate AI reflection based on journal entries
// mode: journal_reflection
app.post('/api/journal-reflection', async (req, res) => {
  try {
    const {
      userName,
      localDate,
      localDay,
      localTime,
      entries,
    } = req.body || {};

    console.log('🧠 /api/journal-reflection entries:', entries?.length || 0);

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.json({
        ok: true,
        reflection: "This page is still quiet. Whenever it feels right to write, I'll be here to notice what's unfolding with you.",
      });
    }

    // Build a summary of recent journal entries (max 10, content truncated to 300 chars)
    const recentEntries = entries.slice(0, 10);
    
    // Calculate time span
    const timestamps = recentEntries
      .map(e => new Date(e.createdAt).getTime())
      .filter(t => !isNaN(t));
    const earliest = timestamps.length ? new Date(Math.min(...timestamps)).toLocaleDateString() : null;
    const latest = timestamps.length ? new Date(Math.max(...timestamps)).toLocaleDateString() : null;
    const timeSpan = earliest && latest && earliest !== latest
      ? `Time span: ${earliest} to ${latest}`
      : earliest
        ? `Date: ${earliest}`
        : '';

    // Summarize entries with truncated content
    const entrySummary = recentEntries
      .map((entry, idx) => {
        const mood = entry.mood ? ` [mood: ${entry.mood}]` : '';
        const content = (entry.content || '').slice(0, 300);
        return `${idx + 1}.${mood} "${content}"`;
      })
      .join('\n');

    // Context info
    const contextParts = [];
    if (userName) contextParts.push(`User: ${userName}`);
    if (localDay) contextParts.push(`Day: ${localDay}`);
    if (localTime) contextParts.push(`Time: ${localTime}`);
    if (localDate) contextParts.push(`Date: ${localDate}`);
    const contextLine = contextParts.length ? contextParts.join(', ') : '';

    const systemPrompt = `You are TRACE, offering a 1–2 sentence reflection on the emotional themes in recent journal entries.
mode: journal_reflection

Tone: gentle, validating, non-directive.
- No advice, no questions.
- No clinical labels. Never mention "symptoms" or "treatment".
- Focus on emotional themes, pacing, and what seems to matter to the user.
- Just noticing and validation.`;

    const userPrompt = `${contextLine ? contextLine + '\n' : ''}${timeSpan ? timeSpan + '\n' : ''}
Recent journal entries:
${entrySummary}

In 1–2 sentences, gently reflect what you notice about this person's recent emotional landscape. No questions, no advice, just noticing and validation.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const reflection =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "You're showing up for yourself in small, brave ways. That matters.";

    console.log('✅ Journal reflection generated');
    return res.json({
      ok: true,
      reflection,
    });
  } catch (err) {
    console.error('❌ /api/journal-reflection error:', err);
    return res.json({
      ok: true,
      reflection: "You've been carrying a lot. Even noticing your patterns is an act of care.",
    });
  }
});

app.get('/api/debug-chat-messages', async (req, res) => {
  if (!supabaseServer) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    const { data, error } = await supabaseServer
      .from('chat_messages')
      .select('id, user_id, role, content, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[TRACE DEBUG CHATS ERROR]', error.message || error);
      return res.status(500).json({ error: error.message || 'Supabase error' });
    }

    console.log('[TRACE DEBUG CHATS]', data);
    res.json({
      ok: true,
      count: data?.length || 0,
      rows: data || [],
    });
  } catch (err) {
    console.error('[TRACE DEBUG CHATS ERROR]', err.message || err);
    res.status(500).json({ error: err.message || 'Unknown error' });
  }
});

// Global error handler for consistent JSON responses (must be last middleware)
app.use((err, req, res, next) => {
  console.error('Server error:', err.message || err);
  res.status(err.status || 500).json({
    ok: false,
    error: err.message || 'Internal server error',
  });
});
