import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: Log whether env vars are present
console.log('Supabase config:', { 
  hasUrl: !!supabaseUrl, 
  hasKey: !!supabaseAnonKey,
  url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING'
});

let supabase: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables - auth will not work');
  // Create a dummy client that will fail gracefully
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };

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
