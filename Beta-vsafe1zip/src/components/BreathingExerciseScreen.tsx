import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BottomNav } from './BottomNav';

interface BreathingExerciseScreenProps {
  onFinish: () => void;
  onNavigateHome?: () => void;
  onNavigateActivities?: () => void;
  onNavigateJournal?: () => void;
  onNavigateProfile?: () => void;
  onNavigateHelp?: () => void;
}

// Create breath sound using Web Audio API
function createBreathSound(audioContext: AudioContext, isInhale: boolean, duration: number) {
  const now = audioContext.currentTime;
  
  // Create noise source for breath texture
  const bufferSize = audioContext.sampleRate * duration;
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  
  // Generate soft pink noise (more natural sounding)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  
  const noiseSource = audioContext.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  
  // Create filter for breath shaping
  const filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass';
  
  // Create gain node for volume envelope
  const gainNode = audioContext.createGain();
  
  if (isInhale) {
    // Inhale: gentle rising filter, very soft volume
    filter.frequency.setValueAtTime(150, now);
    filter.frequency.linearRampToValueAtTime(400, now + duration * 0.7);
    filter.frequency.linearRampToValueAtTime(250, now + duration);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.04, now + duration * 0.4);
    gainNode.gain.linearRampToValueAtTime(0.03, now + duration * 0.8);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);
  } else {
    // Exhale: gentle falling filter, soft soothing volume
    filter.frequency.setValueAtTime(350, now);
    filter.frequency.linearRampToValueAtTime(200, now + duration * 0.5);
    filter.frequency.linearRampToValueAtTime(100, now + duration);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.05, now + duration * 0.25);
    gainNode.gain.linearRampToValueAtTime(0.03, now + duration * 0.7);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);
  }
  
  filter.Q.setValueAtTime(1, now);
  
  // Connect nodes
  noiseSource.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  // Start and stop
  noiseSource.start(now);
  noiseSource.stop(now + duration);
  
  return noiseSource;
}

