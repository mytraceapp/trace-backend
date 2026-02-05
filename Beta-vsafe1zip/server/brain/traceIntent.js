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

    // High-level behavior mode (Phase 1: just classify; no enforcement yet)
    mode: "micro", // micro | normal | longform | crisis

    // Primary intent type (Phase 1: best-effort)
    intentType: "presence", // presence | clarify | recipe | story | steps | dream | music | info | crisis | other

    // Posture and state (from attunement)
    posture: null,          // GENTLE | STEADY | DIRECTIVE
    detected_state: null,   // anxious | tired | neutral | etc.

    // Constraints (Phase 1: fill, but don't apply)
    constraints: {
      maxSentences: 2,
      allowQuestions: 1,
      allowActivities: "ifAsked", // never | ifAsked | allowed
      banTherapySpeak: true,
      mustNotTruncate: false,
      requiredSections: null, // e.g. ["ingredients","steps"]
      disclaimerShown: null,  // true/false
    },

    // Selected context (Phase 1: small bullets only; not used yet)
    selectedContext: {
      memoryBullets: [],
      patternBullets: [],
      dreamBullet: null,
      activityBullets: [],
      doorwayHint: null,
    },

    // Debug / provenance
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
