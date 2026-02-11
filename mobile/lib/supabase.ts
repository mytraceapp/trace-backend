import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Use AsyncStorage for Supabase session persistence (sessions can be large, 2KB+ with tokens/user data)
// SecureStore has a 2048 byte limit on iOS and is intended for small secrets only
const AsyncStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return await AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await AsyncStorage.removeItem(key);
  },
};

let supabase: SupabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables - auth will not work');
  supabase = createClient('https://placeholder.supabase.co', 'placeholder-key');
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorageAdapter,
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

// SecureStore is only used for small secrets (user ID is 36 bytes, well under 2KB limit)
// This keeps the anonymous user ID secure and persistent across app reinstalls on iOS
export async function getTraceUserId(): Promise<string> {
  const TRACE_USER_ID_KEY = 'trace_user_id';
  let userId = await SecureStore.getItemAsync(TRACE_USER_ID_KEY);
  if (!userId) {
    userId = generateUUID();
    await SecureStore.setItemAsync(TRACE_USER_ID_KEY, userId);
  }
  return userId;
}

const PERSISTED_AUTH_ID_KEY = 'trace_supabase_auth_id';

export async function getPersistedAuthId(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(PERSISTED_AUTH_ID_KEY);
  } catch {
    return null;
  }
}

async function persistAuthId(userId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(PERSISTED_AUTH_ID_KEY, userId);
  } catch (e) {
    console.warn('[AUTH] Failed to persist auth ID:', e);
  }
}

export async function ensureAuthSession(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user?.id) {
      console.log('[AUTH] Existing session found:', session.user.id.slice(0, 8));
      await persistAuthId(session.user.id);
      return session.user.id;
    }
    
    const previousUserId = await getPersistedAuthId();
    
    console.log('[AUTH] No session, creating anonymous user...');
    const { data, error } = await supabase.auth.signInAnonymously();
    
    if (error) {
      console.error('[AUTH] Anonymous sign-in error:', error.message);
      if (previousUserId) {
        console.log('[AUTH] Falling back to persisted user ID:', previousUserId.slice(0, 8));
        return previousUserId;
      }
      return null;
    }
    
    const newUserId = data.user?.id ?? null;
    
    if (newUserId) {
      await persistAuthId(newUserId);
      
      if (previousUserId && previousUserId !== newUserId) {
        console.log('[AUTH] User ID changed! Previous:', previousUserId.slice(0, 8), '→ New:', newUserId.slice(0, 8));
        console.log('[AUTH] Will migrate data from previous user ID');
        try {
          await AsyncStorage.setItem('trace:pending_user_migration', JSON.stringify({
            oldUserId: previousUserId,
            newUserId: newUserId,
            timestamp: Date.now(),
          }));
        } catch (e) {
          console.warn('[AUTH] Failed to store migration flag:', e);
        }
      }
      
      console.log('[AUTH] Anonymous user created:', newUserId.slice(0, 8));
    }
    
    return newUserId;
  } catch (err: any) {
    console.error('[AUTH] Session error:', err.message);
    const fallback = await getPersistedAuthId();
    if (fallback) {
      console.log('[AUTH] Using persisted fallback ID:', fallback.slice(0, 8));
      return fallback;
    }
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
