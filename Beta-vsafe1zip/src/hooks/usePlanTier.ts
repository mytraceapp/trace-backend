/**
 * Plan Tier Hook
 * 
 * This hook manages the user's subscription plan tier.
 * Currently returns a hardcoded value, but is designed to be easily
 * replaced with real plan data from Supabase/Stripe in the future.
 * 
 * Plan Tier Hierarchy:
 * - "free": Basic access, some patterns locked
 * - "light": Unlocks Peak Window and Energy Tides patterns
 * - "deep": Full access to all patterns including Stress Echoes
 * 
 * To integrate with real backend:
 * 1. Replace the hardcoded return with data from your auth/subscription context
 * 2. Add loading and error states as needed
 * 3. Consider caching the plan tier to avoid repeated API calls
 */

export type PlanTier = "free" | "light" | "deep";

const tierHierarchy: Record<PlanTier, number> = {
  free: 0,
  light: 1,
  deep: 2
};

interface PlanTierResult {
  currentPlan: PlanTier;
  isLoading: boolean;
  canAccessPattern: (requiredTier: PlanTier) => boolean;
  isPlanAtLeast: (tier: PlanTier) => boolean;
}

export function usePlanTier(): PlanTierResult {
  const currentPlan: PlanTier = "light";
  
  const isPlanAtLeast = (tier: PlanTier): boolean => {
    return tierHierarchy[currentPlan] >= tierHierarchy[tier];
  };
  
  const canAccessPattern = (requiredTier: PlanTier): boolean => {
    return isPlanAtLeast(requiredTier);
  };

  return {
    currentPlan,
    isLoading: false,
    canAccessPattern,
    isPlanAtLeast,
  };
}
