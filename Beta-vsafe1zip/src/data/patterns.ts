/**
 * Patterns Data Model
 * 
 * This file contains the data model and seed data for the TRACE Patterns feature.
 * 
 * Plan Tier Requirements:
 * - "free": Pattern is available to all users
 * - "light": Pattern requires Light tier or higher
 * - "deep": Pattern requires Deep tier (highest)
 * 
 * To add a new pattern:
 * 1. Add a new key to PatternCategory type
 * 2. Add a new Pattern object to the patternsData array
 * 3. Set requiredTier to control access
 * 4. The pattern will automatically appear in both Patterns and Full Patterns screens
 */

import type { PlanTier } from '../hooks/usePlanTier';

export type PatternCategory = "peakWindow" | "energyTides" | "stressEchoes";

export interface Pattern {
  id: string;
  key: PatternCategory;
  title: string;
  subtitle: string;
  summary: string;
  timeWindow?: string;
  insightBullets: string[];
  suggestedActions: string[];
  tag?: string;
  requiredTier: PlanTier;
}

export const patternsData: Pattern[] = [
  {
    id: "pattern-peak-window",
    key: "peakWindow",
    title: "Peak Window",
    subtitle: "When your focus finds its natural rhythm",
    summary: "Your Peak Window is the time of day when your focus and clarity naturally rise. During this period, your mind operates at its sharpest.",
    timeWindow: "9:40 AM – 12:10 PM",
    insightBullets: [
      "Your mental clarity tends to peak during late morning hours",
      "Creative and analytical thinking both strengthen in this window",
      "Distractions feel less intrusive during these moments",
      "This pattern has been consistent across your recent check-ins"
    ],
    suggestedActions: [
      "Schedule your most important or creative work during this window",
      "Protect this time from meetings when possible",
      "Use this period for decisions that need clear thinking",
      "Notice how your body signals when this window begins"
    ],
    tag: "Focus hours",
    requiredTier: "free"
  },
  {
    id: "pattern-energy-tides",
    key: "energyTides",
    title: "Energy Tides",
    subtitle: "How your energy flows through the week",
    summary: "Energy Tides are the natural rises and dips in your energy over the week. Understanding these patterns helps you plan with intention.",
    insightBullets: [
      "Your energy tends to dip midweek, around Wednesday afternoon",
      "Weekends bring a natural resurgence and restoration",
      "Monday mornings often carry residual weekend calm",
      "Friday afternoons show renewed lightness and anticipation"
    ],
    suggestedActions: [
      "Plan demanding tasks earlier in the week when energy is fresh",
      "Build in gentle transitions for midweek recovery",
      "Honor the weekend restoration—it fuels your week ahead",
      "Notice the subtle shift in your body as each tide turns"
    ],
    tag: "Weekly rhythm",
    requiredTier: "light"
  },
  {
    id: "pattern-stress-echoes",
    key: "stressEchoes",
    title: "Stress Echoes",
    subtitle: "Patterns that linger after the storm",
    summary: "Stress Echoes are lingering emotional imprints from previous stress events. They can resurface when similar situations arise.",
    insightBullets: [
      "Certain triggers tend to replay emotional patterns from past stress",
      "Your body often holds tension longer than your mind realizes",
      "Evening hours may carry echoes from the day's tensions",
      "Recognition is the first step toward gentle release"
    ],
    suggestedActions: [
      "Practice grounding when you notice an echo arising",
      "Give yourself permission to rest after stressful periods",
      "Journaling can help process and release lingering tension",
      "Be gentle with yourself—healing unfolds at its own pace"
    ],
    tag: "Emotional memory",
    requiredTier: "deep"
  }
];

export function getPatternByKey(key: PatternCategory): Pattern | undefined {
  return patternsData.find(p => p.key === key);
}

export function getPatternById(id: string): Pattern | undefined {
  return patternsData.find(p => p.id === id);
}
