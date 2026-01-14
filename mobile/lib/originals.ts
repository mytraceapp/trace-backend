import { supabase } from './supabaseClient';

export interface OriginalsTrack {
  id: string;
  album: string;
  track_number: number;
  title: string;
  duration_seconds: number;
  bpm: number;
  audio_url: string;
  emotional_purpose: string;
  created_at: string;
}

export interface OriginalsAlbum {
  album: string;
  tracks: OriginalsTrack[];
  fetchedAt: number;
}

const CACHE_DURATION_MS = 60 * 60 * 1000;
const albumCache: Map<string, OriginalsAlbum> = new Map();

export async function fetchOriginalsAlbum(album: string = 'night_swim'): Promise<OriginalsTrack[]> {
  const cached = albumCache.get(album);
  const now = Date.now();
  
  if (cached && (now - cached.fetchedAt) < CACHE_DURATION_MS) {
    console.log(`[ORIGINALS] Using cached tracks for ${album} (${cached.tracks.length} tracks)`);
    return cached.tracks;
  }

  console.log(`[ORIGINALS] Fetching tracks for ${album} from Supabase...`);
  
  try {
    const { data, error } = await supabase
      .from('trace_originals_tracks')
      .select('*')
      .eq('album', album)
      .order('track_number', { ascending: true });

    if (error) {
      console.error('[ORIGINALS] Supabase error:', error.message);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn(`[ORIGINALS] No tracks found for album: ${album}`);
      return [];
    }

    albumCache.set(album, {
      album,
      tracks: data,
      fetchedAt: now
    });

    console.log(`[ORIGINALS] Cached ${data.length} tracks for ${album}`);
    return data;
  } catch (err: any) {
    console.error('[ORIGINALS] Failed to fetch album:', err.message);
    
    if (cached) {
      console.log('[ORIGINALS] Returning stale cache due to error');
      return cached.tracks;
    }
    
    return [];
  }
}

export function clearOriginalsCache(album?: string): void {
  if (album) {
    albumCache.delete(album);
    console.log(`[ORIGINALS] Cleared cache for ${album}`);
  } else {
    albumCache.clear();
    console.log('[ORIGINALS] Cleared all album cache');
  }
}

export function getTrackByNumber(tracks: OriginalsTrack[], trackNumber: number): OriginalsTrack | undefined {
  return tracks.find(t => t.track_number === trackNumber);
}

export function getTrackByTitle(tracks: OriginalsTrack[], title: string): OriginalsTrack | undefined {
  const lowerTitle = title.toLowerCase();
  return tracks.find(t => t.title.toLowerCase().includes(lowerTitle));
}

const LAST_PLAYED_KEY = 'originals_last_played';

interface LastPlayedData {
  [album: string]: {
    trackIndex: number;
    timestamp: number;
  };
}

export async function saveLastPlayedTrack(album: string, trackIndex: number): Promise<void> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const existing = await AsyncStorage.getItem(LAST_PLAYED_KEY);
    const data: LastPlayedData = existing ? JSON.parse(existing) : {};
    
    data[album] = {
      trackIndex,
      timestamp: Date.now()
    };
    
    await AsyncStorage.setItem(LAST_PLAYED_KEY, JSON.stringify(data));
    console.log(`[ORIGINALS] Saved last played: ${album} track ${trackIndex}`);
  } catch (err: any) {
    console.error('[ORIGINALS] Failed to save last played:', err.message);
  }
}

export async function getLastPlayedTrack(album: string): Promise<number | null> {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const existing = await AsyncStorage.getItem(LAST_PLAYED_KEY);
    
    if (!existing) return null;
    
    const data: LastPlayedData = JSON.parse(existing);
    const albumData = data[album];
    
    if (!albumData) return null;
    
    const MAX_RESUME_AGE_MS = 24 * 60 * 60 * 1000;
    if (Date.now() - albumData.timestamp > MAX_RESUME_AGE_MS) {
      console.log(`[ORIGINALS] Last played track expired for ${album}`);
      return null;
    }
    
    return albumData.trackIndex;
  } catch (err: any) {
    console.error('[ORIGINALS] Failed to get last played:', err.message);
    return null;
  }
}

export const NIGHT_SWIM_TRACK_MAP: Record<string, number> = {
  'midnight underwater': 1,
  'slow tides over glass': 2,
  'slow tides': 2,
  'undertow': 3,
  'midnight undertow': 3,
  'euphoria': 4,
  'calm euphoria': 4,
  'ocean breathing': 5,
  'tidal house': 6,
  'tidal memory glow': 6,
  'neon promise': 7,
};

export function getTrackNumberByName(trackName: string): number | null {
  const normalized = trackName.toLowerCase().trim();
  
  if (NIGHT_SWIM_TRACK_MAP[normalized]) {
    return NIGHT_SWIM_TRACK_MAP[normalized];
  }
  
  for (const [key, value] of Object.entries(NIGHT_SWIM_TRACK_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  return null;
}

export const TRACK_EMOTIONAL_MAPPING: Record<number, {
  name: string;
  bpm: number;
  moods: string[];
  description: string;
}> = {
  1: {
    name: 'Midnight Underwater',
    bpm: 76,
    moods: ['overwhelm', 'surrender', 'deep', 'insomnia', 'exhaustion'],
    description: 'Deepest/slowest track for surrender into sleep'
  },
  2: {
    name: 'Slow Tides Over Glass',
    bpm: 80,
    moods: ['contemplation', 'stillness', 'slowing', 'pause'],
    description: 'Ultra-minimal for stillness and contemplation'
  },
  3: {
    name: 'Undertow',
    bpm: 100,
    moods: ['pensive', 'introspection', 'late-night', 'hypnotic'],
    description: 'Hypnotic groove for pensive late-night processing'
  },
  4: {
    name: 'Euphoria',
    bpm: 102,
    moods: ['hope', 'uplifting', 'transition', 'relief'],
    description: 'Uplifting for feeling hope after struggle'
  },
  5: {
    name: 'Ocean Breathing',
    bpm: 104,
    moods: ['anxiety', 'tension', 'release', 'processing'],
    description: 'For anxiety → release journey'
  },
  6: {
    name: 'Tidal House',
    bpm: 104,
    moods: ['nostalgia', 'warmth', 'healing', 'memory', 'comfort'],
    description: 'Nostalgic and warm for processing memories with hope'
  },
  7: {
    name: 'Neon Promise',
    bpm: 104,
    moods: ['longing', 'vulnerability', 'reassurance', 'relationship'],
    description: 'HAS VOCALS - for longing and relationship vulnerability'
  }
};

export function getTrackForMood(mood: string, excludeTracks: number[] = []): number {
  const moodLower = mood.toLowerCase();
  
  const matches: { track: number; score: number }[] = [];
  
  for (const [trackNum, info] of Object.entries(TRACK_EMOTIONAL_MAPPING)) {
    const track = parseInt(trackNum);
    if (excludeTracks.includes(track)) continue;
    
    let score = 0;
    for (const trackMood of info.moods) {
      if (moodLower.includes(trackMood) || trackMood.includes(moodLower)) {
        score += 2;
      }
    }
    
    if (info.description.toLowerCase().includes(moodLower)) {
      score += 1;
    }
    
    if (score > 0) {
      matches.push({ track, score });
    }
  }
  
  if (matches.length > 0) {
    matches.sort((a, b) => b.score - a.score);
    return matches[0].track;
  }
  
  const available = [1, 2, 3, 4, 5, 6, 7].filter(t => !excludeTracks.includes(t));
  if (available.length === 0) return 1;
  
  return available[Math.floor(Math.random() * available.length)];
}
