/**
 * DOORWAYS v1 - Brain-only Detection System
 * 
 * Doors are INTERNAL lenses that shape response tone + one follow-up question.
 * Users never see door names.
 */

const crypto = require('crypto');

// ============================================================
// CONFIG (no magic numbers)
// ============================================================
const DOORWAYS_CONFIG = {
  minConfidence: 4,
  breakawayDelta: 3,
  hardBreakawayScore: 7,
  thresholdFloor: 2,
  unlockMargin: 2,
  unlockSecondHitWindowDays: 14,
  crisisReleaseConsecutiveTurns: 2,
  minCrisisDurationMs: 10 * 60 * 1000, // 10 minutes
  conversationResetHours: 6,
  affinityDecayDays: 30,
};

// ============================================================
// TEXT NORMALIZATION (canonical, used everywhere)
// ============================================================
function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^\w\s]/g, ' ') // replace punctuation/emoji with spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================
// DOOR DEFINITIONS (v1)
// ============================================================
const DOORS = {
  dreams_symbols: {
    id: 'dreams_symbols',
    enabled: true,
    baseThreshold: 4,
    cooldownTurns: 3,
    triggers: [
      { phrase: 'i had a dream', weight: 3 },
      { phrase: 'i dreamed', weight: 3 },
      { phrase: 'i dreamt', weight: 3 },
      { phrase: 'last night i', weight: 2 },
      { phrase: 'nightmare', weight: 3 },
      { phrase: 'recurring dream', weight: 4 },
      { phrase: 'kept dreaming', weight: 3 },
      { phrase: 'dream about', weight: 2 },
      { phrase: 'vision', weight: 2 },
      { phrase: 'symbolic', weight: 2 },
      { phrase: 'what does it mean', weight: 1 },
    ],
    intent: `DOOR: Dreams & Symbols
TONE: Curious, present, gently interpretive
REALM: Dream interpretation, recurring themes, symbolic meaning
FOLLOW-UP: Ask about the most vivid or emotionally charged element.
Example questions:
- "What part of that dream felt the most real?"
- "What stood out to you—the feeling or the image?"
- "Has this dream come before?"`,
  },

  grief: {
    id: 'grief',
    enabled: true,
    baseThreshold: 4,
    cooldownTurns: 4,
    triggers: [
      { phrase: 'i miss', weight: 2 },
      { phrase: 'i lost', weight: 2 },
      { phrase: 'passed away', weight: 4 },
      { phrase: 'died', weight: 3 },
      { phrase: 'death', weight: 2 },
      { phrase: 'gone now', weight: 2 },
      { phrase: 'anniversary of', weight: 3 },
      { phrase: 'still think about them', weight: 3 },
      { phrase: 'miss them', weight: 3 },
      { phrase: 'wish they were here', weight: 4 },
      { phrase: 'cant believe theyre gone', weight: 4 },
      { phrase: 'funeral', weight: 3 },
      { phrase: 'grieving', weight: 4 },
      { phrase: 'mourning', weight: 3 },
    ],
    intent: `DOOR: Grief
TONE: Gentle, unhurried, honoring
REALM: Loss processing, remembrance, meaning-making around loss
DO NOT: Push toward "closure" or silver linings
FOLLOW-UP: Invite them to share a memory or what they're feeling right now.
Example questions:
- "What do you miss most about them?"
- "What's coming up for you today around this?"
- "Would you like to tell me about them?"`,
  },

  joy_delight: {
    id: 'joy_delight',
    enabled: true,
    baseThreshold: 4,
    cooldownTurns: 2,
    triggers: [
      { phrase: 'feel alive', weight: 4 },
      { phrase: 'feel so alive', weight: 4 },
      { phrase: 'so grateful', weight: 3 },
      { phrase: 'grateful for', weight: 2 },
      { phrase: 'breakthrough', weight: 3 },
      { phrase: 'finally happened', weight: 2 },
      { phrase: 'amazing news', weight: 3 },
      { phrase: 'amazing', weight: 2 },
      { phrase: 'beautiful', weight: 1 },
      { phrase: 'in awe', weight: 3 },
      { phrase: 'feels so good', weight: 2 },
      { phrase: 'cant stop smiling', weight: 4 },
      { phrase: 'best day', weight: 3 },
      { phrase: 'so happy', weight: 3 },
      { phrase: 'really happy', weight: 3 },
      { phrase: 'i did it', weight: 3 },
      { phrase: 'good news', weight: 2 },
      { phrase: 'great news', weight: 3 },
      { phrase: 'incredible', weight: 2 },
      { phrase: 'excited', weight: 2 },
      { phrase: 'so excited', weight: 3 },
    ],
    intent: `DOOR: Joy & Delight
TONE: Warm, celebratory but not over-the-top, anchoring
REALM: Anchoring joy, reinforcing positive states, noticing light
FOLLOW-UP: Help them savor and anchor the feeling.
Example questions:
- "What made this moment hit different?"
- "How does it feel in your body right now?"
- "What do you want to remember about this?"`,
  },

  // DISABLED DOORS (enabled=false, but defined for future)
  calling_destiny: {
    id: 'calling_destiny',
    enabled: false,
    baseThreshold: 5,
    cooldownTurns: 5,
    triggers: [
      { phrase: 'i feel called', weight: 4 },
      { phrase: 'theres more', weight: 2 },
      { phrase: 'restless', weight: 2 },
      { phrase: 'purpose', weight: 2 },
      { phrase: 'what am i meant to do', weight: 4 },
      { phrase: 'spiritual hunger', weight: 3 },
    ],
    intent: `DOOR: Calling & Destiny (DISABLED)`,
  },

  identity: {
    id: 'identity',
    enabled: false,
    baseThreshold: 5,
    cooldownTurns: 4,
    triggers: [
      { phrase: 'whats wrong with me', weight: 4 },
      { phrase: 'im not enough', weight: 4 },
      { phrase: 'i feel worthless', weight: 4 },
      { phrase: 'i hate myself', weight: 4 },
      { phrase: 'shame', weight: 3 },
      { phrase: 'comparison', weight: 2 },
    ],
    intent: `DOOR: Identity (DISABLED)`,
  },

  generational_patterns: {
    id: 'generational_patterns',
    enabled: false,
    baseThreshold: 5,
    cooldownTurns: 5,
    triggers: [
      { phrase: 'my family is like this', weight: 4 },
      { phrase: 'runs in my family', weight: 4 },
      { phrase: 'cycle', weight: 2 },
      { phrase: 'inherited', weight: 2 },
      { phrase: 'generational', weight: 4 },
    ],
    intent: `DOOR: Generational Patterns (DISABLED)`,
  },

  relationship_patterns: {
    id: 'relationship_patterns',
    enabled: false,
    baseThreshold: 5,
    cooldownTurns: 4,
    triggers: [
      { phrase: 'why do i pick', weight: 3 },
      { phrase: 'same type', weight: 3 },
      { phrase: 'attachment', weight: 2 },
      { phrase: 'toxic cycle', weight: 4 },
      { phrase: 'boundaries', weight: 2 },
    ],
    intent: `DOOR: Relationship Patterns (DISABLED)`,
  },

  nervous_system: {
    id: 'nervous_system',
    enabled: false,
    baseThreshold: 4,
    cooldownTurns: 3,
    triggers: [
      { phrase: 'panic', weight: 3 },
      { phrase: 'shutdown', weight: 3 },
      { phrase: 'cant sleep', weight: 2 },
      { phrase: 'hypervigilant', weight: 4 },
      { phrase: 'overwhelmed', weight: 2 },
    ],
    intent: `DOOR: Nervous System (DISABLED)`,
  },

  spiritual_warfare: {
    id: 'spiritual_warfare',
    enabled: false,
    baseThreshold: 5,
    cooldownTurns: 5,
    triggers: [
      { phrase: 'heaviness', weight: 2 },
      { phrase: 'fear at night', weight: 3 },
      { phrase: 'intrusive thoughts', weight: 2 },
      { phrase: 'spiritual attack', weight: 4 },
      { phrase: 'oppression', weight: 3 },
    ],
    intent: `DOOR: Spiritual Warfare (DISABLED)`,
  },

  forgiveness: {
    id: 'forgiveness',
    enabled: false,
    baseThreshold: 5,
    cooldownTurns: 5,
    triggers: [
      { phrase: 'cant forgive', weight: 4 },
      { phrase: 'betrayed', weight: 3 },
      { phrase: 'resentment', weight: 3 },
      { phrase: 'cant let go', weight: 3 },
      { phrase: 'unforgivable', weight: 4 },
    ],
    intent: `DOOR: Forgiveness (DISABLED)`,
  },
};

