/**
 * Conversation State Layer
 * Tracks conversation stage and move types to prevent repetitive questioning
 * 
 * Stages: ARRIVAL → OPENING → SHARING → EXPLORING → PROCESSING → INTEGRATING → CLOSING
 * Move Types: OPEN_PROBE | REFLECT | SPECIFIC_FOLLOWUP | VALIDATE | SUMMARIZE | SUGGEST | CHECKIN
 */

const STAGES = {
  ARRIVAL: 'ARRIVAL',
  OPENING: 'OPENING', 
  SHARING: 'SHARING',
  EXPLORING: 'EXPLORING',
  PROCESSING: 'PROCESSING',
  INTEGRATING: 'INTEGRATING',
  CLOSING: 'CLOSING'
};

const MOVE_TYPES = {
  OPEN_PROBE: 'OPEN_PROBE',
  REFLECT: 'REFLECT',
  SPECIFIC_FOLLOWUP: 'SPECIFIC_FOLLOWUP',
  VALIDATE: 'VALIDATE',
  SUMMARIZE: 'SUMMARIZE',
  SUGGEST: 'SUGGEST',
  CHECKIN: 'CHECKIN'
};

// In-memory state storage (keyed by visitorId)
const conversationStates = new Map();
const STATE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Probe patterns - these are OPEN_PROBE moves
const OPEN_PROBE_PATTERNS = [
  /what['']?s\s+(been\s+)?on\s+your\s+mind/i,
  /how\s+(are\s+you|have\s+you\s+been)\s+feeling/i,
  /want\s+to\s+share\s+(more|anything)/i,
  /anything\s+(else|specific|you('d)?\s+(like|want)\s+to)/i,
  /what\s+would\s+you\s+like\s+to\s+talk\s+about/i,
  /what\s+brings\s+you\s+here/i,
  /is\s+there\s+something\s+(on\s+your\s+mind|you('d)?\s+like\s+to)/i,
  /what['']?s\s+going\s+on(\s+with\s+you)?/i,
  /how\s+can\s+I\s+(help|support)\s+you/i,
  /tell\s+me\s+(more\s+)?about\s+(what['']?s|yourself)/i,
  /I['']?m\s+here\s+if\s+you\s+(want|need)\s+to/i,
  /what['']?s\s+something\s+(that['']?s\s+been|you['']?ve\s+been)/i,
  /anything\s+you('d)?\s+(want|like)\s+to\s+(dive|get)\s+into/i,
  /what\s+are\s+you\s+(thinking|feeling)\s+about/i,
];

// Non-content responses (short, acknowledgment-only)
const NON_CONTENT_PATTERNS = [
  /^(ok|okay|k|kk|yes|yeah|yep|yup|no|nope|nah|sure|fine|good|great|thanks|ty|thx|cool|nice|alright|right|hmm|hm|mm|mhm|uh|um|idk|dunno|maybe|sup|hi|hey|hello|yo)\.?$/i,
];

/**
 * Get or create conversation state for a visitor
 */
function getState(visitorId) {
  if (!visitorId) return createDefaultState();
  
  // Clean expired states periodically
  cleanExpiredStates();
  
  if (!conversationStates.has(visitorId)) {
    conversationStates.set(visitorId, createDefaultState());
  }
  
  const state = conversationStates.get(visitorId);
  state.lastAccessed = Date.now();
  return state;
}

const FOLLOWUP_DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

function createDefaultState() {
  return {
    stage: STAGES.ARRIVAL,
    lastMoveType: null,
    lastAssistantIntentSignature: null,
    topicEstablished: false,
    userSetTopic: false,
    turnCount: 0,
    lastAccessed: Date.now(),
    consecutiveProbes: 0,
    lastTopicKeywords: [],
    topicAnchor: null,
    lastPrimaryMode: null,
    pendingFollowup: null,
    activeRun: null,
    consecutiveNonRunTurns: 0,
    lastPlayedTrack: null,
    preActivityContext: null,
    musicFamiliarity: 'new',
    musicFamiliarityMeta: { trackNameMentions: 0, studiosTurns: 0, deepRequestTurns: 0 },
    rhythmHistory: [],
    qStreak: 0,
    feelingCheckins: [],
  };
}

const LENGTH_TIERS = {
  ULTRA_SHORT: 'ultra_short',
  SHORT: 'short',
  MEDIUM: 'medium',
  LONG: 'long',
};

const TARGET_DISTRIBUTION = {
  [LENGTH_TIERS.ULTRA_SHORT]: 0.15,
  [LENGTH_TIERS.SHORT]: 0.35,
  [LENGTH_TIERS.MEDIUM]: 0.35,
  [LENGTH_TIERS.LONG]: 0.15,
};

const RHYTHM_WINDOW = 6;

function classifyResponseLength(text) {
  if (!text) return LENGTH_TIERS.SHORT;
  const words = text.trim().split(/\s+/).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  if (words <= 5 && sentences <= 1) return LENGTH_TIERS.ULTRA_SHORT;
  if (sentences <= 2 && words <= 25) return LENGTH_TIERS.SHORT;
  if (sentences <= 4 && words <= 60) return LENGTH_TIERS.MEDIUM;
  return LENGTH_TIERS.LONG;
}

function classifyUserEnergy(userMessage) {
  if (!userMessage) return 'low';
  const trimmed = userMessage.trim();
  const words = trimmed.split(/\s+/).length;
  const sentences = trimmed.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

  const lowEnergyPatterns = [
    /^(yeah|yea|ya|yep|yup|ok|okay|k|sure|fine|idk|dunno|meh|nah|nope|whatever|ig|i guess|hmm|hm|mm)\.?$/i,
    /^i('m| am) (just |)(tired|exhausted|done|over it|burned out|drained)\.?$/i,
    /^not (really|much|great)\.?$/i,
    /^(same|nothing|nm|no)\.?$/i,
  ];

  for (const p of lowEnergyPatterns) {
    if (p.test(trimmed)) return 'low';
  }

  if (words <= 4) return 'low';
  if (words <= 12) return 'medium';
  if (words >= 30 || sentences >= 3) return 'high';
  return 'medium';
}

function recordResponseLength(visitorId, responseText) {
  const state = getState(visitorId);
  const tier = classifyResponseLength(responseText);
  if (!state.rhythmHistory) state.rhythmHistory = [];
  state.rhythmHistory.push(tier);
  if (state.rhythmHistory.length > RHYTHM_WINDOW) {
    state.rhythmHistory = state.rhythmHistory.slice(-RHYTHM_WINDOW);
  }
  saveState(visitorId, state);
  return tier;
}

function getNextLengthNudge(visitorId, userMessage, opts = {}) {
  const state = getState(visitorId);
  const history = state.rhythmHistory || [];
  const userEnergy = classifyUserEnergy(userMessage);
  const isCrisis = opts.isCrisis || false;
  const isOnboarding = opts.isOnboarding || false;

  if (isCrisis) return { tier: LENGTH_TIERS.SHORT, reason: 'crisis_override', userEnergy };
  if (isOnboarding) return { tier: LENGTH_TIERS.MEDIUM, reason: 'onboarding', userEnergy };

  if (userEnergy === 'low') {
    const lowOptions = [LENGTH_TIERS.ULTRA_SHORT, LENGTH_TIERS.ULTRA_SHORT, LENGTH_TIERS.SHORT];
    const pick = lowOptions[Math.floor(Math.random() * lowOptions.length)];
    return { tier: pick, reason: 'user_low_energy', userEnergy };
  }

  if (history.length < 2) {
    return { tier: LENGTH_TIERS.SHORT, reason: 'early_conversation', userEnergy };
  }

  const recent3 = history.slice(-3);
  const counts = {};
  for (const t of recent3) counts[t] = (counts[t] || 0) + 1;

  if (counts[LENGTH_TIERS.MEDIUM] >= 2 || counts[LENGTH_TIERS.LONG] >= 2) {
    return { tier: LENGTH_TIERS.ULTRA_SHORT, reason: 'rhythm_break_after_density', userEnergy };
  }

  if (counts[LENGTH_TIERS.ULTRA_SHORT] >= 2 || counts[LENGTH_TIERS.SHORT] >= 3) {
    if (userEnergy === 'high') {
      return { tier: LENGTH_TIERS.MEDIUM, reason: 'rhythm_break_user_searching', userEnergy };
    }
    return { tier: LENGTH_TIERS.MEDIUM, reason: 'rhythm_break_after_brevity', userEnergy };
  }

  if (userEnergy === 'high' && history[history.length - 1] !== LENGTH_TIERS.LONG) {
    const roll = Math.random();
    if (roll < 0.3) return { tier: LENGTH_TIERS.LONG, reason: 'user_high_energy_depth', userEnergy };
    return { tier: LENGTH_TIERS.MEDIUM, reason: 'user_high_energy_default', userEnergy };
  }

  const defaultWeights = [
    { tier: LENGTH_TIERS.ULTRA_SHORT, weight: 0.15 },
    { tier: LENGTH_TIERS.SHORT, weight: 0.40 },
    { tier: LENGTH_TIERS.MEDIUM, weight: 0.30 },
    { tier: LENGTH_TIERS.LONG, weight: 0.15 },
  ];

  const lastTier = history[history.length - 1];
  const adjusted = defaultWeights.map(w => {
    if (w.tier === lastTier) return { ...w, weight: w.weight * 0.4 };
    return w;
  });

  const totalWeight = adjusted.reduce((s, w) => s + w.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const w of adjusted) {
    roll -= w.weight;
    if (roll <= 0) return { tier: w.tier, reason: 'weighted_distribution', userEnergy };
  }

  return { tier: LENGTH_TIERS.SHORT, reason: 'fallback', userEnergy };
}

const BUDDY_ACKNOWLEDGMENTS = {
  neutral: ['yeah.', 'makes sense.', 'fair.', 'got it.', 'mm.'],
  heavy: ['damn.', 'yeah.', 'that\'s a lot.', 'heavy.', 'yeah, I hear that.'],
  affirm: ['yeah, that tracks.', 'real.', 'that makes sense.', 'yeah.', 'fair enough.'],
  searching: ['huh.', 'interesting.', 'wait—', 'okay, hold on.', 'say more.'],
};

function pickBuddyAck(userMessage) {
  if (!userMessage) return BUDDY_ACKNOWLEDGMENTS.neutral[0];
  const lower = userMessage.toLowerCase();

  const heavyPatterns = /tired|exhausted|done|can't|hurt|lost|alone|scared|angry|hate|sick of|over it|burned|drained|crying|broke/i;
  const searchingPatterns = /why|what if|wonder|maybe|think about|keep (going|coming) back|realize/i;
  const affirmPatterns = /right|exactly|that's it|yes|yeah|totally|for real/i;

  let pool;
  if (heavyPatterns.test(lower)) pool = BUDDY_ACKNOWLEDGMENTS.heavy;
  else if (searchingPatterns.test(lower)) pool = BUDDY_ACKNOWLEDGMENTS.searching;
  else if (affirmPatterns.test(lower)) pool = BUDDY_ACKNOWLEDGMENTS.affirm;
  else pool = BUDDY_ACKNOWLEDGMENTS.neutral;

  return pool[Math.floor(Math.random() * pool.length)];
}

function buildRhythmPromptDirective(nudge, opts = {}) {
  if (!nudge || !nudge.tier) return '';
  const nextMove = opts.nextMove || null;

  const needsQuestion = nextMove && (nextMove === 'reflect_then_question' || nextMove === 'question_only');

  if (nudge.tier === LENGTH_TIERS.ULTRA_SHORT && needsQuestion) {
    return `RESPONSE LENGTH: Short this turn. 1-2 sentences max. One observation or one question — not both. Keep it tight. Don't fill space.`;
  }

  const directives = {
    [LENGTH_TIERS.ULTRA_SHORT]: `RESPONSE LENGTH: Ultra-short this turn. 1-5 words max. A brief acknowledgment, a single reaction, or just a word. Examples: "yeah." / "damn." / "that tracks." / "huh." Do NOT add a question. Do NOT elaborate.`,

    [LENGTH_TIERS.SHORT]: `RESPONSE LENGTH: Short this turn. 1-2 sentences max. One observation or one question — not both. Keep it tight. Don't fill space.`,

    [LENGTH_TIERS.MEDIUM]: `RESPONSE LENGTH: Medium this turn. 2-4 sentences. You can reflect and ask one question. Stay conversational — no paragraphs, no lists. If the user mentioned something specific earlier in this conversation, you can reference it casually ("you said something about ___ earlier" or "wait, that connects to what you were saying about ___") — but only if it's natural, not forced.`,

    [LENGTH_TIERS.LONG]: `RESPONSE LENGTH: Longer this turn — the user is working something out. 3-6 sentences okay. Stay conversational, not essayistic. Name what you're noticing. One question max. Feel free to lightly reference something they said earlier if it connects — like a friend who was actually listening.`,
  };

  return directives[nudge.tier] || '';
}

const KNOWN_TRACK_NAMES = [
  'midnight underwater', 'slow tides', 'slow tides over glass',
  'undertow', 'euphoria', 'ocean breathing',
  'tidal house', 'tidal memory', 'neon promise', 'night swim'
];

const PLAY_INTENT_PATTERNS = [
  /play\s+(some|a|the)?\s*(trace|night swim|music|track|album|song)/i,
  /put\s+on\s+(some|a|the)?\s*(trace|night swim|music|track|album|song)/i,
  /can\s+(you|i)\s+(hear|listen|play)/i,
  /queue\s+up/i,
  /let('s|s)?\s+listen/i,
];

const DEEP_REQUEST_PATTERNS = [
  /track\s*(list|order|number)/i,
  /what\s*(track|song)\s*(is|was)\s*(that|this|next|after)/i,
  /lyrics/i,
  /reel\s*(concept|idea|visual)/i,
  /album\s*(art|cover|concept|order|track)/i,
  /which\s+track/i,
  /how\s+many\s+tracks/i,
];

function evaluateMusicFamiliarity(state, userMessage, primaryMode) {
  const prev = state.musicFamiliarity || 'new';
  const meta = state.musicFamiliarityMeta || { trackNameMentions: 0, studiosTurns: 0, deepRequestTurns: 0 };
  const msgLower = (userMessage || '').toLowerCase();

  if (primaryMode === 'studios') {
    meta.studiosTurns++;
  }

  const mentionsTrack = KNOWN_TRACK_NAMES.some(t => msgLower.includes(t));
  if (mentionsTrack) meta.trackNameMentions++;

  const hasPlayIntent = PLAY_INTENT_PATTERNS.some(p => p.test(msgLower));
  const hasDeepRequest = DEEP_REQUEST_PATTERNS.some(p => p.test(msgLower));
  if (hasDeepRequest && primaryMode === 'studios') meta.deepRequestTurns++;

  let next = prev;

  if (prev === 'new') {
    if (hasPlayIntent || mentionsTrack || meta.studiosTurns >= 2) {
      next = 'aware';
    }
  }

  if (next === 'aware') {
    if (meta.trackNameMentions >= 3 || (meta.deepRequestTurns >= 2 && meta.studiosTurns >= 4)) {
      next = 'fan';
    }
  }

  state.musicFamiliarity = next;
  state.musicFamiliarityMeta = meta;

  return { prev, next, reason: next !== prev ? buildFamiliarityReason(meta, hasPlayIntent, mentionsTrack, hasDeepRequest) : 'no_change' };
}

function buildFamiliarityReason(meta, hasPlayIntent, mentionsTrack, hasDeepRequest) {
  const parts = [];
  if (hasPlayIntent) parts.push('play_intent');
  if (mentionsTrack) parts.push(`track_mention(${meta.trackNameMentions})`);
  if (meta.studiosTurns >= 2) parts.push(`studios_turns(${meta.studiosTurns})`);
  if (hasDeepRequest) parts.push(`deep_request(${meta.deepRequestTurns})`);
  return parts.join('+') || 'threshold_met';
}

const ACTIVE_RUN_DEFAULT_TTL_MS = 720000;

function setActiveRun(state, { mode, anchorLabel }) {
  const now = Date.now();
  if (state.activeRun && state.activeRun.mode === mode) {
    state.activeRun.lastTouchedAtMs = now;
    state.activeRun.anchorLabel = anchorLabel || state.activeRun.anchorLabel;
  } else {
    state.activeRun = {
      mode: mode || 'studios',
      anchorLabel: anchorLabel || 'music exploration',
      startedAtMs: now,
      lastTouchedAtMs: now,
      ttlMs: ACTIVE_RUN_DEFAULT_TTL_MS,
    };
  }
  state.consecutiveNonRunTurns = 0;
}

function getActiveRun(state) {
  if (!state?.activeRun) return null;
  const ar = state.activeRun;
  const elapsed = Date.now() - ar.lastTouchedAtMs;
  if (elapsed > ar.ttlMs) {
    state.activeRun = null;
    state.consecutiveNonRunTurns = 0;
    return { ...ar, expired: true };
  }
  return { ...ar, expired: false };
}

function clearActiveRun(state, reason) {
  state.activeRun = null;
  state.consecutiveNonRunTurns = 0;
  return reason || 'manual_clear';
}

function incrementNonRunTurns(state) {
  state.consecutiveNonRunTurns = (state.consecutiveNonRunTurns || 0) + 1;
  return state.consecutiveNonRunTurns;
}

function setPendingFollowup(state, { activityId, activityName, ttlMs }) {
  state.pendingFollowup = {
    type: 'activity_reflection',
    expectedIntent: 'reflection_answer',
    activityId: activityId || null,
    activityName: activityName || 'an activity',
    createdAtMs: Date.now(),
    ttlMs: ttlMs || FOLLOWUP_DEFAULT_TTL_MS
  };
}

function getPendingFollowup(state) {
  if (!state?.pendingFollowup) return null;
  const pf = state.pendingFollowup;
  const elapsed = Date.now() - pf.createdAtMs;
  if (elapsed > pf.ttlMs) {
    state.pendingFollowup = null;
    return { ...pf, expired: true };
  }
  return { ...pf, expired: false };
}

function clearPendingFollowup(state) {
  state.pendingFollowup = null;
}

function saveState(visitorId, state) {
  if (visitorId) {
    conversationStates.set(visitorId, { ...state, lastAccessed: Date.now() });
  }
}

function cleanExpiredStates() {
  const now = Date.now();
  for (const [id, state] of conversationStates.entries()) {
    if (now - state.lastAccessed > STATE_TTL_MS) {
      conversationStates.delete(id);
    }
  }
}

/**
 * Detect if user message contains real content (not just acknowledgment)
 */
function userHasContent(message) {
  if (!message) return false;
  const trimmed = message.trim();
  
  for (const pattern of NON_CONTENT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }
  
  const wordCount = trimmed.split(/\s+/).length;
  const hasLength = trimmed.length >= 8;
  const hasMultipleWords = wordCount >= 2;
  const hasPunctuation = /[,!?\-\.]/.test(trimmed.slice(0, -1));
  const hasEmotionWord = /feel|felt|think|thought|worried|anxious|sad|happy|stressed|tired|overwhelmed|scared|angry|frustrated|confused|lost|stuck|hurt/i.test(trimmed);
  const hasTopicWord = /work|job|school|family|friend|sleep|dream|music|health|money|move|break|stress|busy|crazy|everything|nothing|lot|stuff|things/i.test(trimmed);
  
  return hasLength || hasMultipleWords || hasPunctuation || hasEmotionWord || hasTopicWord;
}

/**
 * Extract topic keywords from user message
 */
function extractTopicKeywords(message) {
  if (!message) return [];
  const keywords = [];
  
  // Look for specific topics
  const topicPatterns = [
    { pattern: /\b(work|job|boss|coworker|office|career|meeting|interview)\b/i, topic: 'work' },
    { pattern: /\b(school|class|teacher|homework|exam|grade|college|university|semester|studying)\b/i, topic: 'school' },
    { pattern: /\b(mom|dad|parent|family|brother|sister|son|daughter|wife|husband|partner|teenager|teen|kid|child|baby|mama|papa)\b/i, topic: 'family' },
    { pattern: /\b(she'?s opening up|he'?s opening up|opening up to me|talking to me more)\b/i, topic: 'parenting' },
    { pattern: /\b(friend|friendship|social|lonely|alone)\b/i, topic: 'relationships' },
    { pattern: /\b(sleep|tired|exhausted|insomnia|rest)\b/i, topic: 'sleep' },
    { pattern: /\b(anxious|anxiety|worried|nervous|panic)\b/i, topic: 'anxiety' },
    { pattern: /\b(sad|depressed|down|low|empty)\b/i, topic: 'sadness' },
    { pattern: /\b(stress|stressed|pressure|overwhelmed)\b/i, topic: 'stress' },
    { pattern: /\b(dream|nightmare|dreamt|dreamed)\b/i, topic: 'dreams' },
    { pattern: /\b(music|song|listening|album)\b/i, topic: 'music' },
    { pattern: /\b(money|rent|bills|debt|broke|paycheck|financial)\b/i, topic: 'finances' },
    { pattern: /\b(health|sick|pain|doctor|hospital|medication|meds)\b/i, topic: 'health' },
    { pattern: /\b(breakup|broke up|ex|divorce|separated)\b/i, topic: 'breakup' },
    { pattern: /\b(move|moving|new place|apartment|house)\b/i, topic: 'life change' },
  ];
  
  for (const { pattern, topic } of topicPatterns) {
    if (pattern.test(message)) {
      keywords.push(topic);
    }
  }
  
  return keywords;
}

/**
 * Classify assistant response move type
 */
function classifyMoveType(response) {
  if (!response) return MOVE_TYPES.CHECKIN;
  
  // Check for open probe patterns
  for (const pattern of OPEN_PROBE_PATTERNS) {
    if (pattern.test(response)) {
      return MOVE_TYPES.OPEN_PROBE;
    }
  }
  
  // Check for reflection patterns
  if (/sounds like|seems like|I hear|that must|it makes sense/i.test(response)) {
    return MOVE_TYPES.REFLECT;
  }
  
  // Check for validation
  if (/that's (valid|real|understandable|okay)|makes sense|of course/i.test(response)) {
    return MOVE_TYPES.VALIDATE;
  }
  
  // Check for specific follow-up (references specific content)
  if (/\?$/.test(response.trim()) && response.length > 30) {
    return MOVE_TYPES.SPECIFIC_FOLLOWUP;
  }
  
  // Check for suggestions
  if (/maybe|could try|how about|want me to/i.test(response)) {
    return MOVE_TYPES.SUGGEST;
  }
  
  return MOVE_TYPES.CHECKIN;
}

/**
 * Rebuild conversation state from message history
 * Called when getState creates a fresh default state but messages exist
 */
function reconstructStateFromMessages(state, messages) {
  if (!messages || messages.length === 0) return state;
  
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  
  state.turnCount = Math.max(userMessages.length, assistantMessages.length);
  
  let contentCount = 0;
  const allTopics = [];
  
  for (const msg of userMessages) {
    const content = msg.content || '';
    if (userHasContent(content)) contentCount++;
    const topics = extractTopicKeywords(content);
    for (const t of topics) {
      if (!allTopics.includes(t)) allTopics.push(t);
    }
  }
  
  if (allTopics.length > 0) {
    state.lastTopicKeywords = allTopics.slice(-5);
    state.topicEstablished = true;
  }
  
  if (contentCount >= 2 || state.turnCount >= 4) {
    state.stage = STAGES.EXPLORING;
  } else if (contentCount >= 1 || state.turnCount >= 2) {
    state.stage = STAGES.SHARING;
    state.topicEstablished = true;
  } else if (state.turnCount >= 1) {
    state.stage = STAGES.OPENING;
  }
  
  if (assistantMessages.length > 0) {
    const lastAssistant = assistantMessages[assistantMessages.length - 1];
    state.lastMoveType = classifyMoveType(lastAssistant.content || '');
  }

  let trailingQStreak = 0;
  for (let i = assistantMessages.length - 1; i >= 0; i--) {
    if (/\?/.test(assistantMessages[i].content || '')) trailingQStreak++;
    else break;
  }
  state.qStreak = trailingQStreak;
  
  console.log(`[CONVO_STATE] Reconstructed from ${messages.length} messages: stage=${state.stage}, turns=${state.turnCount}, topics=[${state.lastTopicKeywords.join(', ')}], contentMsgs=${contentCount}, qStreak=${trailingQStreak}`);
  
  return state;
}

/**
 * Advance conversation stage based on user content
 */
function advanceStage(state, userMessage) {
  const hasContent = userHasContent(userMessage);
  const topics = extractTopicKeywords(userMessage);
  
  if (topics.length > 0) {
    state.lastTopicKeywords = topics;
    state.userSetTopic = true;
  }
  
  if (state.turnCount >= 3 && (state.stage === STAGES.ARRIVAL || state.stage === STAGES.OPENING)) {
    state.stage = STAGES.SHARING;
    state.topicEstablished = true;
    console.log(`[CONVO_STATE] Auto-advanced past ARRIVAL after ${state.turnCount} turns`);
  }
  
  if (hasContent) {
    if (state.stage === STAGES.ARRIVAL || state.stage === STAGES.OPENING) {
      state.stage = STAGES.SHARING;
      state.topicEstablished = true;
      console.log(`[CONVO_STATE] Stage advanced: ${STAGES.OPENING} → ${STAGES.SHARING}`);
    } else if (state.stage === STAGES.SHARING) {
      state.stage = STAGES.EXPLORING;
      console.log(`[CONVO_STATE] Stage advanced: ${STAGES.SHARING} → ${STAGES.EXPLORING}`);
    }
    
    if (/overwhelm|really (sad|scared|anxious|stressed)|can't (stop|handle|take)/i.test(userMessage)) {
      state.stage = STAGES.PROCESSING;
      console.log(`[CONVO_STATE] Emotional intensity detected → ${STAGES.PROCESSING}`);
    }
  }
  
  return hasContent;
}

/**
 * Build prompt injection for conversation state
 */
function buildStatePromptInjection(state, userHadContent) {
  let injection = `
=== CONVERSATION STATE (CRITICAL) ===
Stage: ${state.stage}
Last Move Type: ${state.lastMoveType || 'NONE'}
Topic Established: ${state.topicEstablished}
Topics Mentioned: ${state.lastTopicKeywords.length > 0 ? state.lastTopicKeywords.join(', ') : 'none yet'}
Turn Count: ${state.turnCount}
`;

  // HARD RULE: No consecutive open probes
  if (state.lastMoveType === MOVE_TYPES.OPEN_PROBE) {
    injection += `
CRITICAL RULE - DO NOT VIOLATE:
Your last message was an OPEN_PROBE (generic question like "what's on your mind?").
You CANNOT ask another generic open-ended question. This would feel repetitive and distant.

REQUIRED: Your next response MUST be one of:
- REFLECT: Mirror what they said, show you heard them ("sounds like...", "that's real")
- SPECIFIC_FOLLOWUP: Ask about something SPECIFIC they mentioned
- VALIDATE: Acknowledge their experience without questioning
- Or simply be present without asking anything

DO NOT say:
- "What's on your mind?"
- "How are you feeling?"
- "Want to share more?"
- "Anything else?"
- "What would you like to talk about?"
- "Is there something specific?"
- Any variation of these generic probes
`;
  }

  if (userHadContent && state.topicEstablished) {
    injection += `
USER PROVIDED CONTENT - RESPOND TO IT:
They shared something real. Reference it. Don't reset with a generic question.
If they mentioned: ${state.lastTopicKeywords.join(', ') || 'a topic'} — stay with that.
`;
  }

  if (state.stage === STAGES.ARRIVAL || state.stage === STAGES.OPENING) {
    injection += `
You're in early conversation. One gentle probe is acceptable, but make it warm, not clinical.
`;
  } else if (state.stage === STAGES.SHARING || state.stage === STAGES.EXPLORING) {
    injection += `
They're sharing. Follow their thread. Reflect, validate, or ask something SPECIFIC to what they said.
Generic probes are NOT allowed at this stage.
`;
  }

  return injection;
}

/**
 * Check if response violates probe rules
 * Only fires when user has genuinely shared content AND model ignores it
 */
function violatesProbeRules(response, state, userHadContent) {
  const moveType = classifyMoveType(response);
  
  if (moveType !== MOVE_TYPES.OPEN_PROBE) return false;
  
  if (moveType === MOVE_TYPES.OPEN_PROBE && 
      state.lastMoveType === MOVE_TYPES.OPEN_PROBE && 
      userHadContent &&
      state.consecutiveProbes >= 2) {
    console.log(`[CONVO_GUARD] VIOLATION: ${state.consecutiveProbes}x consecutive OPEN_PROBE after user content`);
    return true;
  }
  
  if (moveType === MOVE_TYPES.OPEN_PROBE && !userHadContent) {
    console.log(`[CONVO_GUARD] OPEN_PROBE allowed — user hasn't shared real content yet`);
    return false;
  }
  
  const hasUserDrivenTopic = state.topicEstablished && 
    state.lastTopicKeywords && 
    state.lastTopicKeywords.length > 0 &&
    state.userSetTopic === true;
  
  if (moveType === MOVE_TYPES.OPEN_PROBE && 
      hasUserDrivenTopic && 
      userHadContent &&
      state.stage === STAGES.PROCESSING) {
    console.log(`[CONVO_GUARD] VIOLATION: OPEN_PROBE in PROCESSING with user-set topic [${state.lastTopicKeywords.join(', ')}]`);
    return true;
  }
  
  return false;
}

/**
 * Generate a fallback response when model keeps violating rules.
 * Stage-aware and topic-threading — feels alive, not scripted.
 */
function generateFallbackResponse(state) {
  const topics = state.lastTopicKeywords;
  const stage = state.stage;
  const turn = state.turnCount || 0;

  if (topics.length > 0) {
    const topicPools = {
      'work': [
        "what part of the work thing keeps replaying?",
        "is it the job itself or what it's costing you?",
        "work. what would feel different if you could change one thing about it?",
      ],
      'family': [
        "family — which part of that is yours to carry and which part isn't?",
        "is it something recent or something that's been building?",
        "what do you wish they understood?",
      ],
      'relationships': [
        "what changed? or did something just become harder to ignore?",
        "is this about what happened or about what it means?",
        "what would you say to them if you knew they'd actually hear it?",
      ],
      'sleep': [
        "what's running through your head when you can't sleep?",
        "is the sleep thing new or has it been a pattern?",
        "when was the last time you actually slept well? what was different?",
      ],
      'anxiety': [
        "where does it sit in your body right now?",
        "is there a specific thing driving it or is it more like a hum?",
        "what would 'less anxious' look like in the next hour?",
      ],
      'sadness': [
        "what does the sadness want you to know?",
        "is this a missing-something sadness or a tired-of-something sadness?",
        "when did it get heavier?",
      ],
      'stress': [
        "what's the thing you keep circling back to?",
        "if you could drop one thing from the pile, which one would breathe easier?",
        "is anything actually urgent or does everything just feel urgent?",
      ],
      'dreams': [
        "what part of the dream stayed with you?",
        "did it feel more like a warning or more like processing?",
        "who showed up in it?",
      ],
      'music': [
        "mm. let it sit.",
        "how's this one landing?",
        "something else, or stay here?",
      ],
    };

    for (const topic of topics) {
      const pool = topicPools[topic];
      if (pool) {
        const idx = (turn + Date.now()) % pool.length;
        return pool[idx];
      }
    }
  }

  if (stage === STAGES.ARRIVAL || stage === STAGES.OPENING) {
    const earlyFallbacks = [
      "I'm here. no agenda.",
      "take your time. I'm not going anywhere.",
      "whenever you're ready.",
    ];
    return earlyFallbacks[(turn + Date.now()) % earlyFallbacks.length];
  }

  if (stage === STAGES.PROCESSING || stage === STAGES.EXPLORING) {
    const deepFallbacks = [
      "mm. stay with that for a second.",
      "you don't have to figure it out right now.",
      "that's heavier than it sounds, isn't it.",
    ];
    return deepFallbacks[(turn + Date.now()) % deepFallbacks.length];
  }

  const presentFallbacks = [
    "still here.",
    "mm. I'm listening.",
    "yeah. keep going.",
    "take your time with it.",
  ];
  return presentFallbacks[(turn + Date.now()) % presentFallbacks.length];
}

/**
 * Update state after response is sent
 */
const FEELING_CHECKIN_RE = /\bhow (are you|do you|have you been) feel/i;
const FEELING_CHECKIN_RE2 = /\bhow('s| is) (that|this|it) (feel|making you feel|sitting with you)/i;
const FEELING_CHECKIN_RE3 = /\bwhat (are you|do you) feel/i;

function updateStateAfterResponse(visitorId, response) {
  const state = getState(visitorId);
  const moveType = classifyMoveType(response);
  
  state.lastMoveType = moveType;
  state.turnCount++;
  
  if (moveType === MOVE_TYPES.OPEN_PROBE) {
    state.consecutiveProbes++;
  } else {
    state.consecutiveProbes = 0;
  }

  const hasQuestion = /\?/.test(response || '');
  state.qStreak = hasQuestion ? (state.qStreak || 0) + 1 : 0;

  const isFeelingCheckin = FEELING_CHECKIN_RE.test(response || '') || FEELING_CHECKIN_RE2.test(response || '') || FEELING_CHECKIN_RE3.test(response || '');
  if (!state.feelingCheckins) state.feelingCheckins = [];
  state.feelingCheckins.push(isFeelingCheckin ? 1 : 0);
  if (state.feelingCheckins.length > 10) state.feelingCheckins = state.feelingCheckins.slice(-10);
  
  console.log(`[CONVO_STATE] After response: { stage: ${state.stage}, moveType: ${moveType}, turn: ${state.turnCount}, topics: [${state.lastTopicKeywords.join(', ')}] }`);
  console.log(`[Q_GUARD] qStreak=${state.qStreak} feelingCheckins10=${state.feelingCheckins.filter(x=>x).length}`);
  
  saveState(visitorId, state);
  return state;
}

function getQuestionCooldown(visitorId) {
  const state = getState(visitorId);
  const qStreak = state.qStreak || 0;
  const feelingCount = (state.feelingCheckins || []).filter(x => x).length;
  return { questionCooldown: qStreak >= 1, feelingCooldown: feelingCount >= 1, qStreak, feelingCount };
}

async function loadMusicFamiliarity(supabase, userId, state) {
  if (!supabase || !userId) return;
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('music_familiarity, music_familiarity_meta')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return;
    if (data.music_familiarity) {
      state.musicFamiliarity = data.music_familiarity;
    }
    if (data.music_familiarity_meta) {
      state.musicFamiliarityMeta = data.music_familiarity_meta;
    }
    console.log(`[MUSIC_FAMILIARITY] Loaded from Supabase: ${state.musicFamiliarity}`);
  } catch (e) {
    console.warn('[MUSIC_FAMILIARITY] Load error:', e.message);
  }
}

async function saveMusicFamiliarity(supabase, userId, state) {
  if (!supabase || !userId) return;
  try {
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        music_familiarity: state.musicFamiliarity || 'new',
        music_familiarity_meta: state.musicFamiliarityMeta || { trackNameMentions: 0, studiosTurns: 0, deepRequestTurns: 0 },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    if (error) {
      console.warn('[MUSIC_FAMILIARITY] Save error:', error.message);
    }
  } catch (e) {
    console.warn('[MUSIC_FAMILIARITY] Save error:', e.message);
  }
}

// ============================================================
// TRACE CONTROL BLOCK
// Prepended as a separate system message on every /api/chat call.
// Provides deterministic constraints (length, question budget,
// context anchors) so the LLM doesn't have to guess.
// ============================================================

const CONTROL_LENGTH_MODES = {
  micro:  { label: 'micro',  maxWords: 5  },
  short:  { label: 'short',  maxWords: 20 },
  medium: { label: 'medium', maxWords: 50 },
  long:   { label: 'long',   maxWords: 90 },
};

function computeLengthMode(rhythmNudge) {
  if (!rhythmNudge || !rhythmNudge.tier) return CONTROL_LENGTH_MODES.short;
  switch (rhythmNudge.tier) {
    case LENGTH_TIERS.ULTRA_SHORT: return CONTROL_LENGTH_MODES.micro;
    case LENGTH_TIERS.SHORT:       return CONTROL_LENGTH_MODES.short;
    case LENGTH_TIERS.MEDIUM:      return CONTROL_LENGTH_MODES.medium;
    case LENGTH_TIERS.LONG:        return CONTROL_LENGTH_MODES.long;
    default:                       return CONTROL_LENGTH_MODES.short;
  }
}

function computeQuestionMode(visitorId) {
  const state = getState(visitorId);
  const qStreak = state.qStreak || 0;
  if (qStreak >= 1) {
    return { mode: 'WITNESS_ONLY', budget: 0 };
  }
  return { mode: 'ALLOW_ONE', budget: 1 };
}

function buildControlBlock({
  visitorId,
  rhythmNudge,
  soundscapeName,
  mood,
  localTime,
  anchorsText,
  sessionSummary,
  doorContext,
}) {
  const lengthMode = computeLengthMode(rhythmNudge);
  const questionMode = computeQuestionMode(visitorId);

  const lines = [
    'TRACE_CONTROL_BLOCK',
    `SOUNDSCAPE: ${soundscapeName || 'presence'} | mood=${mood || 'neutral'}`,
    `TIME: ${localTime || 'unknown'}`,
  ];

  lines.push('RELATIONAL_ANCHORS:');
  lines.push(anchorsText || '(none)');
  lines.push('');

  lines.push('SESSION_CONTINUITY:');
  lines.push(sessionSummary || '(new session)');
  lines.push('');

  lines.push(`LENGTH_MODE: ${lengthMode.label}`);
  lines.push(`QUESTION_MODE: ${questionMode.mode}`);
  lines.push(`QUESTION_BUDGET: ${questionMode.budget}`);
  lines.push(`DOOR_CONTEXT: ${doorContext || 'none'}`);
  lines.push('');

  lines.push('OUTPUT_CONSTRAINTS:');
  lines.push(`- Max words this turn: ${lengthMode.maxWords}`);
  lines.push(`- Questions allowed this turn: ${questionMode.budget}`);
  lines.push('- If QUESTIONS_ALLOWED=0: no \'?\' and no implied questions.');
  lines.push('- If SOUNDSCAPE is heavy: prefer micro/short.');
  lines.push('END_CONTROL_BLOCK');

  return lines.join('\n');
}

// ============================================================
// SERVER-SIDE ENFORCEMENT — "No Drift" Guardrails
// Run after the model returns a draft, before sending to user.
// ============================================================

const FORBIDDEN_PHRASES = [
  'i hear you saying',
  'what i\'m hearing is',
  'it\'s important to',
  'it\'s okay to feel',
  'remember that you',
  'you deserve to',
  'be gentle with yourself',
  'give yourself grace',
  'give yourself permission',
  'practice self-care',
  'practice self-compassion',
  'take care of yourself',
  'you are enough',
  'you are worthy',
  'you are not alone',
  'you\'re not alone in this',
  'you matter',
  'i\'m here for you',
  'i\'m so proud of you',
  'sending you',
  'sending love',
  'sending hugs',
  'virtual hug',
  'big hug',
  'safe space',
  'coping mechanism',
  'coping strategy',
  'coping skill',
  'have you tried',
  'you might want to try',
  'i would suggest',
  'i would recommend',
  'my suggestion is',
  'let me suggest',
  'one thing you can do',
  'one thing that might help',
  'a helpful strategy',
  'tools in your toolbox',
  'tools in your toolkit',
  'that\'s perfectly normal',
  'that\'s completely valid',
  'your feelings are valid',
  'it\'s completely normal',
  'and that\'s okay',
  'first of all',
  'i want you to know',
  'let\'s unpack that',
  'let\'s explore that',
  'let\'s dig into that',
  'let me reflect back',
  'what i notice is',
  'i\'m sensing that',
];

const THERAPY_PATTERNS = [
  /\b(it sounds like)\b/i,
  /\b(i hear you)\b/i,
  /\b(that must be)\b/i,
  /\b(that sounds really)\b/i,
  /\b(i can only imagine)\b/i,
  /\b(how does that make you feel)\b/i,
  /\b(what comes up for you)\b/i,
  /\b(i want to hold space)\b/i,
  /\b(hold space for)\b/i,
  /\b(let's sit with that)\b/i,
  /\b(i'm hearing that)\b/i,
  /\b(thank you for sharing)\b/i,
  /\b(thank you for trusting me)\b/i,
  /\b(that takes courage)\b/i,
  /\b(that takes a lot of courage)\b/i,
  /\b(i appreciate you sharing)\b/i,
  /\b(on a scale of)\b/i,
];

function runHardFilter(responseText, maxWords, questionsAllowed) {
  if (!responseText || typeof responseText !== 'string') {
    return { pass: true, reasons: [] };
  }

  const reasons = [];

  if (responseText.includes('!')) {
    reasons.push('exclamation');
  }

  const lowerText = responseText.toLowerCase();
  for (const phrase of FORBIDDEN_PHRASES) {
    if (lowerText.includes(phrase)) {
      reasons.push(`forbidden:"${phrase}"`);
      break;
    }
  }

  const wordCount = responseText.split(/\s+/).filter(Boolean).length;
  if (maxWords && wordCount > maxWords) {
    reasons.push(`over_length:${wordCount}/${maxWords}`);
  }

  if (questionsAllowed === 0 && responseText.includes('?')) {
    reasons.push('question_when_disallowed');
  }

  for (const pattern of THERAPY_PATTERNS) {
    if (pattern.test(responseText)) {
      reasons.push(`therapy_pattern:${pattern.source}`);
      break;
    }
  }

  return { pass: reasons.length === 0, reasons };
}

function buildWitnessRegenPrompt(maxWords, anchorsText) {
  let prompt = `Rewrite the response in TRACE witness voice. No questions. No exclamation points. Under ${maxWords || 50} words.`;
  if (anchorsText && anchorsText !== '(none)') {
    prompt += ' Use relational anchor names.';
  }
  return prompt;
}

function enforceQuestionThrottle(responseText, questionsAllowed) {
  if (!responseText || typeof responseText !== 'string') return responseText;
  if (questionsAllowed !== 1) return responseText;

  const questionCount = (responseText.match(/\?/g) || []).length;
  if (questionCount <= 1) return responseText;

  const sentences = responseText.split(/(?<=[.!?])\s+/);
  let kept = false;
  const rewritten = sentences.map(sentence => {
    if (!sentence.includes('?')) return sentence;
    if (!kept) {
      kept = true;
      return sentence;
    }
    return sentence
      .replace(/\?$/, '.')
      .replace(/^(do you|are you|have you|can you|would you|could you|did you|will you|is it|was it|does it|don't you|isn't it|aren't you|won't you|haven't you|hasn't it)/i, (match) => {
        return match;
      });
  });

  return rewritten.join(' ');
}

module.exports = {
  STAGES,
  MOVE_TYPES,
  LENGTH_TIERS,
  getState,
  saveState,
  userHasContent,
  extractTopicKeywords,
  classifyMoveType,
  advanceStage,
  reconstructStateFromMessages,
  buildStatePromptInjection,
  violatesProbeRules,
  generateFallbackResponse,
  updateStateAfterResponse,
  OPEN_PROBE_PATTERNS,
  setPendingFollowup,
  getPendingFollowup,
  clearPendingFollowup,
  FOLLOWUP_DEFAULT_TTL_MS,
  setActiveRun,
  getActiveRun,
  clearActiveRun,
  incrementNonRunTurns,
  ACTIVE_RUN_DEFAULT_TTL_MS,
  evaluateMusicFamiliarity,
  loadMusicFamiliarity,
  saveMusicFamiliarity,
  classifyResponseLength,
  classifyUserEnergy,
  recordResponseLength,
  getNextLengthNudge,
  pickBuddyAck,
  buildRhythmPromptDirective,
  BUDDY_ACKNOWLEDGMENTS,
  getQuestionCooldown,
  buildControlBlock,
  computeQuestionMode,
  runHardFilter,
  buildWitnessRegenPrompt,
  enforceQuestionThrottle,
  FORBIDDEN_PHRASES,
  THERAPY_PATTERNS,
};
