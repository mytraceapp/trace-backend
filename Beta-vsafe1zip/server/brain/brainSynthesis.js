/**
 * Brain Synthesis (Phase 1)
 * 
 * Consolidates all brain module outputs into a single traceIntent object.
 * Phase 1: Reads existing signals, classifies mode/intent, logs for observability.
 * Does NOT change prompt building or response generation yet.
 */

const { createEmptyTraceIntent } = require("./traceIntent");

/**
 * Main synthesis function - reads existing module outputs and produces traceIntent
 */
function brainSynthesis({
  currentMessage,
  historyMessages,
  localTime,
  tonePreference,

  isEarlyCrisisMode,
  cognitiveIntent,
  conversationState,
  traceBrainSignals,
  attunement,
  doorwaysResult,
  atmosphereResult,
  disclaimerShown,
  memoryBullets,
  patternBullets,
  dreamBullet,
  activityBullets,
  isOnboardingScripted,
  isActivityRequest,
  previousAnchor,
  getPendingFollowupFn,
}) {
  const intent = createEmptyTraceIntent();

  // --- provenance / debug ---
  intent.signals.crisis = { isEarlyCrisisMode: !!isEarlyCrisisMode };
  intent.signals.cognitive = summarizeCognitive(cognitiveIntent);
  intent.signals.conversationState = summarizeConvoState(conversationState);
  intent.signals.traceBrain = summarizeTraceBrain(traceBrainSignals);
  intent.signals.doorways = summarizeDoorways(doorwaysResult);
  intent.signals.atmosphere = summarizeAtmosphere(atmosphereResult);

  // --- posture ---
  if (attunement) {
    intent.posture = attunement.posture || attunement.detectedPosture || null;
    intent.detected_state = attunement.detected_state || attunement.detectedState || null;
  }

  // --- disclaimer flag ---
  intent.constraints.disclaimerShown = disclaimerShown ?? null;

  intent.selectedContext.memoryBullets = Array.isArray(memoryBullets) ? memoryBullets.slice(0, 6) : [];
  intent.selectedContext.patternBullets = Array.isArray(patternBullets) ? patternBullets.slice(0, 4) : [];
  intent.selectedContext.dreamBullet = dreamBullet || null;
  intent.selectedContext.activityBullets = Array.isArray(activityBullets) ? activityBullets.slice(0, 2) : [];
  intent.selectedContext.doorwayHint = pickDoorwayHint(doorwaysResult);

  // --- mode selection (Phase 1 only classification) ---
  if (isEarlyCrisisMode) {
    intent.mode = "crisis";
    intent.intentType = "crisis";
    intent.primaryMode = "crisis";
    intent.constraints.maxSentences = null;
    intent.constraints.allowQuestions = 0;
    intent.constraints.allowActivities = "never";
    intent.topicAnchor = {
      domain: 'crisis',
      label: 'safety support',
      entities: [],
      turnAge: (previousAnchor?.domain === 'crisis') ? (previousAnchor.turnAge || 0) + 1 : 0,
      carried: previousAnchor?.domain === 'crisis',
    };
    return intent;
  }

  const inferred = inferIntentType({ currentMessage, cognitiveIntent, doorwaysResult, traceBrainSignals });

  intent.intentType = inferred.intentType;
  intent.mode = inferred.mode;

  // --- primaryMode: single authoritative mode per response ---
  const doorwayHint = pickDoorwayHint(doorwaysResult);

  const noTopicShift = !cognitiveIntent?.topic_shift;
  const prevDomainIsMusic = previousAnchor?.domain === 'music';

  if (intent.intentType === "music" || traceBrainSignals?.musicRequest) {
    intent.primaryMode = "studios";
  } else if (noTopicShift && prevDomainIsMusic) {
    intent.primaryMode = "studios";
    console.log('[ANCHOR] Carrying studios mode — previous domain=music, no topic_shift');
  } else if (isOnboardingScripted) {
    intent.primaryMode = "onboarding";
  } else if (doorwayHint === "dreams_symbols" || intent.intentType === "dream") {
    intent.primaryMode = "dream";
  } else if (isActivityRequest) {
    intent.primaryMode = "activity";
  } else {
    intent.primaryMode = "conversation";
  }

  // --- enforce studios hard gate ---
  if (intent.primaryMode === "studios") {
    intent.constraints.allowActivities = "never";
    intent.constraints.suppressSoundscapes = true;
    intent.constraints.studiosDirective = `Do not mention soundscapes. Only album/tracks/playlists/visual concepts.
CAPABILITY-AWARE ACTIONS:
- If recommending a TRACE track/album: use PLAY_IN_APP_TRACK. You may say "Playing…" or "Here's…".
- If recommending Spotify content: use OPEN_JOURNAL_MODAL (preferred) or OPEN_EXTERNAL_URL. Never say "Playing…" for Spotify. Use "Check this out…" or "You might like…".
- Never mix sources in one response. One action per response.`;
  }

  // --- constraints by mode ---
  if (intent.mode === "micro") {
    intent.constraints.maxSentences = 2;
    intent.constraints.allowQuestions = 1;
    intent.constraints.mustNotTruncate = false;
    intent.constraints.requiredSections = null;
  } else if (intent.mode === "normal") {
    intent.constraints.maxSentences = null;
    intent.constraints.allowQuestions = 1;
    intent.constraints.mustNotTruncate = false;
    intent.constraints.requiredSections = null;
  } else if (intent.mode === "longform") {
    intent.constraints.maxSentences = null;
    intent.constraints.allowQuestions = 0;
    intent.constraints.mustNotTruncate = true;
    intent.constraints.requiredSections = inferred.requiredSections || null;
  }

  // --- topic anchor: prevent context drift across turns ---
  intent.topicAnchor = buildTopicAnchor({
    primaryMode: intent.primaryMode,
    intentType: intent.intentType,
    conversationState,
    cognitiveIntent,
    doorwaysResult,
    currentMessage,
    previousAnchor: previousAnchor || null,
    historyMessages: historyMessages || [],
  });

  intent.continuity = buildContinuity({
    topicAnchor: intent.topicAnchor,
    previousAnchor,
    conversationState,
    cognitiveIntent,
    primaryMode: intent.primaryMode,
    getPendingFollowup: getPendingFollowupFn,
    historyMessages: historyMessages || [],
  });

  const synthConfidence = intent.continuity?.required ? 'high'
    : intent.topicAnchor?.carried ? 'medium'
    : (conversationState?.stage && ['EXPLORING','PROCESSING','INTEGRATING','CLOSING'].includes(conversationState.stage)) ? 'medium'
    : 'low';

  intent.nextMove = computeNextMove({
    primaryMode: intent.primaryMode,
    intentType: intent.intentType,
    mode: intent.mode,
    continuity: intent.continuity,
    conversationState,
    traceBrainSignals,
    currentMessage,
    confidence: synthConfidence,
  });

  return intent;
}

