/**
 * TRACE Intent Structure (Phase 1)
 * 
 * Centralized intent object that consolidates all brain module signals
 * into a single directive for prompt building and response generation.
 * 
 * Phase 1: Create structure + log (no enforcement yet)
 */

function createEmptyTraceIntent() {
  return {
    version: "v1",
    createdAt: new Date().toISOString(),

    mode: "micro", // micro | normal | longform | crisis
    intentType: "presence", // presence | clarify | recipe | story | steps | dream | music | info | crisis | other
    primaryMode: "conversation", // studios | conversation | dream | activity | crisis | onboarding

    posture: null,          // GENTLE | STEADY | DIRECTIVE
    detected_state: null,   // anxious | tired | neutral | etc.

    constraints: {
      maxSentences: 2,
      allowQuestions: 1,
      allowActivities: "ifAsked", // never | ifAsked | allowed
      banTherapySpeak: true,
      mustNotTruncate: false,
      requiredSections: null,
      disclaimerShown: null,
      suppressSoundscapes: false,
      studiosDirective: null,
    },

    selectedContext: {
      memoryBullets: [],
      patternBullets: [],
      dreamBullet: null,
      activityBullets: [],
      doorwayHint: null,
    },

    signals: {
      crisis: null,
      cognitive: null,
      conversationState: null,
      traceBrain: null,
      doorways: null,
      atmosphere: null,
    }
  };
}

module.exports = { createEmptyTraceIntent };
