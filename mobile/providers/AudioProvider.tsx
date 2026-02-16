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
  currentState: SoundState | null;
  isPlaying: boolean;
  tracksPlayedInState: number;
  getTracksPlayedSync: () => number;
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
const CROSSFADE_MS = 2400;

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const currentStateRef = useRef<SoundState | null>(null);
  const playedTracksRef = useRef<Record<SoundState, number[]>>({
    presence: [],
    grounding: [],
    comfort: [],
    reflective: [],
    insight: [],
  });
  const pausedByRef = useRef<'activity' | 'originals' | null>(null);
  const wasPlayingRef = useRef(false);
  const [currentState, setCurrentState] = useState<SoundState | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracksPlayedInState, setTracksPlayedInState] = useState(0);

  const queuedStateRef = useRef<SoundState | null>(null);
  const tracksInCurrentStateRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const playStateRef = useRef<((state: SoundState, fadeMs?: number) => Promise<void>) | null>(null);
  const stateChangeEpochRef = useRef(0);

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  }, []);

  const getNextTrack = useCallback((state: SoundState): number => {
    const played = playedTracksRef.current[state];
    const allTracks = Array.from({ length: TRACKS_PER_FOLDER }, (_, i) => i + 1);
    const available = allTracks.filter(t => !played.includes(t));

    console.log(`[AUDIO] 🎵 Track rotation for "${state}": played=${JSON.stringify(played)}, available=${JSON.stringify(available)}`);

    let selected: number;
    if (available.length === 0) {
      console.log(`[AUDIO] All ${TRACKS_PER_FOLDER} tracks played for "${state}", resetting rotation`);
      playedTracksRef.current[state] = [];
      selected = allTracks[Math.floor(Math.random() * allTracks.length)];
    } else {
      selected = available[Math.floor(Math.random() * available.length)];
    }

    playedTracksRef.current[state].push(selected);
    console.log(`[AUDIO] 🎵 Selected track #${selected} for "${state}" (${playedTracksRef.current[state].length}/${TRACKS_PER_FOLDER} in rotation)`);
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
    if (isTransitioningRef.current) {
      console.log(`[AUDIO] Already transitioning, queueing ${state}`);
      queuedStateRef.current = state;
      return;
    }

    isTransitioningRef.current = true;
    console.log(`[AUDIO] playState: ${state} (fade: ${fadeMs}ms)`);

    const isSameState = currentStateRef.current === state;
    if (!isSameState) {
      tracksInCurrentStateRef.current = 0;
      stateChangeEpochRef.current++;
      queuedStateRef.current = null;
      console.log(`[AUDIO] State change: ${currentStateRef.current} → ${state}, counter reset to 0, epoch=${stateChangeEpochRef.current}`);
    }

    const trackNum = getNextTrack(state);
    const source = loadTrackSource(state, trackNum);

    if (!source) {
      console.warn(`[AUDIO] No source for ${state} track ${trackNum}`);
      isTransitioningRef.current = false;
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
        isLooping: false,
        volume: 0,
      });

      const epochAtStart = stateChangeEpochRef.current;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          if (stateChangeEpochRef.current !== epochAtStart) {
            console.log(`[AUDIO] Ignoring stale didJustFinish (epoch ${epochAtStart} vs ${stateChangeEpochRef.current})`);
            return;
          }

          const thisState = currentStateRef.current;
          const queued = queuedStateRef.current;

          console.log(`[AUDIO] 🎵 Track finished (${tracksInCurrentStateRef.current + 1} played in "${thisState}"). Queued: ${queued || 'none'}`);

          tracksInCurrentStateRef.current++;
          setTracksPlayedInState(tracksInCurrentStateRef.current);

          const advance = (targetState: SoundState, fade: number) => {
            Promise.resolve(playStateRef.current?.(targetState, fade)).catch((err) => {
              console.error(`[AUDIO] Auto-advance error for "${targetState}":`, err);
              setTimeout(() => {
                console.log(`[AUDIO] Retrying auto-advance for "${targetState}"...`);
                playStateRef.current?.(targetState, fade);
              }, 1000);
            });
          };

          if (queued && queued !== thisState) {
            console.log(`[AUDIO] 🔄 Track finished — switching to queued state: ${queued}`);
            queuedStateRef.current = null;
            advance(queued, CROSSFADE_MS);
          } else if (thisState) {
            console.log(`[AUDIO] 🎵 Auto-advancing to next track in "${thisState}"`);
            advance(thisState, CROSSFADE_MS);
          }
        }
      });

      soundRef.current = sound;
      currentStateRef.current = state;
      setCurrentState(state);

      tracksInCurrentStateRef.current = isSameState ? tracksInCurrentStateRef.current : 0;
      setTracksPlayedInState(tracksInCurrentStateRef.current);

      await sound.playAsync();
      setIsPlaying(true);

      await fadeVolume(sound, 0, DEFAULT_VOLUME, fadeMs / 2);

      console.log(`[AUDIO] Now playing: ${STATE_FOLDERS[state]}/track_${trackNum} (track ${tracksInCurrentStateRef.current + 1} in state)`);
    } catch (error) {
      console.error('[AUDIO] playState error:', error);
    } finally {
      isTransitioningRef.current = false;
    }
  }, [getNextTrack, loadTrackSource, fadeVolume]);

  useEffect(() => {
    playStateRef.current = playState;
  }, [playState]);

  const stopSoundscape = useCallback(async () => {
    if (!soundRef.current) {
      console.log('[AUDIO] No soundscape playing to stop');
      return;
    }

    try {
      const hadQueued = queuedStateRef.current;
      console.log(`[AUDIO] Stopping soundscape, returning to global ambient (queued: ${hadQueued || 'none'})`);
      await fadeVolume(soundRef.current, DEFAULT_VOLUME, 0, DEFAULT_FADE_MS);
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      currentStateRef.current = null;
      tracksInCurrentStateRef.current = 0;
      stateChangeEpochRef.current++;
      setCurrentState(null);
      setIsPlaying(false);
      setTracksPlayedInState(0);

      console.log('[AUDIO] Soundscape stopped - global ambient should resume');
    } catch (error) {
      console.error('[AUDIO] stopSoundscape error:', error);
    }
  }, [fadeVolume]);

  const handleSoundState = useCallback(async (payload: SoundStatePayload) => {
    if (pausedByRef.current) {
      if (payload.changed && payload.current !== currentStateRef.current) {
        console.log(`[AUDIO] Paused by ${pausedByRef.current} — queueing state change to ${payload.current}`);
        queuedStateRef.current = payload.current;
      }
      return;
    }

    const isFirstActivation = !currentStateRef.current && !soundRef.current;
    const soundscapeDied = currentStateRef.current && !soundRef.current;

    if (!payload.changed && !isFirstActivation && !soundscapeDied) {
      return;
    }

    if (payload.current === currentStateRef.current && !isFirstActivation && !soundscapeDied) {
      console.log(`[AUDIO] Already in "${payload.current}", ignoring`);
      return;
    }

    if (isFirstActivation) {
      console.log(`[AUDIO] First activation: starting "${payload.current}" soundscape`);
      await playState(payload.current, DEFAULT_FADE_MS);
      return;
    }

    if (soundscapeDied && payload.current === currentStateRef.current) {
      console.log(`[AUDIO] 🔧 Soundscape died while in "${payload.current}" — restarting`);
      await playState(payload.current, DEFAULT_FADE_MS);
      return;
    }

    const isUrgent = payload.reason?.includes('extreme_spike') || payload.reason?.includes('crisis');

    if (isUrgent) {
      console.log(`[AUDIO] ⚡ URGENT state change: ${currentStateRef.current} → ${payload.current} (${payload.reason})`);
      queuedStateRef.current = null;
      await playState(payload.current, 600);
      return;
    }

    console.log(`[AUDIO] 📋 Queueing state change: ${currentStateRef.current} → ${payload.current} (will switch after current track finishes)`);
    queuedStateRef.current = payload.current;
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

    const queued = queuedStateRef.current;
    if (queued && queued !== currentStateRef.current) {
      console.log(`[AUDIO] Resuming from activity with queued state: ${queued}`);
      queuedStateRef.current = null;
      await playState(queued, CROSSFADE_MS);
      return;
    }

    try {
      await soundRef.current.playAsync();
      await fadeVolume(soundRef.current, 0, DEFAULT_VOLUME, 400);
      setIsPlaying(true);
      console.log('[AUDIO] Resumed from activity');
    } catch (error) {
      console.error('[AUDIO] resumeFromActivity error:', error);
    }
  }, [fadeVolume, playState]);

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

    const queued = queuedStateRef.current;
    if (queued && queued !== currentStateRef.current) {
      console.log(`[AUDIO] Resuming from Originals with queued state: ${queued}`);
      queuedStateRef.current = null;
      await playState(queued, CROSSFADE_MS);
      return;
    }

    try {
      await soundRef.current.playAsync();
      await fadeVolume(soundRef.current, 0, DEFAULT_VOLUME, 600);
      setIsPlaying(true);
      console.log('[AUDIO] Resumed from Originals');
    } catch (error) {
      console.error('[AUDIO] resumeFromOriginals error:', error);
    }
  }, [fadeVolume, playState]);

  const getTracksPlayedSync = useCallback(() => {
    return tracksInCurrentStateRef.current;
  }, []);

  const stopAll = useCallback(async () => {
    if (!soundRef.current) return;

    try {
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setIsPlaying(false);
      pausedByRef.current = null;
      queuedStateRef.current = null;
      tracksInCurrentStateRef.current = 0;
      stateChangeEpochRef.current++;
      setTracksPlayedInState(0);
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
        tracksPlayedInState,
        getTracksPlayedSync,
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
