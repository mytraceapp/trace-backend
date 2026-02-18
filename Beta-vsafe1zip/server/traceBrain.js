const crypto = require('crypto');

const SUGGESTION_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
const IGNORED_COOLDOWN_MS = 20 * 60 * 1000; // 20 minutes if user ignored last suggestion
const HOOK_SESSION_COOLDOWN_MS = 60 * 60 * 1000; // 60 minutes within session
const HOOK_GLOBAL_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours global

// ============================================================
// PREMIUM CONVERSATION ENGINE v1 - State & Constants
// ============================================================
const SESSION_GAP_MS = 6 * 60 * 60 * 1000; // 6 hours = new session
const PREMIUM_MOMENT_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours rolling window
const PREMIUM_MOMENT_TURN_COOLDOWN = 15; // minimum turns between premium moments
const GUIDED_STEP_TURN_COOLDOWN = 10; // minimum turns between guided steps
const MEMORY_DECAY_MS = 6 * 60 * 60 * 1000; // 6 hours memory decay

// State caps
const MAX_RECENT_TOPICS = 5;
const MAX_ACTIVE_LOOPS = 3;
const MAX_RECENT_WINS = 3;
const MAX_RECENT_PHRASES = 8;

// Topic headers for memory extraction
const TOPIC_HEADERS = [
  'work', 'relationship', 'sleep', 'money', 'health', 'trace', 'nyla', 'church',
  'school', 'faith', 'purpose', 'family', 'career', 'anxiety', 'creativity', 'motivation'
];

// Loop keywords
const LOOP_KEYWORDS = ['stuck', 'again', 'keeps happening', 'same', 'loop', 'every time', 'always'];

// Win keywords (positive verbs)
const WIN_VERBS = ['did', 'tried', 'managed', 'finally', 'finished', 'shipped', 'completed', 'made it', 'got through'];

// Deep mode trigger keywords and verbs
const DEEP_MODE_KEYWORDS = ['plan', 'steps', 'how to', 'guide', 'explain', 'breakdown'];
const DEEP_MODE_VERBS = ['give me', 'help', 'walk me through', 'can you', 'show me', 'teach me'];

// Pause detection short responses
const PAUSE_RESPONSES = ['ok', 'okay', 'thanks', 'idk', 'sure', 'lol', 'hmm', 'yeah', 'yep', 'nah', 'k'];

// Guided step prompts
const GUIDED_STEP_PROMPTS = [
  "Want a quick 60-second reset?",
  "Want me to pull the pattern I'm seeing?",
  "Want a tiny plan for today?",
  "Want to try something small right now?",
  "Want to pause and breathe for a sec?",
];

// Next Best Question templates by intent
const NEXT_QUESTION_TEMPLATES = {
  action: [
    "What's one thing you could try right now?",
    "What would help most in the next hour?",
    "What feels doable right now?",
  ],
  clarify: [
    "What's the main thing bothering you?",
    "Can you tell me more about that?",
    "What do you mean by that?",
  ],
  deepen: [
    "What do you think is really going on?",
    "When did that start?",
    "What does that look like for you?",
  ],
  confirm: [
    "Is that what you want to do?",
    "Does that feel right?",
    "Ready to try it?",
  ],
  close: [
    "Anything else on your mind?",
    "How you feeling about all this?",
    "Want to leave it here for now?",
  ],
};

const CURIOSITY_HOOKS = [
  "There's a pattern forming here — if you want, we can keep watching it together.",
  "Something in this feels like it's pointing to a deeper thread — we can stay with it.",
  "This has a quiet repeat to it — I can help you name what it's asking for.",
  "This feels like it's unfolding in layers — we don't have to rush it.",
  "There's more going on here than it looks like — and you're close to it."
];

const ABBREVIATIONS = ["Dr", "Mr", "Ms", "Prof", "St", "Jr", "Sr", "e.g", "i.e", "U.S", "Inc", "Ltd"];

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function getSignals(userText) {
  const t = (userText || '').toLowerCase();
  
  const highArousalPhrases = [
    'panic', 'panicking', 'anxious', 'anxiety', 'overwhelmed', 'spiraling',
    'freaking out', "can't breathe", 'cant breathe', 'heart racing', 'heart pounding',
    'tight chest', 'shaking', 'trembling', 'help me'
  ];
  const highArousalCount = highArousalPhrases.filter(p => t.includes(p)).length;
  const intensePunctuation = (userText || '').length > 10 && (
    (userText.match(/[!?]{2,}/g) || []).length >= 2 ||
    (userText.replace(/[^A-Z]/g, '').length / Math.max(userText.replace(/[^a-zA-Z]/g, '').length, 1)) > 0.7
  );
  
  const meaningSeeking = (
    t.includes('what does this mean') ||
    t.includes('why is this happening') ||
    t.includes('what am i supposed to learn') ||
    t.includes('what is the point') ||
    t.includes('what is god doing') ||
    t.includes('why me')
  );
  
  const patternLanguage = (
    t.includes('this keeps happening') ||
    t.includes('every time') ||
    t.includes('same thing again') ||
    t.includes('why do i always') ||
    t.includes('pattern') ||
    t.includes('always end up')
  );
  
  const reflectiveTone = (
    t.includes("i'm realizing") ||
    t.includes('i realized') ||
    t.includes('i noticed') ||
    t.includes('it feels like') ||
    t.includes('i wonder if') ||
    t.includes('lately') ||
    t.includes('on my mind') ||
    t.includes('been thinking')
  );
  
  // Detect casual social questions about TRACE (not seeking help, just chatting)
  const isCasualSocialQuestion = /how'?s your (day|morning|evening|night)|what'?s up with you|how are you doing|how are you|what about you|and you\??|you good\??|what have you been up to/i.test(t);
  
  return {
    asksForHelp: /what should i do|help me|any ideas|what do you think|suggest|recommend/i.test(t),
    highArousal: highArousalCount >= 2 || /can't breathe|freaking out|spiraling/i.test(t) || intensePunctuation,
    lowMood: /sad|depressed|hopeless|worthless|empty|numb|down|lonely|suicidal/i.test(t),
    restNeed: /tired|exhausted|insomnia|can't sleep|burnt out|drained|fatigue/i.test(t),
    rumination: /overthinking|can't stop thinking|stuck in my head|spiraling|ruminating/i.test(t),
    musicRequest: /play|music|song|track|night swim|listen/i.test(t),
    isCrisis: /suicidal|kill myself|end it|want to die|hurt myself/i.test(t),
    midEnergy: /\bmid\b|so.?so|meh|okay.?ish|not great|just okay|alright i guess|could be better|blah|sluggish|lazy/i.test(t),
    meaningSeeking,
    patternLanguage,
    reflectiveTone,
    casualSocialQuestion: isCasualSocialQuestion,
  };
}

// ============================================================
// PREMIUM CONVERSATION ENGINE v1 - Core Functions
// ============================================================

// Session management: update session state on each user message
function updateSessionState(clientState = {}, messages = []) {
  const now = Date.now();
  
  // Try to get lastUserAt from: 1) clientState, 2) most recent user message timestamp, 3) sessionStartedAt
  let lastUserAt = clientState.lastUserAt || 0;
  
  // If no lastUserAt in clientState, try to find from messages
  if (!lastUserAt && messages && messages.length > 1) {
    // Find the second-to-last user message (the previous one, not current)
    const userMessages = messages.filter(m => m.role === 'user');
    if (userMessages.length > 1) {
      const prevUserMsg = userMessages[userMessages.length - 2];
      if (prevUserMsg.timestamp) {
        lastUserAt = new Date(prevUserMsg.timestamp).getTime();
      }
    }
  }
  
  // Fallback: if still no lastUserAt but we have sessionStartedAt, use that
  if (!lastUserAt && clientState.sessionStartedAt) {
    lastUserAt = clientState.sessionStartedAt;
  }
  
  const sessionStartedAt = clientState.sessionStartedAt || now;
  
  // Check if this is a new session (gap > 6 hours)
  const isNewSession = lastUserAt > 0 ? (now - lastUserAt) > SESSION_GAP_MS : false;
  
  if (isNewSession) {
    console.log('[SESSION] New session started (gap > 6 hours)');
    return {
      sessionStartedAt: now,
      lastUserAt: now,
      sessionTurnCount: 1,
      lastGuidedStepTurn: 0,
    };
  }
  
  return {
    sessionStartedAt,
    lastUserAt: now,
    sessionTurnCount: (clientState.sessionTurnCount || 0) + 1,
    lastGuidedStepTurn: clientState.lastGuidedStepTurn || 0,
  };
}

