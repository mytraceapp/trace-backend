import AsyncStorage from '@react-native-async-storage/async-storage';

const GROUNDING_STORAGE_KEY = '@trace_grounding_progress';

export interface GroundingProgress {
  currentStep: number;
  responses: {
    see: string[];
    feel: string[];
    hear: string[];
    smell: string[];
    taste: string[];
  };
  lastUpdated: number;
}

const defaultProgress: GroundingProgress = {
  currentStep: 0,
  responses: {
    see: [],
    feel: [],
    hear: [],
    smell: [],
    taste: [],
  },
  lastUpdated: Date.now(),
};

export async function saveGroundingProgress(progress: GroundingProgress): Promise<void> {
  try {
    const data = { ...progress, lastUpdated: Date.now() };
    await AsyncStorage.setItem(GROUNDING_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save grounding progress:', error);
  }
}

export async function loadGroundingProgress(): Promise<GroundingProgress> {
  try {
    const stored = await AsyncStorage.getItem(GROUNDING_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load grounding progress:', error);
  }
  return defaultProgress;
}

export async function clearGroundingProgress(): Promise<void> {
  try {
    await AsyncStorage.removeItem(GROUNDING_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear grounding progress:', error);
  }
}

export function getDefaultGroundingProgress(): GroundingProgress {
  return { ...defaultProgress, responses: { ...defaultProgress.responses } };
}
