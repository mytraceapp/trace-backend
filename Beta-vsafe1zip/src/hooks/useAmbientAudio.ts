import { useRef, useCallback, useEffect, useState } from 'react';

interface UseAmbientAudioOptions {
  src: string;
  volume?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  loop?: boolean;
  startDelay?: number;
  playbackRate?: number;
  crossfadeDuration?: number;
}

export function useAmbientAudio({
  src,
  volume = 0.5,
  fadeInDuration = 3500,
  fadeOutDuration = 2000,
  loop = true,
  startDelay = 0,
  playbackRate = 1.0,
  crossfadeDuration = 6,
}: UseAmbientAudioOptions) {
  const audio1Ref = useRef<HTMLAudioElement | null>(null);
  const audio2Ref = useRef<HTMLAudioElement | null>(null);
  const activeAudioRef = useRef<1 | 2>(1);
  const fadeIntervalRef = useRef<number | null>(null);
  const crossfadeIntervalRef = useRef<number | null>(null);
  const hasPlayedOnceRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const audio1 = new Audio(src);
    const audio2 = new Audio(src);
    
    [audio1, audio2].forEach(audio => {
      audio.loop = false;
      audio.volume = 0;
      audio.preload = 'auto';
      audio.playbackRate = playbackRate;
      audio.preservesPitch = true;
    });
    
    let loadedCount = 0;
    const onLoaded = () => {
      loadedCount++;
      if (loadedCount >= 2) {
        setIsLoaded(true);
      }
    };
    
    audio1.addEventListener('canplaythrough', onLoaded);
    audio2.addEventListener('canplaythrough', onLoaded);

    audio1Ref.current = audio1;
    audio2Ref.current = audio2;

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      if (crossfadeIntervalRef.current) {
        clearInterval(crossfadeIntervalRef.current);
      }
      audio1.pause();
      audio2.pause();
      audio1.src = '';
      audio2.src = '';
    };
  }, [src, playbackRate]);

  const startCrossfadeLoop = useCallback(() => {
    const audio1 = audio1Ref.current;
    const audio2 = audio2Ref.current;
    if (!audio1 || !audio2 || !loop) return;

    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
    }

    crossfadeIntervalRef.current = window.setInterval(() => {
      const activeAudio = activeAudioRef.current === 1 ? audio1 : audio2;
      const nextAudio = activeAudioRef.current === 1 ? audio2 : audio1;
      
      if (!activeAudio.duration || isNaN(activeAudio.duration)) return;
      
      const timeRemaining = activeAudio.duration - activeAudio.currentTime;
      
      if (timeRemaining <= crossfadeDuration && nextAudio.paused) {
        nextAudio.currentTime = 0;
        nextAudio.volume = 0;
        nextAudio.play().catch(() => {});
        
        const crossfadeSteps = 60;
        const stepDuration = (crossfadeDuration * 1000) / crossfadeSteps;
        let step = 0;
        
        const crossfade = setInterval(() => {
          step++;
          const progress = step / crossfadeSteps;
          const easedOut = 1 - Math.pow(progress, 2);
          const easedIn = 1 - Math.pow(1 - progress, 2);
          
          activeAudio.volume = Math.max(0, volume * easedOut);
          nextAudio.volume = Math.min(volume, volume * easedIn);
          
          if (step >= crossfadeSteps) {
            clearInterval(crossfade);
            activeAudio.pause();
            activeAudio.currentTime = 0;
            activeAudioRef.current = activeAudioRef.current === 1 ? 2 : 1;
          }
        }, stepDuration);
      }
    }, 200);
  }, [loop, volume, crossfadeDuration]);

  const stopCrossfadeLoop = useCallback(() => {
    if (crossfadeIntervalRef.current) {
      clearInterval(crossfadeIntervalRef.current);
      crossfadeIntervalRef.current = null;
    }
  }, []);

  const fadeIn = useCallback(() => {
    const audio = audio1Ref.current;
    if (!audio) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    const startFade = () => {
      const steps = 80;
      const stepDuration = fadeInDuration / steps;
      let currentStep = 0;

      audio.currentTime = 0;
      audio.volume = 0;
      activeAudioRef.current = 1;
      audio.play().catch(console.error);
      setIsPlaying(true);
      
      if (loop) {
        startCrossfadeLoop();
      }

      fadeIntervalRef.current = window.setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const newVolume = Math.min(easedProgress * volume, volume);
        audio.volume = newVolume;

        if (currentStep >= steps) {
          if (fadeIntervalRef.current) {
            clearInterval(fadeIntervalRef.current);
            fadeIntervalRef.current = null;
          }
        }
      }, stepDuration);
    };

    if (startDelay > 0) {
      setTimeout(startFade, startDelay);
    } else {
      startFade();
    }
  }, [fadeInDuration, volume, startDelay, loop, startCrossfadeLoop]);

  const fadeOut = useCallback(() => {
    const audio1 = audio1Ref.current;
    const audio2 = audio2Ref.current;
    if (!audio1 || !audio2) return;

    stopCrossfadeLoop();

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }

    const steps = 50;
    const stepDuration = fadeOutDuration / steps;
    const startVolume1 = audio1.volume;
    const startVolume2 = audio2.volume;
    let currentStep = 0;

    fadeIntervalRef.current = window.setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      audio1.volume = Math.max(0, startVolume1 * (1 - progress));
      audio2.volume = Math.max(0, startVolume2 * (1 - progress));

      if (currentStep >= steps) {
        if (fadeIntervalRef.current) {
          clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
        }
        audio1.pause();
        audio2.pause();
        setIsPlaying(false);
      }
    }, stepDuration);
  }, [fadeOutDuration, stopCrossfadeLoop]);

  const resume = useCallback(() => {
    const audio1 = audio1Ref.current;
    const audio2 = audio2Ref.current;
    if (!audio1 || !audio2) return;

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    const activeAudio = activeAudioRef.current === 1 ? audio1 : audio2;
    activeAudio.volume = volume;
    activeAudio.play().catch(console.error);
    setIsPlaying(true);
    
    if (loop) {
      startCrossfadeLoop();
    }
  }, [volume, loop, startCrossfadeLoop]);

  const play = useCallback(() => {
    if (hasPlayedOnceRef.current) {
      resume();
    } else {
      hasPlayedOnceRef.current = true;
      fadeIn();
    }
  }, [fadeIn, resume]);

  const pause = useCallback(() => {
    fadeOut();
  }, [fadeOut]);

  const stop = useCallback(() => {
    const audio1 = audio1Ref.current;
    const audio2 = audio2Ref.current;
    if (!audio1 || !audio2) return;

    stopCrossfadeLoop();

    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }

    audio1.pause();
    audio2.pause();
    audio1.currentTime = 0;
    audio2.currentTime = 0;
    audio1.volume = 0;
    audio2.volume = 0;
    setIsPlaying(false);
  }, [stopCrossfadeLoop]);

  const setVolume = useCallback((newVolume: number) => {
    const audio1 = audio1Ref.current;
    const audio2 = audio2Ref.current;
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    if (audio1 && !audio1.paused) {
      audio1.volume = clampedVolume;
    }
    if (audio2 && !audio2.paused) {
      audio2.volume = clampedVolume;
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
