import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  },
};

let supabase: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables - auth will not work');
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export { supabase };

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getTraceUserId(): Promise<string> {
  const TRACE_USER_ID_KEY = 'trace_user_id';
  let userId = await SecureStore.getItemAsync(TRACE_USER_ID_KEY);
  if (!userId) {
    userId = generateUUID();
    await SecureStore.setItemAsync(TRACE_USER_ID_KEY, userId);
  }
  return userId;
}

export async function ensureAuthSession(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.id) {
      console.log('[AUTH] Existing session found:', session.user.id.slice(0, 8));
      return session.user.id;
    }
    
    console.log('[AUTH] No session, creating anonymous user...');
    const { data, error } = await supabase.auth.signInAnonymously();
    
    if (error) {
      console.error('[AUTH] Anonymous sign-in error:', error.message);
      return null;
    }
    
    console.log('[AUTH] Anonymous user created:', data.user?.id?.slice(0, 8));
    return data.user?.id ?? null;
  } catch (err: any) {
    console.error('[AUTH] Session error:', err.message);
    return null;
  }
}

export async function upsertUserProfile(userId: string, displayName?: string): Promise<boolean> {
  try {
    // First check if profile exists
    const { data: existing, error: selectError } = await supabase
      .from('profiles')
      .select('user_id, onboarding_completed')
      .eq('user_id', userId)
      .single();
    
    // PGRST116 is "row not found" - expected for new users
    const isNotFound = selectError?.code === 'PGRST116';
    
    if (existing) {
      // Profile exists - only update display_name if provided, don't reset flags
      if (displayName) {
        const { error } = await supabase
          .from('profiles')
          .update({ display_name: displayName, updated_at: new Date().toISOString() })
          .eq('user_id', userId);
        if (error) console.error('[PROFILE] Update error:', error.message);
      }
      console.log('[PROFILE] Existing profile found for:', userId.slice(0, 8));
      return true;
    }
    
    // Row not found - create new profile
    if (isNotFound) {
      const { error } = await supabase
        .from('profiles')
        .insert({
          user_id: userId,
          display_name: displayName || null,
          onboarding_completed: false,
          onboarding_step: 'intro_sent',
          first_chat_completed: false,
          first_run_completed: false,
          updated_at: new Date().toISOString(),
        });
      
      if (error) {
        console.error('[PROFILE] Insert error:', error.message);
        return false;
      }
      
      console.log('[PROFILE] New profile created for:', userId.slice(0, 8));
      return true;
    }
    
    // Some other error occurred
    console.error('[PROFILE] Select error:', selectError?.message);
    return false;
  } catch (err: any) {
    console.error('[PROFILE] Error:', err.message);
    return false;
  }
}

export async function updateDisplayName(userId: string, displayName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    
    if (error) {
      console.error('[PROFILE] Update display_name error:', error.message);
      return false;
    }
    
    console.log('[PROFILE] Updated display_name for:', userId.slice(0, 8));
    return true;
  } catch (err: any) {
    console.error('[PROFILE] Error:', err.message);
    return false;
  }
}

export async function getDisplayName(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') {
        console.error('[PROFILE] Get display_name error:', error.message);
      }
      return null;
    }
    
    return data?.display_name?.trim() || null;
  } catch (err: any) {
    console.error('[PROFILE] Error:', err.message);
    return null;
  }
}
