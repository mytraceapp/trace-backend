/**
 * TRACE Emotional Atmosphere Engine
 * 
 * Decides whether the app's emotional environment should shift based on
 * conversational signals. Selects atmospheric support states, not music.
 * 
 * States: presence | grounding | comfort | reflective | insight
 */

// ============================================================
// SIGNAL TABLES
// ============================================================

const SIGNAL_TABLES = {
  grounding: [
    "panic", "panic attack", "can't breathe", "overwhelmed", "spiraling",
    "anxious", "losing control", "freaking out", "racing thoughts", "stressed",
    "can't calm down", "heart racing", "shaking", "on edge", "nervous",
    "too much", "can't handle", "falling apart", "breaking down", "so much going on",
    "wound up", "wired", "jittery", "restless", "tense", "uptight",
    "can't relax", "feel like i am going crazy", "losing my mind", "can't focus",
    "mind won't stop", "head is spinning", "feel sick", "knot in my stomach",
    "chest is tight", "can't sit still", "everything is too loud"
  ],
  comfort: [
    "sad", "grief", "lonely", "hurt", "heartbroken", "crying", "tired",
    "exhausted", "miss them", "emotionally drained",
    "miss someone", "miss her", "miss him", "lost someone", "feeling down",
    "heavy", "rough day", "bad day", "tough day", "feeling low",
    "not okay", "not great", "struggling", "hard time", "been hard",
    "worn out", "burnt out", "drained", "empty inside", "feel alone",
    "feeling off", "not myself", "kinda down", "kind of down", "a bit down",
    "not doing well", "having a hard time", "been rough", "been tough",
    "feeling flat", "numb", "disconnected", "hopeless", "defeated",
    "low energy", "no motivation", "can't be bothered", "meh",
    "blah", "ugh", "sucks", "hate this", "over it", "done with everything",
    "nobody cares", "no one gets it", "feeling invisible", "left out",
    "not in a good place", "dark place", "in a funk", "down bad"
  ],
  reflective: [
    "thinking about", "remembering", "processing", "trying to understand",
    "why do I", "looking back", "confused about", "figuring out",
    "been thinking", "on my mind", "can't stop thinking", "wondering",
    "reflecting", "makes me think", "reminds me", "what if", "used to",
    "idk why", "don't know why", "trying to figure", "going through something",
    "not sure how i feel", "mixed feelings", "torn", "conflicted",
    "trying to make sense", "so confusing", "hard to explain",
    "been on my mind", "keeps coming back", "can't let go",
    "second guessing", "overthinking", "analyzing", "replaying",
    "i keep going back to", "part of me thinks", "the other part"
  ],
  insight: [
    "I understand now", "that makes sense", "I realize", "I see",
    "that helped", "I feel better", "relief", "I'm okay now",
    "clicked", "hit me", "finally get it", "makes more sense now",
    "oh wow", "never thought of it that way", "you're right",
    "that's true", "needed to hear that", "thank you for that",
    "i get it now", "that actually helps", "wait that is true",
    "huh i never saw it that way", "you have a point", "good point",
    "that changes things", "i feel lighter", "weight off",
    "i can see that", "starting to make sense", "things are clicking"
  ],
  presence: [
    "I'm calm now", "I am calm now", "I'm relaxed now", "I am relaxed now",
    "feeling much better", "I feel better now", "feel better now",
    "I'm at peace", "I am at peace", "feeling at ease", "I'm content now", "I am content now",
    "just chilling", "just vibing", "vibing", "chillin",
    "life is good", "things are good", "all good now",
    "I'm good now", "I am good now", "feeling good now", "I'm okay now", "I am okay now"
  ]
};