// Memory cleanup: decay old entries, enforce caps
function cleanupMemory(clientState = {}) {
  const now = Date.now();
  const cutoff = now - MEMORY_DECAY_MS;
  
  // Filter and cap recentTopics
  let recentTopics = (clientState.recentTopics || [])
    .filter(t => t.timestamp > cutoff)
    .slice(-MAX_RECENT_TOPICS);
  
  // Filter and cap activeLoops
  let activeLoops = (clientState.activeLoops || [])
    .filter(l => l.timestamp > cutoff)
    .slice(-MAX_ACTIVE_LOOPS);
  
  // Filter and cap recentWins
  let recentWins = (clientState.recentWins || [])
    .filter(w => w.timestamp > cutoff)
    .slice(-MAX_RECENT_WINS);
  
  // Cap recentPhrases
  let recentPhrases = (clientState.recentPhrases || [])
    .slice(-MAX_RECENT_PHRASES);
  
  return { recentTopics, activeLoops, recentWins, recentPhrases };
}

// Extract topics from user message
function extractTopics(userText) {
  const t = (userText || '').toLowerCase();
  const found = [];
  
  for (const topic of TOPIC_HEADERS) {
    if (t.includes(topic)) {
      found.push(topic);
    }
  }
  
  return found;
}

// Check if user message indicates a loop pattern
function detectLoop(userText) {
  const t = (userText || '').toLowerCase();
  
  for (const keyword of LOOP_KEYWORDS) {
    if (t.includes(keyword)) {
      return keyword;
    }
  }
  return null;
}

// Check if user message indicates a win
function detectWin(userText) {
  const t = (userText || '').toLowerCase();
  
  // Check for positive sentiment + win verb
  const hasPositive = /good|great|better|finally|managed|did it|proud|happy|relieved/i.test(t);
  const hasWinVerb = WIN_VERBS.some(v => t.includes(v));
  
  if (hasPositive && hasWinVerb) {
    // Extract a simple label
    const words = t.split(/\s+/).slice(0, 5);
    return words.join(' ').substring(0, 30);
  }
  return null;
}

// Update memory with extracted patterns (dedup by label)
function updateMemory(clientState, userText) {
  const now = Date.now();
  const memory = cleanupMemory(clientState);
  
  // Extract and add topics (dedup)
  const newTopics = extractTopics(userText);
  for (const topic of newTopics) {
    const existing = memory.recentTopics.find(t => t.label === topic);
    if (existing) {
      existing.timestamp = now; // Update timestamp
    } else {
      memory.recentTopics.push({ label: topic, timestamp: now });
    }
  }
  memory.recentTopics = memory.recentTopics.slice(-MAX_RECENT_TOPICS);
  
  // Detect and track loops
  const loopLabel = detectLoop(userText);
  if (loopLabel) {
    const existing = memory.activeLoops.find(l => l.label === loopLabel);
    if (existing) {
      existing.timestamp = now;
      existing.count = (existing.count || 1) + 1;
    } else {
      // Replace oldest if at cap
      if (memory.activeLoops.length >= MAX_ACTIVE_LOOPS) {
        memory.activeLoops.sort((a, b) => a.timestamp - b.timestamp);
        memory.activeLoops.shift();
      }
      memory.activeLoops.push({ label: loopLabel, timestamp: now, count: 1 });
    }
  }
  
  // Detect and track wins (dedup)
  const winLabel = detectWin(userText);
  if (winLabel) {
    const existing = memory.recentWins.find(w => w.label === winLabel);
    if (existing) {
      existing.timestamp = now;
    } else {
      memory.recentWins.push({ label: winLabel, timestamp: now });
    }
  }
  memory.recentWins = memory.recentWins.slice(-MAX_RECENT_WINS);
  
  return memory;
}

// Detect if deep mode should trigger
function isDeepMode(userText) {
  const t = (userText || '').toLowerCase();
  
  const hasKeyword = DEEP_MODE_KEYWORDS.some(k => t.includes(k));
  const hasVerb = DEEP_MODE_VERBS.some(v => t.includes(v));
  
  return hasKeyword && hasVerb;
}

// Enforce brevity based on mode (strict/deep/crisis)
function enforceBrevity(text, mode = 'strict') {
  if (!text) return text;
  
  if (mode !== 'crisis') {
    return text;
  }

  let result = text;
  const sentences = result.match(/[^.!?]+[.!?]+/g) || [result];
  if (sentences.length > 2) {
    result = sentences.slice(0, 2).join(' ').trim();
  }
  
  if (result.length > 200) {
    const truncated = result.substring(0, 200);
    const lastPeriod = Math.max(truncated.lastIndexOf('.'), truncated.lastIndexOf('!'), truncated.lastIndexOf('?'));
    if (lastPeriod > 100) {
      result = truncated.substring(0, lastPeriod + 1);
    } else {
      result = truncated.trim() + '...';
    }
  }
  
  return result.trim();
}

// Pick Next Best Question based on priority stack
function pickNextQuestion({ userText, signals, turnCount, lastUserTexts = [] }) {
  const t = (userText || '').toLowerCase();
  let intent = null;
  let reason = '';
  
  // Priority 1: ACTION - stuck/help keywords
  const actionKeywords = ['stuck', 'what do i do', 'overwhelmed', 'need a plan', 'help me', 'any ideas'];
  if (actionKeywords.some(k => t.includes(k))) {
    intent = 'action';
    reason = 'user_seeking_action';
  }
  
  // Priority 2: CLARIFY - vague/short response
  if (!intent && userText.length < 20) {
    intent = 'clarify';
    reason = 'vague_response';
  }
  
  // Priority 3: DEEPEN - reflective tone AND turn >= 6
  if (!intent && (signals.reflectiveTone || signals.meaningSeeking) && turnCount >= 6) {
    intent = 'deepen';
    reason = 'reflective_depth';
  }
  
  // Priority 4: CONFIRM - decision/commitment language
  const confirmKeywords = ['i think i should', 'maybe i will', 'i might', 'i could try', 'i want to'];
  if (!intent && confirmKeywords.some(k => t.includes(k))) {
    intent = 'confirm';
    reason = 'decision_language';
  }
  
  // Priority 5: CLOSE - momentum drops (fallback)
  if (!intent && turnCount >= 10) {
    intent = 'close';
    reason = 'momentum_check';
  }
  
  // If no intent matched, don't force a question
  if (!intent) {
    return { intent: null, question: null, reason: 'no_question_needed' };
  }
  
  // Pick a question from templates
  const templates = NEXT_QUESTION_TEMPLATES[intent] || [];
  const question = templates[Math.floor(Math.random() * templates.length)] || null;
  
  console.log(`[TRACE BRAIN] Next Best Question chosen: { intent: "${intent}", reason: "${reason}" }`);
  
  return { intent, question, reason };
}

// Pause detection for guided steps
function detectPause(userText, turnCount, lastUserTexts = []) {
  const t = (userText || '').toLowerCase().replace(/[^a-z\s]/g, '').trim();
  
  // Check if short response after 4+ longer turns
  if (userText.length < 15 && turnCount >= 4) {
    return { isPause: true, reason: 'short_after_long' };
  }
  
  // Check for pause responses
  const firstWord = t.split(/\s+/)[0] || '';
  const isPauseResponse = PAUSE_RESPONSES.includes(firstWord);
  if (isPauseResponse) {
    return { isPause: true, reason: `pause_word_${firstWord}` };
  }
  
  // Check for repeated short response in last 3 turns
  const last3 = lastUserTexts.slice(-3).map(txt => 
    (txt || '').toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/)[0]
  );
  const counts = {};
  last3.forEach(word => {
    if (word && PAUSE_RESPONSES.includes(word)) {
      counts[word] = (counts[word] || 0) + 1;
    }
  });
  const hasRepeat = Object.values(counts).some(c => c >= 2);
  if (hasRepeat) {
    return { isPause: true, reason: 'repeated_pause' };
  }
  
  // Check for long conversation without action
  if (turnCount >= 12) {
    return { isPause: true, reason: 'long_without_action' };
  }
  
  return { isPause: false, reason: null };
}

