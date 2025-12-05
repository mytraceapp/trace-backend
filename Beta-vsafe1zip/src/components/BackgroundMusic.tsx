import { useEffect, useRef, useCallback, useState } from 'react';
import backgroundTone from '../assets/background-tone.mp3';

interface BackgroundMusicProps {
  playing?: boolean;
  volume?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  crossfadeDuration?: number;
}

export function BackgroundMusic({
  playing = true,
  volume = 0.3,
  fadeInDuration = 2000,
  fadeOutDuration = 2000,
  crossfadeDuration = 3000,
}: BackgroundMusicProps) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const nextSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const nextGainRef = useRef<GainNode | null>(null);
  const isPlayingRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const initAudioContext = useCallback(async () => {
    if (audioContextRef.current) return;

    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const response = await fetch(backgroundTone);
      const arrayBuffer = await response.arrayBuffer();
      audioBufferRef.current = await audioContextRef.current.decodeAudioData(arrayBuffer);
      
      setIsLoaded(true);
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }, []);

  const createSourceWithGain = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current) return null;

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBufferRef.current;
    
    const gain = audioContextRef.current.createGain();
    gain.gain.value = 0;
    
    source.connect(gain);
    gain.connect(audioContextRef.current.destination);
    
    return { source, gain };
  }, []);

  const startPlayback = useCallback(() => {
    if (!audioContextRef.current || !audioBufferRef.current || isPlayingRef.current) return;

    const result = createSourceWithGain();
    if (!result) return;

    const { source, gain } = result;
    sourceNodeRef.current = source;
    gainNodeRef.current = gain;
    
    const currentTime = audioContextRef.current.currentTime;
    const duration = audioBufferRef.current.duration;
    
    gain.gain.setValueAtTime(0, currentTime);
    gain.gain.linearRampToValueAtTime(volume, currentTime + fadeInDuration / 1000);
    
    source.start(0);
    isPlayingRef.current = true;

    const scheduleNextLoop = () => {
      if (!audioContextRef.current || !audioBufferRef.current || !isPlayingRef.current) return;

      const now = audioContextRef.current.currentTime;
      const crossfadeStart = duration - (crossfadeDuration / 1000);
      
      const nextResult = createSourceWithGain();
      if (!nextResult) return;

      nextSourceRef.current = nextResult.source;
      nextGainRef.current = nextResult.gain;

      const fadeOutStart = now + crossfadeStart;
      
      if (gainNodeRef.current) {
        gainNodeRef.current.gain.setValueAtTime(volume, fadeOutStart);
        gainNodeRef.current.gain.linearRampToValueAtTime(0, fadeOutStart + crossfadeDuration / 1000);
      }

      nextGainRef.current.gain.setValueAtTime(0, fadeOutStart);
      nextGainRef.current.gain.linearRampToValueAtTime(volume, fadeOutStart + crossfadeDuration / 1000);

      nextSourceRef.current.start(fadeOutStart);

      setTimeout(() => {
        if (sourceNodeRef.current) {
          try {
            sourceNodeRef.current.stop();
          } catch (e) {}
        }
        sourceNodeRef.current = nextSourceRef.current;
        gainNodeRef.current = nextGainRef.current;
        nextSourceRef.current = null;
        nextGainRef.current = null;
        
        if (isPlayingRef.current) {
          scheduleNextLoop();
        }
      }, (crossfadeStart + crossfadeDuration / 1000) * 1000);
    };

    setTimeout(scheduleNextLoop, 100);
  }, [volume, fadeInDuration, crossfadeDuration, createSourceWithGain]);

  const stopPlayback = useCallback(() => {
    if (!audioContextRef.current || !gainNodeRef.current) return;

    const currentTime = audioContextRef.current.currentTime;
    gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, currentTime);
    gainNodeRef.current.gain.linearRampToValueAtTime(0, currentTime + fadeOutDuration / 1000);

    isPlayingRef.current = false;

    setTimeout(() => {
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch (e) {}
        sourceNodeRef.current = null;
      }
      if (nextSourceRef.current) {
        try {
          nextSourceRef.current.stop();
        } catch (e) {}
        nextSourceRef.current = null;
      }
    }, fadeOutDuration);
  }, [fadeOutDuration]);

  useEffect(() => {
    const handleInteraction = () => {
      initAudioContext();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [initAudioContext]);

  useEffect(() => {
    if (!isLoaded) return;

    if (playing && audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (playing && !isPlayingRef.current) {
      startPlayback();
    } else if (!playing && isPlayingRef.current) {
      stopPlayback();
    }
  }, [playing, isLoaded, startPlayback, stopPlayback]);

  useEffect(() => {
    if (gainNodeRef.current && audioContextRef.current) {
      const currentTime = audioContextRef.current.currentTime;
      gainNodeRef.current.gain.setValueAtTime(gainNodeRef.current.gain.value, currentTime);
      gainNodeRef.current.gain.linearRampToValueAtTime(volume, currentTime + 0.5);
    }
  }, [volume]);

  useEffect(() => {
    return () => {
      isPlayingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch (e) {}
      }
      if (nextSourceRef.current) {
        try {
          nextSourceRef.current.stop();
        } catch (e) {}
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return null;
}

export function useMusicControl() {
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(0.3);

  const toggle = useCallback(() => setIsPlaying(prev => !prev), []);
  const play = useCallback(() => setIsPlaying(true), []);
  const pause = useCallback(() => setIsPlaying(false), []);

  return {
    isPlaying,
    volume,
    setVolume,
    toggle,
    play,
    pause,
  };
}
