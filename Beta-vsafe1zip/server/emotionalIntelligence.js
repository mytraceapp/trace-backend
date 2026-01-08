/**
 * Emotional Intelligence Module for TRACE
 * 
 * Features:
 * 1. Mood Trajectory - Detect if user is trending up/down/stable
 * 2. Absence Awareness - Gentle warmth when user returns after gaps
 * 3. Gentle Check-backs - Follow up on things user mentioned previously
 */

const auditLog = require('./patternAuditLog');

const TRAJECTORY_LOOKBACK_DAYS = 14;
const TRAJECTORY_MIN_CHECKINS = 3;
const ABSENCE_THRESHOLD_HOURS = 48;
const CHECKBACK_MAX_AGE_DAYS = 7;

/**
 * Calculate mood trajectory from recent check-ins
 * Returns: 'improving', 'declining', 'stable', or null if insufficient data
 */
async function getMoodTrajectory(pool, effectiveUserId) {
  try {
    const cutoff = new Date(Date.now() - TRAJECTORY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    
    const result = await pool.query(`
      SELECT mood_rating, created_at
      FROM mood_checkins
      WHERE (user_id = $1 OR device_id = $1)
        AND created_at >= $2
      ORDER BY created_at ASC
    `, [effectiveUserId, cutoff]);
    
    if (result.rows.length < TRAJECTORY_MIN_CHECKINS) {
      return null;
    }
    
    const ratings = result.rows.map(r => ({
      rating: r.mood_rating,
      time: new Date(r.created_at).getTime()
    }));
    
    const firstHalf = ratings.slice(0, Math.floor(ratings.length / 2));
    const secondHalf = ratings.slice(Math.floor(ratings.length / 2));
    
    const avgFirst = firstHalf.reduce((sum, r) => sum + r.rating, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, r) => sum + r.rating, 0) / secondHalf.length;
    
    const diff = avgSecond - avgFirst;
    
    if (diff >= 0.5) return 'improving';
    if (diff <= -0.5) return 'declining';
    return 'stable';
    
  } catch (error) {
    console.error('[MOOD TRAJECTORY] Error:', error.message);
    return null;
  }
}

/**
 * Get absence awareness context using local pool
 * Uses mood_checkins and activity_logs to determine last interaction
 */
async function getAbsenceContext(pool, queryId) {
  try {
    if (!pool || !queryId) return null;
    
    // Query both mood_checkins and activity_logs to find last interaction
    const result = await pool.query(`
      SELECT last_time FROM (
        SELECT created_at AS last_time FROM mood_checkins WHERE user_id = $1 OR device_id = $1
        UNION ALL
        SELECT completed_at AS last_time FROM activity_logs WHERE user_id = $1 OR device_id = $1
      ) combined
      ORDER BY last_time DESC
      LIMIT 1
    `, [queryId]);
    
    if (result.rows.length === 0) {
      return { isFirstInteraction: true, daysSinceLastInteraction: null };
    }
    
    const lastInteraction = new Date(result.rows[0].last_time);
    const hoursSince = (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60);
    const daysSince = Math.floor(hoursSince / 24);
    
    if (hoursSince < ABSENCE_THRESHOLD_HOURS) {
      return { isFirstInteraction: false, isReturning: false, daysSinceLastInteraction: 0 };
    }
    
    let absenceDescription;
    if (daysSince === 2) {
      absenceDescription = 'a couple of days';
    } else if (daysSince <= 4) {
      absenceDescription = 'a few days';
    } else if (daysSince <= 7) {
      absenceDescription = 'about a week';
    } else if (daysSince <= 14) {
      absenceDescription = 'a little while';
    } else {
      absenceDescription = 'some time';
    }
    
    return {
      isFirstInteraction: false,
      isReturning: true,
      daysSinceLastInteraction: daysSince,
      absenceDescription
    };
    
  } catch (error) {
    console.error('[ABSENCE CONTEXT] Error:', error.message);
    return null;
  }
}

/**
 * Get topics for gentle check-backs from long-term memory
 * Returns recent themes/goals/triggers user mentioned
 */