// ============================================================
// SCORING SYSTEM
// ============================================================
function scoreDoors(normText) {
  const scores = {};
  
  for (const [doorId, door] of Object.entries(DOORS)) {
    let score = 0;
    for (const trigger of door.triggers) {
      if (normText.includes(trigger.phrase.replace(/[^\w\s]/g, '').toLowerCase())) {
        score += trigger.weight;
      }
    }
    scores[doorId] = score;
  }
  
  return scores;
}

function getTopCandidates(scores) {
  const sorted = Object.entries(scores)
    .filter(([id]) => DOORS[id].enabled)
    .sort((a, b) => b[1] - a[1]);
  
  const primary = sorted[0] ? { id: sorted[0][0], score: sorted[0][1] } : null;
  const secondary = sorted[1] ? { id: sorted[1][0], score: sorted[1][1] } : null;
  
  return { primary, secondary };
}

// ============================================================
// AFFINITY DECAY
// ============================================================
function applyAffinityDecay(userProfile, nowISO) {
  if (!userProfile || !userProfile.doorAffinity) return userProfile;
  
  const lastDecayed = userProfile.affinityLastDecayedAt;
  if (!lastDecayed) {
    userProfile.affinityLastDecayedAt = nowISO;
    return userProfile;
  }
  
  const daysSince = (new Date(nowISO) - new Date(lastDecayed)) / (1000 * 60 * 60 * 24);
  
  if (daysSince >= DOORWAYS_CONFIG.affinityDecayDays) {
    for (const doorId of Object.keys(userProfile.doorAffinity)) {
      userProfile.doorAffinity[doorId] = Math.floor(userProfile.doorAffinity[doorId] * 0.5);
    }
    userProfile.affinityLastDecayedAt = nowISO;
  }
  
  return userProfile;
}