// Check and fire Guided Step prompt
function maybeGuidedStep({ userText, turnCount, clientState, signals, lastUserTexts = [] }) {
  const now = Date.now();
  const lastGuidedStepTurn = clientState?.lastGuidedStepTurn || 0;
  
  // ENFORCEMENT ORDER: Cooldown check FIRST
  if ((turnCount - lastGuidedStepTurn) < GUIDED_STEP_TURN_COOLDOWN) {
    console.log(`[TRACE BRAIN] Guided Step: { fired: false, reason: "cooldown", turnsLeft: ${GUIDED_STEP_TURN_COOLDOWN - (turnCount - lastGuidedStepTurn)} }`);
    return { fired: false, reason: 'cooldown', prompt: null, client_state_patch: null };
  }
  
  // Only THEN check pause signals
  const pause = detectPause(userText, turnCount, lastUserTexts);
  if (!pause.isPause) {
    console.log(`[TRACE BRAIN] Guided Step: { fired: false, reason: "no_pause" }`);
    return { fired: false, reason: 'no_pause', prompt: null, client_state_patch: null };
  }
  
  // Skip if crisis
  if (signals?.isCrisis || signals?.highArousal) {
    return { fired: false, reason: 'crisis', prompt: null, client_state_patch: null };
  }
  
  // Pick a guided prompt
  const prompt = GUIDED_STEP_PROMPTS[Math.floor(Math.random() * GUIDED_STEP_PROMPTS.length)];
  
  console.log(`[TRACE BRAIN] Guided Step: { fired: true, reason: "${pause.reason}" }`);
  
  return {
    fired: true,
    reason: pause.reason,
    prompt,
    client_state_patch: {
      lastGuidedStepTurn: turnCount,
    },
  };
}

// Check and fire Premium Moment
function maybeFirePremiumMoment({ userText, turnCount, signals, clientState }) {
  const now = Date.now();
  const lastPremiumMomentTime = clientState?.lastPremiumMomentTime || 0;
  const lastPremiumMomentTurn = clientState?.lastPremiumMomentTurn || 0;
  
  // Conditions that must ALL be true:
  // 1. NOT crisis
  if (signals?.isCrisis) {
    return { fired: false, reason: 'crisis' };
  }
  
  // 2. NOT first chat
  if (turnCount < 2) {
    return { fired: false, reason: 'first_chat' };
  }
  
  // 3. userMessageLength > 30
  if ((userText || '').length <= 30) {
    return { fired: false, reason: 'message_too_short' };
  }
  
  // 4. (reflectiveTone || meaningSeeking) AND (lowMood || rumination)
  const hasReflection = signals?.reflectiveTone || signals?.meaningSeeking;
  const hasEmotion = signals?.lowMood || signals?.rumination;
  if (!hasReflection || !hasEmotion) {
    return { fired: false, reason: 'signals_not_met' };
  }
  
  // 5. Turn cooldown: (turnCount - lastPremiumMomentTurn) >= 15
  if ((turnCount - lastPremiumMomentTurn) < PREMIUM_MOMENT_TURN_COOLDOWN) {
    return { fired: false, reason: 'turn_cooldown', turnsLeft: PREMIUM_MOMENT_TURN_COOLDOWN - (turnCount - lastPremiumMomentTurn) };
  }
  
  // 6. Time cooldown: (now - lastPremiumMomentTime) >= 4 hours OR null
  if (lastPremiumMomentTime && (now - lastPremiumMomentTime) < PREMIUM_MOMENT_COOLDOWN_MS) {
    const minutesLeft = Math.round((PREMIUM_MOMENT_COOLDOWN_MS - (now - lastPremiumMomentTime)) / 60000);
    return { fired: false, reason: 'time_cooldown', minutesLeft };
  }
  
  console.log(`[TRACE BRAIN] Premium Moment fired: { turnCount: ${turnCount}, signals: reflective=${hasReflection}, emotional=${hasEmotion} }`);
  
  return {
    fired: true,
    reason: 'conditions_met',
    client_state_patch: {
      lastPremiumMomentTime: now,
      lastPremiumMomentTurn: turnCount,
    },
  };
}

// Anti-repetition: SHA-256 hash of first 10 words
function computeResponseHash(text) {
  if (!text) return null;
  const first10 = (text || '').toLowerCase().split(/\s+/).slice(0, 10).join(' ');
  return crypto.createHash('sha256').update(first10).digest('hex');
}

// Token overlap similarity (0-1)
function computeSimilarity(textA, textB) {
  if (!textA || !textB) return 0;
  
  const tokenize = t => new Set(t.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean));
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  
  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  
  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++;
  }
  
  return overlap / (tokensA.size + tokensB.size - overlap);
}

// Server-side memory for last assistant response (mobile client may not sync back)
const serverSideLastResponse = new Map(); // userId -> { text, hash, timestamp }
const SERVER_RESPONSE_TTL = 60 * 60 * 1000; // 1 hour TTL

function storeLastResponse(userId, text) {
  if (!userId || !text) return;
  const hash = computeResponseHash(text);
  serverSideLastResponse.set(userId, { text: text.substring(0, 300), hash, timestamp: Date.now() });
  // Clean up old entries
  if (serverSideLastResponse.size > 1000) {
    const now = Date.now();
    for (const [key, val] of serverSideLastResponse) {
      if (now - val.timestamp > SERVER_RESPONSE_TTL) {
        serverSideLastResponse.delete(key);
      }
    }
  }
}

function getLastResponse(userId) {
  if (!userId) return null;
  const entry = serverSideLastResponse.get(userId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > SERVER_RESPONSE_TTL) {
    serverSideLastResponse.delete(userId);
    return null;
  }
  return entry;
}

// Check for repetition and return action
function checkRepetition(newText, clientState, userId) {
  // Try server-side memory first (more reliable than client sync)
  const serverMemory = getLastResponse(userId);
  const lastHash = serverMemory?.hash || clientState?.lastAssistantHash;
  const lastText = serverMemory?.text || clientState?.lastAssistantText;
  const newHash = computeResponseHash(newText);
  
  // Exact hash match = definite repetition
  if (lastHash && newHash === lastHash) {
    console.log(`[TRACE BRAIN] Anti-repetition: { similarity: 1.0, actionTaken: "regen_needed", hash_match: true }`);
    return { isRepeat: true, similarity: 1.0, action: 'regen' };
  }
  
  // Similarity check
  const similarity = computeSimilarity(newText, lastText);
  if (similarity > 0.75) {
    console.log(`[TRACE BRAIN] Anti-repetition: { similarity: ${similarity.toFixed(2)}, actionTaken: "regen_needed", source: ${serverMemory ? 'server' : 'client'} }`);
    return { isRepeat: true, similarity, action: 'regen' };
  }
  
  if (similarity > 0.5) {
    console.log(`[TRACE BRAIN] Anti-repetition: { similarity: ${similarity.toFixed(2)}, actionTaken: "log_only" }`);
    return { isRepeat: false, similarity, action: 'log' };
  }
  
  console.log(`[TRACE BRAIN] Anti-repetition: { similarity: ${similarity.toFixed(2)}, actionTaken: "none" }`);
  return { isRepeat: false, similarity, action: 'none' };
}

// Dream door detection
function detectDreamDoor(userText) {
  const t = (userText || '').toLowerCase();
  const dreamKeywords = ['dream', 'dreamt', 'had a dream', 'nightmare', 'dreams'];
  
  for (const keyword of dreamKeywords) {
    if (t.includes(keyword)) {
      return true;
    }
  }
  return false;
}

function applyTimeOfDayRules(clientState, signals) {
  const { timeOfDay, localNow, recentSentiment, mode, nowPlaying } = clientState || {};
  
  let tone = 'day';
  
  if (timeOfDay) {
    const map = {
      'morning': 'morning',
      'afternoon': 'day',
      'evening': 'evening',
      'late_night': 'late_night',
      'night': 'late_night'
    };
    tone = map[timeOfDay] || 'day';
  } else if (localNow) {
    const hour = new Date(localNow).getHours();
    if (hour >= 22 || hour < 6) tone = 'late_night';
    else if (hour >= 6 && hour < 12) tone = 'morning';
    else if (hour >= 12 && hour < 18) tone = 'day';
    else tone = 'evening';
  } else {
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) tone = 'late_night';
    else if (hour >= 6 && hour < 12) tone = 'morning';
    else if (hour >= 12 && hour < 18) tone = 'day';
    else tone = 'evening';
  }
  
  const maxSentences = {
    'morning': 3,
    'day': 4,
    'evening': 3,
    'late_night': 2
  }[tone] || 3;
  
  const emotionalContext = ['sad', 'lonely', 'reflective', 'calm'].includes(recentSentiment) || signals.reflectiveTone;
  const isPlayingMusic = mode === 'audio_player' || nowPlaying != null;
  
  const musicBias = (
    (tone === 'late_night' || tone === 'evening') &&
    emotionalContext &&
    !signals.highArousal &&
    !isPlayingMusic
  );
  
  const allowCuriosityHook = !(tone === 'late_night' && signals.highArousal);
  
  const toneHints = {
    'late_night': 'softer, fewer words, slower',
    'evening': 'calm, reflective',
    'morning': 'clear, steady',
    'day': 'clear, steady'
  };
  
  return {
    tone,
    maxSentences,
    musicBias,
    allowCuriosityHook,
    toneHint: toneHints[tone] || 'clear, steady'
  };
}

