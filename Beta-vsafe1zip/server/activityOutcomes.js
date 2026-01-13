/**
 * Activity Outcomes Learning
 * Correlates activity completions with mood changes to identify helpful patterns.
 * E.g., "you tend to feel better after walking"
 */

const MINIMUM_COMPLETIONS = 3;
const MOOD_WINDOW_MINUTES = 30;

const ACTIVITY_LABELS = {
  rising: 'Rising',
  breathing: 'Breathing',
  maze: 'Trace the Maze',
  drift: 'Drift',
  ripple: 'Ripple',
  grounding: 'Grounding',
  rest: 'Rest',
  walking: 'Walking Reset',
  window: 'Rain Window',
  echo: 'Echo',
  basin: 'Basin',
  dreamscape: 'Dreamscape',
};

/**
 * Analyze activity outcomes by correlating mood before/after activities.
 * Returns activities that consistently improve mood.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {string} deviceId
 * @returns {Promise<Array<{activity: string, label: string, avgImprovement: number, completions: number}>>}
 */
async function getActivityOutcomes(supabase, userId, deviceId) {
  if (!supabase) return [];

  const effectiveId = userId || deviceId;
  if (!effectiveId) return [];

  const idColumn = userId ? 'user_id' : 'device_id';

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: activities, error: actError } = await supabase
      .from('activity_logs')
      .select('id, activity_type, completed_at')
      .eq(idColumn, effectiveId)
      .gte('completed_at', thirtyDaysAgo)
      .order('completed_at', { ascending: true });

    if (actError || !activities?.length) {
      console.log('[ACTIVITY OUTCOMES] No activity data found');
      return [];
    }

    const { data: moods, error: moodError } = await supabase
      .from('mood_checkins')
      .select('mood_rating, created_at, activity_id')
      .eq(idColumn, effectiveId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: true });

    if (moodError || !moods?.length) {
      console.log('[ACTIVITY OUTCOMES] No mood data found');
      return [];
    }

    const outcomes = {};

    for (const activity of activities) {
      const activityTime = new Date(activity.completed_at).getTime();
      const windowMs = MOOD_WINDOW_MINUTES * 60 * 1000;

      // Find the CLOSEST mood before activity (last one in the window, since sorted ascending)
      let moodBefore = null;
      for (const m of moods) {
        const moodTime = new Date(m.created_at).getTime();
        if (moodTime >= activityTime - windowMs && moodTime < activityTime) {
          moodBefore = m; // Keep updating to get the latest one before activity
        }
        if (moodTime >= activityTime) break;
      }

      // Find the EARLIEST mood after activity (first one in the window)
      const moodAfter = moods.find(m => {
        const moodTime = new Date(m.created_at).getTime();
        return moodTime > activityTime && moodTime <= activityTime + windowMs;
      });

      if (moodAfter?.mood_rating != null) {
        const actType = activity.activity_type;
        if (!outcomes[actType]) {
          outcomes[actType] = { improvements: [], completions: 0 };
        }

        outcomes[actType].completions++;

        if (moodBefore?.mood_rating != null) {
          const improvement = moodAfter.mood_rating - moodBefore.mood_rating;
          outcomes[actType].improvements.push(improvement);
        } else {
          if (moodAfter.mood_rating >= 4) {
            outcomes[actType].improvements.push(1);
          }
        }
      }
    }

    const results = [];

    for (const [activity, data] of Object.entries(outcomes)) {
      if (data.completions < MINIMUM_COMPLETIONS) continue;
      if (data.improvements.length === 0) continue;

      const avgImprovement = data.improvements.reduce((a, b) => a + b, 0) / data.improvements.length;

      if (avgImprovement > 0.3) {
        results.push({
          activity,
          label: ACTIVITY_LABELS[activity] || activity,
          avgImprovement: Math.round(avgImprovement * 10) / 10,
          completions: data.completions,
        });
      }
    }

    results.sort((a, b) => b.avgImprovement - a.avgImprovement);

    console.log('[ACTIVITY OUTCOMES] Found helpful patterns:', results.length);

    return results.slice(0, 3);
  } catch (err) {
    console.error('[ACTIVITY OUTCOMES] Error analyzing outcomes:', err.message);
    return [];
  }
}

/**
 * Format activity outcomes for chat context.
 * Uses hedging language - "I've noticed", "seems to help", etc.
 * @param {Array} outcomes
 * @returns {string}
 */
function formatActivityOutcomesForContext(outcomes) {
  if (!outcomes?.length) return '';

  const lines = [];
  lines.push('\nACTIVITY OUTCOMES (use gently with hedging language):');
  lines.push('These activities seem to consistently help this user feel better:');

  for (const o of outcomes) {
    const strength = o.avgImprovement >= 1 ? 'noticeably' : 'somewhat';
    lines.push(`- ${o.label}: ${strength} improves mood (${o.completions} times)`);
  }

  lines.push('');
  lines.push('Use phrases like:');
  lines.push('- "I\'ve noticed [activity] tends to help you feel a bit lighter..."');
  lines.push('- "Something about [activity] seems to work for you..."');
  lines.push('- "You often seem a little better after [activity]..."');
  lines.push('Never quote statistics or sound analytical. Speak warmly and tentatively.');

  return lines.join('\n');
}

module.exports = {
  getActivityOutcomes,
  formatActivityOutcomesForContext,
  MINIMUM_COMPLETIONS,
};
