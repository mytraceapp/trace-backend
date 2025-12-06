import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Entry, EntryType, createEntry } from '../models/entries';
import { supabase, getTraceUserId } from '../lib/supabaseClient';

const STORAGE_KEY = 'trace_entries';

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
  isLoading: boolean;
}

const EntriesContext = createContext<EntriesContextType | undefined>(undefined);

export function EntriesProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userId = useRef<string>(getTraceUserId());

  // Load entries from Supabase on mount
  useEffect(() => {
    async function loadEntries() {
      try {
        const { data, error } = await supabase
          .from('entries')
          .select('*')
          .eq('user_id', userId.current)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading entries from Supabase:', error);
          // Fallback to localStorage if Supabase fails
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            setEntries(JSON.parse(stored));
          }
        } else if (data) {
          // Map Supabase data to Entry format
          const loadedEntries: Entry[] = data.map((row: any) => ({
            id: row.id,
            type: row.type as EntryType,
            title: row.title,
            body: row.body,
            timestamp: row.created_at,
            sourceScreen: row.source_screen,
            tags: row.tags,
            metadata: row.metadata,
          }));
          setEntries(loadedEntries);
        }
      } catch (e) {
        console.error('Failed to load entries:', e);
        // Fallback to localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setEntries(JSON.parse(stored));
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadEntries();
  }, []);

  // Save entry to Supabase
  const saveEntryToSupabase = async (entry: Entry) => {
    try {
      const { error } = await supabase
        .from('entries')
        .insert({
          id: entry.id,
          user_id: userId.current,
          type: entry.type,
          title: entry.title || null,
          body: entry.body || null,
          source_screen: entry.sourceScreen || null,
          tags: entry.tags || null,
          metadata: entry.metadata || null,
          created_at: entry.timestamp,
        });

      if (error) {
        console.error('Error saving entry to Supabase:', error);
        // Fallback: save to localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        const currentEntries = stored ? JSON.parse(stored) : [];
        localStorage.setItem(STORAGE_KEY, JSON.stringify([entry, ...currentEntries]));
      }
    } catch (e) {
      console.error('Failed to save entry:', e);
    }
  };

  const addEntry = useCallback((entryInput: Omit<Entry, 'id' | 'timestamp'>): Entry => {
    const entry = createEntry(entryInput.type, entryInput);
    setEntries(prev => [entry, ...prev]);
    saveEntryToSupabase(entry);
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

  const deleteEntry = useCallback(async (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    
    try {
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', id)
        .eq('user_id', userId.current);

      if (error) {
        console.error('Error deleting entry from Supabase:', error);
      }
    } catch (e) {
      console.error('Failed to delete entry:', e);
    }
  }, []);

  const clearAllEntries = useCallback(async () => {
    setEntries([]);
    localStorage.removeItem(STORAGE_KEY);
    
    try {
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('user_id', userId.current);

      if (error) {
        console.error('Error clearing entries from Supabase:', error);
      }
    } catch (e) {
      console.error('Failed to clear entries:', e);
    }
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
        isLoading,
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
