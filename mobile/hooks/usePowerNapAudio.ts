import { useEffect, useRef, useCallback, useState } from 'react';
import { Audio } from 'expo-av';

interface UsePowerNapAudioOptions {
  volume?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
}

export function usePowerNapAudio({
  volume = 0.35,
  fadeInDuration = 3000,
  fadeOutDuration = 1000,
}: UsePowerNapAudioOptions = {}) {
  const ambientSoundRef = useRef<Audio.Sound | null>(null);
  const chimeSoundRef = useRef<Audio.Sound | null>(null);
  const chimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isAmbientLoaded, setIsAmbientLoaded] = useState(false);
  const [isChimeLoaded, setIsChimeLoaded] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadSounds = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });

        const { sound: ambientSound } = await Audio.Sound.createAsync(
          require('../assets/audio/power-nap-ambient.mp3'),
          {
            isLooping: true,
            volume: 0,
            shouldPlay: false,
          }
        );

        const { sound: chimeSound } = await Audio.Sound.createAsync(
          require('../assets/audio/power-nap-chime.mp3'),
          {
            isLooping: false,
            volume: volume,
            shouldPlay: false,
          }
        );

        if (isMounted) {
          ambientSoundRef.current = ambientSound;
          chimeSoundRef.current = chimeSound;
          setIsAmbientLoaded(true);
          setIsChimeLoaded(true);
        }
      } catch (error) {
        console.error('Failed to load power nap audio:', error);
      }
    };

    loadSounds();

    return () => {
      isMounted = false;
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
      ambientSoundRef.current?.unloadAsync();
      chimeSoundRef.current?.unloadAsync();
    };
  }, [volume]);

  const fadeVolume = useCallback(
    (
      sound: Audio.Sound,
      targetVolume: number,
      duration: number,
      callback?: () => void
    ) => {
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
          const newVolume = startVolume + volumeDiff * easeProgress;

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
    },
    []
  );

  const startAmbientDrone = useCallback(async () => {
    const sound = ambientSoundRef.current;
    if (!sound || !isAmbientLoaded) return;

    try {
      await sound.setVolumeAsync(0);
      await sound.setPositionAsync(0);
      await sound.playAsync();
      fadeVolume(sound, volume, fadeInDuration);
    } catch (error) {
      console.error('Failed to start ambient drone:', error);
    }
  }, [isAmbientLoaded, fadeVolume, volume, fadeInDuration]);

  const stopAmbientDrone = useCallback(async () => {
    const sound = ambientSoundRef.current;
    if (!sound) return;

    fadeVolume(sound, 0, fadeOutDuration, async () => {
      try {
        await sound.pauseAsync();
      } catch (error) {
        console.error('Failed to stop ambient drone:', error);
      }
    });
  }, [fadeVolume, fadeOutDuration]);

  const playWakeUpChime = useCallback(async () => {
    const sound = chimeSoundRef.current;
    if (!sound || !isChimeLoaded) return;

    try {
      await sound.setPositionAsync(0);
      await sound.setVolumeAsync(volume);
      await sound.playAsync();
    } catch (error) {
      console.error('Failed to play wake up chime:', error);
    }
  }, [isChimeLoaded, volume]);

  const startRepeatingChime = useCallback(
    (intervalMs: number = 6000) => {
      playWakeUpChime();

      chimeIntervalRef.current = setInterval(() => {
        playWakeUpChime();
      }, intervalMs);
    },
    [playWakeUpChime]
  );

  const stopRepeatingChime = useCallback(() => {
    if (chimeIntervalRef.current) {
      clearInterval(chimeIntervalRef.current);
      chimeIntervalRef.current = null;
    }
  }, []);

  const cleanup = useCallback(async () => {
    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
    if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);

    try {
      await ambientSoundRef.current?.stopAsync();
      await chimeSoundRef.current?.stopAsync();
    } catch {}
  }, []);

  return {
    startAmbientDrone,
    stopAmbientDrone,
    playWakeUpChime,
    startRepeatingChime,
    stopRepeatingChime,
    cleanup,
    isLoaded: isAmbientLoaded && isChimeLoaded,
  };
}
