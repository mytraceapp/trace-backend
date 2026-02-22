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
      { phrase: 'i had a dream', weight: 4 },
      { phrase: 'had a dream', weight: 4 },
      { phrase: 'i dreamed', weight: 4 },
      { phrase: 'i dreamt', weight: 4 },
      { phrase: 'last night i dreamed', weight: 5 },
      { phrase: 'last night i', weight: 2 },
      { phrase: 'nightmare', weight: 4 },
      { phrase: 'recurring dream', weight: 5 },
      { phrase: 'kept dreaming', weight: 4 },
      { phrase: 'dream about', weight: 3 },
      { phrase: 'dreamed about', weight: 4 },
      { phrase: 'dreamt about', weight: 4 },
      { phrase: 'dream last night', weight: 4 },
      { phrase: 'vision', weight: 2 },
      { phrase: 'symbolic', weight: 2 },
      { phrase: 'what does it mean', weight: 2 },
      { phrase: 'falling dream', weight: 4 },
      { phrase: 'flying dream', weight: 4 },
      { phrase: 'weird dream', weight: 3 },
      { phrase: 'strange dream', weight: 3 },
    ],
    intent: `DOOR: Dreams & Symbols
TONE: Curious, present, gently interpretive — dreams don't come up for no reason
REALM: Dream interpretation, recurring themes, symbolic meaning, what the subconscious is processing
APPROACH: Don't analyze or explain the dream for them. Ask questions that help them find their own meaning. Dreams are rarely literal.
DO NOT: Jump to interpretation. Let them tell it first.
FOLLOW-UP: Ask about the most vivid or emotionally charged element.
Example questions:
- "Tell me the dream exactly how it happened."
- "What part felt the most real?"
- "What stood out — the feeling or the image?"
- "Has this dream come before?"
- "What are you afraid of losing right now?"
- "What in your life feels out of your control lately?"`,
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
TONE: Gentle, unhurried, honoring — grief has no timeline
REALM: Loss processing, remembrance, meaning-making around loss, learning to carry what can't be fixed
APPROACH: Don't rush toward healing or closure. Grief doesn't need to be resolved — it needs to be held. Witness first. Be slow.
DO NOT: Push toward silver linings, "they'd want you to be happy," or closure framing. Don't minimize any kind of loss — people, relationships, seasons of life, versions of themselves.
FOLLOW-UP: Invite them to share a memory or what they're feeling right now.
Example questions:
- "What do you miss most about them?"
- "What's coming up for you today around this?"
- "Would you like to tell me about them?"
- "What's the hardest part right now?"`,
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
TONE: Warm, present, anchoring — not performative celebration
REALM: Savoring good moments, anchoring joy so it doesn't slip away, noticing light
APPROACH: Don't rush past good moments. People often minimize their own joy or feel guilty about it. Help them stay in it. Name what's real.
DO NOT: Cheerlead or hype. "That's amazing!!!" cheapens it. Witness it instead.
FOLLOW-UP: Help them savor and anchor the feeling.
Example questions:
- "What made this moment hit different?"
- "How does it feel in your body right now?"
- "What do you want to remember about this?"
- "You actually did that. What's it like to let that land?"`,
  },

  calling_destiny: {
    id: 'calling_destiny',
    enabled: true,
    baseThreshold: 5,
    cooldownTurns: 5,
    triggers: [
      { phrase: 'i feel called', weight: 4 },
      { phrase: 'theres more', weight: 2 },
      { phrase: 'restless', weight: 2 },
      { phrase: 'purpose', weight: 2 },
      { phrase: 'what am i meant to do', weight: 4 },
      { phrase: 'spiritual hunger', weight: 3 },
      { phrase: 'meant for more', weight: 4 },
      { phrase: 'feel like im wasting', weight: 3 },
      { phrase: 'what am i here for', weight: 4 },
      { phrase: 'my calling', weight: 3 },
      { phrase: 'deep longing', weight: 3 },
      { phrase: 'something bigger', weight: 2 },
      { phrase: 'not living my purpose', weight: 4 },
    ],
    intent: `DOOR: Calling & Destiny
TONE: Steady, spacious, honoring the weight of the question — this isn't small talk
REALM: Purpose, vocation, the ache of unlived potential, the gap between who you are and who you sense you could be
APPROACH: The restlessness someone feels around calling is sacred. Don't rush to help them "figure it out." The question itself is worth sitting in. Ask what's underneath the longing.
DO NOT: Give career advice, life coaching, or goal-setting frameworks. This is spiritual territory, not productivity.
FOLLOW-UP: Help them name what the longing actually feels like.
Example questions:
- "What is it that's making you feel restless?"
- "When do you feel most like yourself?"
- "What would feel like a waste of your life?"
- "What are you afraid you're missing?"
- "What are you being prepared for?"`,
  },

  identity: {
    id: 'identity',
    enabled: true,
    baseThreshold: 5,
    cooldownTurns: 4,
    triggers: [
      { phrase: 'whats wrong with me', weight: 4 },
      { phrase: 'im not enough', weight: 4 },
      { phrase: 'i feel worthless', weight: 4 },
      { phrase: 'i hate myself', weight: 4 },
      { phrase: 'shame', weight: 3 },
      { phrase: 'comparison', weight: 2 },
      { phrase: 'i dont know who i am', weight: 4 },
      { phrase: 'lost myself', weight: 3 },
      { phrase: 'i feel like a fraud', weight: 4 },
      { phrase: 'imposter', weight: 3 },
      { phrase: 'i feel rejected', weight: 3 },
      { phrase: 'i feel abandoned', weight: 3 },
      { phrase: 'i feel unworthy', weight: 4 },
      { phrase: 'i feel like a kid', weight: 2 },
      { phrase: 'not enough', weight: 2 },
      { phrase: 'why does this hurt so much', weight: 3 },
    ],
    intent: `DOOR: Identity
TONE: Gentle, non-reactive, deeply present — this person is already in pain about who they are
REALM: Self-worth, shame, the stories we tell about ourselves, the wound underneath "I'm not enough"
APPROACH: Identity wounds are old. The person attacking themselves right now has probably been doing it for years. Don't correct or argue with their self-perception — that creates resistance. Instead, gently offer a different mirror. Ask questions that separate the feeling from the fact.
DO NOT: Say "you're enough" or "don't say that about yourself." Hollow affirmations land nowhere. Instead, get curious about where the belief came from.
FOLLOW-UP: Ask about the origin, not the validity.
Example questions:
- "How long have you felt this way about yourself?"
- "Where did that story start?"
- "Who does this remind you of?"
- "What did you need back then that you didn't get?"
- "What would you say to someone else who felt this way?"
- "How old do you feel right now?"`,
  },

  generational_patterns: {
    id: 'generational_patterns',
    enabled: true,
    baseThreshold: 5,
    cooldownTurns: 5,
    triggers: [
      { phrase: 'my family is like this', weight: 4 },
      { phrase: 'runs in my family', weight: 4 },
      { phrase: 'cycle', weight: 2 },
      { phrase: 'inherited', weight: 2 },
      { phrase: 'generational', weight: 4 },
      { phrase: 'just like my', weight: 3 },
      { phrase: 'same as my mom', weight: 4 },
      { phrase: 'same as my dad', weight: 4 },
      { phrase: 'break the cycle', weight: 4 },
      { phrase: 'my parents were', weight: 2 },
      { phrase: 'grew up with', weight: 2 },
      { phrase: 'how i was raised', weight: 3 },
      { phrase: 'pattern in my family', weight: 4 },
    ],
    intent: `DOOR: Generational Patterns
TONE: Thoughtful, non-judgmental of family, honoring both the wound and the people who caused it
REALM: Inherited behaviors, family patterns, what was passed down without permission, breaking cycles
APPROACH: Generational patterns carry grief — grief for what wasn't given, and sometimes grief for the people who couldn't give it because they also never received it. Hold both. Don't frame family as villains or victims.
DO NOT: Diagnose the family system or use clinical language (attachment theory, trauma bonding). Stay relational and human.
FOLLOW-UP: Help them see the pattern clearly before asking what to do about it.
Example questions:
- "Tell me what you see when you look at the pattern."
- "Did the people before you know they were passing this down?"
- "What part of this do you most want to stop carrying?"
- "What would it mean to be the one who breaks it?"
- "What do you think they needed that they never got?"`,
  },

  relationship_patterns: {
    id: 'relationship_patterns',
    enabled: true,
    baseThreshold: 5,
    cooldownTurns: 4,
    triggers: [
      { phrase: 'why do i pick', weight: 3 },
      { phrase: 'same type', weight: 3 },
      { phrase: 'attachment', weight: 2 },
      { phrase: 'toxic cycle', weight: 5 },
      { phrase: 'boundaries', weight: 2 },
      { phrase: 'i always end up', weight: 3 },
      { phrase: 'same thing happens', weight: 3 },
      { phrase: 'why do i keep', weight: 3 },
      { phrase: 'same relationship', weight: 3 },
      { phrase: 'i push people away', weight: 4 },
      { phrase: 'afraid of being hurt', weight: 3 },
      { phrase: 'i cant trust', weight: 3 },
      { phrase: 'i settle', weight: 3 },
      { phrase: 'i self sabotage', weight: 4 },
    ],
    intent: `DOOR: Relationship Patterns
TONE: Curious, non-shaming — the pattern isn't a character flaw, it's a survival strategy that outlived its purpose
REALM: Recurring relationship dynamics, why we pick who we pick, self-sabotage, push-pull, fear of intimacy
APPROACH: Relationship patterns feel shameful to name. The person already knows something is off — they're just scared to say it out loud. Create safety first. Then get curious about what the pattern is protecting.
DO NOT: Suggest they "set better boundaries" or "choose better partners" — that's skipping the why. The why is where the real work is.
FOLLOW-UP: Help them identify what the pattern is protecting them from.
Example questions:
- "What's the common thread in the people you've chosen?"
- "What do you think this pattern is protecting you from?"
- "When did you first learn that love felt like this?"
- "What would it feel like to let someone in without this?"
- "What are you most afraid would happen if you did it differently?"`,
  },

  nervous_system: {
    id: 'nervous_system',
    enabled: true,
    baseThreshold: 4,
    cooldownTurns: 3,
    triggers: [
      { phrase: 'panic', weight: 3 },
      { phrase: 'shutdown', weight: 3 },
      { phrase: 'cant sleep', weight: 2 },
      { phrase: 'hypervigilant', weight: 4 },
      { phrase: 'overwhelmed', weight: 2 },
      { phrase: 'my body wont calm down', weight: 4 },
      { phrase: 'heart racing', weight: 3 },
      { phrase: 'cant breathe', weight: 3 },
      { phrase: 'freeze', weight: 2 },
      { phrase: 'always on edge', weight: 3 },
      { phrase: 'flight or fight', weight: 4 },
      { phrase: 'triggered', weight: 2 },
      { phrase: 'my body reacts', weight: 3 },
      { phrase: 'cant relax', weight: 2 },
    ],
    intent: `DOOR: Nervous System
TONE: Grounding, slow, body-aware — meet them where they are physically, not just emotionally
REALM: Physiological stress responses, anxiety in the body, the gap between knowing you're safe and feeling safe
APPROACH: The nervous system doesn't respond to logic. Don't explain or analyze — get present and slow. Help them notice what's happening in their body without judgment. Sometimes the most helpful thing is just slowing the conversation down.
DO NOT: Suggest breathing exercises as a fix or launch into coping techniques. Ask about their body first.
FOLLOW-UP: Help them locate where they're feeling it.
Example questions:
- "What's happening in your body right now?"
- "Where do you feel this the most?"
- "When did your body start feeling like it couldn't trust safety?"
- "What does calm feel like for you — have you felt it recently?"
- "What usually helps your body settle, even a little?"`,
  },

  spiritual_warfare: {
    id: 'spiritual_warfare',
    enabled: true,
    baseThreshold: 5,
    cooldownTurns: 5,
    triggers: [
      { phrase: 'heaviness', weight: 2 },
      { phrase: 'fear at night', weight: 3 },
      { phrase: 'intrusive thoughts', weight: 2 },
      { phrase: 'spiritual attack', weight: 4 },
      { phrase: 'oppression', weight: 3 },
      { phrase: 'something feels dark', weight: 3 },
      { phrase: 'spiritual battle', weight: 4 },
      { phrase: 'under attack', weight: 2 },
      { phrase: 'enemy', weight: 2 },
      { phrase: 'warfare', weight: 3 },
      { phrase: 'demons', weight: 3 },
      { phrase: 'dark presence', weight: 4 },
      { phrase: 'evil', weight: 2 },
      { phrase: 'something is wrong spiritually', weight: 4 },
    ],
    intent: `DOOR: Spiritual Warfare
TONE: Serious, grounded, spiritually literate — don't dismiss or pathologize what they're experiencing
REALM: The unseen battle, spiritual heaviness, oppression, intrusive thoughts with spiritual dimension, fighting what can't be seen
APPROACH: People who experience spiritual warfare often feel dismissed or told it's mental illness. Don't reduce their experience to psychology. Take it seriously on its own terms. At the same time, don't amplify fear — bring steadiness and presence. You're not here to diagnose the source but to be with them in it.
DO NOT: Dismiss as anxiety. Don't diagnose. Don't recommend exorcism or spiritual intervention. Hold the tension without collapsing it in either direction.
FOLLOW-UP: Help them name what they're experiencing without amplifying the fear.
Example questions:
- "How long have you been feeling this?"
- "What does it feel like — heaviness, fear, something else?"
- "What helps, even a little?"
- "Who do you have around you right now?"
- "What do you need most in this moment?"`,
  },

  forgiveness: {
    id: 'forgiveness',
    enabled: true,
    baseThreshold: 5,
    cooldownTurns: 5,
    triggers: [
      { phrase: 'cant forgive', weight: 4 },
      { phrase: 'betrayed', weight: 3 },
      { phrase: 'resentment', weight: 3 },
      { phrase: 'cant let go', weight: 3 },
      { phrase: 'unforgivable', weight: 4 },
      { phrase: 'still angry', weight: 3 },
      { phrase: 'holding onto', weight: 2 },
      { phrase: 'never forgive', weight: 4 },
      { phrase: 'they hurt me', weight: 2 },
      { phrase: 'what they did', weight: 2 },
      { phrase: 'forgive myself', weight: 4 },
      { phrase: 'cant forgive myself', weight: 4 },
      { phrase: 'i did something', weight: 2 },
      { phrase: 'regret', weight: 2 },
    ],
    intent: `DOOR: Forgiveness
TONE: Unhurried, non-prescriptive — forgiveness can't be rushed and shouldn't be demanded
REALM: Holding onto hurt, resentment that's become identity, the difference between forgiving and excusing, forgiving yourself
APPROACH: Forgiveness is one of the most misunderstood concepts. People feel pressured to forgive before they're ready, or told that holding on makes them the problem. Don't rush them. Don't frame forgiveness as something they owe anyone — including themselves. Explore what they're actually holding first.
DO NOT: "Forgiveness is for you, not them." Even if true, it lands as pressure. Don't prescribe forgiveness as the answer. Let them tell you what they're carrying first.
FOLLOW-UP: Help them name what they're actually holding — anger, grief, betrayal, shame.
Example questions:
- "What happened?"
- "What do you think forgiving them would mean — what would you have to let go of?"
- "Is it forgiveness you're struggling with, or something underneath it?"
- "What do you think you deserve in all of this?"
- "What would you need in order to even consider it?"`,
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
async function loadDoorwayProfile(supabase, userId) {
  if (!supabase || !userId) return { doorAffinity: {}, doorHitHistory: {} };
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('doorway_profile')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data?.doorway_profile) return { doorAffinity: {}, doorHitHistory: {} };
    return data.doorway_profile;
  } catch (e) {
    return { doorAffinity: {}, doorHitHistory: {} };
  }
}

async function saveDoorwayProfile(supabase, userId, profile) {
  if (!supabase || !userId) return;
  try {
    await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        doorway_profile: profile,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  } catch (e) {
    console.warn('[DOORWAYS v1] Profile save error:', e.message);
  }
}

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
  loadDoorwayProfile,
  saveDoorwayProfile,
};
