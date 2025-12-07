import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BottomNav } from './BottomNav';
import { useEntries } from '../state/EntriesContext';

// Force-stop any active audio contexts to prevent static bleed-through
function suspendAllAudioContexts() {
  // Access any global audio contexts and suspend them
  if (typeof window !== 'undefined' && (window as any).audioContexts) {
    (window as any).audioContexts.forEach((ctx: AudioContext) => {
      if (ctx.state === 'running') {
        ctx.suspend().catch(() => {});
      }
    });
  }
}

interface PearlRippleScreenProps {
  onBack?: () => void;
  onReturnToChat?: () => void;
  onNavigateToActivities?: () => void;
  onNavigateToJournal?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToHelp?: () => void;
  onNavigateToPatterns?: () => void;
}

export function PearlRippleScreen({ onBack, onReturnToChat, onNavigateToActivities, onNavigateToJournal, onNavigateToProfile, onNavigateToHelp, onNavigateToPatterns: _onNavigateToPatterns }: PearlRippleScreenProps) {
  const { addSessionEntry } = useEntries();
  const [timeRemaining, setTimeRemaining] = useState(60);
  const hasSavedRef = useRef(false);
  const [countdownStep, setCountdownStep] = useState<number | null>(3);
  const [showMainText, setShowMainText] = useState(false);
  const [sessionActive, setSessionActive] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and play ripple audio with clean fade-in using Web Audio API for smooth sound
  useEffect(() => {
    suspendAllAudioContexts();
    
    const audio = new Audio('/audio/pearl-ripple.mp3');
    audio.loop = true;
    audio.playbackRate = 0.65; // Slightly faster for cleaner sound
    audio.crossOrigin = 'anonymous';
    audioRef.current = audio;

    // Start audio with Web Audio API for smooth, clean sound
    const startAudio = () => {
      try {
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        
        const source = audioContext.createMediaElementSource(audio);
        
        // Lowpass filter to remove harsh highs and create smoother sound
        const lowpass = audioContext.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 1800; // Cut more harsh frequencies for smoother tone
        lowpass.Q.value = 0.5;
        
        // Notch filter to remove weird mid tones
        const notch = audioContext.createBiquadFilter();
        notch.type = 'notch';
        notch.frequency.value = 800; // Remove problematic mid frequency
        notch.Q.value = 2;
        
        // Gain node for smooth volume control
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNodeRef.current = gainNode;
        
        // Connect: source -> lowpass -> notch -> gain -> output
        source.connect(lowpass);
        lowpass.connect(notch);
        notch.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        audio.play().then(() => {
          // Smooth fade-in over 2 seconds
          gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 2);
        }).catch(() => {});
      } catch (e) {
        // Fallback to basic audio
        audio.volume = 0;
        audio.play().then(() => {
          let vol = 0;
          const fadeIn = setInterval(() => {
            vol += 0.02;
            if (vol >= 0.45) {
              clearInterval(fadeIn);
            }
            audio.volume = Math.min(vol, 0.45);
          }, 80);
          fadeIntervalRef.current = fadeIn;
        }).catch(() => {});
      }
    };

    // Start audio almost immediately
    const audioTimer = setTimeout(startAudio, 150);

    // Cleanup with smooth fade-out
    return () => {
      clearTimeout(audioTimer);
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      if (gainNodeRef.current && audioContextRef.current) {
        const ctx = audioContextRef.current;
        const gain = gainNodeRef.current;
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        setTimeout(() => {
          audioRef.current?.pause();
          ctx.close().catch(() => {});
        }, 550);
      } else if (audioRef.current) {
        const currentAudio = audioRef.current;
        let vol = currentAudio.volume;
        const fadeOut = setInterval(() => {
          vol -= 0.03;
          if (vol <= 0) {
            clearInterval(fadeOut);
            currentAudio.pause();
            currentAudio.src = '';
          }
          currentAudio.volume = Math.max(0, vol);
        }, 50);
      }
    };
  }, []);

  // Countdown sequence
  useEffect(() => {
    if (countdownStep === null) return;

    const timer = setTimeout(() => {
      if (countdownStep > 1) {
        setCountdownStep(countdownStep - 1);
      } else {
        setCountdownStep(null);
        setShowMainText(true);
        // Fade out main text after 5-7 seconds
        setTimeout(() => {
          setShowMainText(false);
        }, 6000);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [countdownStep]);

  // Main timer countdown
  useEffect(() => {
    if (!sessionActive || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setSessionActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionActive, timeRemaining]);

  // Auto-save entry when session completes
  useEffect(() => {
    if (!sessionActive && timeRemaining === 0 && !hasSavedRef.current) {
      hasSavedRef.current = true;
      const duration = 60 - timeRemaining;
      addSessionEntry('Ripple', {
        title: 'Ripple – Calmed',
        body: 'Gentle ripples of calm. You found your center.',
        tags: ['calm', 'meditation', 'ripple'],
        metadata: { duration }
      });
    }
  }, [sessionActive, timeRemaining, addSessionEntry]);

  const handleEndSession = () => {
    setSessionActive(false);
    // Fade out audio before navigating
    if (audioRef.current) {
      const currentAudio = audioRef.current;
      let vol = currentAudio.volume;
      const fadeOut = setInterval(() => {
        vol -= 0.04;
        if (vol <= 0) {
          vol = 0;
          clearInterval(fadeOut);
          currentAudio.pause();
        }
        currentAudio.volume = Math.max(0, vol);
      }, 40);
      // Navigate after fade completes
      setTimeout(() => {
        if (onReturnToChat) onReturnToChat();
        else if (onBack) onBack();
      }, 500);
    } else {
      if (onReturnToChat) onReturnToChat();
      else if (onBack) onBack();
    }
  };

  const getCountdownText = () => {
    switch (countdownStep) {
      case 3:
        return { number: '3', instruction: 'Inhale slowly' };
      case 2:
        return { number: '2', instruction: 'Drop your shoulders' };
      case 1:
        return { number: '1', instruction: 'Let everything soften' };
      default:
        return null;
    }
  };

  const countdownText = getCountdownText();

  // Generate ripple layers - reduced count, softer edges, slower animations
  const generateRipples = () => {
    const ripples = [];
    const rippleCount = 6;

    for (let i = 0; i < rippleCount; i++) {
      const delay = i * 2.2;
      const duration = 14;
      const opacity = 0.44 - i * 0.05;  // 25% more visible

      ripples.push(
        <motion.div
          key={`ripple-${i}`}
          className="absolute rounded-full"
          style={{
            width: '120px',
            height: '120px',
            left: '50%',
            top: '50%',
            marginLeft: '-60px',
            marginTop: '-60px',
            border: '4px solid rgba(168, 149, 133, 0.225)',  // 25% more visible
            boxShadow: '0 0 30px rgba(168, 149, 133, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.10)',  // 25% more visible
            filter: 'blur(1px)',
          }}
          animate={{
            scale: [1, 5],
            opacity: [opacity, 0],
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: 'easeOut',
            delay,
          }}
        />
      );
    }

    // Secondary ripples - fewer, softer
    for (let i = 0; i < 4; i++) {
      const delay = i * 3.5 + 1;
      const duration = 16;
      const opacity = 0.35 - i * 0.06;  // 25% more visible

      ripples.push(
        <motion.div
          key={`ripple-secondary-${i}`}
          className="absolute rounded-full"
          style={{
            width: '100px',
            height: '100px',
            left: '50%',
            top: '50%',
            marginLeft: '-50px',
            marginTop: '-50px',
            border: '3px solid rgba(154, 135, 120, 0.19)',  // 25% more visible
            boxShadow: '0 0 25px rgba(154, 135, 120, 0.125)',  // 25% more visible
            filter: 'blur(1.5px)',
          }}
          animate={{
            scale: [1, 6],
            opacity: [opacity, 0],
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: 'easeOut',
            delay,
          }}
        />
      );
    }

    return ripples;
  };

  // Generate shimmer particles - reduced count and slowed for smoother visuals
  const generateShimmers = () => {
    const shimmers = [];
    const shimmerCount = 5;

    for (let i = 0; i < shimmerCount; i++) {
      const angle = (i * 360) / shimmerCount;
      const distance = 140 + (i % 2) * 50;
      const delay = i * 2.5;
      const duration = 18 + (i % 3) * 4;

      shimmers.push(
        <motion.div
          key={`shimmer-${i}`}
          className="absolute w-4 h-4 rounded-full"
          style={{
            left: '50%',
            top: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.5) 0%, rgba(255, 255, 255, 0.15) 50%, transparent 70%)',
            boxShadow: '0 0 30px rgba(255, 255, 255, 0.3)',
            filter: 'blur(4px)',
          }}
          animate={{
            x: Math.cos((angle * Math.PI) / 180) * distance,
            y: Math.sin((angle * Math.PI) / 180) * distance,
            scale: [0.6, 1, 0.6],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay,
          }}
        />
      );
    }

    return shimmers;
  };


  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F8F6F3 25%, #F0EDE8 50%, #E8E4DF 75%, #E0DCD7 100%)',
      }}
    >
      {/* Ambient glow base */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(circle at center, rgba(255, 255, 255, 0.4) 0%, transparent 60%)',
        }}
      />

      {/* Central glow core - moved up 40px for visual balance */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '300px',
          height: '300px',
          left: '50%',
          top: '50%',
          marginLeft: '-150px',
          marginTop: '-190px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(248, 246, 243, 0.6) 30%, rgba(240, 237, 232, 0.3) 50%, transparent 70%)',
          filter: 'blur(60px)',
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.6, 0.85, 0.6],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Secondary glow layer - moved up 40px for visual balance */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '400px',
          height: '400px',
          left: '50%',
          top: '50%',
          marginLeft: '-200px',
          marginTop: '-240px',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.5) 0%, rgba(240, 237, 232, 0.3) 40%, transparent 65%)',
          filter: 'blur(50px)',
        }}
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Ripple waves container - moved up 82.5px */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ marginTop: '-82.5px' }}>
        {generateRipples()}
      </div>

      {/* Shimmer particles */}
      <div className="absolute inset-0 flex items-center justify-center">
        {generateShimmers()}
      </div>

      {/* Subtle rotating ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '280px',
          height: '280px',
          left: '50%',
          top: '50%',
          marginLeft: '-140px',
          marginTop: '-140px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 0 30px rgba(255, 255, 255, 0.2)',
        }}
        animate={{
          rotate: [0, 360],
          scale: [0.98, 1.02, 0.98],
        }}
        transition={{
          rotate: { duration: 40, repeat: Infinity, ease: 'linear' },
          scale: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
        }}
      />

      {/* TRACE Brand Name - fixed position below camera earpiece */}
      <motion.div
        className="absolute w-full text-center z-20"
        style={{ top: '7%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 1.5, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <h1
          style={{
            fontFamily: 'ALORE, Georgia, serif',
            color: '#5A4A3A',
            fontWeight: 300,
            letterSpacing: '1em',
            fontSize: '11px',
            textShadow: '0 0 15px rgba(90, 74, 58, 0.45), 0 0 30px rgba(90, 74, 58, 0.25), 0 2px 4px rgba(0,0,0,0.15)',
            opacity: 0.88,
          }}
        >
          TRACE
        </h1>
      </motion.div>


      {/* Countdown Text Overlay - moved up 40px for cohesiveness */}
      <AnimatePresence>
        {countdownStep !== null && countdownText && (
          <motion.div
            className="absolute z-10"
            style={{ top: '37%', left: '50%', transform: 'translateX(-50%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="text-center"
            >
              <div
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '72px',
                  fontWeight: 300,
                  color: '#9A8778',
                  letterSpacing: '0.05em',
                  textShadow: '0 2px 20px rgba(255, 255, 255, 0.8)',
                  marginBottom: '16px',
                }}
              >
                {countdownText.number}
              </div>
              <div
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '18px',
                  fontWeight: 300,
                  color: '#A89585',
                  letterSpacing: '0.08em',
                  textShadow: '0 1px 10px rgba(255, 255, 255, 0.6)',
                }}
              >
                {countdownText.instruction}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Text Overlay - moved up 40px for cohesiveness */}
      <AnimatePresence>
        {showMainText && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ marginTop: '-40px' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
          >
            <div
              className="text-center px-8"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '22px',
                fontWeight: 300,
                color: '#9A8778',
                letterSpacing: '0.08em',
                lineHeight: '1.6',
                textShadow: '0 2px 15px rgba(255, 255, 255, 0.7)',
                maxWidth: '340px',
              }}
            >
              Let this moment take over.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom End Session Button */}
      <div className="absolute left-0 right-0 flex justify-center z-20" style={{ bottom: '122px' }}>
        <button
          onClick={handleEndSession}
          className="px-8 py-3 rounded-full transition-all duration-300 hover:scale-105"
          style={{
            background: 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            fontWeight: 300,
            color: '#9A8778',
            letterSpacing: '0.08em',
          }}
        >
          End Session
        </button>
      </div>

      {/* Session Complete Overlay */}
      <AnimatePresence>
        {!sessionActive && timeRemaining === 0 && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(40px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-center"
            >
              <div
                className="mb-6"
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '24px',
                  fontWeight: 300,
                  color: '#9A8778',
                  letterSpacing: '0.08em',
                }}
              >
                Session Complete
              </div>
              <button
                onClick={handleEndSession}
                className="px-10 py-3.5 rounded-full transition-all duration-300 hover:scale-105"
                style={{
                  background: 'rgba(168, 149, 133, 0.15)',
                  border: '1px solid rgba(168, 149, 133, 0.3)',
                  fontFamily: 'Georgia, serif',
                  fontSize: '14px',
                  fontWeight: 300,
                  color: '#9A8778',
                  letterSpacing: '0.08em',
                }}
              >
                Return
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        <BottomNav
          activeScreen="activities"
          variant="sage-fixed"
          onNavigateHome={onReturnToChat}
          onNavigateActivities={onNavigateToActivities}
          onNavigateJournal={onNavigateToJournal}
          onNavigateProfile={onNavigateToProfile}
          onNavigateHelp={onNavigateToHelp}
        />
      </div>
    </div>
  );
}