function getAffinityBoost(userProfile, doorId) {
  if (!userProfile?.doorAffinity?.[doorId]) return 0;
  return Math.min(2, userProfile.doorAffinity[doorId]);
}

// ============================================================
// EFFECTIVE THRESHOLD
// ============================================================
function getEffectiveThreshold(doorId, userProfile) {
  const door = DOORS[doorId];
  if (!door) return DOORWAYS_CONFIG.minConfidence;
  
  const affinityBoost = getAffinityBoost(userProfile, doorId);
  return Math.max(
    DOORWAYS_CONFIG.thresholdFloor,
    door.baseThreshold - affinityBoost
  );
}

// ============================================================
// CONVERSATION STATE BOOTSTRAP
// ============================================================
function bootstrapConversationState() {
  return {
    doors: {
      currentDoorId: null,
      lastDoorId: null,
      activatedAtTurn: null,
      turnsSinceActivation: 0,
    },
    crisis: {
      active: false,
      triggeredAt: null,
      lastSeenAt: null,
      cleanTurns: 0,
    },
    lastMessageAt: new Date().toISOString(),
  };
}

function checkConversationReset(conversationState, nowISO) {
  if (!conversationState?.lastMessageAt) return true;
  
  const hoursSince = (new Date(nowISO) - new Date(conversationState.lastMessageAt)) / (1000 * 60 * 60);
  return hoursSince >= DOORWAYS_CONFIG.conversationResetHours;
}

