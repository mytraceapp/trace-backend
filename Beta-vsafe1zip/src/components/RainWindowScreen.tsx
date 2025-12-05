import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BottomNav } from './BottomNav';
import { useEntries } from '../state/EntriesContext';

interface RainWindowScreenProps {
  onReturnToChat: () => void;
  onNavigateToActivities: () => void;
  onNavigateToJournal: () => void;
  onNavigateToProfile: () => void;
  onNavigateToHelp: () => void;
}

export function RainWindowScreen({
  onReturnToChat,
  onNavigateToActivities,
  onNavigateToJournal,
  onNavigateToProfile,
  onNavigateToHelp,
}: RainWindowScreenProps) {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);
  const timerRef = useRef<number | null>(null);
  const introTimeoutRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { addEntry } = useEntries();

  const ACTIVITY_DURATION = 180;

  // Audio disabled - add rain-ambient.mp3 to public/audio/ for rain sounds
  const startRainAudio = useCallback(() => {
    // No audio currently - silent rain window experience
  }, []);

  const stopRainAudio = useCallback(() => {
    // No audio to stop
  }, []);

  // Auto-start session on mount
  useEffect(() => {
    setIsActive(true);
    setIsPaused(false);
    setElapsedTime(0);
    startRainAudio();
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5; // 50% speed for dreamy, smooth feel
      videoRef.current.play().catch(() => {});
    }

    // Fade out intro after 10 seconds
    introTimeoutRef.current = window.setTimeout(() => {
      setIntroVisible(false);
    }, 10000);

    return () => {
      if (introTimeoutRef.current) {
        clearTimeout(introTimeoutRef.current);
      }
    };
  }, [startRainAudio]);

  const handleComplete = useCallback(() => {
    setShowCompletion(true);
    stopRainAudio();

    addEntry({
      type: 'session',
      title: 'Rain Window',
      body: 'Completed a Rain Window session',
      sourceScreen: 'RainWindowScreen',
      metadata: {
        activityType: 'Rain Window',
        duration: elapsedTime,
      },
    });

    setTimeout(() => {
      onReturnToChat();
    }, 3000);
  }, [addEntry, elapsedTime, onReturnToChat, stopRainAudio]);

  useEffect(() => {
    if (isActive && !isPaused) {
      timerRef.current = window.setInterval(() => {
        setElapsedTime(prev => {
          if (prev >= ACTIVITY_DURATION) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleComplete();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, isPaused, handleComplete]);

  useEffect(() => {
    return () => {
      stopRainAudio();
    };
  }, [stopRainAudio]);

  // Video setup - native loop with slow playback for dreamy effect
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = 0.5;
    video.loop = true;
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      style={{ background: '#0a0c0b' }}
    >
      <video
        ref={videoRef}
        className="absolute object-cover"
        src="/video/rain-window.mp4"
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(1.15)',
          minWidth: '115%',
          minHeight: '115%',
          width: 'auto',
          height: 'auto',
          filter: 'brightness(0.85) saturate(0.9)',
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(16, 17, 17, 0.4) 100%)',
        }}
      />

      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* TRACE Brand - top center */}
      <motion.div
        className="absolute z-20 w-full flex justify-center"
        style={{ top: '7%' }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.2 }}
      >
        <h1 style={{
          color: 'rgba(255, 255, 255, 0.68)',
          fontWeight: 300,
          letterSpacing: '0.8em',
          fontSize: '10px',
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          paddingLeft: '0.8em',
        }}>
          TRACE
        </h1>
      </motion.div>

      {/* Top UI Bar - Timer on the right */}
      {isActive && !showCompletion && (
        <motion.div 
          className="absolute top-0 left-0 right-0 flex items-center justify-end p-6 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div
            className="px-5 py-2.5 rounded-full"
            style={{
              background: 'rgba(0, 0, 0, 0.35)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              fontFamily: 'Georgia, serif',
              fontSize: '14px',
              fontWeight: 300,
              color: 'rgba(255, 255, 255, 0.20)',
              letterSpacing: '0.05em',
            }}
          >
            {formatTime(elapsedTime)}
          </div>
        </motion.div>
      )}

      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-8">
        <AnimatePresence mode="wait">
          {introVisible && !showCompletion && (
            <motion.div
              key="intro"
              className="text-center"
              style={{ marginTop: '-15px' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 1.5 } }}
              exit={{ opacity: 0, y: -6, transition: { duration: 3, ease: [0.4, 0, 0.2, 1] } }}
            >
              <motion.div
                style={{
                  marginBottom: '-3px',
                  display: 'flex',
                  justifyContent: 'center',
                  width: '100%',
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 1 }}
              >
                <svg 
                  width="41" 
                  height="41" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  style={{ filter: 'drop-shadow(0 2px 12px rgba(0, 0, 0, 0.3))' }}
                >
                  <path 
                    d="M12 2.5C12 2.5 5 10 5 14.5C5 18.366 8.134 21.5 12 21.5C15.866 21.5 19 18.366 19 14.5C19 10 12 2.5 12 2.5Z" 
                    stroke="rgba(255, 255, 255, 0.7)"
                    strokeWidth="1.1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </motion.div>
              
              <motion.h1
                style={{
                  fontFamily: 'Georgia, serif',
                  color: 'rgba(255, 255, 255, 0.75)',
                  fontSize: '22px',
                  fontWeight: 300,
                  marginBottom: '2px',
                  letterSpacing: '0.35em',
                  textShadow: '0 2px 20px rgba(0, 0, 0, 0.4)',
                  paddingLeft: '0.35em',
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
              >
                WINDOW
              </motion.h1>
              
              <motion.p
                style={{
                  fontFamily: 'Georgia, serif',
                  color: 'rgba(255, 255, 255, 0.55)',
                  fontSize: '14px',
                  fontWeight: 300,
                  lineHeight: 1.6,
                  maxWidth: '260px',
                  margin: '0 auto',
                  textShadow: '0 1px 10px rgba(0, 0, 0, 0.4)',
                  letterSpacing: '0.02em',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 1 }}
              >
                Watch the rain fall.
                <br />
                Let your thoughts drift.
              </motion.p>
            </motion.div>
          )}


          {showCompletion && (
            <motion.div
              key="completion"
              className="text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
            >
              <motion.h2
                style={{
                  fontFamily: 'Georgia, serif',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '26px',
                  fontWeight: 400,
                  marginBottom: '12px',
                  textShadow: '0 2px 20px rgba(0, 0, 0, 0.5)',
                }}
              >
                Session complete
              </motion.h2>
              <motion.p
                style={{
                  fontFamily: 'Georgia, serif',
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '15px',
                  fontWeight: 300,
                  textShadow: '0 1px 10px rgba(0, 0, 0, 0.4)',
                }}
              >
                The rain continues, softly.
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom End Session Button */}
      {isActive && !showCompletion && (
        <motion.div 
          className="absolute left-0 right-0 flex justify-center z-20" 
          style={{ bottom: '122px' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          <button
            onClick={handleComplete}
            className="px-8 py-3 rounded-full transition-all duration-300 hover:scale-105"
            style={{
              background: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(30px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              fontFamily: 'Georgia, serif',
              fontSize: '14px',
              fontWeight: 300,
              color: 'rgba(255, 255, 255, 0.68)',
              letterSpacing: '0.08em',
            }}
          >
            End Session
          </button>
        </motion.div>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-40">
        <BottomNav
          activeScreen="activities"
          onNavigateHome={onReturnToChat}
          onNavigateActivities={onNavigateToActivities}
          onNavigateJournal={onNavigateToJournal}
          onNavigateProfile={onNavigateToProfile}
          onNavigateHelp={onNavigateToHelp}
          variant="neutral"
          disableAnimation={true}
        />
      </div>
    </div>
  );
}
