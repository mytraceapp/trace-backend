import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BottomNav } from './BottomNav';
import { InteractiveMaze } from './InteractiveMaze';
import { useEntries } from '../state/EntriesContext';
import { MazeFocusTone } from './MazeFocusTone';

interface MazeScreenProps {
  onReturnToChat: () => void;
  onNavigateHome?: () => void;
  onNavigateActivities?: () => void;
  onNavigateJournal?: () => void;
  onNavigateProfile?: () => void;
  onNavigateHelp?: () => void;
}

export function MazeScreen({ 
  onReturnToChat,
  onNavigateHome,
  onNavigateActivities,
  onNavigateJournal,
  onNavigateProfile,
  onNavigateHelp,
}: MazeScreenProps) {
  const { addSessionEntry } = useEntries();
  const [traceProgress, setTraceProgress] = React.useState(0);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const [timeElapsed, setTimeElapsed] = React.useState(0);
  const [mazeKey, setMazeKey] = React.useState(0);
  const hasSavedRef = React.useRef(false);
  const TOTAL_TIME = 45; // 45 seconds

  // Timer
  React.useEffect(() => {
    if (isCompleted) return;
    
    const timer = setInterval(() => {
      setTimeElapsed((prev) => {
        if (prev >= TOTAL_TIME) {
          clearInterval(timer);
          return TOTAL_TIME;
        }
        return prev + 0.1;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [isCompleted]);

  // Auto-save entry when maze is completed
  React.useEffect(() => {
    if (isCompleted && !hasSavedRef.current) {
      hasSavedRef.current = true;
      const duration = Math.round(timeElapsed);
      addSessionEntry('Maze', {
        title: 'Maze – Focused',
        body: 'Nice job slowing down. You traced your way to calm.',
        tags: ['focus', 'mindfulness', 'maze'],
        metadata: { duration }
      });
    }
  }, [isCompleted, timeElapsed, addSessionEntry]);

  const handleMazeComplete = () => {
    setIsCompleted(true);
    setTraceProgress(1);
  };

  const handleProgressChange = (progress: number) => {
    setTraceProgress(progress);
  };

  const handlePlayAgain = () => {
    setIsCompleted(false);
    setTraceProgress(0);
    setTimeElapsed(0);
    setMazeKey(prev => prev + 1);
    hasSavedRef.current = false;
  };

  const progressPercentage = (timeElapsed / TOTAL_TIME) * 100;

  // Generate liquid light swirls with sage, pearl, and pale aqua (same as Home)
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

  // Generate smoke particles (same as Home)
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

  return (
    <div className="relative w-full h-full flex flex-col" style={{ backgroundColor: '#9AB09C' }}>
      
      {/* Focus ambient tone - plays entire time on maze page */}
      <MazeFocusTone isPlaying={true} volume={0.32} />
      
      {/* TRACE Brand Name at top */}
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
          opacity: 0.95,
        }}>
          TRACE
        </h1>
      </motion.div>

      {/* Title Section */}
      <motion.div
        className="absolute z-20 w-full px-8 text-center"
        style={{ top: '14%' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
      >
        <h2 
          className="text-[#EDE8DB] mb-1"
          style={{
            fontFamily: 'Georgia, serif',
            fontWeight: 400,
            fontSize: '22px',
            letterSpacing: '0.02em',
            opacity: 0.95,
          }}
        >
          Trace the Maze
        </h2>
        <p 
          className="text-[#EDE8DB]"
          style={{
            fontFamily: 'Georgia, serif',
            fontWeight: 300,
            fontSize: '13px',
            letterSpacing: '0.01em',
            opacity: 0.75,
          }}
        >
          Soothing, simple, and grounding.
        </p>
      </motion.div>

      {/* Large Breathing Orb - Behind Maze */}
      <div className="absolute w-full" style={{ top: '24%' }}>
        <motion.div
          className="w-[340px] h-[340px] mx-auto"
          style={{ 
            position: 'relative',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ 
            opacity: [0.9, 1, 0.9],
            scale: [1, 1.02, 1],
            x: [0, -4, 0, 4, 0],
            y: [0, -2, 0, 2, 0],
            rotate: [0, 0.8, 0, -0.8, 0],
          }}
          transition={{ 
            opacity: { duration: 4, repeat: Infinity, ease: "easeInOut" },
            scale: { duration: 5, repeat: Infinity, ease: "easeInOut" },
            x: { duration: 8, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 9, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 11, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          {/* Faint glowing halo around orb */}
          <motion.div
            className="absolute inset-[-60px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(230,240,235,0.12) 25%, rgba(210,235,230,0.08) 40%, transparent 65%)',
              filter: 'blur(40px)',
            }}
            animate={{
              scale: [0.95, 1.08, 0.95],
              opacity: [0.25, 0.42, 0.25],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Secondary halo layer */}
          <motion.div
            className="absolute inset-[-80px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(210,235,230,0.15) 0%, rgba(200,218,215,0.08) 30%, transparent 55%)',
              filter: 'blur(50px)',
            }}
            animate={{
              scale: [1, 1.12, 1],
              opacity: [0.15, 0.32, 0.15],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Main orb body - translucent */}
          <div className="absolute inset-0 rounded-full overflow-hidden" style={{
            background: 'radial-gradient(circle at 45% 35%, rgba(255,255,255,0.35) 0%, rgba(245,250,245,0.3) 20%, rgba(230,240,235,0.25) 40%, rgba(210,230,225,0.2) 60%, rgba(195,220,215,0.15) 80%, transparent 100%)',
            boxShadow: '0 10px 40px rgba(236,230,216,0.2)',
          }}>
            {/* Liquid light swirls inside */}
            {generateLiquidSwirls()}

            {/* White smoke diffusion spreading outward */}
            <div className="absolute inset-0">
              {generateSmokeParticles()}
            </div>

            {/* Soft inner core glow */}
            <motion.div
              className="absolute inset-[18%] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(248,252,250,0.25) 35%, rgba(240,248,245,0.15) 60%, transparent 80%)',
                filter: 'blur(25px)',
              }}
              animate={{
                scale: [0.85, 1.15, 0.85],
                opacity: [0.25, 0.45, 0.25],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
              }}
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
          </div>

          {/* Breathing pulse animation */}
          <motion.div
            className="absolute inset-0 rounded-full"
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
        </motion.div>
      </div>

      {/* Maze Container with Circular Timer Ring */}
      <motion.div
        className="absolute z-30 w-full"
        style={{ top: '24%' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.9, duration: 1.2 }}
      >
        <div className="relative w-[340px] h-[340px] mx-auto">

          {/* Circular Timer Ring - 45 seconds */}
          <svg 
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 340 340"
            style={{ 
              transform: 'rotate(-90deg)',
              filter: 'drop-shadow(0 2px 8px rgba(168, 144, 124, 0.2))',
            }}
          >
            {/* Background ring */}
            <circle
              cx="170"
              cy="170"
              r="165"
              fill="none"
              stroke="rgba(237, 232, 219, 0.15)"
              strokeWidth="3"
            />
            
            {/* Progress ring */}
            <motion.circle
              cx="170"
              cy="170"
              r="165"
              fill="none"
              stroke="rgba(168, 144, 124, 0.5)"
              strokeWidth="3"
              strokeLinecap="round"
              style={{
                strokeDasharray: `${2 * Math.PI * 165}`,
                strokeDashoffset: `${2 * Math.PI * 165 * (1 - progressPercentage / 100)}`,
                transition: 'stroke-dashoffset 0.1s linear',
              }}
            />
          </svg>

          {/* Maze Background Card */}
          <div 
            className="absolute inset-[30px] rounded-[32px] overflow-hidden"
            style={{
              background: 'rgba(237, 232, 219, 0.12)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.15)',
            }}
          >
            {/* Interactive Maze Component */}
            <InteractiveMaze
              key={mazeKey}
              width={10}
              height={13}
              cellSize={20}
              padding={8}
              onComplete={handleMazeComplete}
              onProgressChange={handleProgressChange}
            />
          </div>
        </div>

        {/* Timer label */}
        <motion.p 
          className="text-[#EDE8DB] text-center mt-6"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 300,
            fontSize: '11px',
            letterSpacing: '0.08em',
            opacity: 0.55,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.55 }}
          transition={{ delay: 1.2, duration: 1 }}
        >
          45-SECOND RESET · {Math.floor(TOTAL_TIME - timeElapsed)}s
        </motion.p>
      </motion.div>

      {/* Instructions */}
      <motion.div
        className="absolute z-20 w-full px-8 text-center"
        style={{ top: '72%' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 1 }}
      >
        <p 
          className="text-[#EDE8DB] mb-3"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 400,
            fontSize: '15px',
            letterSpacing: '0.01em',
            opacity: 0.9,
            lineHeight: '1.5',
          }}
        >
          Follow the path with your finger.
        </p>
        <p 
          className="text-[#EDE8DB]"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 300,
            fontSize: '14px',
            letterSpacing: '0.005em',
            opacity: 0.75,
            lineHeight: '1.5',
          }}
        >
          Go slow. This is your moment.
        </p>
      </motion.div>

      {/* Finish Button */}
      <motion.div
        className="absolute z-20 w-full px-8"
        style={{ bottom: '11%' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 1 }}
      >
        <button 
          onClick={() => setIsCompleted(true)}
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

      {/* Completion Overlay */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div
            className="absolute inset-0 z-50 flex flex-col items-center justify-center px-8"
            style={{
              background: 'rgba(164, 184, 166, 0.96)',
              backdropFilter: 'blur(20px)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Affirmation */}
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            >
              <p 
                className="text-[#EDE8DB]"
                style={{
                  fontFamily: 'Georgia, serif',
                  fontWeight: 400,
                  fontSize: '20px',
                  letterSpacing: '0.02em',
                  opacity: 0.95,
                  lineHeight: '1.6',
                }}
              >
                Nice job slowing down.
                <br />
                I'm proud of you.
              </p>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              className="w-full space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              {/* Play Again */}
              <button 
                onClick={handlePlayAgain}
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
                  Play Again
                </span>
              </button>

              {/* Return to Activities */}
              <button 
                onClick={onNavigateActivities}
                className="w-full rounded-full px-8 py-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'transparent',
                  border: '1.5px solid rgba(237, 232, 219, 0.5)',
                }}
              >
                <span 
                  className="text-[#EDE8DB]"
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
          </motion.div>
        )}
      </AnimatePresence>

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