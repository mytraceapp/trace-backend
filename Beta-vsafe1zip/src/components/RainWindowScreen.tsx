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
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);
  const [videoOpacity, setVideoOpacity] = useState(1);
  const [volume, setVolume] = useState(0.6);
  const [quietMode, setQuietMode] = useState(false);
  const [quietToast, setQuietToast] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const introTimeoutRef = useRef<number | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const quietVideoRef = useRef<HTMLVideoElement | null>(null);
  const isFadingRef = useRef(false);
  const { addEntry } = useEntries();

  // Slow down quiet video by 30% and skip first 12 seconds (camera motion)
  useEffect(() => {
    const video = quietVideoRef.current;
    if (video) {
      video.playbackRate = 0.7;
      video.currentTime = 12;
      
      // When video loops, skip back to 12 seconds instead of 0
      const handleLoop = () => {
        if (video.currentTime < 12) {
          video.currentTime = 12;
        }
      };
      video.addEventListener('timeupdate', handleLoop);
      return () => video.removeEventListener('timeupdate', handleLoop);
    }
  }, []);

  // Toggle quiet mode with micro-toast
  const toggleQuietMode = useCallback(() => {
    setQuietMode(prev => {
      const newMode = !prev;
      setQuietToast(newMode ? "Quiet visuals on." : "Back to normal mode.");
      setTimeout(() => setQuietToast(null), 2000);
      return newMode;
    });
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Real rain audio slowed for dreamy effect
  const startRainAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio('/audio/rain-ambient.mp3');
      audio.loop = true;
      audio.volume = 0;
      audio.playbackRate = 0.575; // 57.5% speed
      audio.preservesPitch = false;
      audioRef.current = audio;
    }
    
    const audio = audioRef.current;
    audio.play().catch(() => {});
    
    // Gentle fade in over 3 seconds to target volume
    let vol = 0;
    const targetVol = volume;
    const fadeIn = setInterval(() => {
      vol += 0.02;
      if (vol >= targetVol) {
        vol = targetVol;
        clearInterval(fadeIn);
      }
      if (audioRef.current) audioRef.current.volume = vol;
    }, 60);
  }, [volume]);

  // Update audio volume when slider changes
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  const stopRainAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      // Gentle fade out over 2 seconds
      const fadeOut = setInterval(() => {
        if (audio.volume > 0.02) {
          audio.volume -= 0.02;
        } else {
          audio.volume = 0;
          audio.pause();
          clearInterval(fadeOut);
        }
      }, 40);
    }
  }, []);

  // Auto-start session on mount
  useEffect(() => {
    setIsActive(true);
    setElapsedTime(0);
    startRainAudio();
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.5;
      videoRef.current.play().catch(() => {});
    }

    // Fade out intro after 7 seconds
    introTimeoutRef.current = window.setTimeout(() => {
      setIntroVisible(false);
    }, 7000);

    return () => {
      if (introTimeoutRef.current) {
        clearTimeout(introTimeoutRef.current);
      }
    };
  }, [startRainAudio]);

  // Trigger gentle haptic feedback
  const triggerHaptic = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]); // Gentle double pulse
    }
  }, []);

  const handleComplete = useCallback(() => {
    triggerHaptic();
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
  }, [addEntry, elapsedTime, onReturnToChat, stopRainAudio, triggerHaptic]);

  // Track elapsed time for session logging (endless mode, no auto-complete)
  useEffect(() => {
    if (isActive) {
      timerRef.current = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  useEffect(() => {
    return () => {
      stopRainAudio();
    };
  }, [stopRainAudio]);

  // Video setup - loop only first 13 seconds (single take)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = 0.5;

    const loopEnd = 13; // Only use first 13 seconds

    const handleTimeUpdate = () => {
      if (video.currentTime >= loopEnd) {
        video.currentTime = 0.1;
        if (video.paused) {
          video.play().catch(() => {});
        }
      }
    };

    const handleEnded = () => {
      video.currentTime = 0.1;
      video.play().catch(() => {});
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);
    
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      style={{ background: '#0a0c0b' }}
    >
      {/* Normal Mode Video (with orb) */}
      <video
        ref={videoRef}
        className="absolute object-cover"
        src="/video/rain-window.mp4"
        muted
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
          filter: 'brightness(0.57) saturate(0.9)',
          opacity: quietMode ? 0 : videoOpacity,
          transition: 'opacity 1.2s ease-in-out',
        }}
      />

      {/* Quiet Mode Video (no orb, softer) */}
      <video
        ref={quietVideoRef}
        className="absolute object-cover"
        src="/video/rain-quiet.mp4"
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        style={{
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          filter: 'brightness(0.55) saturate(0.7)',
          opacity: quietMode ? videoOpacity : 0,
          transition: 'opacity 1.2s ease-in-out',
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

      {/* Quiet Mode Toast */}
      <AnimatePresence>
        {quietToast && (
          <motion.div
            className="absolute z-30 left-1/2"
            style={{ top: '14%' }}
            initial={{ opacity: 0, y: -8, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -8, x: '-50%' }}
            transition={{ duration: 0.4 }}
          >
            <span style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '12px',
              fontWeight: 300,
              letterSpacing: '0.05em',
              textShadow: '0 1px 6px rgba(0,0,0,0.5)',
            }}>
              {quietToast}
            </span>
          </motion.div>
        )}
      </AnimatePresence>


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

      {/* Bottom Controls - Moon Toggle, Volume Slider & End Session */}
      {isActive && !showCompletion && (
        <motion.div 
          className="absolute left-0 right-0 flex flex-col items-center z-20" 
          style={{ bottom: '112px' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          {/* Quiet Mode Toggle */}
          <motion.button
            className="mb-4"
            style={{ 
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '9999px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={toggleQuietMode}
            whileTap={{ scale: 0.95 }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={quietMode ? 'rgba(255, 255, 255, 0.6)' : 'none'}
              stroke="rgba(255, 255, 255, 0.5)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ 
                transition: 'fill 0.4s ease',
              }}
            >
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </motion.button>

          {/* Volume Slider */}
          <div 
            className="flex items-center gap-3 px-5 py-3 rounded-full"
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              marginBottom: '17px',
            }}
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none"
              style={{ opacity: 0.5 }}
            >
              <path 
                d="M11 5L6 9H2v6h4l5 4V5z" 
                stroke="rgba(255,255,255,0.6)" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              {volume > 0.3 && (
                <path 
                  d="M15.54 8.46a5 5 0 0 1 0 7.07" 
                  stroke="rgba(255,255,255,0.5)" 
                  strokeWidth="1.5" 
                  strokeLinecap="round"
                />
              )}
              {volume > 0.6 && (
                <path 
                  d="M19.07 4.93a10 10 0 0 1 0 14.14" 
                  stroke="rgba(255,255,255,0.4)" 
                  strokeWidth="1.5" 
                  strokeLinecap="round"
                />
              )}
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-24 h-1 rounded-full appearance-none cursor-pointer volume-slider"
              style={{
                background: `linear-gradient(to right, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.25) ${volume * 100}%, rgba(255,255,255,0.08) ${volume * 100}%, rgba(255,255,255,0.08) 100%)`,
                WebkitAppearance: 'none',
              }}
            />
            <style>{`
              .volume-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: rgba(245, 241, 235, 0.5);
                cursor: pointer;
                border: none;
                box-shadow: 0 1px 4px rgba(0,0,0,0.3);
              }
              .volume-slider::-moz-range-thumb {
                width: 12px;
                height: 12px;
                border-radius: 50%;
                background: rgba(245, 241, 235, 0.5);
                cursor: pointer;
                border: none;
                box-shadow: 0 1px 4px rgba(0,0,0,0.3);
              }
            `}</style>
          </div>

          {/* End Session Button */}
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