async function getCheckbackTopics(supabase, userId) {
  try {
    if (!supabase || !userId) return [];
    
    const cutoff = new Date(Date.now() - CHECKBACK_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
    
    const { data, error } = await supabase
      .from('long_term_memories')
      .select('kind, content, updated_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .in('kind', ['themes', 'goals', 'triggers'])
      .gte('updated_at', cutoff.toISOString())
      .order('updated_at', { ascending: false })
      .limit(3);
    
    if (error) {
      console.error('[CHECKBACK TOPICS] Supabase error:', error.message);
      return [];
    }
    
    if (!data || data.length === 0) return [];
    
    return data.map(r => ({
      type: r.kind,
      content: r.content,
      daysAgo: Math.floor((Date.now() - new Date(r.updated_at).getTime()) / (1000 * 60 * 60 * 24))
    }));
    
  } catch (error) {
    console.error('[CHECKBACK TOPICS] Error:', error.message);
    return [];
  }
}

/**
 * Build emotional intelligence context for system prompt
 * GUARDRAIL: This function NEVER throws - always returns null on error (graceful degradation)
 */
async function buildEmotionalIntelligenceContext({ pool, supabase, userId, deviceId, effectiveUserId, isCrisisMode }) {
  const queryUserId = userId || effectiveUserId;
  
  if (isCrisisMode) {
    auditLog.logEmotionalIntelligenceBlocked(queryUserId, 'crisis_mode');
    return null;
  }
  
  try {
    // Use userId for Supabase queries, deviceId for pool queries
    const supabaseQueryId = userId || effectiveUserId;
    const poolQueryId = deviceId || userId || effectiveUserId;
    
    // Each sub-function has its own try-catch, but we also wrap them individually
    // to ensure one failure doesn't break the others
    let trajectory = null;
    let absence = null;
    let checkbacks = [];
    
    try {
      trajectory = await getMoodTrajectory(pool, poolQueryId);
    } catch (trajErr) {
      auditLog.logEmotionalIntelligenceFallback(queryUserId, trajErr, 'getMoodTrajectory');
    }
    
    try {
      absence = await getAbsenceContext(pool, poolQueryId);
    } catch (absErr) {
      auditLog.logEmotionalIntelligenceFallback(queryUserId, absErr, 'getAbsenceContext');
    }
    
    try {
      checkbacks = await getCheckbackTopics(supabase, supabaseQueryId);
    } catch (cbErr) {
      auditLog.logEmotionalIntelligenceFallback(queryUserId, cbErr, 'getCheckbackTopics');
      checkbacks = [];
    }
    
    auditLog.logEmotionalIntelligenceUsed(queryUserId, {
      trajectory,
      isReturning: absence?.isReturning || false,
      checkbackCount: checkbacks.length
    });
    
    const parts = [];
    
    if (trajectory) {
      let trajectoryGuidance = '';
      if (trajectory === 'improving') {
        trajectoryGuidance = 'User\'s mood has been trending upward. You may gently acknowledge this without making it performative: "Things seem to be feeling a bit lighter lately" (only if natural and consent allows).';
      } else if (trajectory === 'declining') {
        trajectoryGuidance = 'User\'s mood has been trending downward. Approach with extra gentleness. Do NOT point this out directly—just be more present and warm.';
      } else {
        trajectoryGuidance = 'User\'s mood has been relatively steady. No special handling needed.';
      }
      
      parts.push(`MOOD TRAJECTORY:
- Recent trend: ${trajectory}
- ${trajectoryGuidance}`);
    }
    
    if (absence?.isReturning) {
      parts.push(`RETURN WARMTH:
- User is returning after ${absence.absenceDescription}
- Welcome them back gently: "It's good to see you" or "I'm glad you're here"
- NEVER say "I missed you" or "Where have you been?" or make them feel guilty
- Don't make a big deal of it—just a brief warm acknowledgment, then follow their lead`);
    } else if (absence?.isFirstInteraction) {
      parts.push(`FIRST INTERACTION:
- This appears to be the user's first message
- Be warm and welcoming without being overwhelming
- Let them set the tone`);
    }
    
    if (checkbacks.length > 0) {
      const topicDescriptions = checkbacks.map(t => {
        const timeDesc = t.daysAgo === 0 ? 'today' : t.daysAgo === 1 ? 'yesterday' : `${t.daysAgo} days ago`;
        return `"${t.content}" (${t.type}, mentioned ${timeDesc})`;
      }).join('; ');
      
      parts.push(`GENTLE CHECK-BACKS (optional):
- Recent topics from memory: ${topicDescriptions}
- If natural and the moment feels right, you may gently reference: "I remember you mentioned [topic]—how's that been going?"
- NEVER force a check-back if user seems to want to talk about something else
- Maximum one check-back per conversation
- Skip entirely if user is distressed or focused on something new`);
    }
    
    if (parts.length === 0) {
      return null;
    }
    
    return `EMOTIONAL INTELLIGENCE CONTEXT:

${parts.join('\n\n')}

GUIDELINES:
- These are subtle cues to help you be more attuned, not scripts to follow
- User's current message always takes priority
- Never make the user feel observed or analyzed
- If in doubt, just be present without using any of this context`;
    
  } catch (error) {
    auditLog.logEmotionalIntelligenceFallback(queryUserId, error, 'buildEmotionalIntelligenceContext_outer');
    return null;
  }
}

module.exports = {
  getMoodTrajectory,
  getAbsenceContext,
  getCheckbackTopics,
  buildEmotionalIntelligenceContext,
  TRAJECTORY_LOOKBACK_DAYS,
  ABSENCE_THRESHOLD_HOURS
};
