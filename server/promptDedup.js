/**
 * Prompt Deduplication Module
 *
 * Removes overlapping directives when V2 prompt system is active.
 * Each policy has a single "owner":
 *   - V2 directive owns: ban list reference, mode/length, confidence/hedging,
 *     studios guardrail, music familiarity ban list.
 *   - Studios gate adds ONLY: capability-aware action rules (PLAY_IN_APP_TRACK etc.)
 *   - T2 manifesto adds ONLY: core rules, premium intuition loop, micro-echo,
 *     anti-repetition cadence, premium questions, micro-insight, voice constraints.
 *
 * Safe-to-trim sections (V2 already provides equivalent):
 *   - PREMIUM BREVITY: conflicts with V2 micro mode's 2-sentence limit
 *   - DEPTH WITHOUT THERAPY VOICE: V2 core says "No therapy jargon" + voiceEngine enforces
 *
 * NOT trimmed (unique to T2, not in V2 core/directive):
 *   - MICRO-ECHO: V2 core/directive do not include micro-echo guidance
 *   - ANTI-REPETITION: V2 has opener dedup but T2 adds cadence rotation rules
 *
 * Gated by FEATURE_FLAGS.PROMPT_DEDUP_ENABLED (default false).
 */

const T2_SECTIONS_OWNED_BY_V2 = [
  {
    id: 'premium_brevity',
    startMarker: 'PREMIUM BREVITY',
    regex: /PREMIUM BREVITY\n[\s\S]*?(?=\n\n[A-Z]|\n*$)/,
    reason: 'V2 directive owns MODE block with sentence limits; T2 40-120 word range conflicts with micro mode',
  },
  {
    id: 'depth_without_therapy',
    startMarker: 'DEPTH WITHOUT THERAPY VOICE',
    regex: /DEPTH WITHOUT THERAPY VOICE\n[\s\S]*?(?=\n\n[A-Z]|\n*$)/,
    reason: 'V2 core says "No therapy jargon" + voiceEngine BANNED_PHRASES enforces at runtime',
  },
];

/**
 * Trim T2 manifesto text by removing sections that V2 already owns.
 * Keeps: CORE RULES, PREMIUM INTUITION LOOP, PREMIUM QUESTIONS, MICRO-INSIGHT, VOICE CONSTRAINTS.
 *
 * @param {string} t2Text - The full T2 manifesto text
 * @returns {{ trimmed: string, removed: string[], kept: string[] }}
 */
function trimT2Manifesto(t2Text) {
  if (!t2Text) return { trimmed: '', removed: [], kept: [] };

  let result = t2Text;
  const removed = [];
  const kept = [];

  for (const section of T2_SECTIONS_OWNED_BY_V2) {
    if (result.includes(section.startMarker)) {
      const before = result;
      result = result.replace(section.regex, '').replace(/\n{3,}/g, '\n\n');
      if (result !== before) {
        removed.push(section.id);
      } else {
        kept.push(section.id);
      }
    }
  }

  const KEPT_MARKERS = [
    'INTUITION',
    'RESPONSE SHAPE',
    'ALIVE LANGUAGE',
    'MICRO-INSIGHT',
    'QUESTIONS',
    'ANTI-REPETITION',
    'BREVITY',
    'GRAMMAR',
  ];
  for (const marker of KEPT_MARKERS) {
    if (result.includes(marker)) {
      kept.push(marker.toLowerCase().replace(/\s+/g, '_'));
    }
  }

  return { trimmed: result.trim(), removed, kept };
}

/**
 * Determine whether the studios gate music-familiarity injection is redundant.
 * When V2 is active, the V2 directive already includes a MUSIC FAMILIARITY block
 * with the full 6-phrase ban list. The studios gate should only add the
 * capability-aware action rules (PLAY_IN_APP_TRACK, OPEN_JOURNAL_MODAL, etc.)
 *
 * @param {boolean} useV2 - Whether V2 prompt system is active
 * @param {string} musicFamiliarity - Current familiarity level
 * @returns {{ skipFamiliarityInjection: boolean, reason: string }}
 */
function shouldSkipStudiosFamiliarityInjection(useV2, musicFamiliarity) {
  if (!useV2) {
    return { skipFamiliarityInjection: false, reason: 'legacy_mode' };
  }
  if (!musicFamiliarity || musicFamiliarity === 'new') {
    return { skipFamiliarityInjection: false, reason: 'new_listener_no_block' };
  }
  return {
    skipFamiliarityInjection: true,
    reason: 'v2_directive_already_includes_familiarity_block',
  };
}

/**
 * Build a prompt dedup summary log object for observability.
 *
 * @param {Object} opts
 * @param {string} opts.requestId
 * @param {boolean} opts.enabled
 * @param {boolean} opts.useV2
 * @param {boolean} opts.stripLegacy
 * @param {string[]} opts.t2Removed - Sections removed from T2
 * @param {string[]} opts.t2Kept - Sections kept in T2
 * @param {boolean} opts.studiosFamiliaritySkipped
 * @param {string} opts.studiosFamiliarityReason
 * @param {string[]} opts.includedBlocks - All prompt blocks that made it into the final prompt
 * @returns {Object}
 */
function buildDedupLog({
  requestId,
  enabled,
  useV2,
  stripLegacy,
  t2Removed = [],
  t2Kept = [],
  studiosFamiliaritySkipped = false,
  studiosFamiliarityReason = '',
  includedBlocks = [],
}) {
  return {
    requestId,
    enabled,
    useV2,
    stripLegacy,
    t2: {
      removed: t2Removed,
      kept: t2Kept,
      action: t2Removed.length > 0 ? 'trimmed' : (enabled ? 'no_overlap_found' : 'passthrough'),
    },
    studios: {
      familiaritySkipped: studiosFamiliaritySkipped,
      reason: studiosFamiliarityReason,
    },
    includedBlocks,
  };
}

module.exports = {
  trimT2Manifesto,
  shouldSkipStudiosFamiliarityInjection,
  buildDedupLog,
};
