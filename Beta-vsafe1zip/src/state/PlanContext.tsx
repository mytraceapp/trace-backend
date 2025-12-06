import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export type PlanTier = 'light' | 'premium' | 'studio';

export interface UserProfile {
  name: string;
  email: string;
  plan: PlanTier;
  hasPaid: boolean;
  referralCode?: string;
}

interface UserState {
  selectedPlan: PlanTier;
  profile: UserProfile | null;
  isUpgrading: boolean;
  ambienceEnabled: boolean;
  ambienceVolume: number;
  setSelectedPlan: (plan: PlanTier) => void;
  setProfile: (profile: UserProfile) => void;
  updatePlan: (plan: PlanTier, hasPaid?: boolean) => void;
  generateReferralCode: () => string;
  setIsUpgrading: (value: boolean) => void;
  setAmbienceEnabled: (value: boolean) => void;
  setAmbienceVolume: (value: number) => void;
  saveProfileToSupabase: (profile: UserProfile) => Promise<void>;
  loadProfileFromSupabase: () => Promise<void>;
}

const UserContext = createContext<UserState | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

function generateRandomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function UserProvider({ children }: UserProviderProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>('light');
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [ambienceEnabled, setAmbienceEnabledState] = useState(true);
  const [ambienceVolume, setAmbienceVolumeState] = useState(65);

  // Save profile to Supabase
  const saveProfileToSupabase = useCallback(async (profileData: UserProfile) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user, skipping Supabase save');
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          name: profileData.name,
          email: profileData.email,
          plan: profileData.plan,
          has_paid: profileData.hasPaid,
          referral_code: profileData.referralCode || null,
          ambience_enabled: ambienceEnabled,
          ambience_volume: ambienceVolume,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error saving profile to Supabase:', error);
      } else {
        console.log('Profile saved to Supabase');
      }
    } catch (e) {
      console.error('Failed to save profile:', e);
    }
  }, [ambienceEnabled, ambienceVolume]);

  // Load profile from Supabase
  const loadProfileFromSupabase = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user, skipping Supabase load');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile exists yet - that's okay
          console.log('No profile found in Supabase for user');
        } else {
          console.error('Error loading profile from Supabase:', error);
        }
        return;
      }

      if (data) {
        console.log('Loaded profile from Supabase:', data);
        setProfileState({
          name: data.name || 'Your Name',
          email: data.email || user.email || 'name@email.com',
          plan: (data.plan as PlanTier) || 'light',
          hasPaid: data.has_paid || false,
          referralCode: data.referral_code || undefined,
        });
        setSelectedPlan((data.plan as PlanTier) || 'light');
        if (data.ambience_enabled !== null) {
          setAmbienceEnabledState(data.ambience_enabled);
        }
        if (data.ambience_volume !== null) {
          setAmbienceVolumeState(data.ambience_volume);
        }
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
    }
  }, []);

  // Listen for auth state changes to load profile
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('User signed in, loading profile...');
          await loadProfileFromSupabase();
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out, clearing profile');
          setProfileState(null);
          setSelectedPlan('light');
        }
      }
    );

    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfileFromSupabase();
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfileFromSupabase]);

  // Wrapper for setProfile that also saves to Supabase
  const setProfile = useCallback((newProfile: UserProfile) => {
    setProfileState(newProfile);
    saveProfileToSupabase(newProfile);
  }, [saveProfileToSupabase]);

  // Wrapper for ambience settings that save to Supabase
  const setAmbienceEnabled = useCallback((value: boolean) => {
    setAmbienceEnabledState(value);
    if (profile) {
      saveProfileToSupabase(profile);
    }
  }, [profile, saveProfileToSupabase]);

  const setAmbienceVolume = useCallback((value: number) => {
    setAmbienceVolumeState(value);
    if (profile) {
      saveProfileToSupabase(profile);
    }
  }, [profile, saveProfileToSupabase]);

  const updatePlan = useCallback((plan: PlanTier, hasPaid?: boolean) => {
    if (profile) {
      const updatedProfile = {
        ...profile,
        plan,
        hasPaid: hasPaid ?? (plan === 'light' ? true : profile.hasPaid),
      };
      setProfileState(updatedProfile);
      saveProfileToSupabase(updatedProfile);
    }
  }, [profile, saveProfileToSupabase]);

  const generateReferralCode = useCallback(() => {
    const code = generateRandomCode();
    if (profile) {
      const updatedProfile = {
        ...profile,
        referralCode: code,
      };
      setProfileState(updatedProfile);
      saveProfileToSupabase(updatedProfile);
    }
    return code;
  }, [profile, saveProfileToSupabase]);

  return (
    <UserContext.Provider value={{ 
      selectedPlan, 
      setSelectedPlan, 
      profile, 
      setProfile, 
      updatePlan, 
      generateReferralCode,
      isUpgrading,
      setIsUpgrading,
      ambienceEnabled,
      setAmbienceEnabled,
      ambienceVolume,
      setAmbienceVolume,
      saveProfileToSupabase,
      loadProfileFromSupabase
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export const planLabels: Record<PlanTier, { name: string; price: string; label: string }> = {
  light: { name: 'Light', price: 'Free', label: 'Light · Free' },
  premium: { name: 'Premium', price: '$9.99/mo', label: 'Premium · $9.99/mo' },
  studio: { name: 'Studio', price: '$14.99/mo', label: 'Studio · $14.99/mo' },
};
