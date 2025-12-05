export type EntryType =
  | 'session'
  | 'emotional_note'
  | 'ai_reflection'
  | 'check_in'
  | 'pattern';

export interface Entry {
  id: string;
  type: EntryType;
  title?: string;
  body?: string;
  timestamp: string; // ISO string
  sourceScreen?: string; // e.g. 'PowerNap', 'Maze', 'Breathing'
  tags?: string[]; // e.g. ['sleep', 'reset', 'pattern:peak_window']
  metadata?: Record<string, any>; // duration, rating, etc.
}

export const entryTypeLabels: Record<EntryType, string> = {
  session: 'Daily sessions',
  emotional_note: 'Emotional notes',
  ai_reflection: 'AI reflections',
  check_in: 'Check-ins',
  pattern: 'Patterns-connected',
};

export const entryTypeIcons: Record<EntryType, string> = {
  session: 'activity',
  emotional_note: 'book',
  ai_reflection: 'sparkles',
  check_in: 'check-circle',
  pattern: 'trending-up',
};

export function generateEntryId(): string {
  return `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createEntry(
  type: EntryType,
  options: Partial<Omit<Entry, 'id' | 'type' | 'timestamp'>> = {}
): Entry {
  return {
    id: generateEntryId(),
    type,
    timestamp: new Date().toISOString(),
    ...options,
  };
}
