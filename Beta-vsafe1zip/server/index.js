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
const {
  buildMemoryContext,
  summarizeToLongTermMemory,
} = require('./traceMemory');
const {
  buildTraceSystemPrompt,
  buildGreetingSystemPrompt,
  buildFirstRunGreetingPrompt,
  buildReturningGreetingPrompt,
  buildBreathingGuidancePrompt,
} = require('./traceSystemPrompt');
const { buildRhythmicLine } = require('./traceRhythm');
const { generateWeeklyLetter, getExistingWeeklyLetter } = require('./traceWeeklyLetter');
const { updateLastSeen, buildReturnWarmthLine, buildMemoryCue } = require('./tracePresence');
const { getDynamicFact, isUSPresidentQuestion } = require('./dynamicFacts');
const { buildNewsContextSummary, isNewsQuestion } = require('./newsClient');

// ---- WEATHER HELPER ----
// Simple TRACE-style weather summary using Open-Meteo (free, no API key needed)
async function getWeatherSummary({ lat, lon }) {
  if (lat == null || lon == null) {
    return null;
  }

  const url = `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}` +
    `&longitude=${lon}` +
    `&current=temperature_2m,wind_speed_10m` +
    `&hourly=temperature_2m,precipitation_probability,cloudcover` +
    `&timezone=auto` +
    `&temperature_unit=fahrenheit`;

  let data;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error('[WEATHER] Open-Meteo error status:', res.status, await res.text());
      return null;
    }
    data = await res.json();
  } catch (err) {
    console.error('[WEATHER] Open-Meteo fetch error:', err);
    return null;
  }

  const current = data.current;
  const hourly = data.hourly;

  if (!current || !hourly || !hourly.temperature_2m || !hourly.time) {
    return null;
  }

  // Take next ~6 hours
  const temps = hourly.temperature_2m.slice(0, 6);
  const avgTemp = Math.round(
    temps.reduce((a, b) => a + b, 0) / Math.max(temps.length, 1)
  );

  const nowTemp = Math.round(current.temperature_2m);
  const wind = Math.round(current.wind_speed_10m ?? 0);

  let tempTone = '';
  if (avgTemp <= 45) tempTone = 'Pretty cold —';
  else if (avgTemp <= 65) tempTone = 'Cool and gentle —';
  else if (avgTemp <= 80) tempTone = 'Mild and comfortable —';
  else tempTone = 'Warm —';

  const summary =
    `${tempTone} around ${avgTemp}°F over the next few hours where they are. ` +
    `Right now it's about ${nowTemp}°F with a breeze around ${wind} mph. ` +
    `Use this context gently and only if they ask about the weather or mention conditions outside.`;

  return {
    summary,
    current,
    hourly,
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

// ---- HOLIDAYS HELPER (AbstractAPI) ----

async function getHolidayContext({ countryCode, date = new Date() }) {
  const apiKey = process.env.ABSTRACT_HOLIDAYS_API_KEY;
  if (!apiKey) {
    console.warn('[HOLIDAY] ABSTRACT_HOLIDAYS_API_KEY is missing');
    return null;
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  const country = countryCode || 'US';

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

async function maybeAttachHolidayContext({ messages, profile }) {
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) return { messages, holidaySummary: null };

  if (!isHolidayRelated(lastUser.content)) {
    return { messages, holidaySummary: null };
  }

  console.log('[HOLIDAY] Holiday-related message detected');

  const countryCode = profile?.country || 'US';
  const ctx = await getHolidayContext({ countryCode });

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

function isFoodRelated(text) {
  if (!text) return false;
  const t = text.toLowerCase();

  return (
    t.includes('recipe') ||
    t.includes('cook something') ||
    t.includes('what should i cook') ||
    t.includes('what should i make') ||
    t.includes('dinner ideas') ||
    t.includes('lunch ideas') ||
    t.includes('snack ideas') ||
    t.includes('comfort food') ||
    t.includes('i want something warm') ||
    t.includes('i want something healthy') ||
    t.includes("i don't feel like eating") ||
    t.includes('no appetite') ||
    t.includes("haven't eaten") ||
    t.includes('food sounds hard') ||
    t.includes('i just want to eat') ||
    t.includes('craving') ||
    t.includes('hungry but tired')
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

  if (!isFoodRelated(lastUser.content)) {
    return { messages, foodSummary: null };
  }

  console.log('[FOOD] Food-related message detected');

  const lowered = lastUser.content.toLowerCase();
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

  console.log('[FOOD] Attaching food context with', recipes.length, 'recipes');

  const foodSummary =
    `FOOD_CONTEXT: The user is talking about food / appetite / cooking.\n` +
    `Here are a few simple recipe ideas:\n` +
    `${formatted}\n\n` +
    `When you respond:\n` +
    `- Present 1–3 of these as gentle ideas, not assignments.\n` +
    `- Emphasize there is *no pressure* to cook or choose anything.\n` +
    `- If the user sounds like they have low appetite or food stress, focus on validation first, recipes second.\n` +
    `- Never mention that these came from an API or refer to FOOD_CONTEXT by name.`;

  return {
    messages,
    foodSummary,
  };
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
  const t = text.toLowerCase();

  return (
    t.includes('tell me a joke') ||
    t.includes('dad joke') ||
    t.includes('make me laugh') ||
    t.includes('cheer me up') ||
    t.trim() === 'joke' ||
    t.trim() === '/joke'
  );
}

async function maybeAttachJokeContext({ messages }) {
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
      `JOKE_CONTEXT: The user has explicitly asked for a joke or some lightness.\n` +
      `Here is a ready-made dad joke:\n` +
      `SETUP: ${joke.setup}\n` +
      `PUNCHLINE: ${joke.punchline}\n\n` +
      `When you respond:\n` +
      `- Deliver this joke in a gentle, TRACE-like way (you can present it as-is, or wrap it in one or two soft sentences).\n` +
      `- Keep it on the wholesome / corny side; avoid edgy or offensive humor.\n` +
      `- After the joke, you may very briefly check in on how they're feeling, but don't push deep processing unless they invite it.\n` +
      `- Do NOT say "here is a joke from an API" or mention JOKE_CONTEXT by name.`,
  };

  return {
    messages: [systemJoke, ...messages],
    joke,
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
   - Activities available: Breathing, Trace the Maze, Walking Reset, Rest, Window, Echo, Rising, Drift, Grounding, Pearl Ripple.
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
  - Or one of: "Breathing", "Trace the Maze", "Walking Reset", "Rest", "Window", "Echo", "Rising", "Drift", "Grounding", "Pearl Ripple".
- activity_suggestion.reason: brief, user-friendly reason if you suggest something.
- activity_suggestion.should_navigate:
  - false by default.
  - Set to true only after the user clearly agrees (e.g., "okay", "yes let's try it", "sure, breathing sounds good").
`;

const fallbackResponses = [
  "mm, I'm here with you.",
  "I hear you... tell me more?",
  "that's okay. take your time.",
  "mm, what's on your mind?",
  "I'm listening.",
  "how does that feel?",
  "mm... that sounds like a lot.",
  "I'm here.",
];

function getFallbackResponse() {
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
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
    const { userId, deviceId, isNewUser } = req.body;
    console.log('[TRACE GREETING] Request received - userId:', userId, 'deviceId:', deviceId, 'isNewUser:', isNewUser);
    
    if (!userId && !deviceId) {
      return res.status(400).json({ error: 'userId or deviceId required' });
    }

    // Try to load profile, but don't fail if it doesn't exist (new users)
    let profile = null;
    let displayName = null;
    
    if (userId && supabaseServer) {
      profile = await loadProfileBasic(userId);
      displayName = profile?.preferred_name?.trim() || null;
    }
    
    // Prioritize isNewUser flag from mobile app, fallback to database check
    // If profile doesn't exist, treat as first run
    const firstRun = isNewUser === true || !profile || !profile.first_run_completed;

    console.log('[TRACE GREETING] Resolved - firstRun:', firstRun, 'displayName:', displayName, 'profileExists:', !!profile);

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
    
    // Filter out garbage/corrupted messages from history (empty or whitespace-only content)
    const messages = (rawMessages || []).filter(msg => {
      const content = (msg.content || '').trim();
      // Keep message only if it has meaningful content (not just whitespace/newlines)
      return content.length > 0 && !/^\s*$/.test(content);
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
    
    const LIGHT_ACKS = [
      "You're welcome. 😊",
      "Got you. I'm here if you need me.",
      "Anytime. Take good care of yourself.",
      "Of course. I'm nearby if you want to share more later.",
      "You're welcome. Rest easy.",
      "No problem.",
      "Anytime. 🙏",
      "Take care."
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
    try {
      if (supabaseServer && effectiveUserId) {
        const profile = await loadProfileBasic(effectiveUserId);
        if (profile?.preferred_name) {
          displayName = profile.preferred_name.trim();
          console.log('[TRACE NAME] Loaded from DB:', displayName);
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

    // Load news context if user is asking about current events
    let newsContext = null;
    try {
      if (isNewsQuestion(userText)) {
        console.log('[TRACE NEWS] News question detected, fetching...');
        newsContext = await buildNewsContextSummary(userText);
        if (newsContext) {
          console.log('[TRACE NEWS] Loaded news context');
        }
      }
    } catch (err) {
      console.error('[TRACE NEWS] Failed to build news context:', err.message);
    }

    // Load weather context if user is asking about weather
    let weatherContext = null;
    try {
      // Reload full profile with lat/lon for weather
      const profileForWeather = await loadProfileBasic(effectiveUserId);
      const weatherResult = await maybeAttachWeatherContext({
        messages,
        profile: profileForWeather,
      });
      if (weatherResult.weatherSummary) {
        weatherContext = `WEATHER_CONTEXT: ${weatherResult.weatherSummary}\nUse this only if they ask about weather or conditions outside. Do not mention APIs.`;
      }
    } catch (err) {
      console.error('[TRACE WEATHER] Failed to load weather context:', err.message);
    }

    // Load dog context if user is talking about their dog
    let dogContext = null;
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
    let holidayContext = null;
    try {
      const profileForHoliday = await loadProfileBasic(effectiveUserId);
      const holidayResult = await maybeAttachHolidayContext({
        messages,
        profile: profileForHoliday,
      });
      if (holidayResult.holidaySummary) {
        holidayContext = holidayResult.holidaySummary;
      }
    } catch (err) {
      console.error('[TRACE HOLIDAY] Failed to load holiday context:', err.message);
    }

    // Load food context if user mentions food/cooking/appetite
    let foodContext = null;
    try {
      const foodResult = await maybeAttachFoodContext({ messages });
      if (foodResult.foodSummary) {
        foodContext = foodResult.foodSummary;
      }
    } catch (err) {
      console.error('[TRACE FOOD] Failed to load food context:', err.message);
    }

    // Load joke context if user asks for a joke
    let jokeContext = null;
    try {
      const jokeResult = await maybeAttachJokeContext({ messages });
      if (jokeResult.joke) {
        jokeContext = `JOKE_CONTEXT: Setup: "${jokeResult.joke.setup}" Punchline: "${jokeResult.joke.punchline}"`;
      }
    } catch (err) {
      console.error('[TRACE JOKE] Failed to load joke context:', err.message);
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
    const fullContext = contextParts.filter(Boolean).join('\n\n');

    // Check for hydration moment and optionally add hint
    const { messages: messagesWithHydration, hasHydrationHint } = maybeAddHydrationHint({ messages });
    if (hasHydrationHint) {
      console.log('[TRACE] Hydration hint added to conversation');
    }

    // Build system prompt using centralized builder (handles name, memory, tone)
    // displayName comes from database lookup, not client payload
    let systemPrompt = buildTraceSystemPrompt({
      displayName: displayName || null,
      contextSnapshot: fullContext || null,
    });

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
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messagesWithHydration
      ],
      max_tokens: 300,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const rawContent = response.choices[0]?.message?.content || '{"message": "mm, what\'s on your mind?", "activity_suggestion": {"name": null, "reason": null, "should_navigate": false}}';
    
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = {
        message: '',
        activity_suggestion: { name: null, reason: null, should_navigate: false }
      };
    }
    
    const messageText = (parsed.message || '').trim();
    if (!messageText) {
      const fallbacks = [
        "I'm here with you. What's on your mind?",
        "mm, take your time. I'm listening.",
        "I'm here. No pressure to talk, but I'm listening if you'd like to.",
        "that's a meaningful question. I think the answer is different for everyone, but I'm here to help you find yours.",
      ];
      parsed.message = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    const assistantText = parsed.message || "I'm here.";

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
    
    return res.json({
      message: assistantText,
      activity_suggestion: parsed.activity_suggestion || { name: null, reason: null, should_navigate: false }
    });
  } catch (error) {
    console.error('TRACE API error:', error.message || error);
    res.status(500).json({ error: 'Failed to get response', message: "mm, I'm here." });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
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
  const { userId, displayName, email, theme, pushEnabled, emailEnabled } = req.body;
  
  console.log('[PROFILE] PATCH request for userId:', userId);
  
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
    
    const { data, error } = await supabaseServer
      .from('profiles')
      .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) {
      console.error('[PROFILE] Update error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('[PROFILE] Updated profile for:', userId);
    return res.json(data);
    
  } catch (err) {
    console.error('[PROFILE] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/profile/update - Update user profile (for mobile app compatibility)
app.post('/api/profile/update', async (req, res) => {
  const { userId, displayName, email, theme, pushEnabled, emailEnabled } = req.body;
  
  console.log('[PROFILE] POST /api/profile/update for userId:', userId);
  
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
    
    const { data, error } = await supabaseServer
      .from('profiles')
      .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) {
      console.error('[PROFILE] Update error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('[PROFILE] Updated profile for:', userId);
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
  const { userId, activityType, durationMinutes, timeOfDay } = req.body;
  
  if (!userId || !activityType) {
    return res.status(400).json({ error: 'userId and activityType required' });
  }

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
    
    // Build context-aware prompt for OpenAI
    const systemPrompt = `You are TRACE, a compassionate mental wellness companion. Generate a brief, gentle encouragement message (1-2 short lines, max 50 characters total) for someone doing the Rising activity - a breathing/mindfulness exercise where they watch bubbles drift upward.

Context:
- Activity: ${activityType}
- Time: ${timeOfDay || 'unknown'}
- Duration so far: ${durationMinutes || 0} minutes
${nameContext}

Guidelines:
- Keep it intimate and present-focused
- Use "you" not their name
- Focus on: breath, presence, release, being enough as you are
- Match the gentle, upward energy of rising bubbles
- Maximum 2 lines, each under 30 characters
- Use \\n for line breaks
- No punctuation at the end
- NEVER use pet names like "friend", "buddy", "pal"

Examples:
"You're exactly where\\nyou need to be"
"This moment\\nis enough"
"Feel yourself\\nrising too"`;

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
          { role: 'user', content: 'Generate one encouragement message for this moment.' }
        ],
        temperature: 0.8,
        max_tokens: 50,
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API failed');
    }

    const data = await response.json();
    const message = data.choices[0]?.message?.content?.trim() || "You're exactly where\\nyou need to be";

    res.json({ message });

  } catch (error) {
    console.error('Encouragement generation error:', error);
    
    // Fallback to context-aware default messages
    const fallbacks = {
      morning: "Morning light\\nis rising with you",
      afternoon: "This moment\\nis enough",
      evening: "Let today\\ndrift away",
      default: "You're exactly where\\nyou need to be"
    };
    
    const timeKey = timeOfDay?.toLowerCase() || 'default';
    const fallbackMessage = fallbacks[timeKey] || fallbacks.default;
    
    res.json({ message: fallbackMessage });
  }
});

// POST /api/holidays - Check for holidays on a given date
app.post('/api/holidays', async (req, res) => {
  try {
    const { country, date } = req.body || {};
    const parsedDate = date ? new Date(date) : new Date();

    const ctx = await getHolidayContext({
      countryCode: country,
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

// Helper: Simple similarity check (Jaccard similarity on words)
function calculateSimilarity(str1, str2) {
  const words1 = new Set(str1.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/));
  const words2 = new Set(str2.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

// Helper: Check if greeting is too similar to any recent ones
function isTooSimilar(newGreeting, recentGreetings, threshold = 0.6) {
  for (const recent of recentGreetings) {
    if (calculateSimilarity(newGreeting, recent) > threshold) {
      return true;
    }
  }
  return false;
}

// Helper: Get recent greetings from Supabase welcome_history
async function getRecentGreetings(userId, limit = 30) {
  if (!supabaseServer || !userId) return [];
  try {
    const { data, error } = await supabaseServer
      .from('welcome_history')
      .select('greeting')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('Error fetching welcome history:', error.message);
      return [];
    }
    return (data || []).map(row => row.greeting);
  } catch (err) {
    console.error('Exception fetching welcome history:', err.message);
    return [];
  }
}

// Helper: Save greeting to Supabase welcome_history
async function saveGreetingToHistory(userId, greeting) {
  if (!supabaseServer || !userId) return;
  try {
    // Insert new greeting
    const { error: insertError } = await supabaseServer
      .from('welcome_history')
      .insert({ user_id: userId, greeting });
    if (insertError) {
      console.error('Error saving greeting to history:', insertError.message);
      return;
    }
    // Keep only the last 30 greetings per user
    const { data: allGreetings } = await supabaseServer
      .from('welcome_history')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (allGreetings && allGreetings.length > 30) {
      const idsToDelete = allGreetings.slice(30).map(row => row.id);
      await supabaseServer
        .from('welcome_history')
        .delete()
        .in('id', idsToDelete);
    }
  } catch (err) {
    console.error('Exception saving greeting to history:', err.message);
  }
}

// Helper: Generate stable anonymous key from IP
function getStableAnonKey(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.socket?.remoteAddress 
    || 'unknown';
  // Simple hash of IP for privacy
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ((hash << 5) - hash) + ip.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return `anon:${Math.abs(hash).toString(36)}`;
}

// Greeting system prompt - context-aware personalized greetings
const GREETING_SYSTEM_PROMPT = `
You are TRACE, a calm, emotionally-aware journaling companion in a mobile app.

This endpoint is ONLY for short greetings when the user opens the app.
You are NOT doing full conversation here, just a gentle hello and orientation.

Style rules:
- Keep it short: 1–2 sentences, max ~35 words total.
- No backstory, no feature list, no "I'm an AI" talk.
- Warm, grounded, conversational. Not bubbly, not clinical, not cheesy.
- Do NOT call the user "friend" or use pet names.
- Avoid repeating "I'm here for you" / "I'm always here" in every greeting.
  You can imply presence without constantly saying it.

Use context to shape the greeting:
- Morning: gentle, fresh-start tone. One short invitation to notice how they're arriving.
- Evening/late-night: softer, winding-down tone. Acknowledge tiredness without being dramatic.
- High stress: validate effort; give a sense of exhale; avoid big questions.
- Low stress: lighter tone; can be a bit more curious or playful, but still calm.
- Just did activity: briefly reference that; invite them to notice body/heart state.
- Hasn't used TRACE in a while: subtle "nice to see you back" vibe. No guilt, no pressure.

Name usage:
- If name is present, you MAY use it once. Do not overuse.

Examples of the overall feel (do NOT copy verbatim):
- "Hey Nina. Evening's here—let's take a quiet moment and see how today landed for you."
- "Welcome back. You've been carrying a lot; we can move gently from here."
- "Good morning. Before the day runs away, we can pause for a minute and see where you're at."
- "Nice to see you again. After that last activity, give yourself a second to notice how your body feels."

Answer with a single greeting message only.
`;

// Generate a unique AI-powered welcome greeting (with history-based uniqueness)
app.post('/api/greeting', async (req, res) => {
  try {
    const { 
      userName, 
      localTime, 
      localDay, 
      localDate, 
      userId: providedUserId, 
      deviceId,
      // New context fields for personalization
      timeOfDay,
      stressLevel,
      justDidActivity,
      hasRecentCheckIn
    } = req.body;
    
    // Generate stable user key - prefer userId, then deviceId-based, then IP-based
    const effectiveUserId = providedUserId 
      || (deviceId ? `device:${deviceId}` : null)
      || getStableAnonKey(req);
    
    console.log('Generating greeting for:', userName || 'anonymous user', 'effectiveUserId:', effectiveUserId);
    console.log('Time context:', localTime, localDay, localDate);
    console.log('Personalization context:', { timeOfDay, stressLevel, justDidActivity, hasRecentCheckIn });
    
    // Fetch recent greetings for this user
    const recentGreetings = await getRecentGreetings(effectiveUserId);
    const recentWelcomesText = recentGreetings.length > 0 
      ? recentGreetings.slice(0, 10).map((g, i) => `${i + 1}. "${g}"`).join('\n')
      : 'None yet';
    
    if (!openai) {
      // Fallback greetings when no API key - warm and welcoming
      const hour = new Date().getHours();
      let fallbackGreetings;
      
      if (hour >= 5 && hour < 12) {
        fallbackGreetings = [
          userName ? `Good morning, ${userName}. I hope today treats you gently.` : "Good morning. I hope today treats you gently.",
          userName ? `Morning, ${userName}. It's nice to see you here.` : "Morning. It's nice to see you here.",
          userName ? `Hey, ${userName}. I hope you slept well.` : "Hey. I hope you slept well.",
        ];
      } else if (hour >= 12 && hour < 17) {
        fallbackGreetings = [
          userName ? `Hey, ${userName}. I hope your day's been kind to you.` : "Hey. I hope your day's been kind to you.",
          userName ? `Hi, ${userName}. It's good to see you.` : "Hi. It's good to see you.",
          userName ? `Good afternoon, ${userName}.` : "Good afternoon.",
        ];
      } else if (hour >= 17 && hour < 22) {
        fallbackGreetings = [
          userName ? `Hey, ${userName}. I hope today was gentle on you.` : "Hey. I hope today was gentle on you.",
          userName ? `Good evening, ${userName}. It's nice to see you.` : "Good evening. It's nice to see you.",
          userName ? `Hi, ${userName}. I hope you're winding down okay.` : "Hi. I hope you're winding down okay.",
        ];
      } else {
        fallbackGreetings = [
          userName ? `Hey, ${userName}. It's late—I hope you're okay.` : "Hey. It's late—I hope you're okay.",
          userName ? `Hi, ${userName}. Take your time.` : "Hi. Take your time.",
          userName ? `Hey, ${userName}. No pressure to talk.` : "Hey. No pressure to talk.",
        ];
      }
      // Filter out recently used fallbacks
      const availableFallbacks = fallbackGreetings.filter(g => !isTooSimilar(g, recentGreetings, 0.7));
      const selectedFallback = availableFallbacks.length > 0 
        ? availableFallbacks[Math.floor(Math.random() * availableFallbacks.length)]
        : fallbackGreetings[Math.floor(Math.random() * fallbackGreetings.length)];
      
      // Save to history
      await saveGreetingToHistory(effectiveUserId, selectedFallback);
      return res.json({ ok: true, message: selectedFallback, greeting: selectedFallback });
    }
    
    // Build personalization context for the AI
    const userContext = {
      name: userName || null,
      timeOfDay: timeOfDay || (localTime ? getTimeOfDayFromTime(localTime) : null),
      stressLevel: stressLevel || null,
      justDidActivity: !!justDidActivity,
      hasRecentCheckIn: hasRecentCheckIn !== false, // default true unless explicitly false
      localDay: localDay || null,
    };

    const greetingPrompt = `${GREETING_SYSTEM_PROMPT}

User context:
${JSON.stringify(userContext, null, 2)}

CRITICAL - DO NOT REPEAT OR PARAPHRASE these recent welcomes:
${recentWelcomesText}

Generate ONE short greeting (1-2 sentences, max 35 words). No quotation marks.`;

    // Generate greeting with potential retry for uniqueness
    let greeting = null;
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: greetingPrompt }],
        max_tokens: 80,
        temperature: 0.85,
      });

      greeting = response.choices[0]?.message?.content?.trim() || "I'm here with you.";
      greeting = greeting.replace(/^["']|["']$/g, '');
      
      // Check similarity - regenerate if too similar
      if (!isTooSimilar(greeting, recentGreetings, 0.6)) {
        break;
      }
      console.log(`Greeting attempt ${attempts + 1} was too similar, regenerating...`);
      attempts++;
    }
    
    console.log('Generated greeting:', greeting);
    
    // Save to history
    await saveGreetingToHistory(effectiveUserId, greeting);
    
    res.json({ ok: true, message: greeting, greeting });
  } catch (error) {
    console.error('Greeting API error:', error.message || error);
    res.status(500).json({ ok: false, error: 'Failed to generate greeting', message: "Whenever you're ready.", greeting: "Whenever you're ready." });
  }
});