function resetEphemeralState(conversationState) {
  conversationState.doors = {
    currentDoorId: null,
    lastDoorId: null,
    activatedAtTurn: null,
    turnsSinceActivation: 0,
  };
  conversationState.crisis = {
    active: false,
    triggeredAt: null,
    lastSeenAt: null,
    cleanTurns: 0,
  };
  return conversationState;
}

// ============================================================
// COOLDOWN TRACKING
// ============================================================
function getCooldownRemainingTurns(conversationState) {
  const { lastDoorId, turnsSinceActivation } = conversationState.doors;
  if (!lastDoorId || !DOORS[lastDoorId]) return 0;
  
  const cooldownTurns = DOORS[lastDoorId].cooldownTurns || 0;
  return Math.max(0, cooldownTurns - turnsSinceActivation);
}

function isInCooldown(conversationState) {
  return getCooldownRemainingTurns(conversationState) > 0;
}

// ============================================================
// DOOR SELECTION
// ============================================================
function selectDoorForResponse(scores, conversationState, userProfile) {
  const { primary, secondary } = getTopCandidates(scores);
  
  if (!primary || primary.score === 0) {
    return { doorId: null, score: 0, reasonCode: 'no_match' };
  }
  
  const { lastDoorId, turnsSinceActivation } = conversationState.doors;
  const effectiveThreshold = getEffectiveThreshold(primary.id, userProfile);
  const qualifies = primary.score >= effectiveThreshold && primary.score >= DOORWAYS_CONFIG.minConfidence;
  
  // During cooldown
  if (isInCooldown(conversationState)) {
    if (!qualifies) {
      return { doorId: lastDoorId, score: scores[lastDoorId] || 0, reasonCode: 'cooldown_stick' };
    }
    
    const lastScore = scores[lastDoorId] || 0;
    const isBreakaway = 
      primary.score >= lastScore + DOORWAYS_CONFIG.breakawayDelta ||
      primary.score >= DOORWAYS_CONFIG.hardBreakawayScore;
    
    if (isBreakaway && primary.id !== lastDoorId) {
      return { doorId: primary.id, score: primary.score, reasonCode: 'breakaway' };
    }
    
    return { doorId: lastDoorId, score: lastScore, reasonCode: 'cooldown_stick' };
  }
  
  // Cooldown expired
  if (!qualifies) {
    if (lastDoorId && turnsSinceActivation > 0) {
      return { doorId: null, score: 0, reasonCode: 'cooldown_expired' };
    }
    return { doorId: null, score: 0, reasonCode: 'threshold' };
  }
  
  // Tie-breaking
  if (secondary && secondary.score === primary.score) {
    // Prefer lastDoorId
    if (lastDoorId === primary.id) {
      return { doorId: primary.id, score: primary.score, reasonCode: 'tie_lastdoor' };
    }
    if (lastDoorId === secondary.id) {
      return { doorId: secondary.id, score: secondary.score, reasonCode: 'tie_lastdoor' };
    }
    
    // Higher effective threshold wins
    const primaryThresh = getEffectiveThreshold(primary.id, userProfile);
    const secondaryThresh = getEffectiveThreshold(secondary.id, userProfile);
    if (primaryThresh > secondaryThresh) {
      return { doorId: primary.id, score: primary.score, reasonCode: 'tie_threshold' };
    }
    if (secondaryThresh > primaryThresh) {
      return { doorId: secondary.id, score: secondary.score, reasonCode: 'tie_threshold' };
    }
    
    // DOORS insertion order (primary wins since it came first in sort)
    return { doorId: primary.id, score: primary.score, reasonCode: 'tie_order' };
  }
  
  return { doorId: primary.id, score: primary.score, reasonCode: 'selected' };
}

