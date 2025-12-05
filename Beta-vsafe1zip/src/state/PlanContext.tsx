import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [ambienceEnabled, setAmbienceEnabled] = useState(true);
  const [ambienceVolume, setAmbienceVolume] = useState(65);

  const updatePlan = useCallback((plan: PlanTier, hasPaid?: boolean) => {
    if (profile) {
      setProfile({
        ...profile,
        plan,
        hasPaid: hasPaid ?? (plan === 'light' ? true : profile.hasPaid),
      });
    }
  }, [profile]);

  const generateReferralCode = useCallback(() => {
    const code = generateRandomCode();
    if (profile) {
      setProfile({
        ...profile,
        referralCode: code,
      });
    }
    return code;
  }, [profile]);

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
      setAmbienceVolume
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