// Helper to derive time of day from time string
function getTimeOfDayFromTime(timeStr) {
  if (!timeStr) return null;
  const hourMatch = timeStr.match(/(\d{1,2})/);
  if (!hourMatch) return null;
  let hour = parseInt(hourMatch[1], 10);
  // Handle PM
  if (timeStr.toLowerCase().includes('pm') && hour !== 12) hour += 12;
  if (timeStr.toLowerCase().includes('am') && hour === 12) hour = 0;
  
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'late-night';
}

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
      userName,
      localDate,
      localDay,
      localTime,
      weekSessions = 0,
      weekActiveDays = 0,
      dominantKind = null,
      dominantKindCount = 0,
      journalWeekCount = 0,
    } = req.body || {};

    console.log('🧠 /api/patterns/weekly-summary sessions:', weekSessions, 'days:', weekActiveDays);

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
    const dataLine = dataParts.join('\n');

    const systemPrompt = `You are TRACE, summarizing a week of check-ins and journaling.
mode: patterns_weekly_narrative

Tone: calm, validating, no advice, no instructions.
- 2–3 sentences maximum.
- Focus on noticing consistency, effort, and the kinds of practices they're drawn to (breathing, grounding, gratitude, etc.).
- Do not mention exact counts mechanically; weave them into natural language.
- Do not ask questions.
- Talk directly to the user as "you".`;

    const userPrompt = `${contextLine ? contextLine + '\n' : ''}${dataLine}

In 2–3 sentences, gently reflect what this week's rhythm suggests about how this person has been showing up for themselves. No advice, no questions, just noticing and affirming.`;

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
