import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  plan: 'light' | 'premium' | 'studio';
  has_paid: boolean;
  referral_code: string | null;
  ambience_enabled: boolean;
  ambience_volume: number;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdate {
  name?: string;
  plan?: 'light' | 'premium' | 'studio';
  has_paid?: boolean;
  referral_code?: string;
  ambience_enabled?: boolean;
  ambience_volume?: number;
}

export async function getOrCreateProfile(user: User): Promise<Profile | null> {
  try {
    const { data: existingProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (existingProfile) {
      console.log('Profile found:', existingProfile);
      return existingProfile as Profile;
    }

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching profile:', fetchError);
      return null;
    }

    console.log('No profile found, creating new one for user:', user.id);
    const newProfile = {
      id: user.id,
      email: user.email,
      name: null,
      plan: 'light',
      has_paid: false,
      referral_code: null,
      ambience_enabled: true,
      ambience_volume: 40,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: createdProfile, error: insertError } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating profile:', insertError);
      return null;
    }

    console.log('Profile created:', createdProfile);
    return createdProfile as Profile;
  } catch (error) {
    console.error('getOrCreateProfile error:', error);
    return null;
  }
}

export async function updateProfile(userId: string, data: ProfileUpdate): Promise<Profile | null> {
  try {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return null;
    }

    console.log('Profile updated:', updatedProfile);
    return updatedProfile as Profile;
  } catch (error) {
    console.error('updateProfile error:', error);
    return null;
  }
}

export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      console.error('Error getting profile:', error);
      return null;
    }

    return data as Profile;
  } catch (error) {
    console.error('getProfile error:', error);
    return null;
  }
}
