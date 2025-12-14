import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

interface AudioContextValue {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  isPlaying: boolean;
  isLoaded: boolean;
  setVolume: (volume: number) => Promise<void>;
  pauseForActivity: () => Promise<void>;
  resumeFromActivity: () => Promise<void>;
}

const AudioContext = createContext<AudioContextValue | null>(null);

interface AudioProviderProps {
  children: ReactNode;
}

const CROSSFADE_DURATION = 400;
const CROSSFADE_TRIGGER_BEFORE_END = 500;

export function AudioProvider({ children }: AudioProviderProps) {
  const soundARef = useRef<Audio.Sound | null>(null);
  const soundBRef = useRef<Audio.Sound | null>(null);
  const activeSound = useRef<'A' | 'B'>('A');
  const trackDurationRef = useRef<number>(0);
  const isCrossfadingRef = useRef(false);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeIntervalBRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasPlayingBeforeActivityRef = useRef(false);
  const targetVolumeRef = useRef(0.1);

  const getActiveSound = useCallback(() => {
    return activeSound.current === 'A' ? soundARef.current : soundBRef.current;
  }, []);

  const getInactiveSound = useCallback(() => {
    return activeSound.current === 'A' ? soundBRef.current : soundARef.current;
  }, []);

  const fadeVolumeOnSound = useCallback((
    sound: Audio.Sound, 
    targetVolume: number, 
    duration: number, 
    intervalRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
    callback?: () => void
  ) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const steps = 20;
    const stepDuration = duration / steps;
    let currentStep = 0;

    sound.getStatusAsync().then((status) => {
      if (!status.isLoaded) return;
      
      const startVolume = status.volume;
      const volumeDiff = targetVolume - startVolume;

      intervalRef.current = setInterval(async () => {
        currentStep++;
        const progress = currentStep / steps;
        const easeProgress = progress * (2 - progress);
        const newVolume = startVolume + (volumeDiff * easeProgress);

        try {
          await sound.setVolumeAsync(Math.max(0, Math.min(1, newVolume)));
        } catch {}

        if (currentStep >= steps) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          callback?.();
        }
      }, stepDuration);
    });
  }, []);

  const performCrossfade = useCallback(async () => {
    if (isCrossfadingRef.current) return;
    isCrossfadingRef.current = true;

    const currentSound = getActiveSound();
    const nextSound = getInactiveSound();

    if (!currentSound || !nextSound) {
      isCrossfadingRef.current = false;
      return;
    }

    try {
      await nextSound.setPositionAsync(0);
      await nextSound.setVolumeAsync(0);
      await nextSound.playAsync();

      fadeVolumeOnSound(nextSound, targetVolumeRef.current, CROSSFADE_DURATION, fadeIntervalBRef);
      fadeVolumeOnSound(currentSound, 0, CROSSFADE_DURATION, fadeIntervalRef, async () => {
        try {
          await currentSound.pauseAsync();
          await currentSound.setPositionAsync(0);
        } catch {}
      });

      activeSound.current = activeSound.current === 'A' ? 'B' : 'A';
      
      setTimeout(() => {
        isCrossfadingRef.current = false;
      }, CROSSFADE_DURATION + 100);
    } catch (error) {
      isCrossfadingRef.current = false;
    }
  }, [getActiveSound, getInactiveSound, fadeVolumeOnSound]);

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    
    if (trackDurationRef.current === 0 && status.durationMillis) {
      trackDurationRef.current = status.durationMillis;
    }

    if (
      status.isPlaying && 
      status.positionMillis && 
      trackDurationRef.current > 0 &&
      !isCrossfadingRef.current
    ) {
      const timeRemaining = trackDurationRef.current - status.positionMillis;
      if (timeRemaining <= CROSSFADE_TRIGGER_BEFORE_END && timeRemaining > 0) {
        performCrossfade();
      }
    }
  }, [performCrossfade]);

  useEffect(() => {
    let isMounted = true;

    const loadSounds = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        const audioSource = require('../assets/audio/ambient-loop-mastered.m4a');

        const { sound: soundA } = await Audio.Sound.createAsync(
          audioSource,
          {
            isLooping: false,
            volume: 0,
            shouldPlay: false,
            rate: 1.0,
            shouldCorrectPitch: false,
          }
        );

        const { sound: soundB } = await Audio.Sound.createAsync(
          audioSource,
          {
            isLooping: false,
            volume: 0,
            shouldPlay: false,
            rate: 1.0,
            shouldCorrectPitch: false,
          }
        );

        if (isMounted) {
          soundARef.current = soundA;
          soundBRef.current = soundB;
          
          soundA.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
          soundB.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
          
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load ambient audio:', error);
      }
    };

    loadSounds();

    return () => {
      isMounted = false;
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      if (fadeIntervalBRef.current) {
        clearInterval(fadeIntervalBRef.current);
      }
      if (soundARef.current) {
        soundARef.current.unloadAsync();
      }
      if (soundBRef.current) {
        soundBRef.current.unloadAsync();
      }
    };
  }, [onPlaybackStatusUpdate]);

  const play = useCallback(async () => {
    const sound = getActiveSound();
    if (!sound || !isLoaded) return;

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        return;
      }
      
      await sound.setVolumeAsync(0);
      await sound.playAsync();
      setIsPlaying(true);
      fadeVolumeOnSound(sound, targetVolumeRef.current, 2000, fadeIntervalRef);
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }, [isLoaded, getActiveSound, fadeVolumeOnSound]);

  const pause = useCallback(async () => {
    const soundA = soundARef.current;
    const soundB = soundBRef.current;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }
    if (fadeIntervalBRef.current) {
      clearInterval(fadeIntervalBRef.current);
    }

    const pauseBoth = async () => {
      try {
        if (soundA) {
          await soundA.pauseAsync();
        }
        if (soundB) {
          await soundB.pauseAsync();
        }
        setIsPlaying(false);
      } catch (error) {
        console.error('Failed to pause audio:', error);
      }
    };

    const activeS = getActiveSound();
    if (activeS) {
      fadeVolumeOnSound(activeS, 0, 600, fadeIntervalRef, pauseBoth);
    } else {
      await pauseBoth();
    }
  }, [getActiveSound, fadeVolumeOnSound]);

  const stop = useCallback(async () => {
    const soundA = soundARef.current;
    const soundB = soundBRef.current;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }
    if (fadeIntervalBRef.current) {
      clearInterval(fadeIntervalBRef.current);
    }

    try {
      if (soundA) {
        await soundA.stopAsync();
        await soundA.setVolumeAsync(0);
        await soundA.setPositionAsync(0);
      }
      if (soundB) {
        await soundB.stopAsync();
        await soundB.setVolumeAsync(0);
        await soundB.setPositionAsync(0);
      }
      activeSound.current = 'A';
      setIsPlaying(false);
    } catch (error) {
      console.error('Failed to stop audio:', error);
    }
  }, []);

  const setVolume = useCallback(async (newVolume: number) => {
    targetVolumeRef.current = newVolume;
    const sound = getActiveSound();
    if (!sound) return;

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await sound.setVolumeAsync(Math.max(0, Math.min(1, newVolume)));
      }
    } catch {}
  }, [getActiveSound]);

  const pauseForActivity = useCallback(async () => {
    wasPlayingBeforeActivityRef.current = isPlaying;
    if (isPlaying) {
      const activeS = getActiveSound();
      if (activeS) {
        fadeVolumeOnSound(activeS, 0, 800, fadeIntervalRef, async () => {
          try {
            const soundA = soundARef.current;
            const soundB = soundBRef.current;
            if (soundA) await soundA.pauseAsync();
            if (soundB) await soundB.pauseAsync();
            setIsPlaying(false);
          } catch {}
        });
      }
    }
  }, [isPlaying, getActiveSound, fadeVolumeOnSound]);

  const resumeFromActivity = useCallback(async () => {
    if (wasPlayingBeforeActivityRef.current) {
      const sound = getActiveSound();
      if (sound) {
        try {
          await sound.setVolumeAsync(0);
          await sound.playAsync();
          setIsPlaying(true);
          fadeVolumeOnSound(sound, targetVolumeRef.current, 1500, fadeIntervalRef);
        } catch {}
      }
    }
  }, [getActiveSound, fadeVolumeOnSound]);

  const value: AudioContextValue = {
    play,
    pause,
    stop,
    isPlaying,
    isLoaded,
    setVolume,
    pauseForActivity,
    resumeFromActivity,
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export function useGlobalAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useGlobalAudio must be used within an AudioProvider');
  }
  return context;
}
