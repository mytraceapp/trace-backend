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
    turnCount: 0,
    lastAccessed: Date.now(),
    consecutiveProbes: 0,
    lastTopicKeywords: [],
    topicAnchor: null,
    lastPrimaryMode: null,
    pendingFollowup: null,
    activeRun: null,
    consecutiveNonRunTurns: 0,
  };
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
  
  // Check for non-content patterns
  for (const pattern of NON_CONTENT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return false;
    }
  }
  
  // Content indicators
  const hasLength = trimmed.length >= 15;
  const hasMultipleWords = trimmed.split(/\s+/).length >= 3;
  const hasPunctuation = /[,!?\-\.]/.test(trimmed.slice(0, -1)); // punctuation not just at end
  const hasEmotionWord = /feel|felt|think|thought|worried|anxious|sad|happy|stressed|tired|overwhelmed|scared|angry|frustrated|confused|lost|stuck|hurt/i.test(trimmed);
  
  return hasLength || hasMultipleWords || hasPunctuation || hasEmotionWord;
}

/**
 * Extract topic keywords from user message
 */
function extractTopicKeywords(message) {
  if (!message) return [];
  const keywords = [];
  
  // Look for specific topics
  const topicPatterns = [
    { pattern: /\b(work|job|boss|coworker|office|career|meeting)\b/i, topic: 'work' },
    { pattern: /\b(mom|dad|parent|family|brother|sister|son|daughter|wife|husband|partner)\b/i, topic: 'family' },
    { pattern: /\b(friend|friendship|social|lonely|alone)\b/i, topic: 'relationships' },
    { pattern: /\b(sleep|tired|exhausted|insomnia|rest)\b/i, topic: 'sleep' },
    { pattern: /\b(anxious|anxiety|worried|nervous|panic)\b/i, topic: 'anxiety' },
    { pattern: /\b(sad|depressed|down|low|empty)\b/i, topic: 'sadness' },
    { pattern: /\b(stress|stressed|pressure|overwhelmed)\b/i, topic: 'stress' },
    { pattern: /\b(dream|nightmare|dreamt|dreamed)\b/i, topic: 'dreams' },
    { pattern: /\b(music|song|listening|album)\b/i, topic: 'music' },
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
 * Advance conversation stage based on user content
 */
function advanceStage(state, userMessage) {
  const hasContent = userHasContent(userMessage);
  const topics = extractTopicKeywords(userMessage);
  
  if (topics.length > 0) {
    state.lastTopicKeywords = topics;
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
    
    // Check for emotional content to advance to PROCESSING
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
 */
function violatesProbeRules(response, state, userHadContent) {
  const moveType = classifyMoveType(response);
  
  // Violation: consecutive open probes when user provided content
  if (moveType === MOVE_TYPES.OPEN_PROBE && 
      state.lastMoveType === MOVE_TYPES.OPEN_PROBE && 
      userHadContent) {
    console.log(`[CONVO_GUARD] VIOLATION: Consecutive OPEN_PROBE after user content`);
    return true;
  }
  
  // Violation: open probe when topic is established and we're past OPENING
  if (moveType === MOVE_TYPES.OPEN_PROBE && 
      state.topicEstablished && 
      (state.stage === STAGES.SHARING || state.stage === STAGES.EXPLORING || state.stage === STAGES.PROCESSING)) {
    console.log(`[CONVO_GUARD] VIOLATION: OPEN_PROBE in ${state.stage} stage with established topic`);
    return true;
  }
  
  return false;
}

/**
 * Generate a fallback response when model keeps violating rules
 */
function generateFallbackResponse(state) {
  const topics = state.lastTopicKeywords;
  
  if (topics.length > 0) {
    const topicResponses = {
      'work': "work stuff can weigh on you. what part's been sitting heaviest?",
      'family': "family's complicated. is there a specific moment that's stuck with you?",
      'relationships': "those connections matter. what's been different about it lately?",
      'sleep': "sleep's been tough. is it the falling asleep or the staying asleep?",
      'anxiety': "that anxious feeling — does it come in waves or is it more constant?",
      'sadness': "I hear that. is it more of a heavy feeling or more like emptiness?",
      'stress': "a lot on your plate. what's the one thing that keeps coming back to you?",
      'dreams': "dreams can surface things. anything in particular that stood out?",
      'music': "mm. how's it landing right now?",
    };
    
    for (const topic of topics) {
      if (topicResponses[topic]) {
        return topicResponses[topic];
      }
    }
  }
  
  // Generic but present fallbacks (not probing)
  const fallbacks = [
    "I'm here.",
    "mm. take your time.",
    "still with you.",
    "no rush.",
  ];
  
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

/**
 * Update state after response is sent
 */
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
  
  console.log(`[CONVO_STATE] After response: { stage: ${state.stage}, moveType: ${moveType}, turn: ${state.turnCount}, topics: [${state.lastTopicKeywords.join(', ')}] }`);
  
  saveState(visitorId, state);
  return state;
}

module.exports = {
  STAGES,
  MOVE_TYPES,
  getState,
  saveState,
  userHasContent,
  extractTopicKeywords,
  classifyMoveType,
  advanceStage,
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
  ACTIVE_RUN_DEFAULT_TTL_MS
};
