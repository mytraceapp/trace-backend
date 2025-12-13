import AsyncStorage from '@react-native-async-storage/async-storage';

const ENTRIES_STORAGE_KEY = '@trace_entries';
const DEMO_OFFSETS_KEY = '@trace_demo_offsets';

export type EntryType = 'activity' | 'journal';
export type EntryGroup = 'daily' | 'notes';

export interface Entry {
  id: string;
  type: EntryType;
  group: EntryGroup;
  title: string;
  preview?: string;
  createdAt: string;
  meta?: {
    activityName?: string;
    durationSeconds?: number;
    mood?: string;
  };
}

interface DemoOffsets {
  daily: number;
  notes: number;
}

const DEFAULT_DEMO_OFFSETS: DemoOffsets = {
  daily: 112,
  notes: 0,
};

export async function getDemoOffsets(): Promise<DemoOffsets> {
  try {
    const data = await AsyncStorage.getItem(DEMO_OFFSETS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    await AsyncStorage.setItem(DEMO_OFFSETS_KEY, JSON.stringify(DEFAULT_DEMO_OFFSETS));
    return DEFAULT_DEMO_OFFSETS;
  } catch {
    return DEFAULT_DEMO_OFFSETS;
  }
}

export async function listEntries(): Promise<Entry[]> {
  try {
    const data = await AsyncStorage.getItem(ENTRIES_STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch {
    return [];
  }
}

export async function addEntry(entry: Omit<Entry, 'id' | 'createdAt'>): Promise<Entry> {
  const entries = await listEntries();
  const newEntry: Entry = {
    ...entry,
    id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
  };
  entries.unshift(newEntry);
  await AsyncStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries));
  return newEntry;
}

export async function getEntryCounts(): Promise<{ daily: number; notes: number; total: number }> {
  const entries = await listEntries();
  const offsets = await getDemoOffsets();
  
  const realDailyCount = entries.filter(e => e.group === 'daily').length;
  const realNotesCount = entries.filter(e => e.group === 'notes').length;
  
  const dailyCount = realDailyCount + offsets.daily;
  const notesCount = realNotesCount + offsets.notes;
  
  return {
    daily: dailyCount,
    notes: notesCount,
    total: dailyCount + notesCount,
  };
}

export async function getEntriesByGroup(group: EntryGroup): Promise<Entry[]> {
  const entries = await listEntries();
  return entries.filter(e => e.group === group);
}

export async function seedDemoEntriesIfEmpty(): Promise<void> {
  const entries = await listEntries();
  if (entries.length === 0) {
    const sampleEntry: Omit<Entry, 'id' | 'createdAt'> = {
      type: 'journal',
      group: 'notes',
      title: 'Feeling Heavy',
      preview: 'sleepy sleepy',
    };
    await addEntry(sampleEntry);
  }
}

export async function clearAllEntries(): Promise<void> {
  await AsyncStorage.removeItem(ENTRIES_STORAGE_KEY);
}