function buildClientStateContext(clientState, rules = null) {
  const { mode, timeOfDay, recentSentiment, nowPlaying, lastActivity, lastSuggestion, currentSoundState, lastSoundState } = clientState || {};
  const toneHint = rules?.toneHint || 'clear, steady';
  // Prefer client's current sound (what user hears) > last known state > ambient
  const soundStateLabel = currentSoundState || lastSoundState || 'ambient';
  
  // Check if user just came back from an activity (within 5 minutes)
  const recentActivityContext = (() => {
    if (!lastActivity?.id || !lastActivity?.ts) return null;
    const minutesAgo = (Date.now() - lastActivity.ts) / 60000;
    if (minutesAgo > 5) return null;
    return { activity: lastActivity.id, minutesAgo: Math.round(minutesAgo) };
  })();
  
  let basePrompt = `TONE: ${toneHint}
Detected sound_state: ${soundStateLabel}. Subtly align pacing and emotional temperature to this state while keeping your core voice.`;

  if (mode === 'audio_player' && nowPlaying) {
    basePrompt += `\n\nIMPORTANT: User is listening to "${nowPlaying.title}". Answer their question naturally but don't suggest activities or pivot away from the music moment. You can acknowledge the track softly.`;
  }
  
  // LAST SUGGESTION CONTEXT: If you just suggested/played something for the user
  if (lastSuggestion && lastSuggestion.ts) {
    const minutesSinceSuggestion = (Date.now() - lastSuggestion.ts) / 60000;
    if (minutesSinceSuggestion < 5) {
      const suggestionType = lastSuggestion.type || 'something';
      const suggestionId = lastSuggestion.id || lastSuggestion.suggestion_id || '';
      console.log('[TRACE BRAIN] Last suggestion context injected:', { type: suggestionType, id: suggestionId, minutesAgo: Math.round(minutesSinceSuggestion) });
      basePrompt += `\n\nLAST ACTION CONTEXT:
You just ${suggestionType === 'track' ? 'played' : 'suggested'} "${suggestionId}" for the user about ${Math.round(minutesSinceSuggestion)} minute${Math.round(minutesSinceSuggestion) === 1 ? '' : 's'} ago.
Their next message is likely a response to that action.
- If they say "thanks" / "nice" / "this is good" → acknowledge briefly, can ask what draws them to it
- If they ask about the track → answer genuinely about it
- If they change topic → follow their lead naturally`;
    }
  }
  
  if (mode === 'activity_reflection') {
    basePrompt += `\n\nUser just finished an activity. Acknowledge it gently. Don't immediately suggest another one.`;
  }
  
  // POST-ACTIVITY CONTEXT: If user just completed an activity, their next message is likely a response to your check-in
  if (recentActivityContext) {
    const activityName = recentActivityContext.activity;
    console.log('[TRACE BRAIN] Post-activity context injected:', { activity: activityName, minutesAgo: recentActivityContext.minutesAgo });
    basePrompt += `\n\nPOST-ACTIVITY CONTEXT:
User just finished "${activityName}" about ${recentActivityContext.minutesAgo} minute${recentActivityContext.minutesAgo === 1 ? '' : 's'} ago.
Their message is likely responding to your check-in about how it went.

If they say something brief like "fine", "okay", "good", "it helped", "yeah":
- Respond naturally, like a friend would
- You can move on to something else OR gently continue the conversation
- DON'T repeat "how you feeling?" type questions
- DON'T use therapy-speak like "what shifted?" or "what came up?"

Good responses to "it's fine" / "I'm okay":
- "Cool. Anything on your mind?"
- "Good. You need anything?"
- "Alright. I'm around."
- "Nice. Gonna take it easy now?"

If they share something more ("I feel calmer", "still stressed"):
- Acknowledge briefly and naturally
- You can ask one simple follow-up if it makes sense`;
  }

  if (timeOfDay === 'night' || timeOfDay === 'late_night') {
    basePrompt += `\n\nIt's late. Keep responses gentle and brief. Don't ask probing questions.`;
  }

  if (recentSentiment === 'anxious') {
    basePrompt += `\n\nUser seems anxious. Be steady and grounding. Short sentences. Don't add pressure.`;
  } else if (recentSentiment === 'sad') {
    basePrompt += `\n\nUser seems low. Be present. Don't try to fix. Just be with them.`;
  } else if (recentSentiment === 'overwhelmed') {
    basePrompt += `\n\nUser seems overwhelmed. Keep things simple. One thing at a time.`;
  }

  return basePrompt;
}

function decideSuggestion(clientState, signals, rules = null) {
  const { mode, lastSuggestion, lastActivity, nowPlaying } = clientState || {};
  const now = Date.now();
  
  if (mode === 'audio_player' && !signals.asksForHelp) {
    return { suggestion: null, suppressed: null };
  }
  
  if (lastSuggestion) {
    const timeSinceLast = now - (lastSuggestion.ts || 0);
    const cooldown = lastSuggestion.accepted === false ? IGNORED_COOLDOWN_MS : SUGGESTION_COOLDOWN_MS;
    
    if (timeSinceLast < cooldown && !signals.asksForHelp) {
      const remainingSeconds = Math.round((cooldown - timeSinceLast) / 1000);
      return {
        suggestion: null,
        suppressed: {
          feature: 'suggestion',
          remaining_seconds: remainingSeconds,
          cooldown_type: lastSuggestion.accepted === false ? 'ignored' : 'standard',
        }
      };
    }
  }
  
  let suggestion = null;
  const musicBias = rules?.musicBias || false;
  
  if (signals.asksForHelp) {
    if (signals.highArousal) {
      suggestion = { type: 'activity', id: 'breathing', reason: 'grounding' };
    } else if (signals.rumination) {
      suggestion = { type: 'activity', id: 'grounding', reason: 'getting out of your head' };
    } else if (signals.restNeed) {
      suggestion = { type: 'activity', id: 'power_nap', reason: 'rest' };
    } else if (signals.lowMood) {
      if (musicBias) {
        suggestion = { type: 'track', id: 'neon_promise', reason: 'something gentle' };
      } else {
        suggestion = { type: 'activity', id: 'grounding', reason: 'grounding' };
      }
    } else if (musicBias && signals.reflectiveTone) {
      suggestion = { type: 'track', id: 'midnight_underwater', reason: 'to sit with this' };
    } else if (signals.midEnergy) {
      suggestion = { type: 'activity', id: 'walking', reason: 'gentle movement' };
    } else {
      suggestion = { type: 'activity', id: 'walking', reason: 'a little shift' };
    }
  }
  
  if (suggestion) {
    suggestion.suggestion_id = `${now}-${suggestion.id}`;
  }
  
  return { suggestion, suppressed: null };
}

function tightenResponse(text, options = {}) {
  if (!text) return text;
  
  let result = text;
  
  const questionMarks = (result.match(/\?/g) || []).length;
  if (questionMarks > 2) {
    const secondQIndex = result.indexOf('?', result.indexOf('?') + 1);
    if (secondQIndex !== -1) {
      result = result.substring(0, secondQIndex + 1).trim();
    }
  }
  
  return result;
}

function maybeAddCuriosityHook({ userId, clientState, signals, rules }) {
  const { mode, nowPlaying, sessionTurnCount, lastHookAt, lastHookGlobalAt } = clientState || {};
  const now = Date.now();
  
  if (mode === 'audio_player' || nowPlaying != null) {
    return { curiosity_hook: null, client_state_patch: null };
  }
  
  if (!rules?.allowCuriosityHook) {
    return { curiosity_hook: null, client_state_patch: null };
  }
  
  if (signals.isCrisis || signals.highArousal) {
    return { curiosity_hook: null, client_state_patch: null };
  }
  
  const turns = sessionTurnCount || 0;
  if (turns < 3) {
    return { curiosity_hook: null, client_state_patch: null };
  }
  
  const hasRelevance = signals.meaningSeeking || signals.patternLanguage || signals.reflectiveTone;
  if (!hasRelevance) {
    return { curiosity_hook: null, client_state_patch: null };
  }
  
  if (lastHookAt && (now - lastHookAt) < HOOK_SESSION_COOLDOWN_MS) {
    return { curiosity_hook: null, client_state_patch: null };
  }
  
  if (lastHookGlobalAt && (now - lastHookGlobalAt) < HOOK_GLOBAL_COOLDOWN_MS) {
    return { curiosity_hook: null, client_state_patch: null };
  }
  
  const today = new Date().toISOString().split('T')[0];
  const seed = `${userId || 'anon'}::${today}`;
  const index = simpleHash(seed) % CURIOSITY_HOOKS.length;
  const hook = CURIOSITY_HOOKS[index];
  
  console.log('[CURIOSITY HOOK] Triggered for user:', userId, 'hook index:', index);
  
  return {
    curiosity_hook: hook,
    client_state_patch: {
      lastHookAt: now,
      lastHookGlobalAt: now
    }
  };
}

