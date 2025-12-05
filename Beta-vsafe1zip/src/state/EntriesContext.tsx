import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Entry, EntryType, createEntry } from '../models/entries';

const STORAGE_KEY = 'trace_entries';

function loadEntriesFromStorage(): Entry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load entries from localStorage:', e);
  }
  return [];
}

function saveEntriesToStorage(entries: Entry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save entries to localStorage:', e);
  }
}

interface EntriesContextType {
  entries: Entry[];
  addEntry: (entryInput: Omit<Entry, 'id' | 'timestamp'>) => Entry;
  addSessionEntry: (sourceScreen: string, options?: { title?: string; body?: string; tags?: string[]; metadata?: Record<string, any> }) => Entry;
  addEmotionalNoteEntry: (title: string, body: string, tags?: string[], metadata?: Record<string, any>) => Entry;
  addAIReflectionEntry: (body: string, sourceScreen?: string) => Entry;
  addCheckInEntry: (title: string, body?: string, metadata?: Record<string, any>) => Entry;
  addPatternEntry: (patternKey: string, body?: string) => Entry;
  getEntriesByType: (type: EntryType) => Entry[];
  getRecentEntries: (limit?: number) => Entry[];
  deleteEntry: (id: string) => void;
  clearAllEntries: () => void;
}

const EntriesContext = createContext<EntriesContextType | undefined>(undefined);

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>(() => loadEntriesFromStorage());

  useEffect(() => {
    saveEntriesToStorage(entries);
  }, [entries]);

  const addEntry = useCallback((entryInput: Omit<Entry, 'id' | 'timestamp'>): Entry => {
    const entry = createEntry(entryInput.type, entryInput);
    setEntries(prev => [entry, ...prev]);
    return entry;
  }, []);

  const addSessionEntry = useCallback((
    sourceScreen: string,
    options?: { title?: string; body?: string; tags?: string[]; metadata?: Record<string, any> }
  ): Entry => {
    return addEntry({
      type: 'session',
      sourceScreen,
      title: options?.title || `${sourceScreen} Session`,
      body: options?.body,
      tags: options?.tags || [sourceScreen.toLowerCase()],
      metadata: options?.metadata,
    });
  }, [addEntry]);

  const addEmotionalNoteEntry = useCallback((
    title: string,
    body: string,
    tags?: string[],
    metadata?: Record<string, any>
  ): Entry => {
    return addEntry({
      type: 'emotional_note',
      title,
      body,
      tags,
      sourceScreen: 'Journal',
      metadata: {
        ...metadata,
        mood: tags?.[0] || undefined,
      },
    });
  }, [addEntry]);

  const addAIReflectionEntry = useCallback((
    body: string,
    sourceScreen?: string
  ): Entry => {
    return addEntry({
      type: 'ai_reflection',
      title: 'AI Reflection',
      body,
      sourceScreen,
      tags: ['ai', 'reflection'],
    });
  }, [addEntry]);

  const addCheckInEntry = useCallback((
    title: string,
    body?: string,
    metadata?: Record<string, any>
  ): Entry => {
    return addEntry({
      type: 'check_in',
      title,
      body,
      metadata,
      tags: ['check-in'],
    });
  }, [addEntry]);

  const addPatternEntry = useCallback((
    patternKey: string,
    body?: string
  ): Entry => {
    return addEntry({
      type: 'pattern',
      title: `Pattern: ${patternKey}`,
      body,
      tags: [`pattern:${patternKey}`],
    });
  }, [addEntry]);

  const getEntriesByType = useCallback((type: EntryType): Entry[] => {
    return entries.filter(e => e.type === type);
  }, [entries]);

  const getRecentEntries = useCallback((limit: number = 10): Entry[] => {
    return entries.slice(0, limit);
  }, [entries]);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  const clearAllEntries = useCallback(() => {
    setEntries([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <EntriesContext.Provider
      value={{
        entries,
        addEntry,
        addSessionEntry,
        addEmotionalNoteEntry,
        addAIReflectionEntry,
        addCheckInEntry,
        addPatternEntry,
        getEntriesByType,
        getRecentEntries,
        deleteEntry,
        clearAllEntries,
      }}
    >
      {children}
    </EntriesContext.Provider>
  );
}

export function useEntries() {
  const context = useContext(EntriesContext);
  if (context === undefined) {
    throw new Error('useEntries must be used within an EntriesProvider');
  }
  return context;
}
