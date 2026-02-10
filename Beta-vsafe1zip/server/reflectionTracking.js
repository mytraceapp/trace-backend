/**
 * Post-Activity Reflection Tracking
 * Manages gentle check-ins after activity completion
 * Uses direct PostgreSQL connection (not Supabase) for new tables
 */

const REFLECTION_WINDOW_MINUTES = 30;

/**
 * Mark that user completed an activity and awaits reflection prompt
 */
async function markActivityCompletedForReflection(pool, userId, activityId, activityName) {
  if (!userId || !pool) return;
  
  const now = new Date().toISOString();
  
  try {
    await pool.query(
      `INSERT INTO activity_reflection_state (user_id, last_activity_id, last_activity_name, completed_at, awaiting_reflection, updated_at)
       VALUES ($1, $2, $3, $4, true, $5)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         last_activity_id = $2,
         last_activity_name = $3,
         completed_at = $4,
         awaiting_reflection = true,
         updated_at = $5`,
      [userId, activityId, activityName, now, now]
    );
    console.log('[REFLECTION] Marked activity for reflection:', { userId, activityName });
  } catch (error) {
    console.error('[REFLECTION] Failed to mark activity:', error.message);
  }
}

/**
 * Get reflection state and check if within time window
 */
async function getReflectionContext(pool, userId) {
  if (!userId || !pool) return null;
  
  try {
    const result = await pool.query(
      `SELECT * FROM activity_reflection_state 
       WHERE user_id = $1 AND awaiting_reflection = true`,
      [userId]
    );
    
    const data = result.rows?.[0];
    if (!data) return null;
    
    const completedAt = new Date(data.completed_at).getTime();
    const now = Date.now();
    const diffMinutes = (now - completedAt) / (1000 * 60);
    
    if (diffMinutes > REFLECTION_WINDOW_MINUTES) {
      console.log('[REFLECTION] Outside 30min window, skipping');
      await clearReflectionFlag(pool, userId);
      return null;
    }
    
    console.log('[REFLECTION] Active reflection window:', {
      activityName: data.last_activity_name,
      minutesAgo: Math.round(diffMinutes * 10) / 10
    });
    
    return {
      lastActivityName: data.last_activity_name ?? 'an activity',
      minutesSinceCompletion: diffMinutes,
    };
  } catch (error) {
    console.error('[REFLECTION] Error getting context:', error.message);
    return null;
  }
}

/**
 * Clear reflection flag after first check-in
 */
async function clearReflectionFlag(pool, userId) {
  if (!userId || !pool) return;
  
  try {
    await pool.query(
      `UPDATE activity_reflection_state SET awaiting_reflection = false WHERE user_id = $1`,
      [userId]
    );
    console.log('[REFLECTION] Cleared awaiting_reflection flag');
  } catch (error) {
    console.error('[REFLECTION] Failed to clear flag:', error.message);
  }
}

const REFLECTION_ANSWER_PATTERNS = [
  /\b(it helped|that helped|felt (good|better|calmer|lighter|nice)|i feel|much better|a bit better|a little better)\b/i,
  /\b(calmer|relaxed|relieved|peaceful|settled|grounded|clearer|rested)\b/i,
  /\b(still (anxious|stressed|tired|tense|worried|overwhelmed|sad|off))\b/i,
  /\b(not really|didn't help|didn't do (much|anything)|same|worse|meh|idk|whatever|nah)\b/i,
  /\b(yeah|yes|yep|totally|definitely|for sure)\b/i,
  /\b(no|nope|not really)\b/i,
];

const PIVOT_AWAY_PATTERNS = [
  /\b(play|put on|listen to|queue|start)\b/i,
  /\b(spotify|apple music|playlist|album|track|song|neon promise|undertow|euphoria|ocean breathing|tidal house|midnight underwater|night swim|slow tides|afterglow)\b/i,
  /\b(trace studios|your music|your album)\b/i,
  /\b(reel|concept|visual|video)\b/i,
];

function isReflectionAnswer(text) {
  if (!text || typeof text !== 'string') return false;
  const t = text.trim().toLowerCase();
  if (t.length > 120) return false;
  if (PIVOT_AWAY_PATTERNS.some(p => p.test(t))) return false;
  if (REFLECTION_ANSWER_PATTERNS.some(p => p.test(t))) return true;
  if (t.length < 30 && !/\b(play|track|album|song|music|spotify|reel)\b/i.test(t)) return true;
  return false;
}

module.exports = {
  markActivityCompletedForReflection,
  getReflectionContext,
  clearReflectionFlag,
  isReflectionAnswer,
  REFLECTION_WINDOW_MINUTES,
};
