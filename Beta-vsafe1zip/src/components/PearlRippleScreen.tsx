import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useEntries } from '../state/EntriesContext';

interface PearlRippleScreenProps {
  onBack?: () => void;
  onReturnToChat?: () => void;
  onNavigateToActivities?: () => void;
  onNavigateToJournal?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToHelp?: () => void;
  onNavigateToPatterns?: () => void;
}

export function PearlRippleScreen({ onBack, onReturnToChat, onNavigateToActivities, onNavigateToJournal, onNavigateToProfile, onNavigateToHelp, onNavigateToPatterns }: PearlRippleScreenProps) {
  const { addSessionEntry } = useEntries();
  const [timeRemaining, setTimeRemaining] = useState(60);
  const hasSavedRef = useRef(false);
  const [countdownStep, setCountdownStep] = useState<number | null>(3);
  const [showMainText, setShowMainText] = useState(false);
  const [sessionActive, setSessionActive] = useState(true);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [oceanNodes, setOceanNodes] = useState<any[]>([]);
  const [masterGain, setMasterGain] = useState<GainNode | null>(null);
  
  // Use refs to ensure cleanup has access to current values
  const audioContextRef = useRef<AudioContext | null>(null);
  const oceanNodesRef = useRef<any[]>([]);
  const masterGainRef = useRef<GainNode | null>(null);

  // Initialize ocean wave audio - clean, pure tones without reverb or static
  useEffect(() => {
    const initOceanAudio = () => {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const nodes: any[] = [];
      
      // Master gain at 70% volume with smooth fade in
      const masterGainNode = ctx.createGain();
      masterGainNode.gain.setValueAtTime(0, ctx.currentTime);
      masterGainNode.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 2);
      masterGainNode.gain.linearRampToValueAtTime(0.126, ctx.currentTime + 4);
      masterGainNode.connect(ctx.destination);
      
      // Create pure, clean tone - no filters, no modulation, direct connection
      const createPureTone = (frequency: number, gain: number) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(frequency, ctx.currentTime);
        
        const oscGain = ctx.createGain();
        oscGain.gain.setValueAtTime(gain, ctx.currentTime);
        
        osc.connect(oscGain);
        oscGain.connect(masterGainNode);
        
        osc.start(0);
        
        return { oscillator: osc, gain: oscGain };
      };
      
      // Pure harmonic pad - steady tones, no automation (eliminates all static)
      nodes.push(createPureTone(110, 0.10));     // A2 - deep foundation
      nodes.push(createPureTone(165, 0.08));     // E3 - perfect fifth  
      nodes.push(createPureTone(220, 0.07));     // A3 - octave
      nodes.push(createPureTone(277, 0.05));     // C#4 - major third
      nodes.push(createPureTone(330, 0.04));     // E4 - fifth
      
      // Store in refs for cleanup
      audioContextRef.current = ctx;
      oceanNodesRef.current = nodes;
      masterGainRef.current = masterGainNode;
      
      setAudioContext(ctx);
      setOceanNodes(nodes);
      setMasterGain(masterGainNode);
    };
    
    initOceanAudio();
    
    // Cleanup on unmount - stop music when navigating away
    return () => {
      // Stop all oscillators immediately
      oceanNodesRef.current.forEach(node => {
        if (node.oscillator) {
          try {
            node.oscillator.stop();
          } catch (e) {
            // Already stopped
          }
        }
      });
      
      // Close audio context only if it's not already closed
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {
          // Already closed
        }
      }
      audioContextRef.current = null;
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
          // Fade out audio
          if (masterGain && audioContext) {
            masterGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1);
          }
          setTimeout(() => {
            // Stop all oscillators
            oceanNodes.forEach(node => {
              if (node.oscillator) {
                try {
                  node.oscillator.stop();
                } catch (e) {
                  // Already stopped
                }
              }
            });
            // Close context only if not already closed
            if (audioContext && audioContext.state !== 'closed') {
              audioContext.close();
            }
          }, 1000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionActive, timeRemaining, masterGain, audioContext, oceanNodes]);

  // Auto-save entry when session completes
  useEffect(() => {
    if (!sessionActive && timeRemaining === 0 && !hasSavedRef.current) {
      hasSavedRef.current = true;
      const duration = 60 - timeRemaining;
      addSessionEntry('PearlRipple', {
        title: 'Pearl Ripple – Calmed',
        body: 'Gentle ripples of calm. You found your center.',
        tags: ['calm', 'meditation', 'pearlripple'],
        metadata: { duration }
      });
    }
  }, [sessionActive, timeRemaining, addSessionEntry]);

  const handleEndSession = () => {
    setSessionActive(false);
    // Fade out audio smoothly
    if (masterGain && audioContext && audioContext.state !== 'closed') {
      masterGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
    }
    setTimeout(() => {
      // Stop all oscillators
      oceanNodes.forEach(node => {
        if (node.oscillator) {
          try {
            node.oscillator.stop();
          } catch (e) {
            // Already stopped
          }
        }
      });
      // Close context only if not already closed
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
      if (onReturnToChat) onReturnToChat();
      else if (onBack) onBack();
    }, 500);
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

  // Generate multiple ripple layers
  const generateRipples = () => {
    const ripples = [];
    const rippleCount = 12;

    for (let i = 0; i < rippleCount; i++) {
      const delay = i * 0.8;
      const duration = 8;
      const opacity = 0.55 - i * 0.04;

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
            border: '3px solid rgba(168, 149, 133, 0.35)',
            boxShadow: '0 0 20px rgba(168, 149, 133, 0.25), inset 0 0 20px rgba(255, 255, 255, 0.15)',
          }}
          animate={{
            scale: [1, 6],
            opacity: [opacity, 0],
            borderWidth: ['3px', '1px'],
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

    // Add secondary geometric ripples with different timing
    for (let i = 0; i < 8; i++) {
      const delay = i * 1.2 + 0.4;
      const duration = 10;
      const opacity = 0.45 - i * 0.05;

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
            border: '2px solid rgba(154, 135, 120, 0.30)',
            boxShadow: '0 0 15px rgba(154, 135, 120, 0.20)',
          }}
          animate={{
            scale: [1, 7],
            opacity: [opacity, 0],
            borderWidth: ['2px', '0.5px'],
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

  // Generate shimmer particles
  const generateShimmers = () => {
    const shimmers = [];
    const shimmerCount = 12;

    for (let i = 0; i < shimmerCount; i++) {
      const angle = (i * 360) / shimmerCount;
      const distance = 150 + (i % 3) * 40;
      const delay = i * 0.4;
      const duration = 8 + (i % 4) * 2;

      shimmers.push(
        <motion.div
          key={`shimmer-${i}`}
          className="absolute w-3 h-3 rounded-full"
          style={{
            left: '50%',
            top: '50%',
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.3) 50%, transparent 70%)',
            boxShadow: '0 0 20px rgba(255, 255, 255, 0.6)',
            filter: 'blur(2px)',
          }}
          animate={{
            x: Math.cos((angle * Math.PI) / 180) * distance,
            y: Math.sin((angle * Math.PI) / 180) * distance,
            scale: [0.5, 1.2, 0.5],
            opacity: [0.3, 0.8, 0.3],
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

      {/* Central glow core */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '300px',
          height: '300px',
          left: '50%',
          top: '50%',
          marginLeft: '-150px',
          marginTop: '-150px',
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

      {/* Secondary glow layer */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '400px',
          height: '400px',
          left: '50%',
          top: '50%',
          marginLeft: '-200px',
          marginTop: '-200px',
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

      {/* Ripple waves container */}
      <div className="absolute inset-0 flex items-center justify-center">
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

      {/* Top UI Bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-6 z-20">
        {/* Back Button */}
        <button
          onClick={handleEndSession}
          className="flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300"
          style={{
            background: 'rgba(255, 255, 255, 0.35)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          }}
        >
          <ArrowLeft size={18} style={{ color: '#9A8778', strokeWidth: 2 }} />
        </button>

        {/* Timer */}
        <div
          className="px-5 py-2.5 rounded-full"
          style={{
            background: 'rgba(255, 255, 255, 0.35)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            fontWeight: 300,
            color: '#9A8778',
            letterSpacing: '0.05em',
            filter: 'blur(0.4px)',
          }}
        >
          {formatTime(timeRemaining)}
        </div>
      </div>

      {/* Countdown Text Overlay */}
      <AnimatePresence>
        {countdownStep !== null && countdownText && (
          <motion.div
            className="absolute z-10"
            style={{ top: '42.05%', left: '50%', transform: 'translateX(-50%)' }}
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

      {/* Main Text Overlay */}
      <AnimatePresence>
        {showMainText && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center z-10"
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