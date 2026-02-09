/**
 * TRACE Intent Structure (Phase 1)
 * 
 * Centralized intent object that consolidates all brain module signals
 * into a single directive for prompt building and response generation.
 * 
 * Phase 1: Create structure + log (no enforcement yet)
 */

const UI_ACTION_TYPES = {
  OPEN_JOURNAL_MODAL: 'OPEN_JOURNAL_MODAL',
  OPEN_EXTERNAL_URL: 'OPEN_EXTERNAL_URL',
  PLAY_IN_APP_TRACK: 'PLAY_IN_APP_TRACK',
  SHOW_PLAYLIST_CHOOSER: 'SHOW_PLAYLIST_CHOOSER',
};

function createEmptyUiAction() {
  return null;
}

function createUiAction({ type, title, url, playlistId, trackId, trackIndex, album, source }) {
  if (!type || !UI_ACTION_TYPES[type]) return null;
  return {
    type,
    ...(title && { title }),
    ...(url && { url }),
    ...(playlistId && { playlistId }),
    ...(trackId && { trackId }),
    ...(trackIndex !== undefined && trackIndex !== null && { trackIndex }),
    ...(album && { album }),
    source: source || 'trace',
  };
}

function createEmptyTraceIntent() {
  return {
    version: "v1",
    createdAt: new Date().toISOString(),

    mode: "micro", // micro | normal | longform | crisis
    intentType: "presence", // presence | clarify | recipe | story | steps | dream | music | info | crisis | other
    primaryMode: "conversation", // studios | conversation | dream | activity | crisis | onboarding

    posture: null,          // GENTLE | STEADY | DIRECTIVE
    detected_state: null,   // anxious | tired | neutral | etc.

    ui_action: null,

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

module.exports = { createEmptyTraceIntent, createUiAction, UI_ACTION_TYPES };
