/**
 * Pattern & Emotional Intelligence Audit Log
 * 
 * Provides structured logging for:
 * - Pattern consent offers/grants/revocations
 * - Pattern reflection usage in replies
 * - Emotional intelligence feature usage
 * - Intentional feature skips (nothing happened = still meaningful)
 * 
 * All logs are timestamped and include:
 * - Policy version for regression tracking
 * - Trigger source for flow debugging
 * - User context for debugging
 */

const LOG_PREFIX = '[PATTERN AUDIT]';

const POLICY_VERSIONS = {
  pattern_reflections: 'pattern_v3.1',
  emotional_intelligence: 'ei_v1.4',
  consent_system: 'consent_v2.0',
  crisis_override: 'crisis_v1.0'
};

const TRIGGERS = {
  USER_MESSAGE: 'user_message',
  POST_ACTIVITY: 'post_activity',
  DAILY_CHECKIN: 'daily_check_in',
  SESSION_START: 'session_start',
  RETURNING_USER: 'returning_user',
  SYSTEM_INIT: 'system_init'
};

function truncateUserId(userId) {
  if (!userId) return 'unknown...';
  return userId.slice(0, 8) + '...';
}

function baseEntry(event, userId, policyKey = 'pattern_reflections') {
  return {
    event,
    timestamp: new Date().toISOString(),
    userId: truncateUserId(userId),
    policyVersion: POLICY_VERSIONS[policyKey] || POLICY_VERSIONS.pattern_reflections
  };
}

/**
 * Log when pattern consent is offered to a user
 */
function logConsentOffered(userId, stats, trigger = TRIGGERS.USER_MESSAGE) {
  const entry = {
    ...baseEntry('CONSENT_OFFERED', userId, 'consent_system'),
    trigger,
    context: {
      daysSinceFirstUse: stats?.daysSinceFirstUse,
      activityCount: stats?.activityCount,
      totalMessages: stats?.totalMessages
    }
  };
  console.log(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

/**
 * Log when user grants consent
 */
function logConsentGranted(userId, method, trigger = TRIGGERS.USER_MESSAGE) {
  const entry = {
    ...baseEntry('CONSENT_GRANTED', userId, 'consent_system'),
    trigger,
    method: method || 'verbal'
  };
  console.log(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

/**
 * Log when user denies consent
 */
function logConsentDenied(userId, method, trigger = TRIGGERS.USER_MESSAGE) {
  const entry = {
    ...baseEntry('CONSENT_DENIED', userId, 'consent_system'),
    trigger,
    method: method || 'verbal',
    cooldownDays: 60
  };
  console.log(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

/**
 * Log when user revokes consent
 */
function logConsentRevoked(userId, trigger = TRIGGERS.USER_MESSAGE) {
  const entry = {
    ...baseEntry('CONSENT_REVOKED', userId, 'consent_system'),
    trigger
  };
  console.log(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

/**
 * Log when a pattern reflection is included in system prompt
 */
function logPatternReflectionIncluded(userId, summary, trigger = TRIGGERS.USER_MESSAGE) {
  const entry = {
    ...baseEntry('PATTERN_REFLECTION_INCLUDED', userId, 'pattern_reflections'),
    trigger,
    summaryNotes: summary?.notes?.length || 0,
    observations: {
      hasHeavyDays: (summary?.commonHeavyDays?.length || 0) > 0,
      hasPreferredTime: !!summary?.preferredTime,
      hasMostUsedActivity: !!summary?.mostUsedActivity
    }
  };
  console.log(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

/**
 * Log when emotional intelligence context is used
 */
function logEmotionalIntelligenceUsed(userId, context, trigger = TRIGGERS.USER_MESSAGE) {
  const entry = {
    ...baseEntry('EMOTIONAL_INTELLIGENCE_USED', userId, 'emotional_intelligence'),
    trigger,
    features: {
      trajectory: context?.trajectory || null,
      isReturning: context?.isReturning || false,
      checkbackCount: context?.checkbackCount || 0
    }
  };
  console.log(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

/**
 * Log when emotional intelligence is blocked due to crisis mode
 */
function logEmotionalIntelligenceBlocked(userId, reason, trigger = TRIGGERS.USER_MESSAGE) {
  const entry = {
    ...baseEntry('EMOTIONAL_INTELLIGENCE_BLOCKED', userId, 'crisis_override'),
    trigger,
    reason: reason || 'crisis_mode'
  };
  console.log(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

/**
 * Log when pattern reflection is blocked
 */
function logPatternReflectionBlocked(userId, reason, trigger = TRIGGERS.USER_MESSAGE) {
  const entry = {
    ...baseEntry('PATTERN_REFLECTION_BLOCKED', userId, 'pattern_reflections'),
    trigger,
    reason
  };
  console.log(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

/**
 * Log when pattern system gracefully degrades due to error
 */
function logPatternFallback(userId, error, component) {
  const entry = {
    ...baseEntry('PATTERN_FALLBACK', userId, 'pattern_reflections'),
    component,
    error: error?.message || String(error)
  };
  console.warn(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

/**
 * Log when emotional intelligence gracefully degrades due to error
 */
function logEmotionalIntelligenceFallback(userId, error, component) {
  const entry = {
    ...baseEntry('EMOTIONAL_INTELLIGENCE_FALLBACK', userId, 'emotional_intelligence'),
    component,
    error: error?.message || String(error)
  };
  console.warn(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

/**
 * Log when pattern features are intentionally skipped (not error, just no data/criteria)
 */
function logPatternFeaturesSkipped(userId, reason, trigger = TRIGGERS.USER_MESSAGE) {
  const entry = {
    ...baseEntry('PATTERN_FEATURES_SKIPPED', userId, 'pattern_reflections'),
    trigger,
    reason
  };
  console.log(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

/**
 * Log when emotional intelligence is intentionally not used (subthreshold, no data, etc)
 */
function logEmotionalIntelligenceSkipped(userId, reason, details = {}, trigger = TRIGGERS.USER_MESSAGE) {
  const entry = {
    ...baseEntry('EI_NOT_USED', userId, 'emotional_intelligence'),
    trigger,
    reason,
    details
  };
  console.log(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

/**
 * Log when consent check is skipped (not enough history, recently asked, etc)
 */
function logConsentCheckSkipped(userId, reason, trigger = TRIGGERS.USER_MESSAGE) {
  const entry = {
    ...baseEntry('CONSENT_CHECK_SKIPPED', userId, 'consent_system'),
    trigger,
    reason
  };
  console.log(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

module.exports = {
  logConsentOffered,
  logConsentGranted,
  logConsentDenied,
  logConsentRevoked,
  logPatternReflectionIncluded,
  logEmotionalIntelligenceUsed,
  logEmotionalIntelligenceBlocked,
  logPatternReflectionBlocked,
  logPatternFallback,
  logEmotionalIntelligenceFallback,
  logPatternFeaturesSkipped,
  logEmotionalIntelligenceSkipped,
  logConsentCheckSkipped,
  POLICY_VERSIONS,
  TRIGGERS
};
