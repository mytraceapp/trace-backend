/**
 * TRACE Schema Validator — Phase 4.2
 * 
 * Validates model output against traceIntent constraints.
 * Uses server-side computed meta (NOT model self-reports).
 * 
 * Hard bypasses: crisis mode, onboarding — always returns ok.
 * Named distinctly from voiceEngine.validateResponse() to avoid collision.
 */

/**
 * @param {string} finalText - The model's response text
 * @param {object} meta - Server-side computed meta from computeMeta()
 * @param {object} traceIntent - The traceIntent with mode/constraints
 * @param {object} ctx - Context: { useV2, isCrisisMode, isOnboardingActive, tier, model, requestId }
 * @returns {{ ok: boolean, violations: string[], severity: 'low'|'med'|'high', skipped: boolean, reason?: string }}
 */
function validateTraceResponseSchema(finalText, meta, traceIntent, ctx = {}) {
  const { isCrisisMode, isOnboardingActive, useV2 } = ctx;

  if (isCrisisMode) {
    return { ok: true, violations: [], severity: 'low', skipped: true, reason: 'crisis_bypass' };
  }

  if (isOnboardingActive) {
    return { ok: true, violations: [], severity: 'low', skipped: true, reason: 'onboarding_bypass' };
  }

  if (!useV2) {
    return { ok: true, violations: [], severity: 'low', skipped: true, reason: 'legacy_mode' };
  }

  if (!traceIntent || !meta) {
    return { ok: true, violations: [], severity: 'low', skipped: true, reason: 'missing_input' };
  }

  const violations = [];
  const mode = traceIntent.mode || 'micro';
  const constraints = traceIntent.constraints || {};

  if (mode === 'micro' || mode === 'normal') {
    const maxSentences = constraints.maxSentences || 2;
    if (meta.sentence_count > maxSentences + 1) {
      violations.push(`sentence_overflow: ${meta.sentence_count} > ${maxSentences} (limit+1)`);
    }

    const allowQuestions = constraints.allowQuestions ?? 1;
    if (meta.question_count > allowQuestions) {
      violations.push(`question_overflow: ${meta.question_count} > ${allowQuestions}`);
    }

    if (constraints.allowActivities === 'never' && meta.activity_offered) {
      violations.push('activity_offered_when_never');
    }

    if (constraints.allowActivities === 'ifAsked' && meta.activity_offered) {
      violations.push('activity_offered_unsolicited');
    }
  }

  if (mode === 'longform') {
    if (constraints.mustNotTruncate && meta.has_truncation_language) {
      violations.push('truncation_language_in_mustNotTruncate');
    }

    if (constraints.requiredSections && Array.isArray(constraints.requiredSections)) {
      for (const section of constraints.requiredSections) {
        if (!meta.sections_present.includes(section)) {
          violations.push(`missing_section: ${section}`);
        }
      }
    }
  }

  const severity = violations.length === 0 ? 'low'
    : violations.some(v => v.startsWith('activity_offered')) ? 'high'
    : violations.length >= 3 ? 'high'
    : 'med';

  return {
    ok: violations.length === 0,
    violations,
    severity,
    skipped: false,
  };
}

module.exports = { validateTraceResponseSchema };