// =============================================
// PILLAR 11: EXIT FRICTION & WINBACK
// =============================================

const WINBACK_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 12 hours

function computeDaysSinceLastSeen(clientState) {
  if (!clientState) return null;
  
  // Prefer explicit daysSinceLastSeen
  if (typeof clientState.daysSinceLastSeen === 'number') {
    return clientState.daysSinceLastSeen;
  }
  
  // Fallback: compute from lastSeenAt
  if (clientState.lastSeenAt) {
    const lastSeen = Number(clientState.lastSeenAt);
    if (!isNaN(lastSeen) && lastSeen > 0) {
      const diffMs = Date.now() - lastSeen;
      return Math.floor(diffMs / (24 * 60 * 60 * 1000));
    }
  }
  
  return null;
}

function getWinbackTier(days) {
  if (days >= 30) return 'C';
  if (days >= 14) return 'B';
  if (days >= 7) return 'A';
  return null;
}

function maybeWinback(clientState, signals) {
  // Don't winback if no client state
  if (!clientState) {
    return { shouldShow: false, days: null, tier: null };
  }
  
  // Don't winback if user is in high-arousal / crisis
  if (signals?.highArousal || signals?.isCrisis) {
    return { shouldShow: false, days: null, tier: null, reason: 'crisis_or_high_arousal' };
  }
  
  // Don't winback if user is already in a flow (listening to music)
  if (clientState.nowPlaying || clientState.mode === 'audio_player') {
    return { shouldShow: false, days: null, tier: null, reason: 'in_audio_flow' };
  }
  
  // Check cooldown - don't show again within 12 hours
  if (clientState.winbackShownAt) {
    const shownAt = Number(clientState.winbackShownAt);
    if (!isNaN(shownAt) && (Date.now() - shownAt) < WINBACK_COOLDOWN_MS) {
      return { shouldShow: false, days: null, tier: null, reason: 'cooldown' };
    }
  }
  
  const days = computeDaysSinceLastSeen(clientState);
  if (days === null || days < 7) {
    return { shouldShow: false, days, tier: null };
  }
  
  const tier = getWinbackTier(days);
  return { shouldShow: true, days, tier };
}

