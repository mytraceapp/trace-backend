/**
 * TRACE Schema Rollout Controller — Phase 4.5
 * 
 * Deterministic per-user sampling for schema enforcement rollout.
 * Uses the same stable hash pattern as shouldUsePromptV2() to ensure
 * consistent bucketing across restarts.
 * 
 * Env vars:
 *   TRACE_SCHEMA_ENFORCEMENT      — master switch (0/1)
 *   TRACE_SCHEMA_ENFORCEMENT_PCT  — percentage of V2 users who get enforcement (0–100)
 */

function stableHash(userId) {
  let hash = 0;
  const s = String(userId || '');
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Determines whether schema enforcement should run for this user.
 * 
 * Pre-conditions (caller must check):
 *   - useV2 === true
 *   - !isCrisisMode
 *   - !isOnboardingActive
 *   - TRACE_SCHEMA_ENFORCEMENT === '1'
 * 
 * This function only handles the percentage gate.
 * 
 * @param {string} userId
 * @returns {boolean}
 */
function shouldUseSchemaEnforcement(userId) {
  const pct = Number(process.env.TRACE_SCHEMA_ENFORCEMENT_PCT || '100');
  if (pct <= 0) return false;
  if (pct >= 100) return true;
  return (stableHash(userId) % 100) < pct;
}

/**
 * Build a structured metrics object for schema enforcement telemetry.
 * Only emitted when TRACE_INTENT_LOG=1.
 * 
 * @param {object} opts
 * @param {string} opts.requestId
 * @param {string} opts.userId
 * @param {boolean} opts.schemaRan - Whether schema validation actually executed (not skipped)
 * @param {boolean} opts.schemaFailed - Whether violations were found
 * @param {boolean} opts.rewriteAttempted - Whether rewrite was triggered
 * @param {boolean} opts.rewriteSucceeded - Whether rewrite passed re-validation
 * @param {string[]} opts.violations - List of violation strings
 * @param {string} opts.severity - 'low' | 'med' | 'high'
 * @param {number} opts.latencyMsTotal - Total time for schema validate + rewrite
 * @param {number} opts.latencyMsModel - Time spent in main model call (from caller)
 * @param {number} opts.latencyMsRewrite - Time spent in rewrite call
 * @param {string|null} opts.skipReason - Why schema was skipped (null if ran)
 * @returns {object}
 */
function buildSchemaMetrics(opts = {}) {
  return {
    requestId: opts.requestId || null,
    userId: opts.userId || null,
    schema_ran: !!opts.schemaRan,
    schema_failed: !!opts.schemaFailed,
    rewrite_attempted: !!opts.rewriteAttempted,
    rewrite_succeeded: !!opts.rewriteSucceeded,
    violations: opts.violations || [],
    severity: opts.severity || 'low',
    latency_ms_total: opts.latencyMsTotal || 0,
    latency_ms_model: opts.latencyMsModel || 0,
    latency_ms_rewrite: opts.latencyMsRewrite || 0,
    skip_reason: opts.skipReason || null,
    enforcement_pct: Number(process.env.TRACE_SCHEMA_ENFORCEMENT_PCT || '100'),
    ts: Date.now(),
  };
}

module.exports = { shouldUseSchemaEnforcement, buildSchemaMetrics, stableHash };
