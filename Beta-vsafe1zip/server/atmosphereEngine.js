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
    "anxious", "losing control", "freaking out", "racing thoughts", "stressed"
  ],
  comfort: [
    "sad", "grief", "lonely", "hurt", "heartbroken", "crying", "tired",
    "exhausted", "miss them", "emotionally drained"
  ],
  reflective: [
    "thinking about", "remembering", "processing", "trying to understand",
    "why do I", "looking back", "confused about", "figuring out"
  ],
  insight: [
    "I understand now", "that makes sense", "I realize", "I see",
    "that helped", "I feel better", "relief", "I'm okay now"
  ],
  // PRESENCE signals - actively detected calm/positive states
  // Includes single keywords AND phrases for robust detection
  presence: [
    // Single keywords (catch sentiment detection)
    "calm", "relaxed", "peaceful", "content", "happy", "chill", "great", "good",
    // Full phrases (more confident matches)
    "I'm good", "I'm okay", "I'm fine", "feeling good", "feeling better",
    "I'm calm", "I'm relaxed", "at peace", "I'm content", "I'm happy",
    "doing well", "pretty good", "not bad", "all good", "I'm great",
    "feeling chill", "good day", "nice day", "just chilling", "just hanging",
    "things are good", "life is good", "feeling at ease", "I'm at peace"
  ]
};

const EXTREME_SPIKE_TRIGGERS = [
  "panic attack", "I can't breathe", "losing control"
];

const STRONG_GROUNDING_SIGNALS = [
  "anxious", "stressed", "nervous", "overwhelmed", "spiraling",
  "can't stop thinking", "racing thoughts", "on edge", "tense",
  "freaking out", "panicking", "scared"
];

// Priority order: grounding (urgent) > insight > comfort > reflective > presence (calm)
const STATE_PRIORITY = ['grounding', 'insight', 'comfort', 'reflective', 'presence'];

const ALLOWED_TRANSITIONS = {
  presence: ['grounding', 'comfort', 'reflective', 'insight', 'presence'],
  grounding: ['comfort', 'presence'],  // Can exit grounding to presence when calm
  comfort: ['reflective', 'insight', 'comfort', 'presence'],  // Added presence
  reflective: ['insight', 'presence', 'reflective'],
  insight: ['presence', 'insight']
};

const DWELL_TIME_MS = 45000;
const OSCILLATION_WINDOW_MS = 120000;
const OSCILLATION_THRESHOLD = 3;
const FREEZE_DURATION_MS = 90000;
const NEUTRAL_STREAK_THRESHOLD = 3;
const SIGNAL_TIMEOUT_MS = 300000; // 5 minutes
const GROUNDING_CLEAR_THRESHOLD = 2;

// ============================================================
// SESSION STATE STORAGE (in-memory, keyed by userId)
// ============================================================

const sessionStates = new Map();

function getSessionState(userId) {
  if (!sessionStates.has(userId)) {
    sessionStates.set(userId, {
      current_state: 'presence',
      last_change_timestamp: 0,
      state_change_history: [],
      last_signal_timestamp: 0,
      neutral_message_streak: 0,
      grounding_clear_streak: 0,
      freeze_until_timestamp: null
    });
  }
  return sessionStates.get(userId);
}