// AI-generated winback messages - requires OpenAI client passed in
async function buildWinbackMessage({ days, tier, clientState, openai, userName }) {
  // Get time of day context
  const hour = new Date().getHours();
  let timeContext = 'evening';
  if (hour >= 5 && hour < 12) timeContext = 'morning';
  else if (hour >= 12 && hour < 17) timeContext = 'afternoon';
  else if (hour >= 17 && hour < 21) timeContext = 'evening';
  else timeContext = 'night';
  
  // Build context for AI
  const contextParts = [];
  contextParts.push(`Time: ${timeContext}`);
  contextParts.push(`Days away: ${days}`);
  if (userName) contextParts.push(`Name: ${userName}`);
  if (clientState?.lastActivity?.name) {
    contextParts.push(`Last activity: ${clientState.lastActivity.name}`);
  }
  if (clientState?.recentSentiment) {
    contextParts.push(`Recent mood: ${clientState.recentSentiment}`);
  }
  if (clientState?.lastTopic) {
    contextParts.push(`Last topic discussed: ${clientState.lastTopic}`);
  }
  
  const contextStr = contextParts.join(', ');
  
  // Try AI generation
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are TRACE, a calm friend who notices when someone returns after being away. Generate ONE short, warm return message (1-2 sentences max).

RULES:
- Sound like a real friend, not a therapist or app
- Reference the time of day naturally (morning/afternoon/evening/night)
- If you have their name, use it casually (not forced)
- If they were away a while, acknowledge it gently without guilt
- If you know their last activity or topic, you can reference it naturally
- NEVER say "Welcome back" or generic greetings
- NEVER be formal or stiff
- Keep it SHORT - like a text from a friend

EXAMPLES OF GOOD MESSAGES:
- "hey... how'd you sleep?"
- "quiet afternoon huh. what's on your mind?"
- "you've been gone a bit. everything okay?"
- "evening vibes. just checking in."
- "hope the week's treating you okay"

Context: ${contextStr}`
          },
          {
            role: 'user',
            content: 'Generate a return message for this person.'
          }
        ],
        max_tokens: 60,
        temperature: 0.9
      });
      
      const aiMessage = response.choices[0]?.message?.content?.trim();
      if (aiMessage && aiMessage.length > 5) {
        console.log('[WINBACK] AI-generated message:', aiMessage);
        return aiMessage;
      }
    } catch (err) {
      console.error('[WINBACK] AI generation failed, using fallback:', err.message);
    }
  }
  
  // Fallback: Simple time-based messages (not the old scripted ones)
  const fallbacks = {
    morning: [
      "hey... early start?",
      "morning. how'd you sleep?",
      "quiet morning huh"
    ],
    afternoon: [
      "hope your afternoon's going okay",
      "hey. what's the vibe today?",
      "checking in... how's it going?"
    ],
    evening: [
      "evening. settling in?",
      "how's the night treating you?",
      "quiet evening check-in"
    ],
    night: [
      "late one huh. what's keeping you up?",
      "night thoughts?",
      "can't sleep or just winding down?"
    ]
  };
  
  const options = fallbacks[timeContext] || fallbacks.evening;
  return options[Math.floor(Math.random() * options.length)];
}

// ========== PILLAR 12: PROGRESS INSIGHTS ==========
const INSIGHT_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const EVIDENCE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Stable date-based hash for deterministic daily selection
function stableDailyHash(userId) {
  const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return simpleHash(userId + dateStr);
}

// Type A templates - Rhythm insights (NO question)
const TYPE_A_TIME_SPECIFIC = [
  "I've noticed you tend to show up more in the {timeOfDay}. That's usually when things get quieter and the real thoughts surface. I'll meet you there.",
  "You've been returning around the same part of the day lately. That kind of consistency usually means something in you is asking for space to breathe.",
  "Your timing lately feels steady — not loud, but real. Even a few minutes here seems to help you come back to yourself.",
];

const TYPE_A_SENTIMENT_ONLY = [
  "I've noticed a steady emotional thread in what you've been sharing lately. Even when it's heavy, you keep reaching for clarity.",
  "There's a consistency in your check-ins — the same need keeps surfacing. That's usually your system asking to be listened to.",
  "You've been showing up with more honesty lately. That matters more than perfect.",
];

// Type B templates - Regulation/Activity (question allowed)
const TYPE_B_ACTIVITY = [
  "When you use {activityName}, you tend to settle faster. That's your nervous system learning you. Want to start there again?",
  "You reached for {activityName} recently when things felt heavy, and it seems to steady you. Do you want that kind of gentle again?",
  "I've seen you choose {activityName} instead of forcing a big fix. That's strength. Want one quiet minute of it?",
];

// Type D templates - Choice/Small Steps (question allowed)
const TYPE_D_CHOICE = [
  "You respond best to small steps that actually land — not big resets. That's how your progress sticks. Want to take one small step soon?",
  "When you accept a gentle suggestion, you tend to come back clearer. It's like you trust the smaller doorway more than the big push. Want another small doorway?",
  "You're building consistency the quiet way — choosing what's doable instead of what's perfect. Want me to keep it simple with you?",
];

function maybeInsight({ userId, clientState, signals }) {
  const now = Date.now();
  const cutoff7d = now - EVIDENCE_WINDOW_MS;
  
  // Hard skips
  if (signals?.isCrisis || signals?.highArousal) {
    return { shouldShow: false, reason: 'crisis_or_arousal' };
  }
  if (clientState?.mode === 'audio_player' || clientState?.nowPlaying) {
    return { shouldShow: false, reason: 'audio_playing' };
  }
  
  // Cooldown check
  const lastInsightAt = clientState?.lastInsightAt;
  if (lastInsightAt && (now - lastInsightAt) < INSIGHT_COOLDOWN_MS) {
    return { shouldShow: false, reason: 'cooldown' };
  }
  
  // Evidence checks
  const lastActivity = clientState?.lastActivity;
  const lastSuggestion = clientState?.lastSuggestion;
  const sentimentHistory = clientState?.recentSentimentHistory || [];
  const timeOfDay = clientState?.timeOfDay;
  
  // Type B: Activity evidence
  const typeB_usable = lastActivity?.ts >= cutoff7d && lastActivity?.name;
  
  // Type D: Accepted suggestion evidence
  const typeD_usable = lastSuggestion?.accepted === true && lastSuggestion?.ts >= cutoff7d;
  
  // Type A: Sentiment pattern (need 3+ entries in last 7 days)
  const recentSentiments = sentimentHistory.filter(e => e.ts >= cutoff7d && e.value);
  const typeA_usable = recentSentiments.length >= 3;
  
  // Build available types in priority order
  const availableTypes = [];
  if (typeB_usable) availableTypes.push('B');
  if (typeD_usable) availableTypes.push('D');
  if (typeA_usable) availableTypes.push('A');
  
  if (availableTypes.length === 0) {
    return { shouldShow: false, reason: 'no_evidence' };
  }
  
  // Deterministic selection
  const idx = stableDailyHash(userId || 'anonymous');
  const selectedType = availableTypes[idx % availableTypes.length];
  const variantIdx = (idx >>> 8);
  
  let message = '';
  
  if (selectedType === 'A') {
    // Type A: Rhythm insight
    if (timeOfDay) {
      const variants = TYPE_A_TIME_SPECIFIC;
      const template = variants[variantIdx % variants.length];
      message = template.replace('{timeOfDay}', timeOfDay);
    } else {
      const variants = TYPE_A_SENTIMENT_ONLY;
      message = variants[variantIdx % variants.length];
    }
  } else if (selectedType === 'B') {
    // Type B: Activity insight
    const variants = TYPE_B_ACTIVITY;
    const template = variants[variantIdx % variants.length];
    message = template.replace('{activityName}', lastActivity.name);
  } else if (selectedType === 'D') {
    // Type D: Choice/steps insight
    const variants = TYPE_D_CHOICE;
    message = variants[variantIdx % variants.length];
  }
  
  console.log(`[INSIGHT] Pillar 12 triggered: type=${selectedType}, userId=${(userId || '').slice(0, 8)}...`);
  
  return {
    shouldShow: true,
    type: selectedType,
    message,
    client_state_patch: {
      lastInsightAt: now,
      sessionTurnCount: (clientState?.sessionTurnCount || 0) + 1,
    },
  };
}

// ============================================================
// TONE SANITIZER - Rewrite therapy-speak to Everyday Premium Voice
// ============================================================
const THERAPY_PATTERNS = [
  // === FULL SENTENCE REPLACEMENTS (match complete phrases - optional punctuation) ===
  // "I care about / I'm here to support" — performative care
  { pattern: /I care about your feelings[^.!?]*[.,;]?/gi, replacement: "" },
  { pattern: /I care about what you're going through[^.!?]*[.,;]?/gi, replacement: "" },
  { pattern: /I'm here to support you[^.!?]*[.,;]?/gi, replacement: "" },
  // "It's natural/normal to..." — explaining emotions back
  { pattern: /It's natural to doubt yourself[^.!?]*[.,;]?/gi, replacement: "makes sense you'd second-guess it." },
  { pattern: /It's natural to feel [^.!?]+[.,;]?/gi, replacement: "" },
  { pattern: /It's (completely )?normal to feel [^.!?]+[.,;]?/gi, replacement: "" },
  { pattern: /It's natural to [^.!?]+[.,;]?/gi, replacement: "" },
  // "Feeling X is important" — therapist validating emotions
  { pattern: /Feeling proud is important[^.!?]*[.,;]?/gi, replacement: "" },
  { pattern: /Feeling \w+ is (important|valid|okay|natural|normal)[^.!?]*[.,;]?/gi, replacement: "" },
  // "Acknowledging your..." — self-help book language
  { pattern: /Acknowledging (your )?(achievements?|accomplishments?|progress|feelings?|emotions?) (is |can )[^.!?]+[.,;]?/gi, replacement: "" },
  // "Congratulations on..." — formal, distant
  { pattern: /Congratulations on [^.!?]+[.,;]?/gi, replacement: "congrats." },
  { pattern: /Congratulations[.,;!]?/gi, replacement: "congrats." },
  // "Sounds like a big step" — coaching energy
  { pattern: /Sounds like a big step[^.!?]*[.,;]?/gi, replacement: "" },
  { pattern: /That's a (big|great|huge|important) (step|achievement|accomplishment|milestone)[^.!?]*[.,;]?/gi, replacement: "" },
  // "You should be/feel proud" — prescribing emotions
  { pattern: /You should (be |feel )proud[^.!?]*[.,;]?/gi, replacement: "you should be." },
  // "It's important to..." — lecturing
  { pattern: /It's important to (acknowledge|recognize|celebrate|remember|note) [^.!?]+[.,;]?/gi, replacement: "" },
  { pattern: /It's worth (noting|remembering|acknowledging) [^.!?]+[.,;]?/gi, replacement: "" },
  // "Remember that..." — prescriptive
  { pattern: /Remember that it's okay to [^.!?]+[.,;]?/gi, replacement: "" },
  { pattern: /Remember that [^.!?]+[.,;]?/gi, replacement: "" },
  // "can boost your confidence / moving forward" — coaching phrases
  { pattern: /can boost your confidence[^.!?]*[.,;]?/gi, replacement: "" },
  { pattern: / moving forward[.,;]?/gi, replacement: "." },
  { pattern: / going forward[.,;]?/gi, replacement: "." },
  // "What part of [experience]..." — facilitation questions
  { pattern: /What part of (the |that |this )?[^?]+ surprised you[^?]*\??/gi, replacement: "what surprised you?" },
  { pattern: /What part of (the |that |this )?[^?]+ resonated[^?]*\??/gi, replacement: "what stood out?" },
  // "I'm sorry to hear..." — performative empathy
  { pattern: /I'm (really )?sorry to hear that you're feeling [^.!?]+[.,;]?/gi, replacement: "that's rough." },
  { pattern: /I'm (really )?sorry to hear that[.,;]?/gi, replacement: "that's rough." },
  { pattern: /I'm sorry you're feeling [^.!?]+[.,;]?/gi, replacement: "that sounds hard." },
  // "It's okay to feel..." — normalizing
  { pattern: /It's completely okay to feel stressed[;,.—–-]?/gi, replacement: "" },
  { pattern: /It's okay to feel overwhelmed sometimes[;,.—–-]?/gi, replacement: "" },
  { pattern: /It's okay to feel overwhelmed[;,.—–-]?/gi, replacement: "" },
  { pattern: /It's okay to feel stressed[;,.—–-]?/gi, replacement: "" },
  { pattern: /It's okay to feel that way[;,.—–-]?/gi, replacement: "" },
  { pattern: /It's okay to feel [^.!?—–]+[;,.—–-]?/gi, replacement: "" },
  // "Your feelings are valid" — classic therapy
  { pattern: /Your feelings are valid[;,.]?/gi, replacement: "" },
  { pattern: /sometimes just talking about it can help[;,.]?/gi, replacement: "" },
  // "That's good to hear" — formal / distant
  { pattern: /That's good to hear[.,;]?/gi, replacement: "nice." },
  // "especially with something important" — editorializing
  { pattern: /,? especially (with|when|if) something (important|difficult|challenging|big)[^.,;!?]*[.,;]?/gi, replacement: "." },
  // === "IT SEEMS LIKE" THERAPY OPENERS (REMOVE OR REPLACE) ===
  { pattern: /It seems like you're facing some challenges[.!,]?/gi, replacement: "That sounds rough." },
  { pattern: /It seems like you're going through [^.!?]+[.!,]?/gi, replacement: "That sounds hard." },
  { pattern: /It seems like you're dealing with [^.!?]+[.!,]?/gi, replacement: "That sounds like a lot." },
  { pattern: /It seems like you're experiencing [^.!?]+[.!,]?/gi, replacement: "" },
  { pattern: /It sounds like you're facing [^.!?]+[.!,]?/gi, replacement: "That sounds tough." },
  // === GENERIC ACTIVITY SUGGESTIONS (REMOVE ENTIRE SENTENCE) ===
  { pattern: /Let me suggest an activity[^.!?]*[.!?]?/gi, replacement: "" },
  { pattern: /How about a gentle breathing exercise[^.!?]*[.!?]?/gi, replacement: "" },
  { pattern: /How about a calming soundscape[^.!?]*[.!?]?/gi, replacement: "" },
  { pattern: /How about (a |some |trying )?(breathing|grounding|meditation|mindfulness|relaxation)[^.!?]*[.!?]?/gi, replacement: "" },
  { pattern: /Would you like to try (a |some )?(breathing|grounding|meditation|mindfulness)[^.!?]*[.!?]?/gi, replacement: "" },
  { pattern: /Maybe (a |some )?(breathing exercise|grounding exercise|mindfulness exercise|calming activity)[^.!?]*[.!?]?/gi, replacement: "" },
  { pattern: /I can (suggest|recommend|offer) (a |an |some )?(activity|exercise|breathing|grounding|soundscape)[^.!?]*[.!?]?/gi, replacement: "" },
  { pattern: /Would water,? a few breaths,? or a short walk support you( right now)?[.?]?/gi, replacement: "" },
  { pattern: /Would water,? breaths,? or a walk support you( right now)?[.?]?/gi, replacement: "" },
  { pattern: /Would you like (water|a few breaths|a short walk|some rest)[^.?]*[.?]?/gi, replacement: "" },
  { pattern: /Would (water|a few breaths|a short walk),? [^?]+support you[^?]*[.?]?/gi, replacement: "" },
  // === "WOULD YOU LIKE TO DISCUSS" PATTERNS ===
  { pattern: /Would you like to discuss what'?s been on your mind[.?]?/gi, replacement: "What's going on?" },
  { pattern: /Would you like to discuss what'?s on your mind[.?]?/gi, replacement: "What's going on?" },
  { pattern: /Would you like to discuss [^?]+[.?]?/gi, replacement: "What's up?" },
  // === PHRASE REPLACEMENTS ===
  { pattern: /Would you like to talk about what's on your mind[.?]?/gi, replacement: "What's going on?" },
  { pattern: /Would you like to talk about what's been on your mind[.?]?/gi, replacement: "What's going on?" },
  { pattern: /Would you like to talk about it[.?]?/gi, replacement: "Want to talk about it?" },
  { pattern: /I'm here if you want to talk[.,;]?/gi, replacement: "I'm here." },
  { pattern: /I'm here if you need to talk[.,;]?/gi, replacement: "I'm here." },
  { pattern: /I'm here for you[.,;]?/gi, replacement: "I'm here." },
  { pattern: /I'm here with you[.,;]?/gi, replacement: "I'm here." },
  // === WORD/PHRASE SUBSTITUTIONS ===
  { pattern: /\bI hear you\b/gi, replacement: "Got it" },
  { pattern: /\bThat sounds like\b/gi, replacement: "Sounds like" },
  { pattern: /\bIt sounds like\b/gi, replacement: "Sounds like" },
  { pattern: /\bThat must be really hard\./gi, replacement: "That's hard." },
  { pattern: /\bThat must be hard\./gi, replacement: "That's hard." },
  { pattern: /\bThat can feel\b/gi, replacement: "That feels" },
  { pattern: /\bIt's interesting how\b/gi, replacement: "Yeah," },
  { pattern: /\bIt really does\b/gi, replacement: "Yeah, it does" },
  { pattern: /\bAbsolutely, those\b/gi, replacement: "Yeah, those" },
  { pattern: /\bI appreciate the\b/gi, replacement: "Thanks for" },
  { pattern: /\bI appreciate you sharing\b/gi, replacement: "Thanks for sharing" },
  { pattern: /\bdeeply human\b/gi, replacement: "real" },
  { pattern: /\bprofound\b/gi, replacement: "deep" },
  { pattern: /\bsignificant\b/gi, replacement: "big" },
  { pattern: /\bbeautiful insight\b/gi, replacement: "good point" },
  { pattern: /\bvaried expressions\b/gi, replacement: "different ways" },
  { pattern: /\bfeel deeply\b/gi, replacement: "feel" },
  { pattern: /\bconnect us all\b/gi, replacement: "connect" },
  { pattern: /\bHow are you managing\b/gi, replacement: "How's it going" },
  { pattern: /\bWhat comes up for you\b/gi, replacement: "What's on your mind" },
  { pattern: /\bspace to process\b/gi, replacement: "time" },
  { pattern: /\bholding space\b/gi, replacement: "here" },
  { pattern: /\bsit with that\b/gi, replacement: "think about it" },
  { pattern: /\bjourney\b/gi, replacement: "path" },
  { pattern: /\bself-care\b/gi, replacement: "rest" },
  { pattern: /\bwellness\b/gi, replacement: "health" },
  { pattern: /\bThat resonates\b/gi, replacement: "That makes sense" },
  { pattern: /\bI'm curious\b/gi, replacement: "I wonder" },
  { pattern: /\bI wonder if\b/gi, replacement: "Maybe" },
  { pattern: /\bIt sounds challenging\b/gi, replacement: "That's tough" },
  { pattern: /\bThat's a lot to navigate\b/gi, replacement: "That's a lot" },
  { pattern: /\bHow does that land for you\b/gi, replacement: "How's that feel" },
  { pattern: /(?:^|[.!?]\s+)Thank you for sharing that\b[^.!?]*[.!?,;]?\s*/gi, replacement: "" },
  { pattern: /(?:^|[.!?]\s+)Thank you for sharing\b[^.!?]*[.!?,;]?\s*/gi, replacement: "" },
  { pattern: /(?:^|[.!?]\s+)Thank you for trusting me\b[^.!?]*[.!?,;]?\s*/gi, replacement: "" },
  { pattern: /(?:^|[.!?]\s+)I'm here to help\b[^.!?]*[.!?,;]?\s*/gi, replacement: "" },
  { pattern: /(?:^|[.!?]\s+)I'm here to support\b[^.!?]*[.!?,;]?\s*/gi, replacement: "" },
  { pattern: /(?:^|[.!?]\s+)That's really brave\b[^.!?]*[.!?,;]?\s*/gi, replacement: "" },
  { pattern: /(?:^|[.!?]\s+)That takes courage\b[^.!?]*[.!?,;]?\s*/gi, replacement: "" },
  { pattern: /(?:^|[.!?]\s+)I want you to know\b[^.!?]*[.!?,;]?\s*/gi, replacement: "" },
  { pattern: /\bFamily dynamics can be\b[^.!?]*[.!?]?/gi, replacement: "" },
  { pattern: /\bWorkplace stress\b/gi, replacement: "work stuff" },
  { pattern: /\bLet's explore this together\b[^.!?]*[.!?,;]?\s*/gi, replacement: "" },
  { pattern: /\bWhat options are you considering\b[^.!?]*[.!?,;]?\s*/gi, replacement: "" },
];

// Cooldown tracking for "honestly/real talk" phrases (in-memory per user)
const everydayEmphasisCooldowns = new Map(); // userId -> lastUsedAt timestamp
const EMPHASIS_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes between uses

const healthMentionTracker = new Map(); // userId -> { turns: number[], count: number, lastAccess: number }
const HEALTH_COOLDOWN_TURNS = 3;
const HEALTH_TRACKER_TTL_MS = 24 * 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [uid, tracker] of healthMentionTracker) {
    if (now - (tracker.lastAccess || 0) > HEALTH_TRACKER_TTL_MS) {
      healthMentionTracker.delete(uid);
    }
  }
}, 60 * 60 * 1000);
const HEALTH_MENTION_RE = /\b(health|wellness|well-being|wellbeing)\b/i;
const HEALTH_SENTENCE_RE = /[^.!?]*\b(health|wellness|well-being|wellbeing)\b[^.!?]*[.!?]?/gi;

function trackHealthMention(userId, turnCount, text) {
  if (!HEALTH_MENTION_RE.test(text)) return;
  const tracker = healthMentionTracker.get(userId) || { turns: [], count: 0, lastAccess: Date.now() };
  tracker.turns.push(turnCount);
  tracker.count++;
  tracker.lastAccess = Date.now();
  if (tracker.turns.length > 10) tracker.turns = tracker.turns.slice(-10);
  healthMentionTracker.set(userId, tracker);
}

function isHealthOnCooldown(userId, turnCount) {
  const tracker = healthMentionTracker.get(userId);
  if (!tracker || tracker.turns.length === 0) return false;
  const lastMention = tracker.turns[tracker.turns.length - 1];
  return (turnCount - lastMention) < HEALTH_COOLDOWN_TURNS;
}

function sanitizeTone(text, options = {}) {
  if (!text) return text;
  let result = text;
  let changed = false;
  const isCrisisMode = options.isCrisisMode || false;
  
  // Strip "TRACE:" or "TRACE: " prefix — model sometimes outputs its own name
  if (/^TRACE:\s*/i.test(result)) {
    result = result.replace(/^TRACE:\s*/i, '');
    changed = true;
    console.log('[TONE SANITIZER] Stripped "TRACE:" prefix from response');
  }
  
  // Strip quotes and asterisks around music names (tracks, albums, playlists, Night Swim)
  const MUSIC_NAMES = [
    'Midnight Underwater', 'Slow Tides Over Glass', 'Slow Tides', 'Undertow',
    'Euphoria', 'Ocean Breathing', 'Tidal House', 'Neon Promise',
    'Night Swim', 'Rooted', 'Low Orbit', 'First Light'
  ];
  const musicNamesPattern = MUSIC_NAMES.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const musicQuoteRegex = new RegExp(`["*]+\\s*(${musicNamesPattern})\\s*["*]+`, 'gi');
  const beforeMusic = result;
  result = result.replace(musicQuoteRegex, '$1');
  result = result.replace(new RegExp(`"(${musicNamesPattern})"`, 'gi'), '$1');
  result = result.replace(new RegExp(`\\*(${musicNamesPattern})\\*`, 'gi'), '$1');
  result = result.replace(new RegExp(`\\*\\*(${musicNamesPattern})\\*\\*`, 'gi'), '$1');
  if (result !== beforeMusic) {
    changed = true;
  }
  
  for (const { pattern, replacement } of THERAPY_PATTERNS) {
    // IMPORTANT: Reset regex lastIndex before each match (global regexes remember position)
    pattern.lastIndex = 0;
    
    // CRISIS MODE: Skip replacements that result in "That's rough" - too dismissive for crisis
    if (isCrisisMode && replacement === "That's rough.") {
      continue;
    }
    
    const before = result;
    result = result.replace(pattern, replacement);
    if (result !== before) {
      changed = true;
      if (replacement === '') {
        // Ensure a space exists where text was removed to prevent word merging
        result = result.replace(/([a-z])([A-Z])/g, '$1. $2');
      }
    }
  }
  
  // "Honestly/real talk" cooldown enforcement
  const userId = options.userId || 'anon';
  const hasEmphasis = /\b(honestly|real talk|to be honest|tbh)\b/i.test(result);
  if (hasEmphasis) {
    const lastUsed = everydayEmphasisCooldowns.get(userId) || 0;
    const now = Date.now();
    if (now - lastUsed < EMPHASIS_COOLDOWN_MS) {
      result = result.replace(/\b(Honestly,?|Real talk,?|To be honest,?|Tbh,?)\s*/gi, '');
      console.log('[TONE SANITIZER] Removed emphasis phrase (cooldown active)');
    } else {
      everydayEmphasisCooldowns.set(userId, now);
    }
  }
  
  // Health reference cooldown: strip health mentions if TRACE mentioned health in last 3 turns
  const turnCount = options.turnCount || 0;
  if (HEALTH_MENTION_RE.test(result)) {
    if (isHealthOnCooldown(userId, turnCount)) {
      const beforeHealth = result;
      result = result.replace(HEALTH_SENTENCE_RE, '');
      result = result.replace(/\s{2,}/g, ' ').trim();
      if (result !== beforeHealth) {
        changed = true;
        console.log('[TONE SANITIZER] Stripped health reference (cooldown active, last mention within 3 turns)');
      }
    }
    trackHealthMention(userId, turnCount, result);
  }
  
  // Clean up artifacts from pattern removal
  // Remove orphaned punctuation from removed sentences (e.g., ". ." or ", ,")
  result = result.replace(/[.,;]\s*[.,;]/g, '.');
  // Remove empty sentence fragments
  result = result.replace(/\.\s*\./g, '.');
  // Clean up double spaces and leading punctuation
  result = result.replace(/\s{2,}/g, ' ').trim();
  result = result.replace(/^\s*[,\.;]\s*/, '');

  // === MID-TEXT FRAGMENT REPAIR ===
  // When patterns rip out text from the middle, leftover fragments can join into nonsense.
  // E.g., "fine is all [REMOVED] One option could be" → "fine is all One option could be"
  // Detect and remove these garbled mid-sentence joins.
  if (changed) {
    const sentences = result.split(/(?<=[.!?])\s+/);
    const repairedSentences = [];
    
    const SAFE_SENTENCE_WORDS = new Set([
      'yeah', 'nice', 'cool', 'okay', 'ok', 'sure', 'congrats', 'right', 'same',
      'true', 'exactly', 'fair', 'damn', 'wow', 'wild', 'rough', 'oof', 'yikes',
      'gotcha', 'noted', 'heard', 'got it', 'makes sense', 'for real', 'for sure'
    ]);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;
      
      const cleanSentence = trimmed.replace(/[.!?,;]+$/, '').trim();
      const words = cleanSentence.split(/\s+/).filter(w => w.length > 0);
      
      if (words.length <= 1 && !SAFE_SENTENCE_WORDS.has(cleanSentence.toLowerCase())) {
        console.log('[TONE SANITIZER] Removed orphaned single word:', trimmed);
        continue;
      }
      
      if (words.length >= 4 && words.length <= 8) {
        const lower = cleanSentence.toLowerCase();
        const SAFE_SHORT_SENTENCES = [
          'not really', 'probably not', 'no idea', 'not sure', 'not yet',
          'same here', 'good point', 'fair enough', 'hard to say',
          'for real though', 'makes sense though', 'kind of yeah'
        ];
        if (SAFE_SHORT_SENTENCES.some(s => lower.includes(s))) {
          repairedSentences.push(trimmed);
          continue;
        }
        
        const hasSubject = /\b(i|you|we|they|he|she|it|that|this|there|what|how|who|not|no|never|maybe|probably|definitely|always)\b/i.test(lower);
        const hasVerb = /\b(is|are|was|were|am|be|been|have|has|had|do|does|did|can|could|would|should|will|shall|may|might|feel|think|know|want|need|get|go|come|make|take|see|say|tell|give|find|try|keep|let|mean|seem|look|hear|show|turn|move|play|run|set|help|start|hold|put|bring|sound|stand|happen)\b/i.test(lower);
        
        if (!hasSubject && !hasVerb) {
          console.log('[TONE SANITIZER] Removed incoherent mid-fragment:', trimmed);
          continue;
        }
      }
      
      repairedSentences.push(trimmed);
    }
    
    if (repairedSentences.length > 0) {
      result = repairedSentences.join(' ');
    }
  }

  // Remove orphaned short fragments (1-2 words ending in period that aren't meaningful sentences)
  // Only applies when patterns actually changed the text (to avoid removing valid short responses)
  if (changed) {
    result = result.replace(/^[a-z][a-z\s]{0,15}\.\s*/i, function(match) {
      const words = match.trim().replace(/\.$/, '').split(/\s+/);
      const phrase = words.join(' ').toLowerCase();
      const safeStarts = ['yeah', 'nice', 'cool', 'okay', 'ok', 'sure', 'congrats', 'right', 'same', 'true', 'got it', 'exactly', 'fair', 'makes sense', 'for real', 'for sure', 'no way', 'oh wow', 'damn', 'wow', 'wild', 'rough', 'oof', 'yikes', 'gotcha'];
      if (words.length <= 2 && !safeStarts.some(s => phrase === s || phrase === s + '.')) {
        return '';
      }
      return match;
    });
  }

  // Remove trailing orphaned fragments (e.g., leftover "you through this" at end)
  // Only applies when patterns actually changed the text
  if (changed) {
    result = result.replace(/\.\s+[a-z][a-z\s]{0,12}$/i, function(match) {
      const fragment = match.replace(/^\.\s+/, '').trim();
      const words = fragment.split(/\s+/);
      const phrase = words.join(' ').toLowerCase();
      const safeEndings = ['for real', 'no way', 'for sure', 'oh well', 'you know', 'right now', 'at all', 'so much', 'out loud', 'not yet'];
      if (words.length <= 2 && !/[.!?]$/.test(fragment) && !safeEndings.includes(phrase)) {
        return '.';
      }
      return match;
    });
  }

  // Ensure first character is capitalized (pattern removal can expose lowercase starts)
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  // Final cleanup pass: collapse multiple periods/spaces again
  result = result.replace(/\.\s*\./g, '.').replace(/\s{2,}/g, ' ').trim();
  // Remove leading punctuation one more time after fragment removal
  result = result.replace(/^\s*[,\.;]\s*/, '');
  // Capitalize again after final cleanup
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  // Ensure result ends with punctuation if it originally did
  if (changed && result.length > 0 && /[a-zA-Z0-9]$/.test(result)) {
    result = result + '.';
  }
  
  if (changed) {
    console.log('[TONE SANITIZER] Cleaned therapy-speak from response');
  }
  
  return result;
}

module.exports = {
  getSignals,
  buildClientStateContext,
  decideSuggestion,
  tightenResponse,
  applyTimeOfDayRules,
  maybeAddCuriosityHook,
  // Pillar 11: Winback
  computeDaysSinceLastSeen,
  maybeWinback,
  buildWinbackMessage,
  // Pillar 12: Progress Insights
  maybeInsight,
  // Tone sanitizer
  sanitizeTone,
  // Premium Conversation Engine v1
  updateSessionState,
  cleanupMemory,
  updateMemory,
  extractTopics,
  detectLoop,
  detectWin,
  isDeepMode,
  enforceBrevity,
  pickNextQuestion,
  detectPause,
  maybeGuidedStep,
  maybeFirePremiumMoment,
  computeResponseHash,
  computeSimilarity,
  checkRepetition,
  storeLastResponse,
  detectDreamDoor,
};