/**
 * Infer intent type from message content and signals
 */
function inferIntentType({ currentMessage, cognitiveIntent, doorwaysResult, traceBrainSignals }) {
  const text = (currentMessage || "").toLowerCase();

  // explicit longform asks
  if (looksLikeRecipeAsk(text)) {
    return { intentType: "recipe", mode: "longform", requiredSections: ["ingredients", "steps"] };
  }
  if (looksLikeStepsAsk(text)) {
    return { intentType: "steps", mode: "longform", requiredSections: ["steps"] };
  }
  if (looksLikeStoryAsk(text)) {
    return { intentType: "story", mode: "longform", requiredSections: ["beginning", "middle", "end"] };
  }

  // music intent
  if (looksLikeMusicAsk(text)) {
    return { intentType: "music", mode: "normal" };
  }

  // dream hint
  if (looksLikeDream(text) || pickDoorwayHint(doorwaysResult) === "dreams_symbols") {
    return { intentType: "dream", mode: "normal" };
  }

  // grief doorway
  if (pickDoorwayHint(doorwaysResult) === "grief") {
    return { intentType: "presence", mode: "normal" };
  }

  // fallback using cognitiveIntent if available
  if (cognitiveIntent?.asks_for_help) return { intentType: "clarify", mode: "normal" };
  if (cognitiveIntent?.emotional_context && cognitiveIntent.emotional_context !== "neutral") {
    return { intentType: "presence", mode: "normal" };
  }

  // Check traceBrain signals
  if (traceBrainSignals?.asksForHelp) {
    return { intentType: "clarify", mode: "normal" };
  }
  if (traceBrainSignals?.highArousal || traceBrainSignals?.lowMood) {
    return { intentType: "presence", mode: "normal" };
  }

  const words = (currentMessage || "").trim().split(/\s+/).length;
  if (words <= 2) {
    return { intentType: "other", mode: "micro" };
  }
  return { intentType: "other", mode: "normal" };
}

