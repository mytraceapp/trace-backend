import React, { createContext, useContext, useRef, useCallback, useState, useEffect } from 'react';
import { Audio } from 'expo-av';
import { AppState, AppStateStatus } from 'react-native';

type SoundState = 'presence' | 'grounding' | 'comfort' | 'reflective' | 'insight';

interface SoundStatePayload {
  current: SoundState;
  changed: boolean;
  reason?: string;
}

interface AudioContextType {
  playState: (state: SoundState, fadeMs?: number) => Promise<void>;
  handleSoundState: (payload: SoundStatePayload) => Promise<void>;
  pauseForActivity: () => Promise<void>;
  resumeFromActivity: () => Promise<void>;
  pauseForOriginals: () => Promise<void>;
  resumeFromOriginals: () => Promise<void>;
  stopAll: () => Promise<void>;
  stopSoundscape: () => Promise<void>;
  currentState: SoundState | null;  // null = no soundscape playing (global ambient mode)
  isPlaying: boolean;
}

const AudioContext = createContext<AudioContextType | null>(null);

const STATE_FOLDERS: Record<SoundState, string> = {
  presence: 'Neutral_Presence',
  grounding: 'Grounding_Held',
  comfort: 'Comfort_Holding',
  reflective: 'Reflecting_Processing',
  insight: 'Insight_Lift',
};

