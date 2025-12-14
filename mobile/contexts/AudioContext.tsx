import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { Audio } from 'expo-av';

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

export function AudioProvider({ children }: AudioProviderProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasPlayingBeforeActivityRef = useRef(false);
  const targetVolumeRef = useRef(0.7);

  useEffect(() => {
    let isMounted = true;

    const loadSound = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          require('../assets/audio/ambient-loop.mp3'),
          {
            isLooping: true,
            volume: 0,
            shouldPlay: false,
            rate: 1.0,
            shouldCorrectPitch: true,
          }
        );

        if (isMounted) {
          soundRef.current = sound;
          setIsLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load ambient audio:', error);
      }
    };

    loadSound();

    return () => {
      isMounted = false;
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const fadeVolume = useCallback((sound: Audio.Sound, targetVolume: number, duration: number, callback?: () => void) => {
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
  }, []);

  const play = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound || !isLoaded) return;

    try {
      const status = await sound.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        return;
      }
      
      await sound.setVolumeAsync(0);
      await sound.playAsync();
      setIsPlaying(true);
      fadeVolume(sound, targetVolumeRef.current, 2000);
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }, [isLoaded, fadeVolume]);

  const pause = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;

    fadeVolume(sound, 0, 600, async () => {
      try {
        await sound.pauseAsync();
        setIsPlaying(false);
      } catch (error) {
        console.error('Failed to pause audio:', error);
      }
    });
  }, [fadeVolume]);

  const stop = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    try {
      await sound.stopAsync();
      await sound.setVolumeAsync(0);
      setIsPlaying(false);
    } catch (error) {
      console.error('Failed to stop audio:', error);
    }
  }, []);

  const setVolume = useCallback(async (newVolume: number) => {
    targetVolumeRef.current = newVolume;
    const sound = soundRef.current;
    if (!sound) return;

    try {
      await sound.setVolumeAsync(Math.max(0, Math.min(1, newVolume)));
    } catch {}
  }, []);

  const pauseForActivity = useCallback(async () => {
    const sound = soundRef.current;
    wasPlayingBeforeActivityRef.current = isPlaying;
    if (isPlaying && sound) {
      fadeVolume(sound, 0, 800, async () => {
        try {
          await sound.pauseAsync();
          setIsPlaying(false);
        } catch {}
      });
    }
  }, [isPlaying, fadeVolume]);

  const resumeFromActivity = useCallback(async () => {
    if (wasPlayingBeforeActivityRef.current) {
      const sound = soundRef.current;
      if (sound) {
        try {
          await sound.setVolumeAsync(0);
          await sound.playAsync();
          setIsPlaying(true);
          fadeVolume(sound, targetVolumeRef.current, 1500);
        } catch {}
      }
    }
  }, [fadeVolume]);

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
