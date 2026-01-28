/**
 * TRACE Soundscape Engine
 * 
 * Maps emotional atmosphere states to ambient soundscapes.
 * Responds to sound_state from the Emotional Atmosphere Engine.
 */

import { playAmbient, stopAmbient, fadeTo, isPlaying } from './ambientAudio';

export type SoundState = 'presence' | 'grounding' | 'comfort' | 'reflective' | 'insight';

interface SoundStatePayload {
  current: SoundState;
  changed: boolean;
  reason?: string;
}

const SOUNDSCAPE_MAP: Record<SoundState, {
  source: any;
  volume: number;
  description: string;
}> = {
  presence: {
    source: require('../assets/audio/trace_ambient.m4a'),
    volume: 0.25,
    description: 'Default neutral presence'
  },
  grounding: {
    source: require('../assets/audio/rain-ambient.mp3'),
    volume: 0.4,
    description: 'Grounding during panic/anxiety'
  },
  comfort: {
    source: require('../assets/audio/ambient-loop-mastered.m4a'),
    volume: 0.35,
    description: 'Comfort during sadness/grief'
  },
  reflective: {
    source: require('../assets/audio/trace-echo-slow.mp3'),
    volume: 0.3,
    description: 'Reflective processing mode'
  },
  insight: {
    source: require('../assets/audio/trace-echo.mp3'),
    volume: 0.3,
    description: 'Insight/clarity moment'
  }
};

let currentSoundState: SoundState = 'presence';
let soundscapeEnabled = true;

export function getSoundscapeEnabled(): boolean {
  return soundscapeEnabled;
}

export function setSoundscapeEnabled(enabled: boolean): void {
  soundscapeEnabled = enabled;
  if (!enabled) {
    stopAmbient();
  }
}

export function getCurrentSoundState(): SoundState {
  return currentSoundState;
}

export async function handleSoundStateChange(payload: SoundStatePayload): Promise<void> {
  if (!soundscapeEnabled) {
    console.log('[SOUNDSCAPE] Disabled - skipping state change');
    return;
  }

  const { current, changed, reason } = payload;
  
  if (!changed) {
    return;
  }

  if (current === currentSoundState) {
    return;
  }

  const soundscape = SOUNDSCAPE_MAP[current];
  if (!soundscape) {
    console.warn('[SOUNDSCAPE] Unknown state:', current);
    return;
  }

  console.log(`[SOUNDSCAPE] Transitioning: ${currentSoundState} → ${current} (${reason || 'no reason'})`);
  
  try {
    if (isPlaying()) {
      await fadeTo(0.05, 500);
    }
    
    await playAmbient(`soundscape_${current}`, soundscape.source, soundscape.volume);
    currentSoundState = current;
    
    console.log(`[SOUNDSCAPE] Now playing: ${current} (${soundscape.description})`);
  } catch (error) {
    console.error('[SOUNDSCAPE] Failed to transition:', error);
  }
}

export async function initSoundscape(): Promise<void> {
  if (!soundscapeEnabled) return;
  
  const defaultState = SOUNDSCAPE_MAP.presence;
  try {
    await playAmbient('soundscape_presence', defaultState.source, defaultState.volume);
    currentSoundState = 'presence';
    console.log('[SOUNDSCAPE] Initialized with presence state');
  } catch (error) {
    console.error('[SOUNDSCAPE] Failed to initialize:', error);
  }
}