// --- Pattern matchers ---

function looksLikeRecipeAsk(t) {
  return /\b(recipe|ingredients|how do i make|how to make|cook|bake)\b/.test(t);
}

function looksLikeStepsAsk(t) {
  return /\b(step by step|steps|walk me through|how do i|instructions)\b/.test(t);
}

function looksLikeStoryAsk(t) {
  return /\b(tell\s+me\s+a\s+(\w+\s+){0,3}story|story\s+time|write\s+(me\s+)?a\s+(\w+\s+){0,3}story|can\s+you\s+narrate|short\s+story|complete\s+story)\b/.test(t);
}

function looksLikeDream(t) {
  return /\b(i had a dream|dreamt|weird dream|in my dream)\b/.test(t);
}

function looksLikeMusicAsk(t) {
  if (/\b(play|night swim|neon promise|music|song|album|listen|soundscape|track|playlist)\b/.test(t)) return true;
  if (/\b(for fun|hobbies|hobby|what do you like to do|what do you do for fun|what are you into|what do you enjoy)\b/.test(t)) return true;
  if (/\b(do you make music|do you write music|your music|you make music|you write music|tell me about your music|what.?s your music like|what kind of music|what type of music|what genre)\b/.test(t)) return true;
  if (/\b(can i hear|let me hear|can you play|play it|play that|put it on)\b/.test(t)) return true;
  return false;
}

function pickDoorwayHint(doorwaysResult) {
  if (!doorwaysResult) return null;
  return doorwaysResult.selectedDoorId || doorwaysResult.triggeredDoor || doorwaysResult.doorway || (doorwaysResult.candidates?.[0] || null);
}

// --- Signal summarizers (keep logs small) ---

function summarizeCognitive(ci) {
  if (!ci) return null;
  return {
    emotional_context: ci.emotional_context,
    topic_shift: ci.topic_shift,
    is_short_message: ci.is_short_message,
    asks_for_help: ci.asks_for_help,
  };
}

function summarizeConvoState(cs) {
  if (!cs) return null;
  return {
    stage: cs.stage,
    lastMoveType: cs.lastMoveType,
    topicEstablished: cs.topicEstablished,
    probeCount: cs.probeCount,
  };
}

function summarizeTraceBrain(tb) {
  if (!tb) return null;
  return {
    asksForHelp: tb.asksForHelp,
    highArousal: tb.highArousal,
    lowMood: tb.lowMood,
    reflectiveTone: tb.reflectiveTone,
  };
}

function summarizeDoorways(dw) {
  if (!dw) return null;
  return {
    triggeredDoor: dw.selectedDoorId || dw.triggeredDoor || dw.doorway || null,
    candidates: dw.candidates ? dw.candidates.slice(0, 3) : null,
  };
}

function summarizeAtmosphere(atm) {
  if (!atm) return null;
  return {
    sound_state: atm.sound_state || atm.recommendedSoundState || null,
  };
}

// --- Topic Recovery from Message History ---

const TOPIC_PATTERNS = [
  { pattern: /\b(work|job|boss|coworker|office|career|meeting|deadline)\b/i, label: 'work' },
  { pattern: /\b(school|homework|paper|class|teacher|exam|test|assignment|grade|study)\b/i, label: 'school' },
  { pattern: /\b(mom|dad|parent|family|brother|sister|son|daughter|wife|husband|partner|boyfriend|girlfriend)\b/i, label: 'family' },
  { pattern: /\b(friend|friendship|social|lonely|alone)\b/i, label: 'relationships' },
  { pattern: /\b(sleep|tired|exhausted|insomnia|rest|nap)\b/i, label: 'sleep' },
  { pattern: /\b(anxious|anxiety|worried|nervous|panic|stressed|overwhelmed)\b/i, label: 'stress' },
  { pattern: /\b(sad|depressed|down|low|empty|hopeless|crying)\b/i, label: 'sadness' },
  { pattern: /\b(angry|frustrated|mad|annoyed|irritated|furious)\b/i, label: 'frustration' },
  { pattern: /\b(money|rent|bills|debt|financial|afford)\b/i, label: 'finances' },
  { pattern: /\b(health|sick|pain|doctor|hospital|medication)\b/i, label: 'health' },
  { pattern: /\b(move|moving|new place|apartment|house)\b/i, label: 'life changes' },
  { pattern: /\b(breakup|broke up|divorce|separation|ex\b)\b/i, label: 'breakup' },
];

