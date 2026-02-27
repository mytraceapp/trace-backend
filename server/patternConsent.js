/**
 * Pattern Reflections Consent System
 * 
 * Controls verbal pattern comments in chat like:
 * "Mondays often feel heavier for you."
 * "You usually come here in the evenings."
 * 
 * Safety guarantees:
 * - Opt-in only (verbal consent required)
 * - Revocable at any time
 * - Disabled during crisis/high distress
 * - High-level only (no timestamps, no creepy specifics)
 */

const auditLog = require('./patternAuditLog');
const { TRIGGERS } = auditLog;

const PATTERN_MIN_DAYS_SINCE_FIRST_USE = 14;
const PATTERN_MIN_ACTIVITY_COUNT = 6;
const PATTERN_MIN_MESSAGES_FOR_TRUST = 25;
const PATTERN_COOLDOWN_DAYS_AFTER_NO = 60;

/**
 * Get user's pattern-related stats
 */
async function getUserPatternStats(pool, userId) {
  if (!pool || !userId) return { daysSinceFirstUse: 0, activityCount: 0, totalMessages: 0 };
  
  try {
    const firstActivityResult = await pool.query(
      `SELECT MIN(completed_at) as first_activity FROM activity_logs 
       WHERE user_id = $1 OR device_id = $1`,
      [userId]
    );
    
    const firstDate = firstActivityResult.rows[0]?.first_activity;
    const daysSinceFirstUse = firstDate 
      ? Math.floor((Date.now() - new Date(firstDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    const activityCountResult = await pool.query(
      `SELECT COUNT(*) as count FROM activity_logs 
       WHERE (user_id = $1 OR device_id = $1) 
       AND completed_at > NOW() - INTERVAL '90 days'`,
      [userId]
    );
    const activityCount = parseInt(activityCountResult.rows[0]?.count || 0);
    
    const messageCountResult = await pool.query(
      `SELECT COUNT(*) as count FROM mood_checkins 
       WHERE (user_id = $1 OR device_id = $1)`,
      [userId]
    );
    const totalMessages = parseInt(messageCountResult.rows[0]?.count || 0) + activityCount;
    
    return { daysSinceFirstUse, activityCount, totalMessages };
  } catch (error) {
    console.error('[PATTERN CONSENT] Error getting stats:', error.message);
    return { daysSinceFirstUse: 0, activityCount: 0, totalMessages: 0 };
  }
}

/**
 * Get or create user settings
 */
async function getUserSettings(pool, userId) {
  if (!pool || !userId) return null;
  
  try {
    const result = await pool.query(
      `SELECT * FROM user_settings WHERE user_id = $1`,
      [userId]
    );
    
    if (result.rows[0]) return result.rows[0];
    
    const insertResult = await pool.query(
      `INSERT INTO user_settings (user_id, pattern_reflection_consent) 
       VALUES ($1, 'undecided') 
       ON CONFLICT (user_id) DO NOTHING
       RETURNING *`,
      [userId]
    );
    
    return insertResult.rows[0] || { pattern_reflection_consent: 'undecided' };
  } catch (error) {
    console.error('[PATTERN CONSENT] Error getting settings:', error.message);
    return { pattern_reflection_consent: 'undecided' };
  }
}

/**
 * Update consent status
 */
async function updatePatternConsent(pool, userId, consent, method = 'verbal') {
  if (!pool || !userId) return false;
  
  try {
    const now = new Date().toISOString();
    
    if (consent === 'yes') {
      await pool.query(
        `INSERT INTO user_settings (user_id, pattern_reflection_consent, pattern_reflection_enabled_at, updated_at)
         VALUES ($1, 'yes', $2, $2)
         ON CONFLICT (user_id) DO UPDATE SET 
           pattern_reflection_consent = 'yes',
           pattern_reflection_enabled_at = $2,
           updated_at = $2`,
        [userId, now]
      );
      auditLog.logConsentGranted(userId, method);
    } else if (consent === 'no') {
      await pool.query(
        `INSERT INTO user_settings (user_id, pattern_reflection_consent, pattern_reflection_last_prompt_at, updated_at)
         VALUES ($1, 'no', $2, $2)
         ON CONFLICT (user_id) DO UPDATE SET 
           pattern_reflection_consent = 'no',
           pattern_reflection_last_prompt_at = $2,
           updated_at = $2`,
        [userId, now]
      );
      auditLog.logConsentDenied(userId, method);
    } else if (consent === 'revoked') {
      await pool.query(
        `UPDATE user_settings SET 
           pattern_reflection_consent = 'no',
           pattern_reflection_last_prompt_at = $2,
           updated_at = $2
         WHERE user_id = $1`,
        [userId, now]
      );
      auditLog.logConsentRevoked(userId, method);
    }
    
    return true;
  } catch (error) {
    console.error('[PATTERN CONSENT] Error updating:', error.message);
    return false;
  }
}

/**
 * Check if we should offer pattern consent
 */
async function shouldOfferPatternConsent(pool, userId, settings, stats, isCrisisMode) {
  if (isCrisisMode) return false;
  
  if (!settings) settings = await getUserSettings(pool, userId);
  if (!stats) stats = await getUserPatternStats(pool, userId);
  
  if (settings.pattern_reflection_consent === 'yes') return false;
  
  if (settings.pattern_reflection_consent === 'no') {
    const lastPrompt = settings.pattern_reflection_last_prompt_at;
    if (!lastPrompt) return false;
    const daysSince = (Date.now() - new Date(lastPrompt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < PATTERN_COOLDOWN_DAYS_AFTER_NO) return false;
  }
  
  if (stats.daysSinceFirstUse < PATTERN_MIN_DAYS_SINCE_FIRST_USE) return false;
  if (stats.activityCount < PATTERN_MIN_ACTIVITY_COUNT) return false;
  if (stats.totalMessages < PATTERN_MIN_MESSAGES_FOR_TRUST) return false;
  
  return true;
}

/**
 * Check if user is revoking consent (keyword-based for safety)
 * Uses regex patterns to handle word variations and filler words
 */
function isRevokingPatternConsent(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  
  const revokePatterns = [
    /stop\s+(?:\w+\s+)?reflect(?:ing)?\s+(?:my\s+)?patterns/,
    /stop\s+(?:\w+\s+)?analyz(?:ing|e)\s+(?:my\s+)?patterns/,
    /stop\s+(?:\w+\s+)?notic(?:ing|e)\s+(?:my\s+)?patterns/,
    /stop\s+(?:\w+\s+)?track(?:ing)?\s+(?:my\s+)?patterns/,
    /stop\s+pattern\s+reflections?/,
    /no\s+more\s+patterns?/,
    /don'?t\s+(?:\w+\s+)?reflect\s+(?:my\s+)?patterns/,
    /don'?t\s+(?:\w+\s+)?analyz(?:e|ing)\s+(?:my\s+)?patterns/,
    /don'?t\s+(?:\w+\s+)?notice\s+(?:my\s+)?patterns/,
    /disable\s+pattern/,
    /turn\s+off\s+pattern/,
  ];
  
  return revokePatterns.some(pattern => pattern.test(lower));
}

/**
 * Classify user response to consent question (keyword-based for safety)
 */
function classifyConsentResponse(text) {
  if (!text) return 'unclear';
  const lower = text.toLowerCase().trim();
  
  const yesPatterns = [
    'yes', 'yeah', 'yep', 'sure', 'okay', 'ok', 'yes please', 
    'i\'d like that', 'sounds good', 'that would be nice', 'go ahead',
    'i\'m okay with that', 'that\'s fine', 'please do', 'i consent',
  ];
  
  const noPatterns = [
    'no', 'nope', 'no thanks', 'not really', 'i\'d rather not',
    'no thank you', 'prefer not', 'not now', 'maybe later', 'pass',
    'i don\'t want that', 'not interested', 'skip', 'i decline',
  ];
  
  for (const pattern of yesPatterns) {
    if (lower === pattern || lower.startsWith(pattern + ' ') || lower.startsWith(pattern + ',')) {
      return 'yes';
    }
  }
  
  for (const pattern of noPatterns) {
    if (lower === pattern || lower.startsWith(pattern + ' ') || lower.startsWith(pattern + ',')) {
      return 'no';
    }
  }
  
  if (lower.includes('yes') && !lower.includes('no')) return 'yes';
  if (lower.includes('no') && !lower.includes('yes')) return 'no';
  
  return 'unclear';
}

/**
 * Compute high-level pattern summary for the model
 * Only aggregated, soft observations - nothing creepy
 */
async function computePatternSummary(pool, userId) {
  if (!pool || !userId) return null;
  
  try {
    const heavyDaysResult = await pool.query(`
      SELECT EXTRACT(DOW FROM created_at) as day_of_week, COUNT(*) as count
      FROM mood_checkins
      WHERE (user_id = $1 OR device_id = $1) 
        AND mood_rating < 3 
        AND created_at > NOW() - INTERVAL '60 days'
      GROUP BY day_of_week
      ORDER BY count DESC
      LIMIT 2
    `, [userId]);
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const commonHeavyDays = heavyDaysResult.rows
      .filter(r => parseInt(r.count) >= 2)
      .map(r => dayNames[parseInt(r.day_of_week)]);
    
    const timeResult = await pool.query(`
      SELECT EXTRACT(HOUR FROM completed_at) as hour, COUNT(*) as count
      FROM activity_logs
      WHERE (user_id = $1 OR device_id = $1) 
        AND completed_at > NOW() - INTERVAL '60 days'
      GROUP BY hour
      ORDER BY count DESC
      LIMIT 1
    `, [userId]);
    
    const topHour = parseInt(timeResult.rows[0]?.hour || 12);
    const preferredTime = topHour < 12 ? 'morning' : topHour < 18 ? 'afternoon' : 'evening';
    
    const activityResult = await pool.query(`
      SELECT activity_type, COUNT(*) as count
      FROM activity_logs
      WHERE (user_id = $1 OR device_id = $1) 
        AND completed_at > NOW() - INTERVAL '60 days'
      GROUP BY activity_type
      ORDER BY count DESC
      LIMIT 1
    `, [userId]);
    
    const mostUsedActivity = activityResult.rows[0]?.activity_type;
    
    const summary = {
      commonHeavyDays,
      preferredTime,
      mostUsedActivity,
    };
    
    const notes = [];
    if (commonHeavyDays.length > 0) {
      notes.push(`${commonHeavyDays.join(' and ')} often feel heavier`);
    }
    if (preferredTime && activityResult.rows.length > 0) {
      notes.push(`Usually engages during ${preferredTime}`);
    }
    if (mostUsedActivity) {
      notes.push(`${mostUsedActivity} is a frequent choice`);
    }
    
    summary.notes = notes;
    
    return summary;
  } catch (error) {
    console.error('[PATTERN CONSENT] Error computing summary:', error.message);
    return null;
  }
}

/**
 * Get safe pattern context for the model
 * GUARDRAIL: This function NEVER throws - always returns safe fallback
 */
async function getSafePatternContext(pool, userId, settings, stats, isCrisisMode, trigger = TRIGGERS.USER_MESSAGE) {
  const SAFE_FALLBACK = {
    consent: 'undecided',
    canOfferConsent: false,
    patternSummary: null,
  };
  
  try {
    if (!pool || !userId) {
      auditLog.logPatternFeaturesSkipped(userId, 'missing_pool_or_userId', trigger);
      return SAFE_FALLBACK;
    }
    
    if (isCrisisMode) {
      auditLog.logPatternReflectionBlocked(userId, 'crisis_mode', trigger);
      return {
        consent: settings?.pattern_reflection_consent || 'undecided',
        canOfferConsent: false,
        patternSummary: null,
      };
    }
    
    if (!settings) {
      try {
        settings = await getUserSettings(pool, userId);
      } catch (settingsErr) {
        auditLog.logPatternFallback(userId, settingsErr, 'getUserSettings');
        settings = { pattern_reflection_consent: 'undecided' };
      }
    }
    
    if (!stats) {
      try {
        stats = await getUserPatternStats(pool, userId);
      } catch (statsErr) {
        auditLog.logPatternFallback(userId, statsErr, 'getUserPatternStats');
        stats = { daysSinceFirstUse: 0, activityCount: 0, totalMessages: 0 };
      }
    }
    
    const consent = settings?.pattern_reflection_consent || 'undecided';
    
    let canOfferConsent = false;
    try {
      canOfferConsent = await shouldOfferPatternConsent(pool, userId, settings, stats, false);
      if (canOfferConsent) {
        auditLog.logConsentOffered(userId, stats, trigger);
      } else if (consent === 'undecided') {
        let skipReason = 'unknown';
        if (stats.daysSinceFirstUse < PATTERN_MIN_DAYS_SINCE_FIRST_USE) {
          skipReason = 'insufficient_days';
        } else if (stats.activityCount < PATTERN_MIN_ACTIVITY_COUNT) {
          skipReason = 'insufficient_activities';
        } else if (stats.totalMessages < PATTERN_MIN_MESSAGES_FOR_TRUST) {
          skipReason = 'insufficient_messages';
        }
        auditLog.logConsentCheckSkipped(userId, skipReason, trigger);
      }
    } catch (offerErr) {
      auditLog.logPatternFallback(userId, offerErr, 'shouldOfferPatternConsent');
      canOfferConsent = false;
    }
    
    let patternSummary = null;
    if (consent === 'yes' && 
        stats.daysSinceFirstUse >= PATTERN_MIN_DAYS_SINCE_FIRST_USE && 
        stats.activityCount >= PATTERN_MIN_ACTIVITY_COUNT) {
      try {
        patternSummary = await computePatternSummary(pool, userId);
        if (patternSummary && patternSummary.notes && patternSummary.notes.length > 0) {
          auditLog.logPatternReflectionIncluded(userId, patternSummary, trigger);
        } else {
          auditLog.logPatternFeaturesSkipped(userId, 'no_pattern_data', trigger);
        }
      } catch (summaryErr) {
        auditLog.logPatternFallback(userId, summaryErr, 'computePatternSummary');
        patternSummary = null;
      }
    } else if (consent === 'no') {
      auditLog.logPatternReflectionBlocked(userId, 'consent_denied', trigger);
    } else if (consent === 'undecided') {
      auditLog.logPatternFeaturesSkipped(userId, 'consent_undecided', trigger);
    }
    
    return {
      consent,
      canOfferConsent,
      patternSummary,
    };
  } catch (outerErr) {
    auditLog.logPatternFallback(userId, outerErr, 'getSafePatternContext_outer');
    return SAFE_FALLBACK;
  }
}

module.exports = {
  getUserPatternStats,
  getUserSettings,
  updatePatternConsent,
  shouldOfferPatternConsent,
  isRevokingPatternConsent,
  classifyConsentResponse,
  computePatternSummary,
  getSafePatternContext,
  PATTERN_MIN_DAYS_SINCE_FIRST_USE,
  PATTERN_MIN_ACTIVITY_COUNT,
  PATTERN_MIN_MESSAGES_FOR_TRUST,
  PATTERN_COOLDOWN_DAYS_AFTER_NO,
};
