/**
 * Activity Frequency Analysis
 * Tracks which activities users return to most often as a preference signal
 */
const { subDays } = require('date-fns');

/**
 * Activity key to human-readable name mapping
 */
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
};

/**
 * Map activities to categories for smart suggestions
 */
const ACTIVITY_CATEGORIES = {
  breathing: 'breath',
  rising: 'reflection',
  ripple: 'reflection',
  window: 'reflection',
  echo: 'reflection',
  maze: 'focus',
  drift: 'focus',
  grounding: 'body',
  rest: 'body',
  walking: 'body',
};

/**
 * Get user's most frequent activity from last 2 weeks
 * Returns null if no strong preference, or { activity, count, label }
 */
async function getActivityFrequency(supabase, userId, deviceId) {
  const since = subDays(new Date(), 14).toISOString();
  const effectiveId = userId || deviceId;
  if (!effectiveId) return null;
  
  const idColumn = userId ? 'user_id' : 'device_id';
  
  const { data, error } = await supabase
    .from('activity_logs')
    .select('activity_type, completed_at')
    .eq(idColumn, effectiveId)
    .gte('completed_at', since);
  
  if (error || !data?.length) return null;
  
  // Count frequency of each activity
  const counts = {};
  data.forEach(log => {
    const key = log.activity_type;
    if (key) {
      counts[key] = (counts[key] || 0) + 1;
    }
  });
  
  // Find most repeated activity (minimum 3 completions)
  const sorted = Object.entries(counts)
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);
  
  if (!sorted.length) return null;
  
  const [activity, count] = sorted[0];
  const label = ACTIVITY_LABELS[activity] || activity;
  
  return { activity, count, label };
}

/**
 * Analyze when user completes activities most often
 * Returns best time category for each activity type
 */
async function getActivityTimePatterns(supabase, userId, deviceId) {
  const since = subDays(new Date(), 14).toISOString();
  const effectiveId = userId || deviceId;
  if (!effectiveId) return null;
  
  const idColumn = userId ? 'user_id' : 'device_id';
  
  const { data } = await supabase
    .from('activity_logs')
    .select('activity_type, completed_at')
    .eq(idColumn, effectiveId)
    .gte('completed_at', since);
  
  if (!data?.length) return null;
  
  // Group by activity and time of day
  const patterns = {};
  data.forEach(log => {
    const hour = new Date(log.completed_at).getHours();
    const timeSlot = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const key = log.activity_type;
    
    if (!patterns[key]) patterns[key] = { morning: 0, afternoon: 0, evening: 0 };
    patterns[key][timeSlot]++;
  });
  
  return patterns;
}

/**
 * Get personalized activity suggestion context for system prompt
 * Only includes if user is seeking help/suggestions
 */
async function getSuggestionContext(supabase, userId, deviceId, userMessage) {
  console.log('[SUGGESTION ENGINE] Checking for patterns...', { userId: userId || deviceId });
  
  // Only suggest if user is asking for help
  const msg = (userMessage || '').toLowerCase();
  const isSeekingHelp =
    msg.includes('help') ||
    msg.includes('stuck') ||
    msg.includes('what should i do') ||
    msg.includes('suggest') ||
    msg.includes('anything that might help') ||
    msg.includes('what can i do') ||
    msg.includes('not sure what to do') ||
    msg.includes('what would you recommend');
  
  if (!isSeekingHelp) {
    console.log('[SUGGESTION ENGINE] User not seeking help, skipping');
    return null;
  }
  
  const freq = await getActivityFrequency(supabase, userId, deviceId);
  if (!freq) {
    console.log('[SUGGESTION ENGINE] No strong patterns yet');
    return null;
  }
  
  console.log('[SUGGESTION ENGINE] Pattern found:', freq);
  
  // Add time-of-day pattern analysis
  const timePatterns = await getActivityTimePatterns(supabase, userId, deviceId);
  const currentHour = new Date().getHours();
  const currentSlot = currentHour < 12 ? 'morning' : currentHour < 18 ? 'afternoon' : 'evening';
  
  let timeContext = '';
  if (timePatterns?.[freq.activity]) {
    const pattern = timePatterns[freq.activity];
    const maxSlot = Object.entries(pattern).sort((a, b) => b[1] - a[1])[0][0];
    
    if (maxSlot === currentSlot) {
      timeContext = `\nThis is typically when they do ${freq.label} (${currentSlot}).`;
    }
  }
  
  // Add category-aware hints
  const category = ACTIVITY_CATEGORIES[freq.activity];
  let categoryHint = '';
  if (category === 'reflection' && (currentHour >= 18 || currentHour < 6)) {
    categoryHint = '\nReflection practices tend to work well in evening/quiet hours.';
  } else if (category === 'focus' && currentHour >= 8 && currentHour < 17) {
    categoryHint = '\nFocus practices align well with active hours.';
  } else if (category === 'body' && (currentHour >= 6 && currentHour < 10)) {
    categoryHint = '\nBody practices can be grounding in morning hours.';
  }
  
  return `
PERSONALIZED PATTERN (use gently, do not sound like you're tracking them):
"${freq.label}" seems to resonate with this user — they've returned to it ${freq.count} times recently.${timeContext}${categoryHint}
You may gently suggest it as one option, using soft language like "you might try" or "it's seemed to help before."
Never say exact numbers or sound analytical. Speak warmly, like "I've noticed [activity] seems to help you."
  `.trim();
}

module.exports = {
  getActivityFrequency,
  getActivityTimePatterns,
  getSuggestionContext,
  ACTIVITY_LABELS,
  ACTIVITY_CATEGORIES,
};