export function BreathingExerciseScreen({ 
  onFinish,
  onNavigateHome,
  onNavigateActivities,
  onNavigateJournal,
  onNavigateProfile,
  onNavigateHelp,
}: BreathingExerciseScreenProps) {
  const [phase, setPhase] = React.useState<'inhale' | 'exhale'>('inhale');
  const [progress, setProgress] = React.useState(0);
  const [audioStarted, setAudioStarted] = React.useState(false);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const TOTAL_DURATION = 30; // 30 seconds total
  const BREATH_CYCLE = 6; // 3 seconds inhale + 3 seconds exhale
  const PHASE_DURATION = BREATH_CYCLE / 2; // 3 seconds per phase

  // Initialize audio context on user interaction
  const startAudio = React.useCallback(() => {
    if (!audioStarted) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      setAudioStarted(true);
    }
  }, [audioStarted]);

  // Play breath sound when phase changes
  React.useEffect(() => {
    if (audioStarted && audioContextRef.current && progress < TOTAL_DURATION) {
      createBreathSound(audioContextRef.current, phase === 'inhale', PHASE_DURATION);
    }
  }, [phase, audioStarted, progress]);

  // Cleanup audio context
  React.useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  React.useEffect(() => {
    // Progress timer
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= TOTAL_DURATION) {
          clearInterval(progressInterval);
          return TOTAL_DURATION;
        }
        return prev + 0.1;
      });
    }, 100);

    // Breathing phase cycling
    const phaseInterval = setInterval(() => {
      setPhase((prev) => (prev === 'inhale' ? 'exhale' : 'inhale'));
    }, PHASE_DURATION * 1000); // Switch every 3 seconds

    return () => {
      clearInterval(progressInterval);
      clearInterval(phaseInterval);
    };
  }, []);

  // Generate liquid light swirls with sage, pearl, and pale aqua
  const generateLiquidSwirls = () => {
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
      const opacity = 0.18 + (i % 10) * 0.02;
      
      const strokeWidth = 5 + (i % 10) * 3;
      const blur = 3 + (i % 5) * 1.5;
      const duration = 45 + (i % 35);
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
            opacity: [opacity * 0.6, opacity, opacity * 0.6],
          }}
          transition={{
            rotate: { duration, repeat: Infinity, ease: "linear" },
            opacity: { duration: 7 + (i % 4), repeat: Infinity, ease: "easeInOut", delay },
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

  // Generate smoke particles
  const generateSmokeParticles = () => {
    const particles = [];
    
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30) % 360;
      const delay = i * 0.3;
      const duration = 8 + (i % 4) * 2;
      
      particles.push(
        <motion.div
          key={`smoke-${i}`}
          className="absolute w-[80px] h-[80px] rounded-full"
          style={{
            left: '50%',
            top: '50%',
            marginLeft: '-40px',
            marginTop: '-40px',
            background: `radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(240,248,245,0.08) 40%, transparent 70%)`,
            filter: 'blur(20px)',
          }}
          animate={{
            x: Math.cos((angle * Math.PI) / 180) * 100,
            y: Math.sin((angle * Math.PI) / 180) * 100,
            scale: [0.5, 1.5, 0.5],
            opacity: [0, 0.4, 0],
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay,
          }}
        />
      );
    }
    
    return particles;
  };

  const progressPercentage = (progress / TOTAL_DURATION) * 100;

  return (
    <div 
      className="relative w-full h-full flex flex-col" 
      style={{ backgroundColor: '#9AB09C' }}
      onClick={startAudio}
    >
      {/* Tap to enable sound prompt */}
      <AnimatePresence>
        {!audioStarted && (
          <motion.div
            className="absolute z-40 w-full text-center"
            style={{ top: '75%' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p 
              className="text-[#EDE8DB]"
              style={{
                fontFamily: 'Georgia, serif',
                fontWeight: 300,
                fontSize: '12px',
                letterSpacing: '0.05em',
                opacity: 0.6,
              }}
            >
              Tap anywhere to enable breathing sounds
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TRACE Brand Name - matching home screen style */}
      <motion.div
        className="absolute w-full text-center z-30"
        style={{ top: '7%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 1.5, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <h1
          style={{
            fontFamily: 'ALORE, Georgia, serif',
            color: '#EDE8DB',
            fontWeight: 300,
            letterSpacing: '1em',
            fontSize: '11px',
            opacity: 0.7,
          }}
        >
          TRACE
        </h1>
      </motion.div>

      {/* Instruction Text Above Orb */}
      <motion.div
        className="absolute z-20 w-full text-center"
        style={{ top: '14%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={phase}
            className="text-[#EDE8DB]"
            style={{
              fontFamily: 'Georgia, serif',
              fontWeight: 300,
              fontSize: '18px',
              letterSpacing: '0.08em',
              opacity: 0.9,
              textTransform: 'lowercase',
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.8 }}
          >
            {phase === 'inhale' ? 'Inhale…' : 'Exhale…'}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* Large Breathing Orb - Centered */}
      <div className="absolute w-full" style={{ top: '20%' }}>
        <motion.div
          className="w-[240px] h-[240px] mx-auto"
          style={{ 
            position: 'relative',
          }}
          initial={{ opacity: 0, scale: 1 }}
          animate={{ 
            opacity: 1,
            scale: phase === 'inhale' ? 0.85 : 1.15, // Contract on inhale, expand on exhale
            x: [0, -5, 0, 5, 0],
            y: [0, -3, 0, 3, 0],
            rotate: [0, 1, 0, -1, 0],
          }}
          transition={{ 
            opacity: { duration: 1.5 },
            scale: { 
              duration: BREATH_CYCLE / 2, // 3 seconds per phase
              ease: [0.4, 0.0, 0.2, 1] // Smooth breathing curve
            },
            x: { duration: 8, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 9, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 11, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          {/* Breathing glow halo - more intense on inhale */}
          <motion.div
            className="absolute inset-[-70px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(230,240,235,0.15) 25%, rgba(210,235,230,0.1) 40%, transparent 65%)',
              filter: 'blur(45px)',
            }}
            animate={{
              scale: phase === 'inhale' ? [0.85, 1.15, 0.85] : [0.9, 1.3, 0.9],
              opacity: phase === 'inhale' ? [0.2, 0.5, 0.2] : [0.3, 0.7, 0.3],
            }}
            transition={{
              duration: BREATH_CYCLE / 2,
              ease: "easeInOut",
            }}
          />

          {/* Secondary halo - breathes with orb */}
          <motion.div
            className="absolute inset-[-90px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(210,235,230,0.18) 0%, rgba(200,218,215,0.1) 30%, transparent 55%)',
              filter: 'blur(55px)',
            }}
            animate={{
              scale: phase === 'inhale' ? [0.95, 1.25, 0.95] : [1, 1.4, 1],
              opacity: phase === 'inhale' ? [0.15, 0.45, 0.15] : [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: BREATH_CYCLE / 2,
              ease: "easeInOut",
            }}
          />

          {/* Main orb body - breathes */}
          <motion.div 
            className="absolute inset-0 rounded-full overflow-hidden" 
            style={{
              background: 'radial-gradient(circle at 45% 35%, rgba(255,255,255,0.4) 0%, rgba(245,250,245,0.35) 20%, rgba(230,240,235,0.28) 40%, rgba(210,230,225,0.22) 60%, rgba(195,220,215,0.18) 80%, transparent 100%)',
              boxShadow: '0 12px 50px rgba(236,230,216,0.25)',
            }}
          >
            {/* Liquid light swirls inside */}
            {generateLiquidSwirls()}

            {/* White smoke diffusion spreading outward */}
            <div className="absolute inset-0">
              {generateSmokeParticles()}
            </div>

            {/* Soft inner core glow - pulses with breathing */}
            <motion.div
              className="absolute inset-[18%] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.45) 0%, rgba(248,252,250,0.32) 35%, rgba(240,248,245,0.2) 60%, transparent 80%)',
                filter: 'blur(28px)',
              }}
              animate={{
                scale: phase === 'inhale' ? [0.75, 1.3, 0.75] : [0.8, 1.5, 0.8],
                opacity: phase === 'inhale' ? [0.3, 0.7, 0.3] : [0.4, 0.85, 0.4],
              }}
              transition={{
                duration: BREATH_CYCLE / 2,
                ease: "easeInOut",
              }}
            />

            {/* Pearlescent highlight - shimmers with breath */}
            <motion.div
              className="absolute top-[20%] left-[32%] w-[100px] h-[100px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(248,252,250,0.38) 45%, rgba(230,240,235,0.18) 70%, transparent 85%)',
                filter: 'blur(20px)',
              }}
              animate={{
                opacity: phase === 'inhale' ? [0.35, 0.85, 0.35] : [0.4, 1, 0.4],
                scale: phase === 'inhale' ? [0.8, 1.25, 0.8] : [0.85, 1.4, 0.85],
              }}
              transition={{
                duration: BREATH_CYCLE / 2,
                ease: "easeInOut",
              }}
            />

            {/* Pale aqua accent - breathes subtly */}
            <motion.div
              className="absolute bottom-[30%] right-[28%] w-[85px] h-[85px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(210,235,230,0.5) 0%, rgba(200,218,215,0.28) 55%, transparent 80%)',
                filter: 'blur(18px)',
              }}
              animate={{
                opacity: phase === 'inhale' ? [0.25, 0.7, 0.25] : [0.3, 0.8, 0.3],
                scale: phase === 'inhale' ? [0.85, 1.2, 0.85] : [0.9, 1.35, 0.9],
              }}
              transition={{
                duration: BREATH_CYCLE / 2,
                ease: "easeInOut",
              }}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Instruction Text Below Orb */}
      <motion.div
        className="absolute z-20 w-full text-center"
        style={{ top: '58%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={`below-${phase}`}
            className="text-[#EDE8DB]"
            style={{
              fontFamily: 'Georgia, serif',
              fontWeight: 300,
              fontSize: '18px',
              letterSpacing: '0.08em',
              opacity: 0.9,
              textTransform: 'lowercase',
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.8 }}
          >
            {phase === 'exhale' ? 'Exhale…' : 'Inhale…'}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* Progress Bar */}
      <motion.div
        className="absolute z-20 w-full px-12"
        style={{ top: '62%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
      >
        <div 
          className="w-full h-1 rounded-full overflow-hidden"
          style={{
            background: 'rgba(237, 232, 219, 0.2)',
          }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(to right, rgba(237, 232, 219, 0.6), rgba(237, 232, 219, 0.9))',
              width: `${progressPercentage}%`,
            }}
            initial={{ width: '0%' }}
          />
        </div>
        
        {/* Timer text */}
        <p 
          className="text-[#EDE8DB] text-center mt-2"
          style={{
            fontFamily: 'Georgia, serif',
            fontWeight: 300,
            fontSize: '12px',
            letterSpacing: '0.05em',
            opacity: 0.7,
            filter: 'blur(0.4px)',
          }}
        >
          {Math.floor(TOTAL_DURATION - progress)}s remaining
        </p>
      </motion.div>

      {/* Guidance Text */}
      <motion.div
        className="absolute z-20 w-full px-8 text-center"
        style={{ top: '67%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
      >
        <p 
          className="text-[#EDE8DB]"
          style={{
            fontFamily: 'Georgia, serif',
            fontWeight: 300,
            fontSize: '13px',
            letterSpacing: '0.02em',
            opacity: 0.7,
          }}
        >
          Just follow the orb. You're doing great.
        </p>
      </motion.div>

      {/* Finish Session Button */}
      <motion.div
        className="absolute z-20 w-full px-8"
        style={{ bottom: '15%' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 1 }}
      >
        <button 
          onClick={onFinish}
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
            Finish Session
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