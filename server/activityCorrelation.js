/**
 * Activity Intelligence Engine
 * - Tracks user preferences via frequency
 * - Time-of-day category awareness
 * - Privacy-preserving suggestions
 */
const { subDays } = require('date-fns');

/**
 * Activity metadata
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
  basin: 'Basin',
  dreamscape: 'Dreamscape',
};

const ACTIVITY_CATEGORIES = {
  breathing: 'breath',
  rising: 'reflection',
  ripple: 'reflection',
  window: 'reflection',
  echo: 'reflection',
  basin: 'reflection',
  dreamscape: 'reflection',
  maze: 'focus',
  drift: 'focus',
  grounding: 'body',
  rest: 'body',
  walking: 'body',
};

/**
 * Get user's most frequent activity from last 2 weeks
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
 * TIME-OF-DAY INTELLIGENCE
 * Build time profiles from activity history
 */
function buildTimeProfiles(logs) {
  const buckets = {};

  for (const log of logs) {
    const category = ACTIVITY_CATEGORIES[log.activity_type];
    if (!category) continue;
    
    const d = new Date(log.completed_at);
    const hour = d.getHours(); // 0–23
    const key = `${category}:${hour}`;
    buckets[key] = (buckets[key] || 0) + 1;
  }

  return Object.entries(buckets).map(([key, count]) => {
    const [category, hourStr] = key.split(':');
    return { category, hour: Number(hourStr), count };
  });
}

/**
 * Score a category's relevance for current hour
 */
function scoreCategoryForNow(profiles, category, now) {
  const hourNow = now.getHours();

  const relevant = profiles.filter(p => p.category === category);
  if (!relevant.length) return 0;

  // Weighted by how close each hour is to now
  let score = 0;
  for (const p of relevant) {
    const diff = Math.min(
      Math.abs(p.hour - hourNow),
      24 - Math.abs(p.hour - hourNow)
    ); // wrap-around for midnight
    const weight = Math.max(0, 1 - diff / 6); // within ~6h has some weight
    score += p.count * weight;
  }
  return score;
}

/**
 * Rank all categories by relevance to current time
 */
function rankCategoriesForNow(profiles, now = new Date()) {
  const categories = Array.from(
    new Set(profiles.map(p => p.category))
  );

  return categories
    .map(cat => ({
      category: cat,
      score: scoreCategoryForNow(profiles, cat, now),
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Get personalized suggestion context for system prompt
 * Only triggers when user asks for help
 */
async function getSuggestionContext(supabase, userId, deviceId, userMessage) {
  console.log('[SUGGESTION ENGINE] Checking for patterns...', { 
    userId: userId || 'none', 
    deviceId: deviceId || 'none' 
  });
  
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
    console.log('[SUGGESTION ENGINE] No strong patterns found (need 3+ completions)');
    return null;
  }
  
  console.log('[SUGGESTION ENGINE] Pattern found:', {
    activity: freq.activity,
    count: freq.count,
    label: freq.label
  });
  
  return `
PERSONALIZED PATTERN (use gently, do not sound like you're tracking them):
"${freq.label}" seems to resonate with this user — they've returned to it ${freq.count} times recently.
You may gently suggest it as one option, using soft language like "you might try" or "it's seemed to help before."
Never say exact numbers or sound analytical. Speak warmly, like "I've noticed [activity] seems to help you."
  `.trim();
}

/**
 * Get time-awareness context for system prompt
 */
async function getTimeAwarenessContext(supabase, userId, deviceId) {
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
  
  const profiles = buildTimeProfiles(data);
  const rankings = rankCategoriesForNow(profiles);
  
  if (!rankings.length) return null;
  
  const now = new Date();
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const topCategory = rankings[0].category;
  
  console.log('[TIME AWARENESS] Top category for now:', { 
    timeOfDay, 
    topCategory, 
    score: rankings[0].score 
  });
  
  return `
TIME-OF-DAY INTUITION:
It's ${timeOfDay} right now. Based on general patterns, ${topCategory}-focused practices tend to work well at this time.
Use this intuition when suggesting options, but keep it subtle and natural.
Examples:
- "Since it's later in the day, something softer might land better..."
- "A bit of movement could help shift things right now..."
Never mention data, timestamps, or tracking.
  `.trim();
}

module.exports = {
  getActivityFrequency,
  getSuggestionContext,
  getTimeAwarenessContext,
  buildTimeProfiles,
  rankCategoriesForNow,
  ACTIVITY_LABELS,
  ACTIVITY_CATEGORIES,
};
