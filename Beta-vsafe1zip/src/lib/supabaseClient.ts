import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Generate or retrieve unique trace_user_id
const TRACE_USER_ID_KEY = 'trace_user_id';

export function getTraceUserId(): string {
  let userId = localStorage.getItem(TRACE_USER_ID_KEY);
  if (!userId) {
    // Generate a unique ID using crypto
    userId = crypto.randomUUID();
    localStorage.setItem(TRACE_USER_ID_KEY, userId);
  }
  return userId;
}
