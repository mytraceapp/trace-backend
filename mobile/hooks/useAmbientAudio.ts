import { useEffect, useRef, useState, useCallback } from 'react';
import { Audio } from 'expo-av';

interface UseAmbientAudioOptions {
  volume?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  loop?: boolean;
  playbackRate?: number;
}

export function useAmbientAudio({
  volume = 0.35,
  fadeInDuration = 2000,
  fadeOutDuration = 400,
  loop = true,
  playbackRate = 1.0,
}: UseAmbientAudioOptions = {}) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetVolumeRef = useRef(volume);
  const playbackRateRef = useRef(playbackRate);

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
            isLooping: loop,
            volume: 0,
            shouldPlay: false,
            rate: playbackRateRef.current,
            shouldCorrectPitch: false,
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
  }, [loop, playbackRate]);

  const fadeVolume = useCallback((targetVolume: number, duration: number, callback?: () => void) => {
    const sound = soundRef.current;
    if (!sound) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    const steps = 20;
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
      await sound.setVolumeAsync(0);
      await sound.setRateAsync(playbackRateRef.current, false);
      await sound.playAsync();
      setIsPlaying(true);
      fadeVolume(targetVolumeRef.current, fadeInDuration);
    } catch (error) {
      console.error('Failed to play audio:', error);
    }
  }, [isLoaded, fadeVolume, fadeInDuration]);

  const pause = useCallback(async () => {
    const sound = soundRef.current;
    if (!sound) return;

    fadeVolume(0, fadeOutDuration, async () => {
      try {
        await sound.pauseAsync();
        setIsPlaying(false);
      } catch (error) {
        console.error('Failed to pause audio:', error);
      }
    });
  }, [fadeVolume, fadeOutDuration]);

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

  return {
    play,
    pause,
    stop,
    isPlaying,
    isLoaded,
    setVolume,
  };
}
