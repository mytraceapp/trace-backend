/**
 * TRACE Rhythmic Awareness
 * 
 * Generates contextual, time-aware lines that help TRACE feel present
 * in the user's actual moment (weekend evening, late night, new month, etc.)
 */

async function recentlyUsedTouchpoint(supabase, userId, kind, withinHours = 24) {
  if (!supabase || !userId) return true;
  
  const since = new Date(Date.now() - withinHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('user_touchpoints')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('kind', kind)
    .gte('created_at', since)
    .limit(1);

  if (error) {
    console.error('[recentlyUsedTouchpoint error]', error.message);
    return true;
  }

  return (data || []).length > 0;
}

async function recordTouchpoint(supabase, userId, kind) {
  if (!supabase || !userId) return;
  
  const { error } = await supabase
    .from('user_touchpoints')
    .insert([{ user_id: userId, kind }]);

  if (error) {
    console.error('[recordTouchpoint error]', error.message);
  }
}

/**
 * Parse user's local time info from the /api/chat payload
 * Returns a pseudo-Date-like object with hour, day, date, month
 */
function parseUserLocalTime({ localTime, localDay, localDate }) {
  let hour = new Date().getHours();
  let dayOfWeek = new Date().getDay();
  let dateOfMonth = new Date().getDate();
  let month = new Date().getMonth();

  if (localTime) {
    const match = localTime.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      hour = parseInt(match[1], 10);
    }
    if (localTime.toLowerCase().includes('pm') && hour < 12) {
      hour += 12;
    } else if (localTime.toLowerCase().includes('am') && hour === 12) {
      hour = 0;
    }
  }

  if (localDay) {
    const dayMap = { 'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6 };
    const dayLower = localDay.toLowerCase().slice(0, 3);
    if (dayMap[dayLower] !== undefined) {
      dayOfWeek = dayMap[dayLower];
    }
  }

  if (localDate) {
    const dateMatch = localDate.match(/(\d{1,2})/);
    if (dateMatch) {
      dateOfMonth = parseInt(dateMatch[1], 10);
    }
    const monthMatch = localDate.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i);
    if (monthMatch) {
      const monthMap = { 'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5, 
                         'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11 };
      month = monthMap[monthMatch[1].toLowerCase()];
    }
  }

  return { hour, dayOfWeek, dateOfMonth, month };
}

/**
 * Returns a short contextual line based on time/date awareness.
 * Example: "It's a slow Sunday night. How are you arriving?"
 * Returns null if no special moment detected.
 * 
 * @param {Object} supabase - Supabase client
 * @param {string} userId - User ID
 * @param {Object} userTimeInfo - { localTime, localDay, localDate } from client
 */
async function buildRhythmicLine(supabase, userId, userTimeInfo = {}) {
  if (!supabase || !userId) return null;
  
  const { hour, dayOfWeek: day, dateOfMonth: date, month } = parseUserLocalTime(userTimeInfo);

  try {
    if (date === 1 && !(await recentlyUsedTouchpoint(supabase, userId, 'new_month', 72))) {
      await recordTouchpoint(supabase, userId, 'new_month');
      return "It's the first day of a new month. How are you arriving into it?";
    }

    const isWeekend = day === 0 || day === 6;
    if (
      isWeekend &&
      hour >= 18 &&
      !(await recentlyUsedTouchpoint(supabase, userId, 'weekend_evening', 48))
    ) {
      await recordTouchpoint(supabase, userId, 'weekend_evening');
      return "It's a slow weekend evening. How are you landing in it tonight?";
    }

    if (
      hour >= 23 &&
      !(await recentlyUsedTouchpoint(supabase, userId, 'late_night', 24))
    ) {
      await recordTouchpoint(supabase, userId, 'late_night');
      return "It's really late. These hours can feel heavier. How are you arriving right now?";
    }

    if (
      (month === 11 || month <= 1) &&
      !(await recentlyUsedTouchpoint(supabase, userId, 'winter_checkin', 72))
    ) {
      await recordTouchpoint(supabase, userId, 'winter_checkin');
      return "This time of year can stir up a lot—holidays, endings, new beginnings. How are you feeling in all of it?";
    }

    if (
      hour >= 5 && hour < 7 &&
      !(await recentlyUsedTouchpoint(supabase, userId, 'early_morning', 48))
    ) {
      await recordTouchpoint(supabase, userId, 'early_morning');
      return "You're up early. The world's still quiet. How does this morning find you?";
    }

    const isSunday = day === 0;
    if (
      isSunday &&
      hour >= 16 && hour < 20 &&
      !(await recentlyUsedTouchpoint(supabase, userId, 'sunday_evening', 48))
    ) {
      await recordTouchpoint(supabase, userId, 'sunday_evening');
      return "Sunday evening. That in-between time before a new week. How are you holding it?";
    }

    return null;
  } catch (err) {
    console.error('[buildRhythmicLine error]', err.message);
    return null;
  }
}

module.exports = {
  buildRhythmicLine,
  recentlyUsedTouchpoint,
  recordTouchpoint,
};
