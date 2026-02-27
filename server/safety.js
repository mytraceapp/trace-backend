/**
 * TRACE Safety Module
 * Handles crisis state persistence using Supabase
 * 
 * DATABASE SETUP (run this SQL in Supabase SQL Editor):
 * -------------------------------------------------------
 * create table if not exists public.user_safety_state (
 *   user_id uuid primary key references auth.users(id) on delete cascade,
 *   last_crisis_at timestamptz,
 *   last_crisis_source text,           -- e.g. 'chat', 'journal'
 *   last_crisis_tag text,              -- e.g. 'self-harm-language', 'overwhelmed', 'hopelessness'
 *   safe_messages_since integer default 0,
 *   updated_at timestamptz default now()
 * );
 * 
 * -- Enable RLS
 * alter table public.user_safety_state enable row level security;
 * 
 * -- Allow service role full access (for backend)
 * create policy "Service role full access" on public.user_safety_state
 *   for all using (auth.role() = 'service_role');
 * -------------------------------------------------------
 */

const CRISIS_WINDOW_MINUTES = 90;
const SAFE_MESSAGES_TO_EXIT = 4;
const MIN_MINUTES_TO_EXIT = 30;

/**
 * Mark a user as entering crisis mode
 * @param {object} supabase - Supabase client instance
 * @param {string} userId - User's UUID
 * @param {object} opts - Optional source and tag
 */
async function markUserInCrisis(supabase, userId, opts = {}) {
  if (!supabase || !userId) {
    console.warn('[SAFETY] Cannot mark crisis - missing supabase or userId');
    return false;
  }

  const source = opts.source || 'chat';
  const tag = opts.tag || 'distress';

  try {
    const { error } = await supabase
      .from('user_safety_state')
      .upsert({
        user_id: userId,
        last_crisis_at: new Date().toISOString(),
        last_crisis_source: source,
        last_crisis_tag: tag,
        safe_messages_since: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('[SAFETY] Failed to mark crisis:', error);
      return false;
    }

    console.log(`[SAFETY] User ${userId} marked in crisis (source: ${source}, tag: ${tag})`);
    return true;
  } catch (err) {
    console.error('[SAFETY] Exception marking crisis:', err);
    return false;
  }
}

/**
 * Check if user is within the crisis window
 * @param {object} supabase - Supabase client instance
 * @param {string} userId - User's UUID
 * @param {number} windowMinutes - Crisis window duration (default 90)
 * @returns {Promise<boolean>}
 */
async function isUserInCrisisWindow(supabase, userId, windowMinutes = CRISIS_WINDOW_MINUTES) {
  if (!supabase || !userId) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('user_safety_state')
      .select('last_crisis_at, safe_messages_since')
      .eq('user_id', userId)
      .single();

    if (error || !data || !data.last_crisis_at) {
      return false;
    }

    const lastCrisisAt = new Date(data.last_crisis_at);
    const now = new Date();
    const minutesSinceCrisis = (now - lastCrisisAt) / (1000 * 60);

    // Still in crisis window if:
    // - Less than windowMinutes have passed, OR
    // - Less than MIN_MINUTES_TO_EXIT and not enough safe messages
    if (minutesSinceCrisis <= windowMinutes) {
      // Check if they've exited via safe messages
      if (data.safe_messages_since >= SAFE_MESSAGES_TO_EXIT && minutesSinceCrisis >= MIN_MINUTES_TO_EXIT) {
        return false; // Exited via safe messages
      }
      return true;
    }

    return false;
  } catch (err) {
    console.error('[SAFETY] Exception checking crisis window:', err);
    return false;
  }
}

/**
 * Get full crisis state for a user
 * @param {object} supabase - Supabase client instance
 * @param {string} userId - User's UUID
 * @returns {Promise<object>}
 */
