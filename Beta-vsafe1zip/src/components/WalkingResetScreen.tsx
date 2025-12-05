import React from 'react';
import { motion, AnimatePresence, useAnimationControls } from 'motion/react';
import { Footprints, Volume2, VolumeX } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useEntries } from '../state/EntriesContext';
import { WalkingAmbientSound } from './WalkingAmbientSound';

interface WalkingResetScreenProps {
  onFinish: () => void;
  onNavigateHome?: () => void;
  onNavigateActivities?: () => void;
  onNavigateJournal?: () => void;
  onNavigateProfile?: () => void;
  onNavigateHelp?: () => void;
}

export function WalkingResetScreen({ 
  onFinish,
  onNavigateHome,
  onNavigateActivities,
  onNavigateJournal,
  onNavigateProfile,
  onNavigateHelp,
}: WalkingResetScreenProps) {
  const { addSessionEntry } = useEntries();
  const [timeElapsed, setTimeElapsed] = React.useState(0);
  const [currentStep, setCurrentStep] = React.useState(0);
  const [currentAffirmation, setCurrentAffirmation] = React.useState(0);
  const [isComplete, setIsComplete] = React.useState(false);
  const [ambientEnabled, setAmbientEnabled] = React.useState(true);
  const [stepTrigger, setStepTrigger] = React.useState(0);
  const hasSavedRef = React.useRef(false);
  const TOTAL_TIME = 120; // 2 minutes in seconds
  const STEP_RHYTHM = 1.5; // seconds per step (gentle walking pace)

  // Animation controls for metronome reactivity
  const orbControls = useAnimationControls();
  const glowControls = useAnimationControls();
  const haloControls = useAnimationControls();
  const orbPositionControls = useAnimationControls();

  const affirmations = [
    "You're doing great.",
    "Just keep moving gently.",
    "One step at a time.",
    "You're right where you need to be.",
    "Feel the ground beneath you.",
    "Breathe and walk.",
  ];

  // Metronome sound using Web Audio API (minimized volume)
  const playMetronome = React.useCallback(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Soft, warm metronome tone - very subtle
    oscillator.frequency.value = 420; // Slightly lower, warmer
    oscillator.type = 'sine';
    
    // Gentle envelope - minimized volume
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.015, audioContext.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.12);
    
    // Trigger ambient footstep sound
    setStepTrigger(prev => prev + 1);

    // Trigger orb reaction animations - bounce and move
    orbControls.start({
      scale: [1, 1.15, 1],
      transition: { duration: 0.4, ease: "easeOut" }
    });
    
    glowControls.start({
      opacity: [0.4, 1, 0.4],
      scale: [1, 1.2, 1],
      transition: { duration: 0.4, ease: "easeOut" }
    });
    
    haloControls.start({
      scale: [1, 1.25, 1],
      opacity: [0.3, 0.7, 0.3],
      transition: { duration: 0.5, ease: "easeOut" }
    });
    
    // Bounce orb vertically
    orbPositionControls.start({
      y: [0, -15, 0],
      transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }
    });
  }, [orbControls, glowControls, haloControls, orbPositionControls]);

  React.useEffect(() => {
    // Timer
    const timer = setInterval(() => {
      setTimeElapsed((prev) => {
        if (prev >= TOTAL_TIME) {
          clearInterval(timer);
          setIsComplete(true);
          return TOTAL_TIME;
        }
        return prev + 0.1;
      });
    }, 100);

    // Step rhythm with metronome
    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % 3);
      playMetronome();
    }, STEP_RHYTHM * 1000);

    // Affirmation rotation
    const affirmationTimer = setInterval(() => {
      setCurrentAffirmation((prev) => (prev + 1) % affirmations.length);
    }, 12000); // Change every 12 seconds

    // Play initial metronome sound
    playMetronome();

    return () => {
      clearInterval(timer);
      clearInterval(stepTimer);
      clearInterval(affirmationTimer);
    };
  }, [playMetronome]);

  // Auto-save entry when walking completes
  React.useEffect(() => {
    if (isComplete && !hasSavedRef.current) {
      hasSavedRef.current = true;
      const duration = Math.round(timeElapsed);
      addSessionEntry('Walking', {
        title: 'Walking Reset – Grounded',
        body: 'You walked it out. Step by step, you found your rhythm.',
        tags: ['walking', 'movement', 'grounding'],
        metadata: { duration, steps: currentStep }
      });
    }
  }, [isComplete, timeElapsed, currentStep, addSessionEntry]);

  const progressPercentage = Math.min((timeElapsed / TOTAL_TIME) * 100, 100);
  const timeRemaining = Math.max(Math.floor(TOTAL_TIME - timeElapsed), 0);
  const minutesRemaining = Math.floor(timeRemaining / 60);
  const secondsRemaining = timeRemaining % 60;

  // Generate liquid light swirls - exact same as HomeScreen
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

  // Generate smoke particles - exact same as HomeScreen
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

  // Home screen orb - exact same structure, super reactive to metronome
  const HomeOrb = () => {
    return (
      <div className="relative w-[200px] h-[200px]">
        {/* Faint glowing halo - reacts to metronome */}
        <motion.div
          className="absolute inset-[-60px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(230,240,235,0.12) 25%, rgba(210,235,230,0.08) 40%, transparent 65%)',
            filter: 'blur(40px)',
          }}
          animate={haloControls}
          initial={{ opacity: 0.3, scale: 1 }}
        />

        {/* Secondary halo layer - reacts to metronome */}
        <motion.div
          className="absolute inset-[-80px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(210,235,230,0.15) 0%, rgba(200,218,215,0.08) 30%, transparent 55%)',
            filter: 'blur(50px)',
          }}
          animate={haloControls}
          initial={{ opacity: 0.2, scale: 1 }}
        />

        {/* Main orb body - super reactive to metronome */}
        <motion.div 
          className="absolute inset-0 rounded-full overflow-hidden" 
          style={{
            background: 'radial-gradient(circle at 45% 35%, rgba(255,255,255,0.25) 0%, rgba(245,250,245,0.2) 20%, rgba(230,240,235,0.15) 40%, rgba(210,230,225,0.1) 60%, rgba(195,220,215,0.05) 80%, transparent 100%)',
            boxShadow: '0 10px 40px rgba(236,230,216,0.2)',
          }}
          animate={orbControls}
          initial={{ scale: 1 }}
        >
          {/* Liquid light swirls inside */}
          {generateLiquidSwirls()}

          {/* White smoke diffusion spreading outward */}
          <div className="absolute inset-0">
            {generateSmokeParticles()}
          </div>

          {/* Soft inner core glow - reacts to metronome */}
          <motion.div
            className="absolute inset-[18%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(248,252,250,0.25) 35%, rgba(240,248,245,0.15) 60%, transparent 80%)',
              filter: 'blur(25px)',
            }}
            animate={glowControls}
            initial={{ opacity: 0.3, scale: 1 }}
          />

          {/* Pearlescent highlight - top left */}
          <motion.div
            className="absolute top-[20%] left-[32%] w-[90px] h-[90px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(248,252,250,0.3) 45%, rgba(230,240,235,0.15) 70%, transparent 85%)',
              filter: 'blur(18px)',
            }}
            animate={{
              opacity: [0.4, 0.7, 0.4],
              scale: [0.9, 1.15, 0.9],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Pale aqua accent */}
          <motion.div
            className="absolute bottom-[30%] right-[28%] w-[70px] h-[70px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(210,235,230,0.4) 0%, rgba(200,218,215,0.2) 55%, transparent 80%)',
              filter: 'blur(15px)',
            }}
            animate={{
              opacity: [0.3, 0.55, 0.3],
              scale: [0.95, 1.12, 0.95],
            }}
            transition={{
              duration: 6.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>

        {/* Breathing pulse animation */}
        <motion.div
          className="absolute inset-0 rounded-full"
          initial={{ scale: 1 }}
          animate={{
            scale: [1, 1.015, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ pointerEvents: 'none' }}
        />
      </div>
    );
  };

  if (isComplete) {
    return (
      <div className="relative w-full h-full flex flex-col items-center justify-center" style={{ backgroundColor: '#9AB09C' }}>
        <motion.div
          className="text-center px-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
        >
          <h2 
            className="text-[#EDE8DB] mb-6"
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '28px',
              fontWeight: 400,
              letterSpacing: '0.03em',
            }}
          >
            Walk Complete
          </h2>
          <p 
            className="text-[#EDE8DB] mb-12"
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '15px',
              fontWeight: 300,
              letterSpacing: '0.02em',
              opacity: 0.8,
              lineHeight: '1.7',
            }}
          >
            You've taken the time to move gently.
            <br />
            Notice how you feel now.
          </p>
          <button 
            onClick={onFinish}
            className="rounded-full px-12 py-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
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
              Return to Activities
            </span>
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col" style={{ backgroundColor: '#9AB09C' }}>
      
      {/* Ambient Walking Sound */}
      <WalkingAmbientSound isPlaying={ambientEnabled && !isComplete} stepTrigger={stepTrigger} />

      {/* Ambient Sound Toggle */}
      <motion.button
        className="absolute z-30 p-3 rounded-full"
        style={{ 
          top: '7%', 
          right: '6%',
          background: 'rgba(237, 232, 219, 0.15)',
          backdropFilter: 'blur(8px)',
        }}
        onClick={() => setAmbientEnabled(!ambientEnabled)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        whileTap={{ scale: 0.95 }}
      >
        {ambientEnabled ? (
          <Volume2 size={18} color="#EDE8DB" strokeWidth={1.5} style={{ opacity: 0.8 }} />
        ) : (
          <VolumeX size={18} color="#EDE8DB" strokeWidth={1.5} style={{ opacity: 0.5 }} />
        )}
      </motion.button>

      {/* Background gradient texture */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 40%), radial-gradient(circle at 70% 80%, rgba(200,230,220,0.2) 0%, transparent 50%)',
          }}
          animate={{
            opacity: [0.6, 0.85, 0.6],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Vignette */}
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 0%, transparent 40%, rgba(0,0,0,0.15) 100%)',
        }}
      />

      {/* TRACE wordmark */}
      <motion.div
        className="absolute z-10 w-full text-center"
        style={{ top: '7%' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 1.5, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <h1 style={{ 
          fontFamily: 'ALORE, Georgia, serif',
          color: '#EDE8DB',
          fontWeight: 300,
          letterSpacing: '1em',
          fontSize: '11px',
          textShadow: '0 2px 5px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.3)',
          textIndent: '1em',
          marginBottom: '4px',
        }}>
          TRACE
        </h1>
      </motion.div>

      {/* Title */}
      <motion.div
        className="absolute z-10 w-full text-center"
        style={{ top: '15%' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1.2 }}
      >
        <h2 
          className="text-[#EDE8DB]"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '26px',
            fontWeight: 400,
            letterSpacing: '0.02em',
            marginBottom: '8px',
          }}
        >
          Take a Walk
        </h2>
        <p 
          className="text-[#EDE8DB]"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '14px',
            fontWeight: 300,
            letterSpacing: '0.01em',
            opacity: 0.8,
          }}
        >
          A gentle two-minute reset.
        </p>
      </motion.div>

      {/* Centered Home Screen Orb - Positioned Higher with Breathing and Movement */}
      <motion.div
        className="absolute z-10 w-full flex justify-center"
        style={{ top: '26%' }}
        initial={{ opacity: 0, scale: 0.8, y: 0 }}
        animate={{ 
          opacity: 1, 
          scale: 1,
          x: [0, 3, -3, 0], // Gentle floating side to side
          y: [0, -5, 0, 5, 0], // Gentle floating up and down
        }}
        transition={{ 
          opacity: { delay: 0.8, duration: 1.5 },
          scale: { delay: 0.8, duration: 1.5 },
          x: { duration: 12, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 15, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <motion.div
          animate={orbPositionControls}
          initial={{ y: 0 }}
        >
          <HomeOrb />
        </motion.div>
      </motion.div>

      {/* Pacing Indicator Below Orb */}
      <motion.div
        className="absolute z-20 w-full text-center"
        style={{ top: '56%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            className="text-[#EDE8DB]"
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '18px',
              fontWeight: 300,
              letterSpacing: '0.15em',
              opacity: 0.85,
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.85, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.6 }}
          >
            walk...
          </motion.p>
        </AnimatePresence>
      </motion.div>

      {/* Progress Bar and Timer */}
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
          {minutesRemaining}:{secondsRemaining.toString().padStart(2, '0')} remaining
        </p>
        
        {/* Tiny walking icon */}
        <div className="flex justify-center mt-2">
          <Footprints size={14} style={{ color: '#EDE8DB', opacity: 0.5 }} strokeWidth={1.5} />
        </div>
      </motion.div>

      {/* Walking Affirmation */}
      <motion.div
        className="absolute z-10 w-full text-center px-8"
        style={{ top: '70%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
      >
        <div className="h-[40px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentAffirmation}
              className="text-[#EDE8DB]"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '13px',
                fontWeight: 300,
                letterSpacing: '0.02em',
                opacity: 0.65,
                fontStyle: 'italic',
              }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 0.65, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 1 }}
            >
              {affirmations[currentAffirmation]}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* End Early Button - Matching Maze "Finish Session" Style */}
      <motion.div
        className="absolute z-20 w-full px-8"
        style={{ bottom: '15%' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.5, duration: 1 }}
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