const TRACKS_PER_FOLDER = 7;
const DEFAULT_VOLUME = 0.35;
const DEFAULT_FADE_MS = 1200;

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const currentStateRef = useRef<SoundState | null>(null);  // null = global ambient mode
  const playedTracksRef = useRef<Record<SoundState, number[]>>({
    presence: [],
    grounding: [],
    comfort: [],
    reflective: [],
    insight: [],
  });
  const pausedByRef = useRef<'activity' | 'originals' | null>(null);
  const wasPlayingRef = useRef(false);
  const [currentState, setCurrentState] = useState<SoundState | null>(null);  // null = global ambient mode
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  }, []);

  // NOTE: Soundscapes are NOT auto-started on app load
  // Global ambient track is the app's default audio (handled separately)
  // Soundscapes only trigger when atmosphere engine detects mood via handleSoundState()

  const getNextTrack = useCallback((state: SoundState): number => {
    const played = playedTracksRef.current[state];
    const allTracks = Array.from({ length: TRACKS_PER_FOLDER }, (_, i) => i + 1);
    const available = allTracks.filter(t => !played.includes(t));
    
    if (available.length === 0) {
      playedTracksRef.current[state] = [];
      return allTracks[Math.floor(Math.random() * allTracks.length)];
    }
    
    const selected = available[Math.floor(Math.random() * available.length)];
    playedTracksRef.current[state].push(selected);
    return selected;
  }, []);

  const fadeVolume = useCallback(async (sound: Audio.Sound, from: number, to: number, durationMs: number) => {
    const steps = 12;
    const stepMs = durationMs / steps;
    
    for (let i = 1; i <= steps; i++) {
      const volume = from + ((to - from) * i) / steps;
      try {
        await sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
      } catch {}
      await new Promise(r => setTimeout(r, stepMs));
    }
  }, []);

  const loadTrackSource = useCallback((state: SoundState, trackNum: number) => {
    const folder = STATE_FOLDERS[state];
    const trackMap: Record<string, Record<number, any>> = {
      Neutral_Presence: {
        1: require('../assets/soundscapes/Neutral_Presence/Neutral_track_1.m4a'),
        2: require('../assets/soundscapes/Neutral_Presence/Neutral_track_2.m4a'),
        3: require('../assets/soundscapes/Neutral_Presence/Neutral_track_3.m4a'),
        4: require('../assets/soundscapes/Neutral_Presence/Neutral_track_4.m4a'),
        5: require('../assets/soundscapes/Neutral_Presence/Neutral_track_5.m4a'),
        6: require('../assets/soundscapes/Neutral_Presence/Neutral_track_6.m4a'),
        7: require('../assets/soundscapes/Neutral_Presence/Neutral_track_7.m4a'),
      },
      Grounding_Held: {
        1: require('../assets/soundscapes/Grounding_Held/Grounding_Held_track_1.m4a'),
        2: require('../assets/soundscapes/Grounding_Held/Grounding_Held_track_2.m4a'),
        3: require('../assets/soundscapes/Grounding_Held/Grounding_Held_track_3.m4a'),
        4: require('../assets/soundscapes/Grounding_Held/Grounding_Held_track_4.m4a'),
        5: require('../assets/soundscapes/Grounding_Held/Grounding_Held_track_5.m4a'),
        6: require('../assets/soundscapes/Grounding_Held/Grounding_Held_track_6.m4a'),
        7: require('../assets/soundscapes/Grounding_Held/Grounding_Held_track_7.m4a'),
      },
      Comfort_Holding: {
        1: require('../assets/soundscapes/Comfort_Holding/Comforting_Holding_track_1.m4a'),
        2: require('../assets/soundscapes/Comfort_Holding/Comforting_Holding_track_2.m4a'),
        3: require('../assets/soundscapes/Comfort_Holding/Comforting_Holding_track_3.m4a'),
        4: require('../assets/soundscapes/Comfort_Holding/Comforting_Holding_track_4.m4a'),
        5: require('../assets/soundscapes/Comfort_Holding/Comforting_Holding_track_5.m4a'),
        6: require('../assets/soundscapes/Comfort_Holding/Comforting_Holding_track_6.m4a'),
        7: require('../assets/soundscapes/Comfort_Holding/Comforting_Holding_track_7.m4a'),
      },
      Reflecting_Processing: {
        1: require('../assets/soundscapes/Reflecting_Processing/Reflective_Processing_track_1.m4a'),
        2: require('../assets/soundscapes/Reflecting_Processing/Reflective_Processing_track_2.m4a'),
        3: require('../assets/soundscapes/Reflecting_Processing/Reflective_Processing_track_3.m4a'),
        4: require('../assets/soundscapes/Reflecting_Processing/Reflective_Processing_track_4.m4a'),
        5: require('../assets/soundscapes/Reflecting_Processing/Reflective_Processing_track_5.m4a'),
        6: require('../assets/soundscapes/Reflecting_Processing/Reflective_Processing_track_6.m4a'),
        7: require('../assets/soundscapes/Reflecting_Processing/Reflective_Processing_track_7.m4a'),
      },
      Insight_Lift: {
        1: require('../assets/soundscapes/Insight_Lift/Insight_Lift_track_1.m4a'),
        2: require('../assets/soundscapes/Insight_Lift/Insight_Lift_track_2.m4a'),
        3: require('../assets/soundscapes/Insight_Lift/Insight_Lift_track_3.m4a'),
        4: require('../assets/soundscapes/Insight_Lift/Insight_Lift_track_4.m4a'),
        5: require('../assets/soundscapes/Insight_Lift/Insight_Lift_track_5.m4a'),
        6: require('../assets/soundscapes/Insight_Lift/Insight_Lift_track_6.m4a'),
        7: require('../assets/soundscapes/Insight_Lift/Insight_Lift_track_7.m4a'),
      },
    };
    
    return trackMap[folder]?.[trackNum];
  }, []);

  const playState = useCallback(async (state: SoundState, fadeMs = DEFAULT_FADE_MS) => {
    console.log(`[AUDIO] playState: ${state} (fade: ${fadeMs}ms)`);
    
    const trackNum = getNextTrack(state);
    const source = loadTrackSource(state, trackNum);
    
    if (!source) {
      console.warn(`[AUDIO] No source for ${state} track ${trackNum}`);
      return;
    }
    
    try {
      if (soundRef.current) {
        await fadeVolume(soundRef.current, DEFAULT_VOLUME, 0, fadeMs / 2);
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      
      const { sound } = await Audio.Sound.createAsync(source, {
        isLooping: true,
        volume: 0,
      });
      
      // Set up playback status listener for track completion fallback
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          // If track finished (backup for looping failure)
          if (status.didJustFinish && !status.isLooping) {
            console.log('[AUDIO] Track finished, playing next...');
            const nextState = currentStateRef.current;
            if (nextState) {
              playState(nextState, 800);
            }
          }
          // If playback stopped unexpectedly
          if (!status.isPlaying && !status.didJustFinish && isPlaying && !pausedByRef.current) {
            console.warn('[AUDIO] Playback stopped unexpectedly, resuming...');
            sound.playAsync().catch(console.error);
          }
        }
      });
      
      soundRef.current = sound;
      currentStateRef.current = state;
      setCurrentState(state);
      
      await sound.playAsync();
      setIsPlaying(true);
      
      await fadeVolume(sound, 0, DEFAULT_VOLUME, fadeMs / 2);
      
      console.log(`[AUDIO] Now playing: ${STATE_FOLDERS[state]}/track_${trackNum}`);
    } catch (error) {
      console.error('[AUDIO] playState error:', error);
    }
  }, [getNextTrack, loadTrackSource, fadeVolume]);

  // Stop soundscape and return to global ambient
  const stopSoundscape = useCallback(async () => {
    if (!soundRef.current) {
      console.log('[AUDIO] No soundscape playing to stop');
      return;
    }
    
    try {
      console.log('[AUDIO] Stopping soundscape, returning to global ambient');
      await fadeVolume(soundRef.current, DEFAULT_VOLUME, 0, DEFAULT_FADE_MS);
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      currentStateRef.current = null;
      setCurrentState(null);
      setIsPlaying(false);
      
      // TODO: Signal global ambient to resume (handled by separate audio system)
      console.log('[AUDIO] Soundscape stopped - global ambient should resume');
    } catch (error) {
      console.error('[AUDIO] stopSoundscape error:', error);
    }
  }, [fadeVolume]);

  const handleSoundState = useCallback(async (payload: SoundStatePayload) => {
    if (!payload.changed) return;
    if (pausedByRef.current) {
      console.log(`[AUDIO] Skipping state change (paused by ${pausedByRef.current})`);
      return;
    }
    
    console.log(`[AUDIO] State change: ${currentStateRef.current} → ${payload.current} (${payload.reason || 'no reason'})`);
    
    // All 5 states are soundscapes (including presence for calm/happy/chill)
    await playState(payload.current, DEFAULT_FADE_MS);
  }, [playState]);

  const pauseForActivity = useCallback(async () => {
    if (!soundRef.current) return;
    pausedByRef.current = 'activity';
    wasPlayingRef.current = isPlaying;
    
    try {
      await fadeVolume(soundRef.current, DEFAULT_VOLUME, 0, 400);
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
      console.log('[AUDIO] Paused for activity');
    } catch (error) {
      console.error('[AUDIO] pauseForActivity error:', error);
    }
  }, [isPlaying, fadeVolume]);

  const resumeFromActivity = useCallback(async () => {
    if (pausedByRef.current !== 'activity') return;
    pausedByRef.current = null;
    
    if (!wasPlayingRef.current || !soundRef.current) return;
    
    try {
      await soundRef.current.playAsync();
      await fadeVolume(soundRef.current, 0, DEFAULT_VOLUME, 400);
      setIsPlaying(true);
      console.log('[AUDIO] Resumed from activity');
    } catch (error) {
      console.error('[AUDIO] resumeFromActivity error:', error);
    }
  }, [fadeVolume]);

  const pauseForOriginals = useCallback(async () => {
    if (!soundRef.current) return;
    pausedByRef.current = 'originals';
    wasPlayingRef.current = isPlaying;
    
    try {
      await fadeVolume(soundRef.current, DEFAULT_VOLUME, 0, 600);
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
      console.log('[AUDIO] Paused for Originals');
    } catch (error) {
      console.error('[AUDIO] pauseForOriginals error:', error);
    }
  }, [isPlaying, fadeVolume]);

  const resumeFromOriginals = useCallback(async () => {
    if (pausedByRef.current !== 'originals') return;
    pausedByRef.current = null;
    
    if (!wasPlayingRef.current || !soundRef.current) return;
    
    try {
      await soundRef.current.playAsync();
      await fadeVolume(soundRef.current, 0, DEFAULT_VOLUME, 600);
      setIsPlaying(true);
      console.log('[AUDIO] Resumed from Originals');
    } catch (error) {
      console.error('[AUDIO] resumeFromOriginals error:', error);
    }
  }, [fadeVolume]);

  const stopAll = useCallback(async () => {
    if (!soundRef.current) return;
    
    try {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setIsPlaying(false);
      pausedByRef.current = null;
      console.log('[AUDIO] Stopped all');
    } catch (error) {
      console.error('[AUDIO] stopAll error:', error);
    }
  }, []);

  return (
    <AudioContext.Provider
      value={{
        playState,
        handleSoundState,
        pauseForActivity,
        resumeFromActivity,
        pauseForOriginals,
        resumeFromOriginals,
        stopAll,
        stopSoundscape,
        currentState,
        isPlaying,
      }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
}
