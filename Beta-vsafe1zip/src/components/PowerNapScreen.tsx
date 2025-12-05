import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BottomNav } from './BottomNav';
import { useEntries } from '../state/EntriesContext';

interface PowerNapScreenProps {
  onReturnToChat?: () => void;
  onNavigateHome?: () => void;
  onNavigateActivities?: () => void;
  onNavigateJournal?: () => void;
  onNavigateProfile?: () => void;
  onNavigateHelp?: () => void;
}

export function PowerNapScreen({ 
  onReturnToChat,
  onNavigateHome,
  onNavigateActivities,
  onNavigateJournal,
  onNavigateProfile,
  onNavigateHelp,
}: PowerNapScreenProps) {
  const { addSessionEntry } = useEntries();
  const [timeElapsed, setTimeElapsed] = React.useState(0);
  const [isResting, setIsResting] = React.useState(true);
  const [isAwake, setIsAwake] = React.useState(false);
  const hasSavedRef = React.useRef(false);
  const [wakeGently, setWakeGently] = React.useState(true);
  const [ambientTonePlaying, setAmbientTonePlaying] = React.useState(true);
  const TOTAL_TIME = 300; // 5 minutes in seconds

  // Ambient tone using Web Audio API
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const gainNodesRef = React.useRef<GainNode[]>([]);
  const alarmIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const alarmAudioContextsRef = React.useRef<AudioContext[]>([]);

  // Cleanup function that stops all audio
  React.useEffect(() => {
    return () => {
      // Component unmount - stop everything
      gainNodesRef.current.forEach(gainNode => {
        try {
          gainNode.gain.cancelScheduledValues(0);
          gainNode.gain.setValueAtTime(0, 0);
        } catch (e) {
          // Ignore
        }
      });
      gainNodesRef.current = [];
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch (e) {
          // Ignore
        }
      }
      audioContextRef.current = null;
      
      // Clear alarm interval if exists
      if (alarmIntervalRef.current) {
        clearInterval(alarmIntervalRef.current);
        alarmIntervalRef.current = null;
      }
      
      // Close all alarm audio contexts
      alarmAudioContextsRef.current.forEach(ctx => {
        try {
          if (ctx.state !== 'closed') {
            ctx.close();
          }
        } catch (e) {
          // Ignore
        }
      });
      alarmAudioContextsRef.current = [];
    };
  }, []);

  // Effect to manage ambient tone
  React.useEffect(() => {
    if (!isResting) {
      // Stop all audio when not resting
      gainNodesRef.current.forEach(gainNode => {
        try {
          const now = gainNode.context.currentTime;
          gainNode.gain.cancelScheduledValues(now);
          gainNode.gain.setValueAtTime(gainNode.gain.value, now);
          gainNode.gain.linearRampToValueAtTime(0, now + 0.5);
        } catch (e) {
          // Ignore
        }
      });
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        setTimeout(() => {
          if (audioContextRef.current) {
            try {
              audioContextRef.current.close();
            } catch (e) {
              // Ignore
            }
            audioContextRef.current = null;
          }
        }, 600);
      }
      return;
    }

    if (!ambientTonePlaying) {
      // Fade out existing audio
      gainNodesRef.current.forEach(gainNode => {
        try {
          const now = gainNode.context.currentTime;
          gainNode.gain.cancelScheduledValues(now);
          gainNode.gain.setValueAtTime(gainNode.gain.value, now);
          gainNode.gain.linearRampToValueAtTime(0, now + 1);
        } catch (e) {
          // Ignore
        }
      });
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        setTimeout(() => {
          if (audioContextRef.current && !ambientTonePlaying) {
            try {
              audioContextRef.current.close();
            } catch (e) {
              // Ignore
            }
            audioContextRef.current = null;
          }
        }, 1100);
      }
      return;
    }

    // Start new audio context if needed
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;
      const newGainNodes: GainNode[] = [];
      
      // Create multiple oscillators for rich ambient sound
      const createOscillator = (freq: number, type: OscillatorType, targetGain: number) => {
        const osc = audioContext.createOscillator();
        const oscGain = audioContext.createGain();
        
        osc.connect(oscGain);
        oscGain.connect(audioContext.destination);
        
        osc.frequency.value = freq;
        osc.type = type;
        
        oscGain.gain.setValueAtTime(0, audioContext.currentTime);
        oscGain.gain.linearRampToValueAtTime(targetGain, audioContext.currentTime + 3);
        
        osc.start(audioContext.currentTime);
        newGainNodes.push(oscGain);
        return { osc, gain: oscGain };
      };
      
      // Deep fundamental drone
      const bass = createOscillator(55, 'sine', 0.018);
      
      // Harmonic layer
      const harmonic = createOscillator(110, 'sine', 0.012);
      
      // High shimmer
      createOscillator(220, 'triangle', 0.006);
      
      // Gentle LFO modulation for breathing quality
      const lfo = audioContext.createOscillator();
      const lfoGain = audioContext.createGain();
      
      lfo.frequency.value = 0.08;
      lfo.type = 'sine';
      lfoGain.gain.value = 0.5;
      
      lfo.connect(lfoGain);
      lfoGain.connect(bass.gain.gain);
      lfoGain.connect(harmonic.gain.gain);
      
      lfo.start(audioContext.currentTime);
      
      gainNodesRef.current = newGainNodes;
    }
  }, [isResting, ambientTonePlaying]);

  const playWakeUpChime = React.useCallback(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Use the same ethereal piano melody from home screen orb
    const now = audioContext.currentTime;
    
    // Piano melody - C4, C5, E5, G5
    const notes = [
      { freq: 261.63, time: 0, gain: 0.20 }, // C4
      { freq: 523.25, time: 1.0, gain: 0.21 }, // C5
      { freq: 659.25, time: 2.0, gain: 0.19 }, // E5
      { freq: 783.99, time: 3.0, gain: 0.18 }, // G5
    ];
    
    // Create piano-like sound with sharp attack and quick decay
    notes.forEach(({ freq, time, gain }) => {
      // Fundamental frequency
      const fundamental = audioContext.createOscillator();
      fundamental.frequency.setValueAtTime(freq, now + time);
      fundamental.type = 'sine';
      
      const fundamentalGain = audioContext.createGain();
      fundamentalGain.gain.setValueAtTime(0, now + time);
      fundamentalGain.gain.linearRampToValueAtTime(gain, now + time + 0.001);
      fundamentalGain.gain.exponentialRampToValueAtTime(gain * 0.25, now + time + 0.05);
      fundamentalGain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.9);
      
      fundamental.connect(fundamentalGain);
      fundamentalGain.connect(audioContext.destination);
      fundamental.start(now + time);
      fundamental.stop(now + time + 0.9);
      
      // Second harmonic (inharmonic for piano realism)
      const harmonic2 = audioContext.createOscillator();
      harmonic2.frequency.setValueAtTime(freq * 2.03, now + time);
      harmonic2.type = 'sine';
      
      const harmonic2Gain = audioContext.createGain();
      harmonic2Gain.gain.setValueAtTime(0, now + time);
      harmonic2Gain.gain.linearRampToValueAtTime(gain * 0.22, now + time + 0.0008);
      harmonic2Gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.4);
      
      harmonic2.connect(harmonic2Gain);
      harmonic2Gain.connect(audioContext.destination);
      harmonic2.start(now + time);
      harmonic2.stop(now + time + 0.4);
      
      // Third harmonic (more inharmonic)
      const harmonic3 = audioContext.createOscillator();
      harmonic3.frequency.setValueAtTime(freq * 3.05, now + time);
      harmonic3.type = 'sine';
      
      const harmonic3Gain = audioContext.createGain();
      harmonic3Gain.gain.setValueAtTime(0, now + time);
      harmonic3Gain.gain.linearRampToValueAtTime(gain * 0.1, now + time + 0.0005);
      harmonic3Gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.25);
      
      harmonic3.connect(harmonic3Gain);
      harmonic3Gain.connect(audioContext.destination);
      harmonic3.start(now + time);
      harmonic3.stop(now + time + 0.25);
    });
    
    return audioContext;
  }, []);

  React.useEffect(() => {
    if (!isResting) return;

    const timer = setInterval(() => {
      setTimeElapsed((prev) => {
        if (prev >= TOTAL_TIME) {
          clearInterval(timer);
          setIsResting(false);
          setIsAwake(true);
          if (wakeGently) {
            playWakeUpChime();
          }
          return TOTAL_TIME;
        }
        return prev + 0.1;
      });
    }, 100);

    return () => {
      clearInterval(timer);
    };
  }, [isResting, wakeGently, playWakeUpChime]);

  const timeRemaining = Math.max(Math.ceil(TOTAL_TIME - timeElapsed), 0);
  const minutesRemaining = Math.floor(timeRemaining / 60);
  const secondsRemaining = timeRemaining % 60;
  const progressPercentage = (timeElapsed / TOTAL_TIME) * 100;

  // Repeating alarm effect - must be at top level, not inside conditional
  React.useEffect(() => {
    if (wakeGently && isAwake) {
      // Play the first chime
      const firstContext = playWakeUpChime();
      alarmAudioContextsRef.current.push(firstContext);
      
      // Set up repeating interval - play every 6 seconds (4 seconds of melody + 2 seconds pause)
      const interval = setInterval(() => {
        const context = playWakeUpChime();
        alarmAudioContextsRef.current.push(context);
        
        // Clean up old audio contexts to prevent memory leak
        alarmAudioContextsRef.current = alarmAudioContextsRef.current.filter(ctx => {
          if (ctx.state === 'closed') {
            return false;
          }
          return true;
        });
      }, 6000);
      
      alarmIntervalRef.current = interval;
      
      return () => {
        // Stop the alarm when component unmounts or wakeGently changes
        if (interval) {
          clearInterval(interval);
        }
        alarmAudioContextsRef.current.forEach(ctx => {
          try {
            if (ctx.state !== 'closed') {
              ctx.close();
            }
          } catch (e) {
            // Ignore
          }
        });
        alarmAudioContextsRef.current = [];
      };
    }
  }, [wakeGently, isAwake, playWakeUpChime]);

  // Auto-save entry when power nap completes
  React.useEffect(() => {
    if (isAwake && !hasSavedRef.current) {
      hasSavedRef.current = true;
      const duration = Math.round(timeElapsed);
      addSessionEntry('PowerNap', {
        title: 'Power Nap – Rested',
        body: 'You rested well. A brief moment of stillness to recharge.',
        tags: ['rest', 'sleep', 'powernap'],
        metadata: { duration }
      });
    }
  }, [isAwake, timeElapsed, addSessionEntry]);

  // Generate liquid light swirls - dimmed version
  const generateLiquidSwirls = (dimFactor: number = 0.7) => {
    const swirls = [];
    const centerX = 160;
    const centerY = 160;
    
    const colors = [
      { r: 255, g: 255, b: 255, name: 'white' },
      { r: 248, g: 252, b: 250, name: 'pearl' },
      { r: 230, g: 240, b: 235, name: 'sage-light' },
      { r: 210, g: 235, b: 230, name: 'aqua' },
      { r: 240, g: 248, b: 245, name: 'mist' },
      { r: 200, g: 218, b: 215, name: 'sage' },
    ];
    
    for (let i = 0; i < 60; i++) {
      const angle = (i * 137.5) % 360;
      const radius = 20 + (i % 18) * 7;
      const sweep = 120 + (i % 12) * 25;
      
      const startAngle = angle + (i % 10) * 4;
      const endAngle = startAngle + sweep;
      const midAngle = startAngle + sweep / 2;
      
      const x1 = centerX + Math.cos((startAngle * Math.PI) / 180) * radius;
      const y1 = centerY + Math.sin((startAngle * Math.PI) / 180) * radius;
      
      const curvature = radius * 1.2 + (i % 6) * 4;
      const x2 = centerX + Math.cos((midAngle * Math.PI) / 180) * curvature;
      const y2 = centerY + Math.sin((midAngle * Math.PI) / 180) * curvature;
      
      const x3 = centerX + Math.cos((endAngle * Math.PI) / 180) * radius;
      const y3 = centerY + Math.sin((endAngle * Math.PI) / 180) * radius;
      
      const pathD = `M ${x1} ${y1} Q ${x2} ${y2}, ${x3} ${y3}`;
      
      const colorIndex = i % colors.length;
      const color = colors[colorIndex];
      const opacity = (0.18 + (i % 10) * 0.02) * dimFactor;
      
      const strokeWidth = 5 + (i % 10) * 3;
      const blur = 3 + (i % 5) * 1.5;
      const duration = 120 + (i % 60); // Much slower rotation
      const direction = i % 2 === 0 ? [0, 360] : [360, 0];
      const delay = (i % 20) * 0.15;
      
      swirls.push(
        <motion.svg
          key={`swirl-${i}`}
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 320 320"
          style={{ zIndex: 1 }}
          animate={{
            rotate: direction,
            opacity: opacity * 0.8, // More static opacity
          }}
          transition={{
            rotate: { duration, repeat: Infinity, ease: "linear" },
          }}
        >
          <path
            d={pathD}
            fill="none"
            stroke={`rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ filter: `blur(${blur}px)` }}
          />
        </motion.svg>
      );
    }
    
    return swirls;
  };

  // Generate smoke particles - static subtle glow
  const generateSmokeParticles = (dimFactor: number = 0.7) => {
    const particles = [];
    
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60) % 360;
      const distance = 20 + (i % 3) * 15;
      
      particles.push(
        <div
          key={`smoke-${i}`}
          className="absolute w-[60px] h-[60px] rounded-full"
          style={{
            left: '50%',
            top: '50%',
            marginLeft: '-30px',
            marginTop: '-30px',
            transform: `translate(${Math.cos((angle * Math.PI) / 180) * distance}px, ${Math.sin((angle * Math.PI) / 180) * distance}px)`,
            background: `radial-gradient(circle, rgba(255,255,255,${0.08 * dimFactor}) 0%, rgba(240,248,245,${0.04 * dimFactor}) 40%, transparent 70%)`,
            filter: 'blur(20px)',
            opacity: 0.25 * dimFactor,
          }}
        />
      );
    }
    
    return particles;
  };

  // Dimmed, sleepy orb with very slow breathing
  const SleepyOrb = ({ dimFactor = 0.7, waking = false }: { dimFactor?: number; waking?: boolean }) => {
    const brightnessFactor = waking ? 1 : dimFactor;
    
    return (
      <div className="relative w-[200px] h-[200px]">
        {/* Faint glowing halo - almost static */}
        <div
          className="absolute inset-[-60px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(230,240,235,0.08) 25%, rgba(210,235,230,0.05) 40%, transparent 65%)',
            filter: 'blur(40px)',
            opacity: 0.2 * brightnessFactor,
          }}
        />

        {/* Secondary halo layer - almost static */}
        <div
          className="absolute inset-[-80px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(210,235,230,0.1) 0%, rgba(200,218,215,0.05) 30%, transparent 55%)',
            filter: 'blur(50px)',
            opacity: 0.15 * brightnessFactor,
          }}
        />

        {/* Main orb body */}
        <div 
          className="absolute inset-0 rounded-full overflow-hidden" 
          style={{
            background: 'radial-gradient(circle at 45% 35%, rgba(255,255,255,0.35) 0%, rgba(245,250,245,0.3) 20%, rgba(230,240,235,0.25) 40%, rgba(210,230,225,0.2) 60%, rgba(195,220,215,0.15) 80%, transparent 100%)',
            boxShadow: '0 10px 40px rgba(236,230,216,0.2)',
            opacity: brightnessFactor,
          }}
        >
          {/* Liquid light swirls inside */}
          {generateLiquidSwirls(brightnessFactor)}

          {/* White smoke diffusion */}
          <div className="absolute inset-0">
            {generateSmokeParticles(brightnessFactor)}
          </div>

          {/* Soft inner core glow - static */}
          <div
            className="absolute inset-[18%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(248,252,250,0.18) 35%, rgba(240,248,245,0.1) 60%, transparent 80%)',
              filter: 'blur(25px)',
              opacity: 0.3 * brightnessFactor,
            }}
          />

          {/* Pearlescent highlight - static */}
          <div
            className="absolute top-[20%] left-[32%] w-[90px] h-[90px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(248,252,250,0.22) 45%, rgba(230,240,235,0.12) 70%, transparent 85%)',
              filter: 'blur(18px)',
              opacity: 0.5 * brightnessFactor,
            }}
          />

          {/* Pale aqua accent - static */}
          <div
            className="absolute bottom-[30%] right-[28%] w-[70px] h-[70px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(210,235,230,0.3) 0%, rgba(200,218,215,0.15) 55%, transparent 80%)',
              filter: 'blur(15px)',
              opacity: 0.35 * brightnessFactor,
            }}
          />
        </div>


      </div>
    );
  };

  // Wake-up screen
  if (isAwake) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center" style={{ backgroundColor: '#9AB09C' }}>
        {/* Vignette */}
        <div 
          className="absolute inset-0 pointer-events-none" 
          style={{
            background: 'radial-gradient(circle at 50% 50%, transparent 0%, transparent 40%, rgba(0,0,0,0.15) 100%)',
          }}
        />

        {/* Brightening orb */}
        <motion.div
          initial={{ opacity: 0.7, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, ease: "easeOut" }}
        >
          <SleepyOrb dimFactor={1} waking={true} />
        </motion.div>

        {/* Wake-up text */}
        <motion.div
          className="text-center px-8 mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 1.5 }}
        >
          <h2 
            className="text-[#EDE8DB] mb-3"
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '26px',
              fontWeight: 400,
              letterSpacing: '0.02em',
            }}
          >
            Welcome back.
          </h2>
          <p 
            className="text-[#EDE8DB]"
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '15px',
              fontWeight: 300,
              letterSpacing: '0.01em',
              opacity: 0.8,
            }}
          >
            You rested well.
          </p>
        </motion.div>

        {/* Buttons */}
        <motion.div
          className="absolute w-full px-8"
          style={{ bottom: '8%' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 1 }}
        >
          <button 
            onClick={onReturnToChat}
            className="w-full rounded-full px-8 py-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: '#EDE8DB',
              boxShadow: '0 6px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)',
            }}
          >
            <span 
              className="text-[#6B7A6E]"
              style={{
                fontFamily: 'Georgia, serif',
                fontWeight: 500,
                fontSize: '15px',
                letterSpacing: '0.03em',
              }}
            >
              Return to Chat
            </span>
          </button>
        </motion.div>
      </div>
    );
  }

  // Resting screen
  return (
    <div className="relative w-full h-full flex flex-col" style={{ backgroundColor: '#8FA293' }}>
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.08) 0%, transparent 40%), radial-gradient(circle at 70% 80%, rgba(200,230,220,0.12) 0%, transparent 50%)',
          }}
          animate={{
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Vignette - stronger for sleepy feeling */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 0%, transparent 30%, rgba(0,0,0,0.25) 100%)',
        }}
      />

      {/* TRACE wordmark */}
      <motion.div
        className="absolute z-10 w-full text-center"
        style={{ top: '7%' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 0.5, y: 0 }}
        transition={{ delay: 0.3, duration: 1.5 }}
      >
        <h1 style={{ 
          fontFamily: 'ALORE, Georgia, serif',
          color: '#EDE8DB',
          fontWeight: 300,
          letterSpacing: '1em',
          fontSize: '11px',
          textShadow: '0 2px 5px rgba(0,0,0,0.45)',
          textIndent: '1em',
        }}>
          TRACE
        </h1>
      </motion.div>

      {/* Title */}
      <motion.div
        className="absolute z-10 w-full text-center px-8"
        style={{ top: '11%' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1.5 }}
      >
        <h2 
          className="text-[#EDE8DB] mb-2"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '24px',
            fontWeight: 400,
            letterSpacing: '0.02em',
          }}
        >
          Take 5 Minutes to Rest
        </h2>
        <p 
          className="text-[#EDE8DB]"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            fontWeight: 300,
            letterSpacing: '0.01em',
            opacity: 0.7,
            fontStyle: 'italic',
          }}
        >
          Close your eyes. Let everything soften.
        </p>
      </motion.div>

      {/* Sleepy Orb with Timer Ring */}
      <motion.div
        className="absolute z-10 w-full flex justify-center"
        style={{ top: '26%' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1, duration: 2 }}
      >
        <div className="relative">
          {/* Circular timer ring */}
          <svg className="absolute inset-[-30px] w-[260px] h-[260px]" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="130"
              cy="130"
              r="115"
              fill="none"
              stroke="rgba(237, 232, 219, 0.15)"
              strokeWidth="1.5"
            />
            <motion.circle
              cx="130"
              cy="130"
              r="115"
              fill="none"
              stroke="rgba(237, 232, 219, 0.5)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 115}
              strokeDashoffset={2 * Math.PI * 115 * (1 - progressPercentage / 100)}
              style={{
                filter: 'drop-shadow(0 0 4px rgba(237, 232, 219, 0.3))',
              }}
            />
          </svg>
          
          <SleepyOrb dimFactor={0.7} />
        </div>
      </motion.div>

      {/* Timer */}
      <motion.div
        className="absolute z-20 w-full text-center"
        style={{ top: '54%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1.5 }}
      >
        <p 
          className="text-[#EDE8DB]"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '36px',
            fontWeight: 300,
            letterSpacing: '0.1em',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          }}
        >
          {minutesRemaining}:{secondsRemaining.toString().padStart(2, '0')}
        </p>
      </motion.div>

      {/* Ambient tone toggle */}
      <motion.div
        className="absolute z-10 w-full flex justify-center px-8"
        style={{ top: '60.5%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 1.5 }}
      >
        <button
          onClick={() => {
            setAmbientTonePlaying(!ambientTonePlaying);
          }}
          className="px-6 py-2 rounded-full transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: ambientTonePlaying ? 'rgba(237, 232, 219, 0.15)' : 'rgba(237, 232, 219, 0.08)',
            border: '1px solid rgba(237, 232, 219, 0.3)',
          }}
        >
          <AnimatePresence mode="wait">
            {ambientTonePlaying ? (
              <motion.span
                key="playing"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: [0.5, 0.7, 0.5], y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ 
                  opacity: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  y: { duration: 0.2 }
                }}
                className="text-[#EDE8DB] block text-center"
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '11px',
                  fontWeight: 300,
                  letterSpacing: '0.05em',
                }}
              >
                Ambient tone playing
              </motion.span>
            ) : (
              <motion.span
                key="off"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 0.6, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="text-[#EDE8DB] block text-center"
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '11px',
                  fontWeight: 300,
                  letterSpacing: '0.05em',
                }}
              >
                Ambient tone off
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </motion.div>

      {/* Rest Instructions */}
      <motion.div
        className="absolute z-10 w-full text-center space-y-1"
        style={{ top: '71%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 2 }}
      >
        <p 
          className="text-[#EDE8DB]"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '13px',
            fontWeight: 300,
            letterSpacing: '0.02em',
            opacity: 0.6,
          }}
        >
          No pressure.
        </p>
        <p 
          className="text-[#EDE8DB]"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '13px',
            fontWeight: 300,
            letterSpacing: '0.02em',
            opacity: 0.6,
          }}
        >
          No goals.
        </p>
        <p 
          className="text-[#EDE8DB]"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '13px',
            fontWeight: 300,
            letterSpacing: '0.02em',
            opacity: 0.6,
          }}
        >
          Just rest.
        </p>
      </motion.div>

      {/* Wake-up toggle */}
      <motion.div
        className="absolute z-20 w-full px-8 flex items-center justify-center space-x-3"
        style={{ bottom: '30.75%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.5, duration: 1.5 }}
      >
        <label 
          className="text-[#EDE8DB] cursor-pointer flex items-center space-x-3"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '13px',
            fontWeight: 300,
            letterSpacing: '0.02em',
            opacity: 0.7,
          }}
        >
          <span>Wake me gently at the end</span>
          <button
            onClick={() => setWakeGently(!wakeGently)}
            className="relative w-12 h-6 rounded-full transition-all duration-300"
            style={{
              background: wakeGently ? 'rgba(237, 232, 219, 0.3)' : 'rgba(237, 232, 219, 0.15)',
              border: '1px solid rgba(237, 232, 219, 0.3)',
            }}
          >
            <motion.div
              className="absolute top-[2px] w-5 h-5 rounded-full"
              style={{
                background: wakeGently ? '#EDE8DB' : 'rgba(237, 232, 219, 0.5)',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              }}
              animate={{
                left: wakeGently ? '24px' : '2px',
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </button>
        </label>
      </motion.div>

      {/* End Early Button */}
      <motion.div
        className="absolute z-20 w-full px-8"
        style={{ bottom: '14%' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3, duration: 1.5 }}
      >
        <button 
          onClick={() => {
            setIsResting(false);
            setIsAwake(true);
            setAmbientTonePlaying(false);
          }}
          className="w-full rounded-full px-8 py-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: '#EDE8DB',
            boxShadow: '0 6px 24px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)',
          }}
        >
          <span 
            className="text-[#6B7A6E]"
            style={{
              fontFamily: 'Georgia, serif',
              fontWeight: 500,
              fontSize: '15px',
              letterSpacing: '0.03em',
            }}
          >
            End Early
          </span>
        </button>
      </motion.div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
        <BottomNav
          activeScreen="activities"
          variant="sage"
          onNavigateHome={onNavigateHome}
          onNavigateActivities={onNavigateActivities}
          onNavigateJournal={onNavigateJournal}
          onNavigateProfile={onNavigateProfile}
          onNavigateHelp={onNavigateHelp}
        />
      </div>
    </div>
  );
}