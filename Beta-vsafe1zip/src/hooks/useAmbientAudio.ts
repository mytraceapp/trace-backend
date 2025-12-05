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
  fadeInDuration = 2000,
  fadeOutDuration = 400,
  loop = true,
  startDelay = 0,
  playbackRate = 1.0,
  crossfadeDuration = 0.8,
}: UseAmbientAudioOptions) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef(false);
  const loopTimeoutRef = useRef<number | null>(null);
  const hasPlayedOnceRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadAudio = async () => {
      try {
        const context = new AudioContext();
        audioContextRef.current = context;

        const masterGain = context.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(context.destination);
        masterGainRef.current = masterGain;

        const response = await fetch(src);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await context.decodeAudioData(arrayBuffer);
        audioBufferRef.current = audioBuffer;
        
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load audio:', error);
      }
    };

    loadAudio();

    return () => {
      if (loopTimeoutRef.current) {
        clearTimeout(loopTimeoutRef.current);
      }
      isPlayingRef.current = false;
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [src]);

  const scheduleLoop = useCallback(() => {
    const context = audioContextRef.current;
    const buffer = audioBufferRef.current;
    const masterGain = masterGainRef.current;

    if (!context || !buffer || !masterGain || !isPlayingRef.current) return;

    if (context.state === 'suspended') {
      context.resume();
    }

    const source = context.createBufferSource();
    const gainNode = context.createGain();

    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    source.connect(gainNode);
    gainNode.connect(masterGain);

    const now = context.currentTime;
    const duration = buffer.duration / playbackRate;
    const fadeTime = crossfadeDuration;

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(1, now + fadeTime);

    gainNode.gain.setValueAtTime(1, now + duration - fadeTime);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    source.start(now);
    source.stop(now + duration);

    if (loop && isPlayingRef.current) {
      const nextLoopTime = (duration - fadeTime) * 1000;
      loopTimeoutRef.current = window.setTimeout(() => {
        if (isPlayingRef.current) {
          scheduleLoop();
        }
      }, nextLoopTime);
    }
  }, [playbackRate, crossfadeDuration, loop]);

  const fadeIn = useCallback(() => {
    const context = audioContextRef.current;
    const masterGain = masterGainRef.current;

    if (!context || !masterGain) return;

    const startFade = () => {
      if (context.state === 'suspended') {
        context.resume();
      }

      isPlayingRef.current = true;
      setIsPlaying(true);

      const now = context.currentTime;
      masterGain.gain.cancelScheduledValues(now);
      masterGain.gain.setValueAtTime(0, now);
      masterGain.gain.linearRampToValueAtTime(volume, now + fadeInDuration / 1000);

      scheduleLoop();
    };

    if (startDelay > 0) {
      setTimeout(startFade, startDelay);
    } else {
      startFade();
    }
  }, [fadeInDuration, volume, startDelay, scheduleLoop]);

  const fadeOut = useCallback(() => {
    const context = audioContextRef.current;
    const masterGain = masterGainRef.current;

    if (!context || !masterGain) return;

    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }

    const now = context.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(masterGain.gain.value, now);
    masterGain.gain.linearRampToValueAtTime(0, now + fadeOutDuration / 1000);

    setTimeout(() => {
      isPlayingRef.current = false;
      setIsPlaying(false);
    }, fadeOutDuration);
  }, [fadeOutDuration]);

  const resume = useCallback(() => {
    const context = audioContextRef.current;
    const masterGain = masterGainRef.current;

    if (!context || !masterGain) return;

    if (context.state === 'suspended') {
      context.resume();
    }

    isPlayingRef.current = true;
    setIsPlaying(true);

    const now = context.currentTime;
    masterGain.gain.cancelScheduledValues(now);
    masterGain.gain.setValueAtTime(volume, now);

    scheduleLoop();
  }, [volume, scheduleLoop]);

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
    if (loopTimeoutRef.current) {
      clearTimeout(loopTimeoutRef.current);
      loopTimeoutRef.current = null;
    }

    const masterGain = masterGainRef.current;
    if (masterGain) {
      masterGain.gain.value = 0;
    }

    isPlayingRef.current = false;
    setIsPlaying(false);
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const masterGain = masterGainRef.current;
    if (masterGain) {
      masterGain.gain.value = Math.max(0, Math.min(1, newVolume));
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
