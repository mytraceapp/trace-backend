import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { useAmbientAudio } from '../hooks/useAmbientAudio';

interface AmbientAudioPlayerProps {
  shouldPlay?: boolean;
  showControls?: boolean;
  volume?: number;
  startDelay?: number;
  playbackRate?: number;
  onReady?: () => void;
}

export function AmbientAudioPlayer({
  shouldPlay = false,
  showControls = true,
  volume = 0.4,
  startDelay = 100,
  playbackRate = 0.70,
  onReady,
}: AmbientAudioPlayerProps) {
  const { play, pause, isPlaying, isLoaded } = useAmbientAudio({
    src: '/audio/ambient-loop.mp3',
    volume,
    fadeInDuration: 2000,
    fadeOutDuration: 400,
    loop: true,
    startDelay,
    playbackRate,
  });
  
  const hasStartedRef = useRef(false);

  useEffect(() => {
    if (isLoaded && onReady) {
      onReady();
    }
  }, [isLoaded, onReady]);

  useEffect(() => {
    if (!isLoaded) return;
    
    if (shouldPlay && !isPlaying) {
      if (!hasStartedRef.current) {
        hasStartedRef.current = true;
        play();
      } else {
        play();
      }
    } else if (!shouldPlay && isPlaying) {
      pause();
    }
  }, [shouldPlay, isLoaded, isPlaying, play, pause]);

  if (!showControls) {
    return null;
  }

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5, duration: 0.3 }}
      onClick={() => (isPlaying ? pause() : play())}
      className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm transition-all"
      style={{
        backgroundColor: isPlaying ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
      }}
    >
      {isPlaying ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="6" y="4" width="4" height="16" rx="1" />
          <rect x="14" y="4" width="4" height="16" rx="1" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      )}
      <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.9)' }}>
        {isPlaying ? 'Pause' : 'Sound'}
      </span>
      
      {isPlaying && (
        <div className="flex items-center gap-0.5 ml-1">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="w-0.5 bg-white rounded-full"
              style={{ opacity: 0.7 }}
              animate={{
                height: ['8px', '14px', '8px'],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      )}
    </motion.button>
  );
}