// ============================================================
// UNLOCK RULES
// ============================================================
function checkUnlock(doorId, score, userProfile, conversationState) {
  if (!doorId || conversationState.crisis?.active) return false;
  
  const effectiveThreshold = getEffectiveThreshold(doorId, userProfile);
  
  // Immediate unlock if score is high enough
  if (score >= effectiveThreshold + DOORWAYS_CONFIG.unlockMargin) {
    return { unlock: true, reason: 'immediate_high_score' };
  }
  
  // Check for second activation within window
  const hitHistory = userProfile?.doorHitHistory?.[doorId];
  if (hitHistory) {
    const daysSinceLast = (Date.now() - new Date(hitHistory.lastHitAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceLast <= DOORWAYS_CONFIG.unlockSecondHitWindowDays && hitHistory.hitCount >= 1) {
      return { unlock: true, reason: 'second_hit_window' };
    }
  }
  
  return { unlock: false, reason: null };
}

function recordDoorHit(userProfile, doorId) {
  if (!userProfile.doorHitHistory) userProfile.doorHitHistory = {};
  if (!userProfile.doorHitHistory[doorId]) {
    userProfile.doorHitHistory[doorId] = { hitCount: 0, lastHitAt: null };
  }
  userProfile.doorHitHistory[doorId].hitCount += 1;
  userProfile.doorHitHistory[doorId].lastHitAt = new Date().toISOString();
  return userProfile;
}

function incrementAffinity(userProfile, doorId) {
  if (!userProfile.doorAffinity) userProfile.doorAffinity = {};
  userProfile.doorAffinity[doorId] = (userProfile.doorAffinity[doorId] || 0) + 1;
  return userProfile;
}

// ============================================================
// CRISIS INTEGRATION
// ============================================================
function updateCrisisState(conversationState, hasCrisisSignals, topScore, nowISO) {
  const crisis = conversationState.crisis;
  
  if (hasCrisisSignals) {
    crisis.cleanTurns = 0;
    if (!crisis.active) {
      crisis.active = true;
      crisis.triggeredAt = nowISO;
    }
    crisis.lastSeenAt = nowISO;
  } else {
    crisis.cleanTurns += 1;
  }
  
  // Check for crisis release
  if (crisis.active && !hasCrisisSignals) {
    const timeSinceTrigger = crisis.triggeredAt 
      ? Date.now() - new Date(crisis.triggeredAt).getTime() 
      : 0;
    
    // Early release via breakaway
    if (topScore >= DOORWAYS_CONFIG.hardBreakawayScore && 
        timeSinceTrigger >= DOORWAYS_CONFIG.minCrisisDurationMs) {
      crisis.active = false;
      return { released: true, reasonCode: 'crisis_breakaway' };
    }
    
    // Standard release
    if (crisis.cleanTurns >= DOORWAYS_CONFIG.crisisReleaseConsecutiveTurns &&
        timeSinceTrigger >= DOORWAYS_CONFIG.minCrisisDurationMs) {
      crisis.active = false;
      return { released: true, reasonCode: 'crisis_released' };
    }
  }
  
  return { released: false, reasonCode: crisis.active ? 'crisis_active' : null };
}

// ============================================================
// TELEMETRY (hash only, no raw text)
// ============================================================
function hashText(text) {
  return crypto.createHash('sha256').update(text || '').digest('hex').slice(0, 16);
}

function buildTelemetry(normText, scores, selectedDoor, conversationState, userProfile) {
  const { primary, secondary } = getTopCandidates(scores);
  
  const effectiveThresholds = {};
  for (const doorId of Object.keys(DOORS)) {
    if (DOORS[doorId].enabled) {
      effectiveThresholds[doorId] = getEffectiveThreshold(doorId, userProfile);
    }
  }
  
  return {
    textHash: hashText(normText),
    crisisActive: conversationState.crisis?.active || false,
    reasonCode: selectedDoor?.reasonCode || 'no_match',
    scores,
    primaryCandidate: primary,
    secondaryCandidate: secondary,
    selectedDoorId: selectedDoor?.doorId || null,
    lastDoorId: conversationState.doors?.lastDoorId || null,
    turnsSinceActivation: conversationState.doors?.turnsSinceActivation || 0,
    cooldownRemainingTurns: getCooldownRemainingTurns(conversationState),
    effectiveThresholds,
  };
}

// ============================================================
// MAIN PIPELINE FUNCTION
// ============================================================
function processDoorways(userText, conversationState, userProfile, crisisSignals = false) {
  const nowISO = new Date().toISOString();
  const normText = normalizeText(userText);
  
  // Apply affinity decay
  userProfile = applyAffinityDecay(userProfile || {}, nowISO);
  
  // Bootstrap conversation state if needed
  if (!conversationState) {
    conversationState = bootstrapConversationState();
  }
  
  // Inactivity reset
  if (checkConversationReset(conversationState, nowISO)) {
    conversationState = resetEphemeralState(conversationState);
  }
  conversationState.lastMessageAt = nowISO;
  
  // Score ALL doors (even during crisis for telemetry)
  const scores = scoreDoors(normText);
  const { primary } = getTopCandidates(scores);
  const topScore = primary?.score || 0;
  
  // Update crisis state
  const crisisResult = updateCrisisState(conversationState, crisisSignals, topScore, nowISO);
  
  let selectedDoor = null;
  let doorIntent = null;
  
  // If crisis is active, don't select door for response
  if (conversationState.crisis.active) {
    selectedDoor = { doorId: null, score: 0, reasonCode: 'crisis_override' };
  } else {
    // Select door for response
    selectedDoor = selectDoorForResponse(scores, conversationState, userProfile);
    
    // Update conversation state
    if (selectedDoor.doorId) {
      const isNewDoor = selectedDoor.doorId !== conversationState.doors.currentDoorId;
      
      if (isNewDoor) {
        conversationState.doors.lastDoorId = conversationState.doors.currentDoorId;
        conversationState.doors.currentDoorId = selectedDoor.doorId;
        conversationState.doors.activatedAtTurn = conversationState.doors.turnsSinceActivation;
        conversationState.doors.turnsSinceActivation = 0;
        
        // Record hit and check unlock
        userProfile = recordDoorHit(userProfile, selectedDoor.doorId);
        const unlockResult = checkUnlock(selectedDoor.doorId, selectedDoor.score, userProfile, conversationState);
        if (unlockResult.unlock) {
          userProfile = incrementAffinity(userProfile, selectedDoor.doorId);
        }
      }
      
      // Get door intent for prompt injection
      doorIntent = DOORS[selectedDoor.doorId]?.intent || null;
    } else {
      // Neutral mode
      conversationState.doors.currentDoorId = null;
    }
  }
  
  // Increment turnsSinceActivation (happens every turn)
  conversationState.doors.turnsSinceActivation += 1;
  
  // Build telemetry
  const telemetry = buildTelemetry(normText, scores, selectedDoor, conversationState, userProfile);
  
  return {
    selectedDoorId: selectedDoor?.doorId || null,
    doorIntent,
    scores,
    reasonCode: selectedDoor?.reasonCode || 'no_match',
    crisisActive: conversationState.crisis.active,
    crisisReleaseReason: crisisResult.reasonCode,
    conversationState,
    userProfile,
    telemetry,
  };
}

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  DOORWAYS_CONFIG,
  DOORS,
  normalizeText,
  scoreDoors,
  processDoorways,
  bootstrapConversationState,
  getEffectiveThreshold,
  getCooldownRemainingTurns,
  buildTelemetry,
};
