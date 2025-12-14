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

const CROSSFADE_DURATION = 2000;
const CROSSFADE_TRIGGER_BEFORE_END = 2500;

export function AudioProvider({ children }: AudioProviderProps) {
  const soundARef = useRef<Audio.Sound | null>(null);
  const soundBRef = useRef<Audio.Sound | null>(null);
  const activeSoundRef = useRef<'A' | 'B'>('A');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const crossfadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasPlayingBeforeActivityRef = useRef(false);
  const targetVolumeRef = useRef(0.35);
  const isCrossfadingRef = useRef(false);
  const audioDurationRef = useRef(0);

  const getActiveSound = useCallback(() => {
    return activeSoundRef.current === 'A' ? soundARef.current : soundBRef.current;
  }, []);

  const getInactiveSound = useCallback(() => {
    return activeSoundRef.current === 'A' ? soundBRef.current : soundARef.current;
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSounds = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        const { sound: soundA } = await Audio.Sound.createAsync(
          require('../assets/audio/ambient-loop.mp3'),
          {
            isLooping: false,
            volume: 0,
            shouldPlay: false,
            rate: 1.0,
            shouldCorrectPitch: false,
          }
        );

        const { sound: soundB } = await Audio.Sound.createAsync(
          require('../assets/audio/ambient-loop.mp3'),
          {
            isLooping: false,
            volume: 0,
            shouldPlay: false,
            rate: 1.0,
            shouldCorrectPitch: false,
          }
        );

        const status = await soundA.getStatusAsync();
        if (status.isLoaded && status.durationMillis) {
          audioDurationRef.current = status.durationMillis;
        }

        if (isMounted) {
          soundARef.current = soundA;
          soundBRef.current = soundB;
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load ambient audio:', error);
      }
    };

    loadSounds();

    return () => {
      isMounted = false;
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (crossfadeIntervalRef.current) clearInterval(crossfadeIntervalRef.current);
      if (soundARef.current) soundARef.current.unloadAsync();
      if (soundBRef.current) soundBRef.current.unloadAsync();
    };
  }, []);

  const fadeSound = useCallback((sound: Audio.Sound, targetVolume: number, duration: number, callback?: () => void) => {
    sound.getStatusAsync().then((status) => {
      if (!status.isLoaded) return;
      
      const startVolume = status.volume;
      const volumeDiff = targetVolume - startVolume;
      const steps = 30;
      const stepDuration = duration / steps;
      let currentStep = 0;

      const intervalId = setInterval(async () => {
        currentStep++;
        const progress = currentStep / steps;
        const easeProgress = progress * (2 - progress);
        const newVolume = startVolume + (volumeDiff * easeProgress);

        try {
          await sound.setVolumeAsync(Math.max(0, Math.min(1, newVolume)));
        } catch {}

        if (currentStep >= steps) {
          clearInterval(intervalId);
          callback?.();
        }
      }, stepDuration);
    });
  }, []);

  const startCrossfadeLoop = useCallback(() => {
    const checkAndCrossfade = async () => {
      if (isCrossfadingRef.current || !isPlaying) return;

      const activeSound = getActiveSound();
      if (!activeSound) return;

      try {
        const status = await activeSound.getStatusAsync();
        if (!status.isLoaded) return;

        const position = status.positionMillis || 0;
        const duration = status.durationMillis || audioDurationRef.current;
        const timeRemaining = duration - position;

        if (timeRemaining <= CROSSFADE_TRIGGER_BEFORE_END && timeRemaining > 0) {
          isCrossfadingRef.current = true;

          const inactiveSound = getInactiveSound();
          if (!inactiveSound) return;

          await inactiveSound.setPositionAsync(0);
          await inactiveSound.setVolumeAsync(0);
          await inactiveSound.playAsync();

          fadeSound(inactiveSound, targetVolumeRef.current, CROSSFADE_DURATION);
          fadeSound(activeSound, 0, CROSSFADE_DURATION, async () => {
            try {
              await activeSound.stopAsync();
              await activeSound.setPositionAsync(0);
            } catch {}
            activeSoundRef.current = activeSoundRef.current === 'A' ? 'B' : 'A';
            isCrossfadingRef.current = false;
          });
        }
      } catch {}
    };

    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
    }
    crossfadeIntervalRef.current = setInterval(checkAndCrossfade, 500);
  }, [isPlaying, getActiveSound, getInactiveSound, fadeSound]);

  const fadeVolume = useCallback((targetVolume: number, duration: number, callback?: () => void) => {
    const sound = getActiveSound();
    if (!sound) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    const steps = 30;
    const stepDuration = duration / steps;
    let currentStep = 0;

    sound.getStatusAsync().then((status) => {
      if (!status.isLoaded) return;
      
      const startVolume = status.volume;
      const volumeDiff = targetVolume - startVolume;

      fadeIntervalRef.current = setInterval(async () => {
        currentStep++;
        const progress = currentStep / steps;
        const easeProgress = progress * (2 - progress);
        const newVolume = startVolume + (volumeDiff * easeProgress);

        try {
          await sound.setVolumeAsync(Math.max(0, Math.min(1, newVolume)));
        } catch {}

        if (currentStep >= steps) {
          if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
          }
          callback?.();
        }
      }, stepDuration);
    });
  }, [getActiveSound]);

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
      fadeVolume(targetVolumeRef.current, 2000);
      startCrossfadeLoop();
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }, [isLoaded, fadeVolume, getActiveSound, startCrossfadeLoop]);

  const pause = useCallback(async () => {
    const sound = getActiveSound();
    if (!sound) return;

    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
    }

    fadeVolume(0, 600, async () => {
      try {
        await sound.pauseAsync();
        setIsPlaying(false);
      } catch (error) {
        console.error('Failed to pause audio:', error);
      }
    });
  }, [fadeVolume, getActiveSound]);

  const stop = useCallback(async () => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    if (crossfadeIntervalRef.current) clearInterval(crossfadeIntervalRef.current);

    try {
      if (soundARef.current) {
        await soundARef.current.stopAsync();
        await soundARef.current.setVolumeAsync(0);
        await soundARef.current.setPositionAsync(0);
      }
      if (soundBRef.current) {
        await soundBRef.current.stopAsync();
        await soundBRef.current.setVolumeAsync(0);
        await soundBRef.current.setPositionAsync(0);
      }
      setIsPlaying(false);
      activeSoundRef.current = 'A';
      isCrossfadingRef.current = false;
    } catch (error) {
      console.error('Failed to stop audio:', error);
    }
  }, []);

  const setVolume = useCallback(async (newVolume: number) => {
    targetVolumeRef.current = newVolume;
    const sound = getActiveSound();
    if (!sound) return;

    try {
      await sound.setVolumeAsync(Math.max(0, Math.min(1, newVolume)));
    } catch {}
  }, [getActiveSound]);

  const pauseForActivity = useCallback(async () => {
    wasPlayingBeforeActivityRef.current = isPlaying;
    if (isPlaying) {
      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current);
      }
      
      const sound = getActiveSound();
      if (sound) {
        fadeSound(sound, 0, 800, async () => {
          try {
            await sound.pauseAsync();
            setIsPlaying(false);
          } catch {}
        });
      }
    }
  }, [isPlaying, getActiveSound, fadeSound]);

  const resumeFromActivity = useCallback(async () => {
    if (wasPlayingBeforeActivityRef.current) {
      const sound = getActiveSound();
      if (sound) {
        try {
          await sound.setVolumeAsync(0);
          await sound.playAsync();
          setIsPlaying(true);
          fadeSound(sound, targetVolumeRef.current, 1500);
          startCrossfadeLoop();
        } catch {}
      }
    }
  }, [getActiveSound, fadeSound, startCrossfadeLoop]);

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