function recoverTopicFromHistory(messages) {
  if (!messages || messages.length < 2) return null;

  const userMsgs = messages
    .filter(m => m.role === 'user')
    .map(m => (m.content || '').trim())
    .filter(c => c.length >= 8);

  const lastFive = userMsgs.slice(-5);

  for (let i = lastFive.length - 1; i >= 0; i--) {
    const msg = lastFive[i];
    for (const { pattern, label } of TOPIC_PATTERNS) {
      if (pattern.test(msg)) {
        return label;
      }
    }
  }

  return null;
}

// --- Topic Anchor Builder ---

const DOMAIN_MAP = {
  studios: 'music',
  dream: 'dreams',
  activity: 'activity',
  crisis: 'crisis',
  onboarding: 'onboarding',
};

function buildTopicAnchor({
  primaryMode,
  intentType,
  conversationState,
  cognitiveIntent,
  doorwaysResult,
  currentMessage,
  previousAnchor,
  historyMessages,
}) {
  const domain = DOMAIN_MAP[primaryMode] || 'conversation';
  const topicKeywords = conversationState?.lastTopicKeywords || [];

  const isBareGreeting = /^(hi|hello|hey|yo|sup|heya|hiya|heyy|hii|what'?s up|wassup)[\s!.?]*$/i.test((currentMessage || '').trim());
  const previousHasContent = previousAnchor && previousAnchor.label && previousAnchor.label !== 'open conversation';

  if (isBareGreeting && !cognitiveIntent?.topic_shift) {
    if (previousHasContent) {
      return {
        domain: previousAnchor.domain,
        label: previousAnchor.label,
        entities: previousAnchor.entities || [],
        turnAge: (previousAnchor.turnAge || 0) + 1,
        carried: true,
      };
    }
    const recoveredLabel = recoverTopicFromHistory(historyMessages);
    if (recoveredLabel) {
      return {
        domain: 'conversation',
        label: recoveredLabel,
        entities: [],
        turnAge: 0,
        carried: true,
        recoveredFromHistory: true,
      };
    }
  }

  let label = '';
  const entities = [];

  if (domain === 'music') {
    label = 'music exploration';
    const musicEntities = extractMusicEntities(currentMessage);
    entities.push(...musicEntities);
  } else if (domain === 'dreams') {
    label = 'dream reflection';
  } else if (domain === 'crisis') {
    label = 'safety support';
  } else if (domain === 'onboarding') {
    label = 'getting to know you';
  } else if (domain === 'activity') {
    label = 'activity';
  } else {
    const neutralTurns = conversationState?.neutralTurnCount || 0;
    const isEmotionalAnchor = previousHasContent && /sadness|anxiety|stress|sleep|breakup|grief|anger|depression/i.test(previousAnchor.label);
    const maxCarryAge = isEmotionalAnchor && neutralTurns >= 2 ? 2 : 4;

    if (topicKeywords.length > 0) {
      label = topicKeywords.slice(0, 2).join(' & ');
    } else if (cognitiveIntent?.emotional_context && cognitiveIntent.emotional_context !== 'neutral') {
      label = cognitiveIntent.emotional_context;
    } else if (previousHasContent && (previousAnchor.turnAge || 0) < maxCarryAge && !isEmotionalAnchor) {
      label = previousAnchor.label;
    } else if (isEmotionalAnchor && neutralTurns >= 2) {
      console.log(`[ANCHOR] Dropping stale emotional anchor "${previousAnchor.label}" after ${neutralTurns} neutral turns`);
      label = 'open conversation';
    } else if (previousHasContent && (previousAnchor.turnAge || 0) < maxCarryAge) {
      label = previousAnchor.label;
    } else {
      label = 'open conversation';
    }
  }

  const doorHint = pickDoorwayHint(doorwaysResult);
  if (doorHint && domain === 'conversation') {
    label = doorHint.replace(/_/g, ' ');
  }

  const topicShift = !!(cognitiveIntent?.topic_shift);
  const carried = !topicShift && previousAnchor?.domain === domain;

  return {
    domain,
    label,
    entities: entities.length > 0 ? entities : (carried && previousAnchor?.entities?.length ? previousAnchor.entities : []),
    turnAge: carried ? (previousAnchor.turnAge || 0) + 1 : 0,
    carried,
  };
}

function extractMusicEntities(message) {
  if (!message) return [];
  const entities = [];
  const nightSwimMatch = message.match(/\bnight\s*swim\b/i);
  if (nightSwimMatch) entities.push('Night Swim');
  const trackMatch = message.match(/\b(track|song)\s+(?:called?\s+)?["']?([^"',]+)["']?/i);
  if (trackMatch) entities.push(trackMatch[2].trim());
  const spotifyMatch = message.match(/\bspotify\b/i);
  if (spotifyMatch) entities.push('Spotify');
  return entities;
}

/**
 * Log traceIntent for Phase 1 observability
 */
function logTraceIntent({ requestId, effectiveUserId, traceIntent, model, route }) {
  const summary = {
    requestId,
    userId: effectiveUserId,
    route,
    model,
    mode: traceIntent.mode,
    primaryMode: traceIntent.primaryMode,
    intentType: traceIntent.intentType,
    posture: traceIntent.posture,
    detected_state: traceIntent.detected_state,
    doorwayHint: traceIntent.selectedContext.doorwayHint,
    topicAnchor: traceIntent.topicAnchor,
    constraints: traceIntent.constraints,
    signals: traceIntent.signals
  };

  // Gate with env var so prod logs don't explode
  if (process.env.TRACE_INTENT_LOG === "1") {
    console.log("[traceIntent]", JSON.stringify(summary));
  }

  // Synthesis health check - catch weird classifications
  const weird =
    !traceIntent.mode ||
    !traceIntent.intentType ||
    (traceIntent.mode === "longform" && !traceIntent.constraints.mustNotTruncate);

  if (weird && process.env.TRACE_INTENT_LOG === "1") {
    console.warn("[traceIntent] WEIRD_INTENT", {
      requestId,
      mode: traceIntent.mode,
      intentType: traceIntent.intentType,
      constraints: traceIntent.constraints
    });
  }
}

function buildContinuity({ topicAnchor, previousAnchor, conversationState, cognitiveIntent, primaryMode, getPendingFollowup, historyMessages }) {
  const noTopicShift = !cognitiveIntent?.topic_shift;
  const anchorExists = !!topicAnchor && topicAnchor.domain !== 'conversation';
  const topicEstablished = !!conversationState?.topicEstablished;
  const pf = typeof getPendingFollowup === 'function' ? getPendingFollowup(conversationState) : null;
  const hasPendingFollowup = pf && !pf.expired;
  const studiosContinuation = primaryMode === 'studios' && topicAnchor?.domain === 'music';

  const allAssistant = (historyMessages || []).filter(m => m.role === 'assistant');
  const lastAssistant = allAssistant[allAssistant.length - 1];
  const lastAssistantText = (lastAssistant?.content || '').toLowerCase();
  const errorPatterns = ['something went wrong', 'give me a sec', 'glitched for a sec',
    'lost you for a sec', 'lost the thread', 'hang on, lost', 'hang on, glitched',
    'sorry, lost that', 'what were you saying', 'say that again'];
  const wasErrorFallback = errorPatterns.some(p => lastAssistantText.includes(p));
  if (wasErrorFallback) {
    console.log('[CONTINUITY] Last assistant message was error fallback — PRESERVING topic anchor for recovery');
    const lastRealUserMsg = (historyMessages || [])
      .filter(m => m.role === 'user')
      .pop();
    const preservedAnchor = topicAnchor || previousAnchor || null;
    const anchorLabel = preservedAnchor?.label || 'open conversation';
    console.log('[CONTINUITY] Recovered anchor:', anchorLabel, '| Last user msg:', (lastRealUserMsg?.content || '').slice(0, 50));
    return {
      required: !!preservedAnchor && anchorLabel !== 'open conversation',
      reason: 'error_recovery_with_context',
      topicAnchor: preservedAnchor,
      sessionSummary: `Recovering from brief error. User was discussing: ${anchorLabel}. Continue that thread naturally.`,
      errorRecovery: true,
      lastUserMessage: lastRealUserMsg?.content?.slice(0, 150) || null
    };
  }

  let required = false;
  let reason = 'no_prior_context';

  const anchorCarried = !!topicAnchor?.carried;
  const previousHadContent = previousAnchor && previousAnchor.label && previousAnchor.label !== 'open conversation';
  const recoveredFromHistory = !!topicAnchor?.recoveredFromHistory;
  const anchorHasRealLabel = topicAnchor?.label && topicAnchor.label !== 'open conversation';

  if (anchorExists && noTopicShift) {
    required = true;
    reason = 'anchor_active';
  } else if (recoveredFromHistory && anchorHasRealLabel) {
    required = true;
    reason = 'anchor_recovered_from_history';
  } else if (anchorCarried && previousHadContent && noTopicShift) {
    required = true;
    reason = 'anchor_carried_through_greeting';
  } else if (topicEstablished) {
    required = true;
    reason = 'topic_established';
  } else if (studiosContinuation) {
    required = true;
    reason = 'studios_continuation';
  } else if (hasPendingFollowup) {
    required = true;
    reason = 'pending_followup';
  } else if (previousAnchor && noTopicShift && previousAnchor.domain !== 'conversation') {
    required = true;
    reason = 'previous_anchor_active';
  }

  return {
    required,
    reason,
    topicAnchor: topicAnchor ? { domain: topicAnchor.domain, label: topicAnchor.label } : null,
    sessionSummary: null,
  };
}

/**
 * Build a max-18-word session summary from topicAnchor + session state.
 * No user quotes. Generic enough for logging. Preserves context when history is trimmed.
 */
function buildSessionSummary(traceIntent, sessionState) {
  const anchor = traceIntent?.topicAnchor;
  if (!anchor) return null;

  const domain = anchor.domain || 'conversation';
  const label = anchor.label || 'open conversation';
  const entity = anchor.entities?.[0] || null;
  const turnAge = anchor.turnAge || 0;
  const stage = sessionState?.stage || null;
  const turnCount = sessionState?.turnCount || 0;

  let parts = [];

  if (domain === 'crisis') {
    parts.push('User in safety support mode.');
  } else if (domain === 'music') {
    parts.push(`Exploring ${label}`);
    if (entity) parts.push(`around ${entity}`);
  } else if (domain === 'dreams') {
    parts.push('Reflecting on a dream experience.');
  } else if (domain === 'onboarding') {
    parts.push('Completing onboarding steps.');
  } else if (domain === 'activity') {
    parts.push('Guided grounding and regulation support.');
  } else {
    parts.push(`Discussing ${label}`);
  }

  if (turnAge > 0 && domain !== 'crisis') {
    parts.push(`(${turnAge + 1} turns on this topic)`);
  }

  if (stage && stage !== 'arrival' && domain !== 'crisis' && domain !== 'onboarding') {
    const stageLabel = stage === 'sharing' ? 'sharing openly'
      : stage === 'exploring' ? 'exploring deeper'
      : stage === 'processing' ? 'processing emotions'
      : null;
    if (stageLabel) parts.push(`— ${stageLabel}`);
  }

  let summary = parts.join(' ');

  const words = summary.split(/\s+/);
  if (words.length > 18) {
    summary = words.slice(0, 18).join(' ');
  }

  return summary.replace(/\.\s*$/, '') + '.';
}

function computeNextMove({ primaryMode, intentType, mode, continuity, conversationState, traceBrainSignals, currentMessage, confidence }) {
  const text = (currentMessage || '').toLowerCase();
  const isStudios = primaryMode === 'studios';
  const continuityRequired = continuity?.required === true;
  const conf = confidence || 'low';

  if (mode === 'longform') return 'deliver_longform';

  const explicitMusicAsk = /\b(play|listen|song|track|album|playlist|night swim|spotify|queue)\b/.test(text);
  if (explicitMusicAsk) return 'offer_music';

  const missingSlot = isStudios && !explicitMusicAsk && /\b(something|anything|whatever|idk|not sure|hmm|what|which)\b/.test(text) && text.length < 50;
  if (missingSlot) return 'clarify';

  if (conf === 'high' && continuityRequired) return 'continue';

  if (isStudios) {
    return 'continue';
  }

  if (continuityRequired) return 'continue';

  const topicEstablished = !!conversationState?.topicEstablished;
  if (topicEstablished) return 'reflect_then_question';

  if (traceBrainSignals?.asksForHelp) return 'clarify';

  return 'reflect_then_question';
}

module.exports = { brainSynthesis, logTraceIntent, buildSessionSummary };