const FUZZY_PATTERNS = {
  comfort: [
    /\b(?:feel(?:ing)?|been|kinda?|sort\s*of|a\s*bit)\s+(?:sad|down|low|off|bad|rough|flat|empty|lonely|meh|blah|crappy|shitty|horrible|terrible|awful|miserable)\b/i,
    /\b(?:not|haven't been|ain't)\s+(?:doing\s+)?(?:good|great|well|okay|ok|fine|myself)\b/i,
    /\b(?:rough|bad|hard|tough|shit|shitty|crappy|horrible|terrible|awful)\s+(?:day|week|month|time|period|stretch|few days)\b/i,
    /\bi\s+(?:just\s+)?(?:want|need)\s+(?:to\s+)?(?:cry|scream|disappear|be alone|give up|hide)\b/i,
    /\b(?:everything|it all|life|things)\s+(?:feels?|seems?|is)\s+(?:pointless|meaningless|hopeless|empty|heavy|dark|too much)\b/i,
  ],
  grounding: [
    /\b(?:feel(?:ing)?|so|really|very|extremely|super)\s+(?:anxious|stressed|panicky|nervous|overwhelmed|tense|wound up|wired|jittery|restless|on edge)\b/i,
    /\b(?:my|the)\s+(?:heart|chest|stomach|hands?|body)\s+(?:is|are|feels?|won't stop)\s+(?:racing|pounding|tight|shaking|churning|hurting)\b/i,
    /\b(?:can't|cannot|unable to)\s+(?:breathe|think|focus|calm|relax|sleep|stop)\b/i,
    /\b(?:mind|brain|thoughts?|head)\s+(?:is|are|won't stop)\s+(?:racing|spinning|going|all over)\b/i,
  ],
  reflective: [
    /\b(?:i'?ve?\s+been|keep|can't stop)\s+(?:thinking|wondering|reflecting|processing|going over|replaying)\b/i,
    /\b(?:trying to|need to|want to)\s+(?:understand|figure out|make sense|process|work through|sort out)\b/i,
    /\b(?:not sure|don't know|idk|dunno)\s+(?:how i feel|what i think|what to do|what to make of|if i should)\b/i,
    /\b(?:something|it)\s+(?:about|in)\s+(?:that|this|what|me)\s+(?:just|really)?\s*(?:bugs|bothers|nags|sticks with)\b/i,
  ],
  insight: [
    /\b(?:oh|wow|huh|wait|actually)\s*[,.]?\s*(?:that|this|you're right|that's true|i see|i get it|makes sense)\b/i,
    /\b(?:i\s+(?:think|feel like)?\s*i?\s*(?:finally|actually|just)?)\s+(?:get it|understand|see it|realize)\b/i,
    /\b(?:never|hadn't|didn't)\s+(?:thought|looked|seen|considered)\s+(?:of|at)?\s*(?:it|things?|that)\s+(?:that|this|like that)\s+(?:way|before)\b/i,
  ]
};

const EXTREME_SPIKE_TRIGGERS = [
  "panic attack", "I can't breathe", "losing control"
];

const STRONG_GROUNDING_SIGNALS = [
  "anxious", "stressed", "nervous", "overwhelmed", "spiraling",
  "can't stop thinking", "racing thoughts", "on edge", "tense",
  "freaking out", "panicking", "scared", "can't calm down",
  "heart racing", "shaking", "too much", "falling apart", "breaking down"
];

// Priority order: grounding (urgent) > insight > comfort > reflective > presence (calm baseline)
// NOTE: 'ambient' is NOT a soundscape - it's the app's default background audio when no soundscape is active
// 'presence' IS a soundscape for calm/chill users, used as rotation return point
const STATE_PRIORITY = ['grounding', 'insight', 'comfort', 'reflective', 'presence'];

const ALLOWED_TRANSITIONS = {
  presence: ['grounding', 'comfort', 'reflective', 'insight', 'presence'],
  grounding: ['comfort', 'presence'],  // Can exit grounding to presence when calm
  comfort: ['reflective', 'insight', 'comfort', 'presence'],  // Added presence
  reflective: ['insight', 'presence', 'reflective'],
  insight: ['presence', 'insight']
};

const DWELL_TIME_MS = 300000; // 5 minutes — anti-oscillation floor
const OSCILLATION_WINDOW_MS = 180000;
const OSCILLATION_THRESHOLD = 2;
const FREEZE_DURATION_MS = 180000;
const NEUTRAL_STREAK_THRESHOLD = 25; // 25 neutral messages before returning to presence — stay committed
const SIGNAL_TIMEOUT_MS = 1800000; // 30 minutes — emotional states linger, don't rush back
const GROUNDING_CLEAR_THRESHOLD = 5; // Require 5 clear messages to exit grounding
const MIN_STATE_PERSIST_MESSAGES = 25; // Secondary gate — message count
const INACTIVITY_TIMEOUT_MS = 1800000; // 30 minutes — emotional states linger, don't rush back
const BASELINE_WINDOW_MESSAGES = 3; // Accumulate signals over first 3 messages before making initial switch
const MIN_TRACKS_BEFORE_SWITCH = 7; // Client must play all 7 tracks before server suggests a switch
const MIN_TIME_IN_STATE_MS = 1800000; // 30 minutes — PRIMARY gate: play all 7 tracks (~30 min) before reassessing

// ============================================================
// SESSION STATE STORAGE (in-memory cache + PostgreSQL persistence)
// ============================================================

const sessionStates = new Map();
let _dbPool = null;

function setDbPool(pool) {
  _dbPool = pool;
}

function defaultSessionState() {
  return {
    current_state: 'presence',
    last_change_timestamp: 0,
    state_change_history: [],
    last_signal_timestamp: 0,
    neutral_message_streak: 0,
    grounding_clear_streak: 0,
    freeze_until_timestamp: null,
    messages_since_state_change: 0,
    last_activity_timestamp: 0,
    baseline_window_active: true,
    baseline_message_count: 0,
    accumulated_signals: { grounding: 0, comfort: 0, reflective: 0, insight: 0 },
    continuous_signals: { grounding: 0, comfort: 0, reflective: 0, insight: 0, presence: 0 },
    last_known_tracks_played: 0
  };
}

async function loadSessionFromDb(userId) {
  if (!_dbPool) return null;
  try {
    const { rows } = await _dbPool.query(
      'SELECT * FROM atmosphere_sessions WHERE user_id = $1',
      [userId]
    );
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      current_state: row.current_state,
      last_change_timestamp: Number(row.last_change_timestamp),
      state_change_history: row.state_change_history || [],
      last_signal_timestamp: Number(row.last_signal_timestamp),
      neutral_message_streak: row.neutral_message_streak,
      grounding_clear_streak: row.grounding_clear_streak,
      freeze_until_timestamp: row.freeze_until_timestamp ? Number(row.freeze_until_timestamp) : null,
      messages_since_state_change: row.messages_since_state_change,
      last_activity_timestamp: Number(row.last_activity_timestamp),
      baseline_window_active: row.baseline_window_active,
      baseline_message_count: row.baseline_message_count,
      accumulated_signals: row.accumulated_signals || { grounding: 0, comfort: 0, reflective: 0, insight: 0 },
      continuous_signals: row.continuous_signals || { grounding: 0, comfort: 0, reflective: 0, insight: 0, presence: 0 },
      last_known_tracks_played: row.last_known_tracks_played || 0
    };
  } catch (err) {
    console.warn('[ATMOSPHERE] DB load failed:', err.message);
    return null;
  }
}

function saveSessionToDb(userId, state) {
  if (!_dbPool) return;
  _dbPool.query(
    `INSERT INTO atmosphere_sessions (user_id, current_state, last_change_timestamp, state_change_history,
      last_signal_timestamp, neutral_message_streak, grounding_clear_streak, freeze_until_timestamp,
      messages_since_state_change, last_activity_timestamp, baseline_window_active, baseline_message_count,
      accumulated_signals, continuous_signals, last_known_tracks_played, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      current_state = $2, last_change_timestamp = $3, state_change_history = $4,
      last_signal_timestamp = $5, neutral_message_streak = $6, grounding_clear_streak = $7,
      freeze_until_timestamp = $8, messages_since_state_change = $9, last_activity_timestamp = $10,
      baseline_window_active = $11, baseline_message_count = $12, accumulated_signals = $13,
      continuous_signals = $14, last_known_tracks_played = $15, updated_at = NOW()`,
    [
      userId, state.current_state, state.last_change_timestamp,
      JSON.stringify(state.state_change_history || []),
      state.last_signal_timestamp, state.neutral_message_streak, state.grounding_clear_streak,
      state.freeze_until_timestamp, state.messages_since_state_change, state.last_activity_timestamp,
      state.baseline_window_active, state.baseline_message_count,
      JSON.stringify(state.accumulated_signals || {}),
      JSON.stringify(state.continuous_signals || {}),
      state.last_known_tracks_played || 0
    ]
  ).catch(err => console.warn('[ATMOSPHERE] DB save failed:', err.message));
}

function getSessionState(userId) {
  if (!sessionStates.has(userId)) {
    sessionStates.set(userId, defaultSessionState());
  }
  return sessionStates.get(userId);
}

async function getSessionStateAsync(userId) {
  if (sessionStates.has(userId)) {
    return sessionStates.get(userId);
  }
  const dbState = await loadSessionFromDb(userId);
  if (dbState) {
    console.log(`[ATMOSPHERE] Restored session from DB for ${userId.slice(0,8)}: state=${dbState.current_state}, msgs=${dbState.messages_since_state_change}`);
    sessionStates.set(userId, dbState);
    return dbState;
  }
  const fresh = defaultSessionState();
  sessionStates.set(userId, fresh);
  return fresh;
}

function updateSessionState(userId, updates) {
  const state = getSessionState(userId);
  Object.assign(state, updates);
  sessionStates.set(userId, state);
  saveSessionToDb(userId, state);
  return state;
}

// ============================================================
// SIGNAL SCORING
// ============================================================

function scoreSignals(currentMessage, recentMessages = []) {
  const scores = {
    grounding: 0,
    comfort: 0,
    reflective: 0,
    insight: 0,
    presence: 0
  };
  
  const normalizeContractions = (text) => text
    .replace(/i'm/g, 'i am')
    .replace(/i've/g, 'i have')
    .replace(/can't/g, 'cannot')
    .replace(/don't/g, 'do not')
    .replace(/won't/g, 'will not')
    .replace(/it's/g, 'it is')
    .replace(/that's/g, 'that is')
    .replace(/what's/g, 'what is')
    .replace(/you're/g, 'you are');
  
  const textLower = normalizeContractions(currentMessage.toLowerCase());
  
  for (const [state, signals] of Object.entries(SIGNAL_TABLES)) {
    for (const signal of signals) {
      const normalizedSignal = normalizeContractions(signal.toLowerCase());
      if (textLower.includes(normalizedSignal)) {
        scores[state] += 1.0;
      }
    }
  }
  
  for (const [state, patterns] of Object.entries(FUZZY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(textLower)) {
        scores[state] += 1.0;
        break;
      }
    }
  }
  
  for (const msg of recentMessages.slice(0, 2)) {
    const msgLower = normalizeContractions((msg || '').toLowerCase());
    for (const [state, signals] of Object.entries(SIGNAL_TABLES)) {
      for (const signal of signals) {
        const normalizedSignal = normalizeContractions(signal.toLowerCase());
        if (msgLower.includes(normalizedSignal)) {
          scores[state] += 0.5;
        }
      }
    }
    for (const [state, patterns] of Object.entries(FUZZY_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(msgLower)) {
          scores[state] += 0.5;
          break;
        }
      }
    }
  }
  
  return scores;
}

function getConfidenceLevel(score) {
  if (score >= 2.0) return 'high';
  if (score >= 1.0) return 'medium';  // Single keyword now triggers medium
  return 'low';
}

function detectExtremSpike(message) {
  const msgLower = message.toLowerCase();
  return EXTREME_SPIKE_TRIGGERS.some(trigger => msgLower.includes(trigger));
}

function detectStrongGroundingSignal(message) {
  const msgLower = message.toLowerCase();
  return STRONG_GROUNDING_SIGNALS.some(trigger => msgLower.includes(trigger));
}

// ============================================================
// MAIN EVALUATION FUNCTION
// ============================================================

async function evaluateAtmosphere(input) {
  const {
    userId,
    current_message,
    recent_messages = [],
    client_sound_state = null,
    userMessageCount = 0,
    assistantMessageCount = 0,
    isCrisisMode = false,
    tracksPlayedInState: clientTracksPlayed = 0,
    soundscapeLocked = false
  } = input;
  
  const now = Date.now();
  
  // ============================================================
  // 🚨 CRISIS MODE OVERRIDE: Force grounding soundscape immediately
  // When user is in crisis, they need the most supportive sound environment
  // ============================================================
  if (isCrisisMode) {
    const session = await getSessionStateAsync(userId);
    const wasGrounding = session.current_state === 'grounding';
    
    // Save pre-crisis state so we can restore it when crisis clears
    if (!wasGrounding && !session._pre_crisis_state) {
      console.log(`[ATMOSPHERE] Saving pre-crisis state: ${session.current_state}`);
    }
    
    // Force grounding state for crisis
    updateSessionState(userId, {
      current_state: 'grounding',
      last_change_timestamp: wasGrounding ? session.last_change_timestamp : now,
      last_activity_timestamp: now,
      messages_since_state_change: wasGrounding ? session.messages_since_state_change + 1 : 0,
      _pre_crisis_state: session._pre_crisis_state || (wasGrounding ? null : session.current_state),
      _crisis_entered_at: session._crisis_entered_at || now
    });
    
    console.log(`[ATMOSPHERE] 🚨 CRISIS MODE - forcing grounding soundscape (was: ${session.current_state})`);
    
    return {
      sound_state: {
        current: 'grounding',
        changed: !wasGrounding,
        reason: 'crisis_mode_override',
        cadence: { userMessageCount, assistantMessageCount, met: true }
      }
    };
  }
  
  // 🔄 CRISIS EXIT: If we were in crisis-forced grounding, restore to presence
  // Only triggers when: (1) current state is grounding, (2) crisis markers exist, (3) crisis entered recently (< 24h)
  {
    const session = await getSessionStateAsync(userId);
    const crisisEnteredAt = session._crisis_entered_at || 0;
    const crisisAge = now - crisisEnteredAt;
    const MAX_CRISIS_AGE = 24 * 60 * 60 * 1000;
    
    if (session.current_state === 'grounding' && crisisEnteredAt > 0 && crisisAge < MAX_CRISIS_AGE) {
      const restoredState = 'presence';
      console.log(`[ATMOSPHERE] Crisis cleared — restoring to ${restoredState} (was crisis-forced grounding for ${Math.round(crisisAge / 60000)}min, pre-crisis: ${session._pre_crisis_state || 'unknown'})`);
      updateSessionState(userId, {
        current_state: restoredState,
        last_change_timestamp: now,
        last_activity_timestamp: now,
        messages_since_state_change: 0,
        _pre_crisis_state: null,
        _crisis_entered_at: null,
        baseline_window_active: true,
        baseline_message_count: 0,
        accumulated_signals: { grounding: 0, comfort: 0, reflective: 0, insight: 0 },
        continuous_signals: { grounding: 0, comfort: 0, reflective: 0, insight: 0, presence: 0 }
      });
      
      return {
        sound_state: {
          current: restoredState,
          changed: true,
          reason: 'crisis_exit_restore',
          cadence: { userMessageCount, assistantMessageCount, met: true }
        }
      };
    } else if (crisisEnteredAt > 0 && crisisAge >= MAX_CRISIS_AGE) {
      console.log('[ATMOSPHERE] Stale crisis markers cleared (> 24h old)');
      updateSessionState(userId, { _pre_crisis_state: null, _crisis_entered_at: null });
    }
  }
  
  // ============================================================
  // 🎵 CADENCE GATE: Check if 3-message cadence is met (2 user + 1 assistant)
  // Soundscapes start quickly once conversation begins
  // ============================================================
  const cadenceMet = userMessageCount >= 2 && assistantMessageCount >= 1;
  
  if (!cadenceMet) {
    console.log(`[ATMOSPHERE] Cadence not met: user=${userMessageCount}, assistant=${assistantMessageCount} - staying on presence`);
    return {
      sound_state: {
        current: 'presence',
        changed: false,
        reason: 'cadence_not_met',
        cadence: { userMessageCount, assistantMessageCount, met: false }
      }
    };
  }
  
  const session = await getSessionStateAsync(userId);
  
  // ============================================================
  // 🎵 INACTIVITY CHECK: Return to ambient after extended inactivity
  // ============================================================
  const lastActivity = session.last_activity_timestamp || 0;
  const timeSinceLastActivity = now - lastActivity;
  
  // Check if a non-presence soundscape is currently active
  const hasNonPresenceSoundscape = session.current_state && session.current_state !== 'presence';
  
  if (lastActivity > 0 && timeSinceLastActivity >= INACTIVITY_TIMEOUT_MS && hasNonPresenceSoundscape) {
    console.log(`[ATMOSPHERE] Inactivity reset: ${Math.floor(timeSinceLastActivity / 1000)}s since last activity - returning to presence from ${session.current_state}`);
    
    updateSessionState(userId, {
      current_state: 'presence',
      last_change_timestamp: now,
      last_activity_timestamp: now,
      neutral_message_streak: 0,
      grounding_clear_streak: 0,
      messages_since_state_change: 0
    });
    
    return {
      sound_state: {
        current: 'presence',
        changed: true,
        reason: 'inactivity_reset_5min',
        cadence: { userMessageCount, assistantMessageCount, met: true }
      }
    };
  }
  
  // Update last activity timestamp (user is active now)
  session.last_activity_timestamp = now;
  
  // ============================================================
  // 🎵 INITIALIZE SOUNDSCAPE: When cadence is met and we're still on ambient
  // Start at presence - accumulate signals over first few messages
  // ============================================================
  if (session.current_state === null || session.current_state === undefined) {
    console.log(`[ATMOSPHERE] Cadence met, initializing to presence (baseline window open for ${BASELINE_WINDOW_MESSAGES} messages)`);
    
    updateSessionState(userId, {
      current_state: 'presence',
      last_change_timestamp: now,
      last_activity_timestamp: now,
      neutral_message_streak: 0,
      grounding_clear_streak: 0,
      messages_since_state_change: 0,
      baseline_window_active: true,
      baseline_message_count: 0,
      accumulated_signals: { grounding: 0, comfort: 0, reflective: 0, insight: 0 }
    });
    
    return {
      sound_state: {
        current: 'presence', // Start calm - will switch if signals accumulate
        changed: true,
        reason: 'cadence_met_initial_presence',
        cadence: { userMessageCount, assistantMessageCount, met: true }
      }
    };
  }
  
  // ============================================================
  // CLIENT STATE RESTORATION (handles server restarts)
  // If server has no record but client says it's in a specific state, restore it
  // ============================================================
  const VALID_STATES = ['presence', 'grounding', 'comfort', 'reflective', 'insight'];
  if (client_sound_state && VALID_STATES.includes(client_sound_state)) {
    if (session.current_state !== client_sound_state && client_sound_state !== 'presence') {
      const isNewSession = session.last_change_timestamp === 0;
      const isServerStale = session.messages_since_state_change <= 2;
      const clientIsLocked = soundscapeLocked || (clientTracksPlayed > 0 && clientTracksPlayed < 7);
      if (isNewSession || isServerStale || clientIsLocked) {
        console.log(`[ATMOSPHERE] Syncing server to client state: ${client_sound_state} (server=${session.current_state}, new=${isNewSession}, stale=${isServerStale}, locked=${clientIsLocked}, tracks=${clientTracksPlayed})`);
        session.current_state = client_sound_state;
        session.last_change_timestamp = now - 30000;
        session.messages_since_state_change = 3;
        session.neutral_message_streak = 0;
        session.baseline_window_active = false;
      }
    }
  }
  
  const {
    current_state,
    last_change_timestamp,
    state_change_history,
    last_signal_timestamp,
    neutral_message_streak,
    grounding_clear_streak,
    freeze_until_timestamp,
    messages_since_state_change,
    baseline_window_active,
    baseline_message_count,
    accumulated_signals
  } = session;
  
  // Increment message counter for current state
  const newMessagesSinceChange = messages_since_state_change + 1;
  
  const seconds_since_last_change = Math.floor((now - last_change_timestamp) / 1000);
  
  // ============================================================
  // 1️⃣ OSCILLATION FREEZE CHECK
  // ============================================================
  
  if (freeze_until_timestamp && now < freeze_until_timestamp) {
    console.log('[ATMOSPHERE] Frozen - oscillation protection active');
    return {
      sound_state: {
        current: current_state,
        changed: false,
        reason: 'oscillation_freeze_active'
      }
    };
  }
  
  // Check if we need to trigger a freeze
  const recentChanges = state_change_history.filter(
    ts => (now - ts) < OSCILLATION_WINDOW_MS
  );
  
  if (recentChanges.length >= OSCILLATION_THRESHOLD) {
    const newFreezeUntil = now + FREEZE_DURATION_MS;
    updateSessionState(userId, { freeze_until_timestamp: newFreezeUntil });
    console.log('[ATMOSPHERE] Triggering oscillation freeze for 90s');
    return {
      sound_state: {
        current: current_state,
        changed: false,
        reason: 'oscillation_freeze_triggered'
      }
    };
  }
  
  // ============================================================
  // SIGNAL SCORING
  // ============================================================
  
  const scores = scoreSignals(current_message, recent_messages);
  const maxScore = Math.max(...Object.values(scores));
  const maxConfidence = getConfidenceLevel(maxScore);
  
  // 🎵 CONTINUOUS CHECK: Every message is evaluated for emotional signals
  console.log(`[ATMOSPHERE] 🔍 CONTINUOUS CHECK: message="${current_message.slice(0,40)}..."`);
  console.log(`[ATMOSPHERE] Scoring: scores=${JSON.stringify(scores)} max=${maxScore} conf=${maxConfidence} current=${current_state}`);
  
  // Update neutral streak and signal timestamp
  let newNeutralStreak = neutral_message_streak;
  let newSignalTimestamp = last_signal_timestamp;
  
  if (maxConfidence === 'low') {
    newNeutralStreak++;
  } else {
    newNeutralStreak = 0;
    newSignalTimestamp = now;
  }
  
  // ============================================================
  // 🎯 BASELINE WINDOW: Accumulate signals over first few messages
  // Make intelligent switch once we have enough emotional context
  // ============================================================
  
  if (baseline_window_active && current_state === 'presence') {
    const newBaselineCount = (baseline_message_count || 0) + 1;
    
    // Accumulate this message's scores
    const newAccumulated = { ...accumulated_signals };
    for (const state of ['grounding', 'comfort', 'reflective', 'insight']) {
      newAccumulated[state] = (newAccumulated[state] || 0) + (scores[state] || 0);
    }
    
    console.log(`[ATMOSPHERE] 📊 Baseline window: message ${newBaselineCount}/${BASELINE_WINDOW_MESSAGES}, accumulated=${JSON.stringify(newAccumulated)}`);
    
    // Check if we should make an intelligent switch
    // Can trigger early if strong signal detected, otherwise wait for window to complete
    const hasStrongSignal = maxScore >= 2.0; // Strong enough for immediate switch
    const windowComplete = newBaselineCount >= BASELINE_WINDOW_MESSAGES;
    
    if (hasStrongSignal || windowComplete) {
      // Find highest accumulated signal
      let bestState = null;
      let bestScore = 0;
      const BASELINE_PRIORITY = ['grounding', 'comfort', 'reflective', 'insight'];
      
      for (const state of BASELINE_PRIORITY) {
        const accumulated = newAccumulated[state] || 0;
        // Require minimum accumulated score to trigger (1.0 = at least one keyword match)
        if (accumulated > bestScore && accumulated >= 1.0) {
          bestScore = accumulated;
          bestState = state;
        }
      }
      
      if (bestState) {
        console.log(`[ATMOSPHERE] 🎯 Baseline switch: ${current_state} → ${bestState} (accumulated: ${bestScore.toFixed(1)})`);
        
        updateSessionState(userId, {
          current_state: bestState,
          last_change_timestamp: now,
          messages_since_state_change: 0,
          baseline_window_active: false, // Window closes after switch
          baseline_message_count: newBaselineCount,
          accumulated_signals: newAccumulated,
          neutral_message_streak: 0,
          last_signal_timestamp: now,
          state_change_history: [...state_change_history.slice(-10), now]
        });
        
        return {
          sound_state: {
            current: bestState,
            changed: true,
            reason: `baseline_detected_${bestState}`,
            accumulated_score: bestScore,
            cadence: { userMessageCount, assistantMessageCount, met: true }
          }
        };
      } else if (windowComplete) {
        // No emotional signals detected, close window and stay in presence
        console.log(`[ATMOSPHERE] 📊 Baseline window complete: no signals detected, staying in presence`);
        updateSessionState(userId, {
          baseline_window_active: false,
          baseline_message_count: newBaselineCount,
          accumulated_signals: newAccumulated
        });
      }
    } else {
      // Still collecting, update counters
      updateSessionState(userId, {
        baseline_message_count: newBaselineCount,
        accumulated_signals: newAccumulated
      });
    }
  }
  
  // ============================================================
  // 🔄 CONTINUOUS SIGNAL ACCUMULATION (even after baseline window)
  // Track rolling signals for reassessment at persistence boundary
  // ============================================================
  
  const newContinuousAccumulated = { ...session.continuous_signals || { grounding: 0, comfort: 0, reflective: 0, insight: 0, presence: 0 } };
  for (const state of ['grounding', 'comfort', 'reflective', 'insight', 'presence']) {
    newContinuousAccumulated[state] = (newContinuousAccumulated[state] * 0.97) + (scores[state] || 0);
  }
  
  console.log(`[ATMOSPHERE] 📊 Continuous signals: ${JSON.stringify(newContinuousAccumulated)}`);
  
  // ============================================================
  // 2️⃣ PERSISTENCE + REASSESSMENT LOGIC
  // Presence = responsive landing pad, switches immediately on signal detection.
  // Non-presence states = locked for 30 min (7 tracks) before reassessment.
  // Primary gate: 30 min elapsed OR 7 tracks played (whichever comes first).
  // ============================================================
  
  let candidate_state = null;
  let reason = '';
  
  const elapsedInStateMs = now - last_change_timestamp;
  const AVG_TRACK_DURATION_MS = 180000;
  const MIN_TRACK_DURATION_MS = 120000;
  const serverEstimatedTracks = Math.floor(elapsedInStateMs / AVG_TRACK_DURATION_MS);
  const maxPossibleTracks = Math.ceil(elapsedInStateMs / MIN_TRACK_DURATION_MS) + 1;

  const trackResetAt = session._track_counter_reset_at || 0;
  const timeSinceReset = trackResetAt > 0 ? (now - trackResetAt) : elapsedInStateMs;
  const tooSoonAfterReset = trackResetAt > 0 && timeSinceReset < MIN_TRACK_DURATION_MS;

  let clientReported = Math.max(clientTracksPlayed, session.last_known_tracks_played || 0);
  if (tooSoonAfterReset && clientReported > 1) {
    console.warn(`[ATMOSPHERE] ⚠️ Client reported ${clientReported} tracks but state just changed ${Math.floor(timeSinceReset/1000)}s ago — resetting to 0 (stale counter)`);
    clientReported = 0;
    session.last_known_tracks_played = 0;
  } else if (clientReported > maxPossibleTracks) {
    console.warn(`[ATMOSPHERE] ⚠️ Client reported ${clientReported} tracks but only ${maxPossibleTracks} possible in ${Math.floor(elapsedInStateMs/1000)}s — capping (likely stale counter from previous state)`);
    clientReported = Math.min(clientReported, maxPossibleTracks);
  }
  if (clientTracksPlayed > (session.last_known_tracks_played || 0) && clientTracksPlayed <= maxPossibleTracks && !tooSoonAfterReset) {
    session.last_known_tracks_played = clientTracksPlayed;
  }
  const tracksPlayedInState = clientReported > 0 ? clientReported : serverEstimatedTracks;
  const trackGateMet = tracksPlayedInState >= MIN_TRACKS_BEFORE_SWITCH;
  const timeGateMet = elapsedInStateMs >= MIN_TIME_IN_STATE_MS;
  const isInNonPresenceState = current_state !== 'presence';
  
  const STATE_URGENCY = { grounding: 4, insight: 3, comfort: 2, reflective: 1, presence: 0 };
  const currentUrgency = STATE_URGENCY[current_state] || 0;
  
  // Primary gate for non-presence: 30 min elapsed OR 7 tracks played
  const fullPersistenceMet = isInNonPresenceState && (timeGateMet || trackGateMet);
  
  if (fullPersistenceMet) {
    // ============================================================
    // 🎯 REASSESSMENT POINT: 30 min / 7 tracks completed in current state
    // Evaluate accumulated signals to decide next state
    // ============================================================
    console.log(`[ATMOSPHERE] 🎯 REASSESSMENT: ${Math.floor(elapsedInStateMs/1000)}s elapsed (${Math.floor(MIN_TIME_IN_STATE_MS/1000)}s gate), ${tracksPlayedInState} tracks (client=${clientReported}, est=${serverEstimatedTracks}), current=${current_state}`);
    
    let bestState = current_state;
    let bestScore = newContinuousAccumulated[current_state] || 0;
    
    for (const state of STATE_PRIORITY) {
      if (state === current_state) continue;
      const accumulated = newContinuousAccumulated[state] || 0;
      if (accumulated > bestScore && accumulated >= 1.0) {
        bestScore = accumulated;
        bestState = state;
      }
    }
    
    // Check if current state is exhausted → return to presence
    const presenceAccumulated = newContinuousAccumulated['presence'] || 0;
    const currentStateScore = newContinuousAccumulated[current_state] || 0;
    const currentStateExhausted = currentStateScore < 0.15;
    const neutralStreakMet = newNeutralStreak >= NEUTRAL_STREAK_THRESHOLD;
    const signalTimedOut = newSignalTimestamp > 0 && (now - newSignalTimestamp) >= SIGNAL_TIMEOUT_MS;
    
    // Presence preference: when presence has signals AND current state is weak,
    // prefer returning to presence even if another state tied or scored slightly higher.
    // This ensures "I'm calm now" reliably returns to baseline.
    if (presenceAccumulated >= 0.5 && currentStateExhausted) {
      bestState = 'presence';
      bestScore = presenceAccumulated;
      console.log(`[ATMOSPHERE] 🔄 Presence preferred: current ${current_state} exhausted (${currentStateScore.toFixed(2)}), presence accumulated ${presenceAccumulated.toFixed(2)} → presence`);
    } else if (bestState === current_state && (
      (currentStateExhausted && neutralStreakMet) ||
      signalTimedOut
    )) {
      bestState = 'presence';
      bestScore = presenceAccumulated || 0;
      const exitReason = signalTimedOut ? 'signal_timeout' : 'neutral_streak';
      console.log(`[ATMOSPHERE] 🔄 State ${current_state} exhausted (${currentStateScore.toFixed(2)}), exit via ${exitReason} → presence`);
    }
    
    if (bestState !== current_state) {
      candidate_state = bestState;
      reason = `reassessment_${bestState}_score_${bestScore.toFixed(1)}`;
      console.log(`[ATMOSPHERE] 🔄 Reassessment suggests: ${current_state} → ${bestState}`);
    } else {
      console.log(`[ATMOSPHERE] 🔄 Reassessment: staying in ${current_state}, resetting 30-min window`);
    }
    
    // Decay continuous signals for next 30-min window
    for (const state of ['grounding', 'comfort', 'reflective', 'insight', 'presence']) {
      newContinuousAccumulated[state] = newContinuousAccumulated[state] * 0.9;
    }
  } else if (isInNonPresenceState && !fullPersistenceMet) {
    // ============================================================
    // 🛡️ PERSISTENCE PROTECTION: Non-presence states locked for 30 min / 7 tracks
    // Only urgent upgrades (higher priority) can interrupt
    // ============================================================
    console.log(`[ATMOSPHERE] 🛡️ Persistence: elapsed=${Math.floor(elapsedInStateMs/1000)}s/${Math.floor(MIN_TIME_IN_STATE_MS/1000)}s, tracks=${tracksPlayedInState}/${MIN_TRACKS_BEFORE_SWITCH} (client=${clientReported}, est=${serverEstimatedTracks}) - locked in ${current_state}`);
    
    if (maxConfidence !== 'low') {
      const highConfidenceStates = Object.entries(scores)
        .filter(([_, score]) => score >= 1.5)
        .map(([state, _]) => state);
      
      for (const priorityState of STATE_PRIORITY) {
        if (highConfidenceStates.includes(priorityState)) {
          const candidateUrgency = STATE_URGENCY[priorityState] || 0;
          if (candidateUrgency > currentUrgency) {
            candidate_state = priorityState;
            reason = `urgent_upgrade_${priorityState}`;
            console.log(`[ATMOSPHERE] ⚡ Urgent upgrade: ${current_state} → ${priorityState} (urgency ${currentUrgency} → ${candidateUrgency})`);
          }
          break;
        }
      }
    }
  } else {
    // ============================================================
    // 3️⃣ PRESENCE STATE: Responsive — switch immediately on signal detection
    // Presence is just the default landing pad. The moment we capture a real
    // emotional state, switch right away. Then lock into that state for 30 min.
    // ============================================================
    
    if (maxConfidence !== 'low') {
      const highConfidenceStates = Object.entries(scores)
        .filter(([_, score]) => score >= 1.0)
        .map(([state, _]) => state);
      
      if (highConfidenceStates.length > 0) {
        for (const priorityState of STATE_PRIORITY) {
          if (highConfidenceStates.includes(priorityState) && priorityState !== 'presence') {
            candidate_state = priorityState;
            reason = `presence_detected_${priorityState}`;
            console.log(`[ATMOSPHERE] 🎯 Presence → ${priorityState}: emotional state captured (score=${scores[priorityState]})`);
            break;
          }
        }
      }
    }
  }
  
  // Store continuous signals for next evaluation
  session.continuous_signals = newContinuousAccumulated;
  
  // ============================================================
  // EXTREME SPIKE OVERRIDE (bypasses dwell + transition, NOT freeze)
  // ============================================================
  
  const isExtremSpike = detectExtremSpike(current_message);
  const isStrongGroundingSignal = detectStrongGroundingSignal(current_message);
  
  if (isExtremSpike) {
    candidate_state = 'grounding';
    reason = 'extreme_spike_override';
    console.log('[ATMOSPHERE] Extreme spike detected - forcing grounding');
  }
  
  // ============================================================
  // 5️⃣ EXIT GROUNDING CHECK (only after 30-min persistence is met)
  // Grounding gets the same 30-min commitment as all other states.
  // Active calm signals ("I'm calm now") are tracked but only acted on at reassessment.
  // ============================================================
  
  let newGroundingClearStreak = grounding_clear_streak;
  
  if (current_state === 'grounding') {
    const groundingScore = scores.grounding || 0;
    const presenceScore = scores.presence || 0;
    
    if (presenceScore >= 1.0 && groundingScore < 1.0) {
      if (fullPersistenceMet) {
        candidate_state = 'presence';
        reason = 'active_presence_detected_in_grounding';
        console.log('[ATMOSPHERE] Exiting grounding - active presence signal + 30-min gate met');
      } else {
        console.log('[ATMOSPHERE] Active presence in grounding detected but 30-min gate not met — staying');
      }
      newGroundingClearStreak = GROUNDING_CLEAR_THRESHOLD;
    } else {
      if (groundingScore < 2.0) {
        newGroundingClearStreak++;
      } else {
        newGroundingClearStreak = 0;
      }
      
      if (newGroundingClearStreak >= GROUNDING_CLEAR_THRESHOLD && fullPersistenceMet) {
        candidate_state = 'presence';
        reason = 'grounding_clear_streak_exit';
        console.log('[ATMOSPHERE] Exiting grounding - clear streak + 30-min gate met');
      }
    }
  }
  
  // ============================================================
  // 4️⃣ TRANSITION RULE VALIDATION
  // ============================================================
  
  let shouldChange = false;
  
  console.log(`[ATMOSPHERE] Transition check: candidate=${candidate_state}, current=${current_state}, clientLocked=${soundscapeLocked}`);
  
  if (soundscapeLocked && candidate_state && candidate_state !== current_state) {
    const isCrisisOverride = isExtremSpike || (isStrongGroundingSignal && candidate_state === 'grounding');
    if (!isCrisisOverride) {
      console.log(`[ATMOSPHERE] 🔒 CLIENT LOCKED: Server wants ${current_state} → ${candidate_state} but client soundscape is locked. Suppressing change, signals accumulated for reassessment.`);
      session.continuous_signals = newContinuousAccumulated;
      updateSessionState(userId, {
        neutral_message_streak: newNeutralStreak,
        last_signal_timestamp: newSignalTimestamp,
        messages_since_state_change: newMessagesSinceChange,
        last_activity_timestamp: now
      });
      return {
        sound_state: {
          current: current_state,
          changed: false,
          reason: 'client_soundscape_locked',
          cadence: { userMessageCount, assistantMessageCount, met: true }
        }
      };
    }
    console.log(`[ATMOSPHERE] 🚨 Client locked but crisis override active — allowing change`);
  }
  
  if (candidate_state && candidate_state !== current_state) {
    const allowedNext = ALLOWED_TRANSITIONS[current_state] || [];
    const dwellElapsed = now - last_change_timestamp;
    
    console.log(`[ATMOSPHERE] Checking transition: allowed=${JSON.stringify(allowedNext)}, dwellElapsed=${dwellElapsed}ms, required=${DWELL_TIME_MS}ms`);
    
    if (isExtremSpike) {
      shouldChange = true;
      console.log('[ATMOSPHERE] Extreme spike - bypassing rules');
    } else if (isStrongGroundingSignal && candidate_state === 'grounding') {
      shouldChange = true;
      console.log('[ATMOSPHERE] Strong grounding signal - bypassing dwell time');
    } else if (fullPersistenceMet && allowedNext.includes(candidate_state)) {
      // 30-min gate already satisfied — reassessment decided, skip dwell time
      shouldChange = true;
      console.log('[ATMOSPHERE] Reassessment transition — 30-min gate met, bypassing dwell time');
    } else if (allowedNext.includes(candidate_state)) {
      if (dwellElapsed >= DWELL_TIME_MS) {
        shouldChange = true;
        console.log('[ATMOSPHERE] Dwell time satisfied - allowing transition');
      } else {
        reason = 'dwell_time_not_satisfied';
        candidate_state = null;
        console.log(`[ATMOSPHERE] Dwell time NOT satisfied - blocking (need ${DWELL_TIME_MS - dwellElapsed}ms more)`);
      }
    } else {
      reason = `transition_not_allowed_${current_state}_to_${candidate_state}`;
      candidate_state = null;
      console.log(`[ATMOSPHERE] Transition blocked: ${current_state} → ${candidate_state} not allowed`);
    }
  } else if (candidate_state === current_state) {
    console.log(`[ATMOSPHERE] Already in ${current_state}, no change needed`);
  }
  
  // ============================================================
  // APPLY STATE CHANGE
  // ============================================================
  
  let finalState = shouldChange ? candidate_state : current_state;
  
  // Update session state
  const updates = {
    neutral_message_streak: newNeutralStreak,
    last_signal_timestamp: newSignalTimestamp,
    grounding_clear_streak: finalState === 'grounding' ? newGroundingClearStreak : 0,
    messages_since_state_change: newMessagesSinceChange, // Track message count
    last_activity_timestamp: now // 🎵 Keep activity timestamp fresh
  };
  
  if (shouldChange) {
    updates.current_state = finalState;
    updates.last_change_timestamp = now;
    updates.state_change_history = [...state_change_history.slice(-10), now];
    updates.freeze_until_timestamp = null;
    updates.messages_since_state_change = 0;
    updates.last_known_tracks_played = 0;
    updates._track_counter_reset_at = now;
    console.log(`[ATMOSPHERE] State change: ${current_state} → ${finalState} (${reason}) — track counter reset`);
  } else if (fullPersistenceMet) {
    // Reassessment ran but decided to stay — reset the 30-min window for next cycle
    updates.last_change_timestamp = now;
    updates.messages_since_state_change = 0;
    updates.last_known_tracks_played = 0;
    console.log(`[ATMOSPHERE] Staying in ${finalState}, resetting 30-min window (messages: ${newMessagesSinceChange})`);
  } else {
    console.log(`[ATMOSPHERE] Staying in ${finalState} (elapsed=${Math.floor(elapsedInStateMs/1000)}s, messages: ${newMessagesSinceChange}, reason: ${reason || 'no_change'})`);
  }
  
  updateSessionState(userId, updates);
  
  let driftCorrected = false;
  const VALID_SOUNDSCAPE_STATES = ['presence', 'grounding', 'comfort', 'reflective', 'insight'];
  if (
    finalState &&
    client_sound_state &&
    VALID_SOUNDSCAPE_STATES.includes(client_sound_state) &&
    client_sound_state !== finalState &&
    !shouldChange
  ) {
    const clientInEmotionalState = ['grounding', 'comfort', 'reflective', 'insight'].includes(client_sound_state);
    if (finalState === 'presence' && clientInEmotionalState) {
      console.log(`[ATMOSPHERE] 🔒 DRIFT SUPPRESSED: server wants "presence" but client is in emotional state "${client_sound_state}" (locked=${soundscapeLocked}, tracks=${clientTracksPlayed}). Not overriding emotional soundscape with presence.`);
      finalState = client_sound_state;
    } else if (soundscapeLocked && client_sound_state !== 'presence') {
      console.log(`[ATMOSPHERE] 🔒 DRIFT SUPPRESSED: server wants "${finalState}" but client is LOCKED in "${client_sound_state}" (${clientTracksPlayed} tracks). Respecting client lock.`);
      finalState = client_sound_state;
    } else {
      console.log(`[ATMOSPHERE] ⚠️ DRIFT DETECTED: server wants "${finalState}" but client reports "${client_sound_state}" — forcing correction`);
      driftCorrected = true;
    }
  }
  
  const returnState = (shouldChange || driftCorrected)
    ? finalState
    : (client_sound_state && VALID_SOUNDSCAPE_STATES.includes(client_sound_state) ? client_sound_state : finalState);

  return {
    sound_state: {
      current: returnState,
      changed: shouldChange || driftCorrected,
      reason: driftCorrected ? 'state_enforcement' : (shouldChange ? reason : 'no_change'),
      cadence: { userMessageCount, assistantMessageCount, met: true }
    }
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  evaluateAtmosphere,
  getSessionState,
  getSessionStateAsync,
  updateSessionState,
  setDbPool,
  SIGNAL_TABLES,
  STATE_PRIORITY
};
