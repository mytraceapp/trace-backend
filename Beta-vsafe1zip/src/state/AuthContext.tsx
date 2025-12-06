import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, getTraceUserId } from '../lib/supabaseClient';
import { getOrCreateProfile, updateProfile as updateProfileService, type Profile, type ProfileUpdate } from '../lib/profileService';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  userId: string;
  currentProfile: Profile | null;
  isProfileLoading: boolean;
  updateProfileData: (data: ProfileUpdate) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const userId = user?.id || getTraceUserId();

  const loadProfile = useCallback(async (authUser: User) => {
    setIsProfileLoading(true);
    try {
      const profile = await getOrCreateProfile(authUser);
      setCurrentProfile(profile);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  const updateProfileData = useCallback(async (data: ProfileUpdate) => {
    if (!user?.id) return;
    
    try {
      const updatedProfile = await updateProfileService(user.id, data);
      if (updatedProfile) {
        setCurrentProfile(updatedProfile);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          loadProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setCurrentProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setCurrentProfile(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isLoading, 
      userId, 
      currentProfile,
      isProfileLoading,
      updateProfileData,
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
