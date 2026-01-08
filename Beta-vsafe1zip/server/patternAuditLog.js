/**
 * Pattern & Emotional Intelligence Audit Log
 * 
 * Provides structured logging for:
 * - Pattern consent offers/grants/revocations
 * - Pattern reflection usage in replies
 * - Emotional intelligence feature usage
 * 
 * All logs are timestamped and include user context for debugging.
 */

const LOG_PREFIX = '[PATTERN AUDIT]';

/**
 * Log when pattern consent is offered to a user
 */
function logConsentOffered(userId, stats) {
  const entry = {
    event: 'CONSENT_OFFERED',
    timestamp: new Date().toISOString(),
    userId: userId?.slice(0, 8) + '...',
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
function logConsentGranted(userId, method) {
  const entry = {
    event: 'CONSENT_GRANTED',
    timestamp: new Date().toISOString(),
    userId: userId?.slice(0, 8) + '...',
    method: method || 'verbal'
  };
  console.log(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

/**
 * Log when user denies consent
 */
function logConsentDenied(userId, method) {
  const entry = {
    event: 'CONSENT_DENIED',
    timestamp: new Date().toISOString(),
    userId: userId?.slice(0, 8) + '...',
    method: method || 'verbal',
    cooldownDays: 60
  };
  console.log(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

/**
 * Log when user revokes consent
 */
function logConsentRevoked(userId, trigger) {
  const entry = {
    event: 'CONSENT_REVOKED',
    timestamp: new Date().toISOString(),
    userId: userId?.slice(0, 8) + '...',
    trigger: trigger || 'keyword'
  };
  console.log(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

/**
 * Log when a pattern reflection is included in system prompt
 */
function logPatternReflectionIncluded(userId, summary) {
  const entry = {
    event: 'PATTERN_REFLECTION_INCLUDED',
    timestamp: new Date().toISOString(),
    userId: userId?.slice(0, 8) + '...',
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
function logEmotionalIntelligenceUsed(userId, context) {
  const entry = {
    event: 'EMOTIONAL_INTELLIGENCE_USED',
    timestamp: new Date().toISOString(),
    userId: userId?.slice(0, 8) + '...',
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
function logEmotionalIntelligenceBlocked(userId, reason) {
  const entry = {
    event: 'EMOTIONAL_INTELLIGENCE_BLOCKED',
    timestamp: new Date().toISOString(),
    userId: userId?.slice(0, 8) + '...',
    reason: reason || 'crisis_mode'
  };
  console.log(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

/**
 * Log when pattern reflection is blocked
 */
function logPatternReflectionBlocked(userId, reason) {
  const entry = {
    event: 'PATTERN_REFLECTION_BLOCKED',
    timestamp: new Date().toISOString(),
    userId: userId?.slice(0, 8) + '...',
    reason: reason
  };
  console.log(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
  return entry;
}

/**
 * Log when pattern system gracefully degrades due to error
 */
function logPatternFallback(userId, error, component) {
  const entry = {
    event: 'PATTERN_FALLBACK',
    timestamp: new Date().toISOString(),
    userId: userId?.slice(0, 8) + '...',
    component: component,
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
    event: 'EMOTIONAL_INTELLIGENCE_FALLBACK',
    timestamp: new Date().toISOString(),
    userId: userId?.slice(0, 8) + '...',
    component: component,
    error: error?.message || String(error)
  };
  console.warn(`${LOG_PREFIX} ${JSON.stringify(entry)}`);
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
  logEmotionalIntelligenceFallback
};
