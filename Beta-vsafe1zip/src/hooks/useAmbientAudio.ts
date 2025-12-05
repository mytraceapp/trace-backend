import { useRef, useCallback, useEffect, useState } from 'react';

interface UseAmbientAudioOptions {
  src: string;
  volume?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  loop?: boolean;
}

export function useAmbientAudio({
  src,
  volume = 0.5,
  fadeInDuration = 2000,
  fadeOutDuration = 2000,
  loop = true,
}: UseAmbientAudioOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeIntervalRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = loop;
    audio.volume = 0;
    audio.preload = 'auto';
    
    audio.addEventListener('canplaythrough', () => {
      setIsLoaded(true);
    });
    
    audio.addEventListener('ended', () => {
      if (!loop) {
        setIsPlaying(false);
      }
    });

    audioRef.current = audio;

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      audio.pause();
      audio.src = '';
    };
  }, [src, loop]);

  const fadeIn = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    const steps = 50;
    const stepDuration = fadeInDuration / steps;
    const volumeStep = volume / steps;
    let currentStep = 0;

    audio.volume = 0;
    audio.play().catch(console.error);
    setIsPlaying(true);

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const newVolume = Math.min(volumeStep * currentStep, volume);
      audio.volume = newVolume;

      if (currentStep >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
      }
    }, stepDuration);
  }, [fadeInDuration, volume]);

  const fadeOut = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    const steps = 50;
    const stepDuration = fadeOutDuration / steps;
    const startVolume = audio.volume;
    const volumeStep = startVolume / steps;
    let currentStep = 0;

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const newVolume = Math.max(startVolume - volumeStep * currentStep, 0);
      audio.volume = newVolume;

      if (currentStep >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        audio.pause();
        setIsPlaying(false);
      }
    }, stepDuration);
  }, [fadeOutDuration]);

  const play = useCallback(() => {
    fadeIn();
  }, [fadeIn]);

  const pause = useCallback(() => {
    fadeOut();
  }, [fadeOut]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0;
    setIsPlaying(false);
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = Math.max(0, Math.min(1, newVolume));
    }
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
