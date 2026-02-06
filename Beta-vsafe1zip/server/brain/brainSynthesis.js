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

  // existing outputs (pass whatever you already compute)
  isEarlyCrisisMode,
  cognitiveIntent,        // from cognitiveEngine.processCognitiveIntent(...)
  conversationState,      // from conversationState.getState(...)
  traceBrainSignals,      // from traceBrain.getBrainSignals(...)
  attunement,             // from detectPosture(...)
  doorwaysResult,         // from processDoorways(...)
  atmosphereResult,       // from evaluateAtmosphere(...)
  disclaimerShown,        // from profile / onboarding
  memoryBullets,          // (Phase 1 optional) from memory builder trimmed
  patternBullets,         // (Phase 1 optional)
  dreamBullet,            // (Phase 1 optional)
  activityBullets,        // (Phase 1 optional)
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

  // --- context bullets (not used yet) ---
  intent.selectedContext.memoryBullets = Array.isArray(memoryBullets) ? memoryBullets.slice(0, 6) : [];
  intent.selectedContext.patternBullets = Array.isArray(patternBullets) ? patternBullets.slice(0, 4) : [];
  intent.selectedContext.dreamBullet = dreamBullet || null;
  intent.selectedContext.activityBullets = Array.isArray(activityBullets) ? activityBullets.slice(0, 2) : [];
  intent.selectedContext.doorwayHint = pickDoorwayHint(doorwaysResult);

  // --- mode selection (Phase 1 only classification) ---
  if (isEarlyCrisisMode) {
    intent.mode = "crisis";
    intent.intentType = "crisis";
    intent.constraints.maxSentences = null;       // crisis path uses special format anyway
    intent.constraints.allowQuestions = 0;
    intent.constraints.allowActivities = "never";
    return intent;
  }

  // Determine longform intent types (recipes, stories, steps)
  const inferred = inferIntentType({ currentMessage, cognitiveIntent, doorwaysResult, traceBrainSignals });

  intent.intentType = inferred.intentType;
  intent.mode = inferred.mode;

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
    intent.constraints.allowQuestions = 0; // usually no questions in recipes/steps unless asked
    intent.constraints.mustNotTruncate = true;
    intent.constraints.requiredSections = inferred.requiredSections || null;
  }

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
  if (cognitiveIntent?.asks_for_help) return { intentType: "clarify", mode: "micro" };
  if (cognitiveIntent?.emotional_context && cognitiveIntent.emotional_context !== "neutral") {
    return { intentType: "presence", mode: "micro" };
  }

  // Check traceBrain signals
  if (traceBrainSignals?.asksForHelp) {
    return { intentType: "clarify", mode: "micro" };
  }
  if (traceBrainSignals?.highArousal || traceBrainSignals?.lowMood) {
    return { intentType: "presence", mode: "micro" };
  }

  return { intentType: "other", mode: "micro" };
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
  return /\b(play|night swim|music|song|album|listen|soundscape)\b/.test(t);
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
    intentType: traceIntent.intentType,
    posture: traceIntent.posture,
    detected_state: traceIntent.detected_state,
    doorwayHint: traceIntent.selectedContext.doorwayHint,
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

module.exports = { brainSynthesis, logTraceIntent };