function updateSessionState(userId, updates) {
  const state = getSessionState(userId);
  Object.assign(state, updates);
  sessionStates.set(userId, state);
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
    presence: 0  // Actively detected calm/positive state
  };
  
  const textLower = currentMessage.toLowerCase();
  
  // Score current message (weight 1.0)
  for (const [state, signals] of Object.entries(SIGNAL_TABLES)) {
    for (const signal of signals) {
      if (textLower.includes(signal.toLowerCase())) {
        scores[state] += 1.0;
      }
    }
  }
  
  // Score recent messages (weight 0.5 each)
  for (const msg of recentMessages.slice(0, 2)) {
    const msgLower = (msg || '').toLowerCase();
    for (const [state, signals] of Object.entries(SIGNAL_TABLES)) {
      for (const signal of signals) {
        if (msgLower.includes(signal.toLowerCase())) {
          scores[state] += 0.5;
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

function evaluateAtmosphere(input) {
  const {
    userId,
    current_message,
    recent_messages = []
  } = input;
  
  const now = Date.now();
  const session = getSessionState(userId);
  
  const {
    current_state,
    last_change_timestamp,
    state_change_history,
    last_signal_timestamp,
    neutral_message_streak,
    grounding_clear_streak,
    freeze_until_timestamp
  } = session;
  
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
  
  console.log(`[ATMOSPHERE] Scoring: message="${current_message.slice(0,30)}..." scores=${JSON.stringify(scores)} max=${maxScore} conf=${maxConfidence} current=${current_state}`);
  
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
  // 2️⃣ RETURN-TO-PRESENCE CHECK
  // ============================================================
  
  let candidate_state = null;
  let reason = '';
  
  if (newNeutralStreak >= NEUTRAL_STREAK_THRESHOLD) {
    candidate_state = 'presence';
    reason = 'neutral_message_streak';
  } else if (newSignalTimestamp > 0 && (now - newSignalTimestamp) >= SIGNAL_TIMEOUT_MS) {
    candidate_state = 'presence';
    reason = 'signal_timeout_5min';
  }
  
  // ============================================================
  // 3️⃣ SIGNAL SCORING + CONFLICT RESOLUTION
  // ============================================================
  
  if (!candidate_state && maxConfidence !== 'low') {
    // Find all states with medium or high confidence, pick by priority
    const highConfidenceStates = Object.entries(scores)
      .filter(([_, score]) => score >= 1.0)  // Single keyword now sufficient
      .map(([state, _]) => state);
    
    console.log(`[ATMOSPHERE] highConfidenceStates: ${JSON.stringify(highConfidenceStates)}`);
    
    if (highConfidenceStates.length > 0) {
      // Select by priority order: grounding > insight > comfort > reflective
      for (const priorityState of STATE_PRIORITY) {
        if (highConfidenceStates.includes(priorityState)) {
          candidate_state = priorityState;
          reason = `signal_detected_${priorityState}`;
          console.log(`[ATMOSPHERE] Candidate selected: ${candidate_state} (reason: ${reason})`);
          break;
        }
      }
    }
  } else {
    console.log(`[ATMOSPHERE] Skipping signal scoring: candidate=${candidate_state}, maxConf=${maxConfidence}`);
  }
  
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
  // 5️⃣ EXIT GROUNDING CHECK
  // ============================================================
  
  let newGroundingClearStreak = grounding_clear_streak;
  
  if (current_state === 'grounding') {
    const groundingScore = scores.grounding || 0;
    const presenceScore = scores.presence || 0;
    
    // ACTIVE PRESENCE DETECTION: If user actively signals calm, exit grounding immediately
    // (e.g., "I'm calm now", "feeling better", "I'm good")
    if (presenceScore >= 1.0 && groundingScore < 1.0) {
      candidate_state = 'presence';
      reason = 'active_presence_detected_in_grounding';
      console.log('[ATMOSPHERE] Exiting grounding - active presence signal detected');
      newGroundingClearStreak = GROUNDING_CLEAR_THRESHOLD; // Mark as cleared
    } else {
      // Passive clear: no grounding signals
      if (groundingScore < 2.0) {
        newGroundingClearStreak++;
      } else {
        newGroundingClearStreak = 0;
      }
      
      // Check if we can exit grounding via passive clear
      if (newGroundingClearStreak >= GROUNDING_CLEAR_THRESHOLD) {
        const dwellSatisfied = (now - last_change_timestamp) >= DWELL_TIME_MS;
        if (dwellSatisfied) {
          candidate_state = 'presence';
          reason = 'grounding_clear_streak_exit';
          console.log('[ATMOSPHERE] Exiting grounding - clear streak satisfied');
        }
      }
    }
  }
  
  // ============================================================
  // 4️⃣ TRANSITION RULE VALIDATION
  // ============================================================
  
  let shouldChange = false;
  
  console.log(`[ATMOSPHERE] Transition check: candidate=${candidate_state}, current=${current_state}`);
  
  if (candidate_state && candidate_state !== current_state) {
    const allowedNext = ALLOWED_TRANSITIONS[current_state] || [];
    const dwellElapsed = now - last_change_timestamp;
    
    console.log(`[ATMOSPHERE] Checking transition: allowed=${JSON.stringify(allowedNext)}, dwellElapsed=${dwellElapsed}ms, required=${DWELL_TIME_MS}ms`);
    
    if (isExtremSpike) {
      // Extreme spike bypasses transition rules
      shouldChange = true;
      console.log('[ATMOSPHERE] Extreme spike - bypassing rules');
    } else if (isStrongGroundingSignal && candidate_state === 'grounding') {
      // Strong emotional signals (anxiety/stress) bypass dwell time for grounding
      shouldChange = true;
      console.log('[ATMOSPHERE] Strong grounding signal - bypassing dwell time');
    } else if (allowedNext.includes(candidate_state)) {
      // ============================================================
      // 6️⃣ DWELL TIME CHECK
      // ============================================================
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
  
  const finalState = shouldChange ? candidate_state : current_state;
  
  // Update session state
  const updates = {
    neutral_message_streak: newNeutralStreak,
    last_signal_timestamp: newSignalTimestamp,
    grounding_clear_streak: finalState === 'grounding' ? newGroundingClearStreak : 0
  };
  
  if (shouldChange) {
    updates.current_state = finalState;
    updates.last_change_timestamp = now;
    updates.state_change_history = [...state_change_history.slice(-10), now];
    updates.freeze_until_timestamp = null;
    console.log(`[ATMOSPHERE] State change: ${current_state} → ${finalState} (${reason})`);
  }
  
  updateSessionState(userId, updates);
  
  return {
    sound_state: {
      current: finalState,
      changed: shouldChange,
      reason: shouldChange ? reason : 'no_change'
    }
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  evaluateAtmosphere,
  getSessionState,
  updateSessionState,
  SIGNAL_TABLES,
  STATE_PRIORITY
};