async function getUserCrisisState(supabase, userId) {
  const defaultState = {
    active: false,
    lastCrisisAt: null,
    lastCrisisTag: null,
    lastCrisisSource: null,
    safeMessagesSince: 0,
    pendingExitCheckIn: false,
  };

  if (!supabase || !userId) {
    return defaultState;
  }

  try {
    const { data, error } = await supabase
      .from('user_safety_state')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return defaultState;
    }

    const isInCrisis = await isUserInCrisisWindow(supabase, userId);
    
    // Check for pending exit check-in
    const lastCrisisAt = data.last_crisis_at ? new Date(data.last_crisis_at) : null;
    const minutesSinceCrisis = lastCrisisAt ? (new Date() - lastCrisisAt) / (1000 * 60) : 0;
    const pendingExitCheckIn = isInCrisis && 
      data.safe_messages_since >= 3 && 
      minutesSinceCrisis >= MIN_MINUTES_TO_EXIT;

    return {
      active: isInCrisis,
      lastCrisisAt: data.last_crisis_at,
      lastCrisisTag: data.last_crisis_tag,
      lastCrisisSource: data.last_crisis_source,
      safeMessagesSince: data.safe_messages_since || 0,
      pendingExitCheckIn,
    };
  } catch (err) {
    console.error('[SAFETY] Exception getting crisis state:', err);
    return defaultState;
  }
}

/**
 * Update crisis state after a message (increment safe messages or reset)
 * @param {object} supabase - Supabase client instance
 * @param {string} userId - User's UUID
 * @param {boolean} isCurrentlyDistressed - Whether the current message shows distress
 * @returns {Promise<object>} Updated crisis state
 */
async function updateCrisisStateInDb(supabase, userId, isCurrentlyDistressed) {
  if (!supabase || !userId) {
    return { active: false, safeMessagesSince: 0, pendingExitCheckIn: false };
  }

  try {
    if (isCurrentlyDistressed) {
      // Enter or stay in crisis mode
      await markUserInCrisis(supabase, userId, { source: 'chat', tag: 'high-distress' });
      console.log(`[SAFETY] User ${userId} - crisis mode ACTIVE (distress detected)`);
      return { active: true, safeMessagesSince: 0, pendingExitCheckIn: false };
    }

    // Get current state
    const { data, error } = await supabase
      .from('user_safety_state')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data || !data.last_crisis_at) {
      // No crisis state exists
      return { active: false, safeMessagesSince: 0, pendingExitCheckIn: false };
    }

    const lastCrisisAt = new Date(data.last_crisis_at);
    const minutesSinceCrisis = (new Date() - lastCrisisAt) / (1000 * 60);
    const isInWindow = minutesSinceCrisis <= CRISIS_WINDOW_MINUTES;

    if (!isInWindow) {
      // Already exited crisis window by time
      return { active: false, safeMessagesSince: 0, pendingExitCheckIn: false };
    }

    // In crisis window but current message is safe - increment counter
    const newSafeCount = (data.safe_messages_since || 0) + 1;
    
    console.log(`[SAFETY] User ${userId} - safe message #${newSafeCount}, ${Math.round(minutesSinceCrisis)}min since flag`);

    // Check for exit conditions
    const canExit = newSafeCount >= SAFE_MESSAGES_TO_EXIT && minutesSinceCrisis >= MIN_MINUTES_TO_EXIT;
    const pendingExitCheckIn = newSafeCount >= 3 && minutesSinceCrisis >= MIN_MINUTES_TO_EXIT && !canExit;

    if (canExit) {
      // Clear the crisis state by setting last_crisis_at to null
      await supabase
        .from('user_safety_state')
        .update({
          last_crisis_at: null,
          safe_messages_since: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
      
      console.log(`[SAFETY] User ${userId} - crisis mode EXITED (${newSafeCount} safe messages, ${Math.round(minutesSinceCrisis)} min)`);
      return { active: false, safeMessagesSince: 0, pendingExitCheckIn: false };
    }

    // Still in crisis, update safe message count
    await supabase
      .from('user_safety_state')
      .update({
        safe_messages_since: newSafeCount,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (pendingExitCheckIn) {
      console.log(`[SAFETY] User ${userId} - pending exit check-in (${newSafeCount} safe, ${Math.round(minutesSinceCrisis)} min)`);
    }

    return { active: true, safeMessagesSince: newSafeCount, pendingExitCheckIn };
  } catch (err) {
    console.error('[SAFETY] Exception updating crisis state:', err);
    return { active: false, safeMessagesSince: 0, pendingExitCheckIn: false };
  }
}

module.exports = {
  markUserInCrisis,
  isUserInCrisisWindow,
  getUserCrisisState,
  updateCrisisStateInDb,
  CRISIS_WINDOW_MINUTES,
  SAFE_MESSAGES_TO_EXIT,
  MIN_MINUTES_TO_EXIT,
};
