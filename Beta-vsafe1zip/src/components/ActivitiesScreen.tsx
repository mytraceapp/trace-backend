import { motion } from 'motion/react';
import { Wind } from 'lucide-react';
import { BottomNav } from './BottomNav';

interface ActivitiesScreenProps {
  onStartExercise: () => void;
  onNavigateHome?: () => void;
  onNavigateJournal?: () => void;
  onNavigateProfile?: () => void;
  onNavigateHelp?: () => void;
}

export function ActivitiesScreen({ 
  onStartExercise,
  onNavigateHome,
  onNavigateJournal,
  onNavigateProfile,
  onNavigateHelp,
}: ActivitiesScreenProps) {
  
  // Generate liquid light swirls with sage, pearl, and pale aqua (same as Chat)
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

  // Generate smoke particles (same as Chat)
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
          textShadow: '0 0 12px rgba(237, 232, 219, 0.5), 0 0 25px rgba(237, 232, 219, 0.25), 0 2px 5px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.25)',
          opacity: 0.98,
          paddingLeft: '1em',
        }}>
          TRACE
        </h1>
      </motion.div>

      {/* Dimmed Suggestion Orb - slightly smaller and more subtle */}
      <div className="absolute w-full" style={{ top: '13%' }}>
        <motion.div
          className="w-[160px] h-[160px] mx-auto"
          style={{ 
            position: 'relative',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ 
            opacity: [0.75, 0.85, 0.75], // Dimmed
            scale: [1, 1.01, 1], // Subtle breathing
            x: [0, -2, 0, 2, 0],
            y: [0, -1, 0, 1, 0],
            rotate: [0, 0.5, 0, -0.5, 0],
          }}
          transition={{ 
            opacity: { duration: 5, repeat: Infinity, ease: "easeInOut" },
            scale: { duration: 6, repeat: Infinity, ease: "easeInOut" },
            x: { duration: 10, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 11, repeat: Infinity, ease: "easeInOut" },
            rotate: { duration: 13, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          {/* Faint glowing halo - dimmed */}
          <motion.div
            className="absolute inset-[-50px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(230,240,235,0.08) 25%, rgba(210,235,230,0.05) 40%, transparent 65%)',
              filter: 'blur(35px)',
            }}
            animate={{
              scale: [0.95, 1.05, 0.95],
              opacity: [0.2, 0.35, 0.2],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Main orb body - translucent and dimmed */}
          <div className="absolute inset-0 rounded-full overflow-hidden" style={{
            background: 'radial-gradient(circle at 45% 35%, rgba(255,255,255,0.28) 0%, rgba(245,250,245,0.24) 20%, rgba(230,240,235,0.2) 40%, rgba(210,230,225,0.16) 60%, rgba(195,220,215,0.12) 80%, transparent 100%)',
            boxShadow: '0 8px 30px rgba(236,230,216,0.15)',
          }}>
            {/* Liquid light swirls inside */}
            <div style={{ opacity: 0.7 }}>
              {generateLiquidSwirls()}
            </div>

            {/* White smoke diffusion spreading outward */}
            <div className="absolute inset-0" style={{ opacity: 0.6 }}>
              {generateSmokeParticles()}
            </div>

            {/* Soft inner core glow - dimmed */}
            <motion.div
              className="absolute inset-[18%] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(248,252,250,0.18) 35%, rgba(240,248,245,0.1) 60%, transparent 80%)',
                filter: 'blur(20px)',
              }}
              animate={{
                scale: [0.85, 1.1, 0.85],
                opacity: [0.2, 0.4, 0.2],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Pearlescent highlight - dimmed */}
            <motion.div
              className="absolute top-[20%] left-[32%] w-[70px] h-[70px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(248,252,250,0.22) 45%, rgba(230,240,235,0.1) 70%, transparent 85%)',
                filter: 'blur(15px)',
              }}
              animate={{
                opacity: [0.3, 0.6, 0.3],
                scale: [0.9, 1.1, 0.9],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        </motion.div>
      </div>

      {/* Title Section */}
      <motion.div
        className="absolute z-20 w-full px-8 text-center"
        style={{ top: '38%' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1 }}
      >
        <h2 
          className="text-[#EDE8DB] mb-2"
          style={{
            fontFamily: 'Georgia, serif',
            fontWeight: 400,
            fontSize: '20px',
            letterSpacing: '0.02em',
            opacity: 0.95,
          }}
        >
          Let's try something grounding.
        </h2>
        <p 
          className="text-[#EDE8DB]"
          style={{
            fontFamily: 'Georgia, serif',
            fontWeight: 300,
            fontSize: '14px',
            letterSpacing: '0.01em',
            opacity: 0.75,
          }}
        >
          Here's what I suggest for you right now.
        </p>
      </motion.div>

      {/* Activity Card */}
      <motion.div
        className="absolute z-20 w-full px-8"
        style={{ top: '52%' }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 1 }}
      >
        <div 
          className="rounded-3xl px-6 py-6"
          style={{
            background: '#EDE8DB',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1)',
          }}
        >
          <div className="flex items-start gap-4">
            {/* Small icon */}
            <div 
              className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: 'radial-gradient(circle, rgba(141, 161, 143, 0.2) 0%, rgba(141, 161, 143, 0.1) 100%)',
              }}
            >
              <Wind size={20} className="text-[#8DA18F]" strokeWidth={1.5} />
            </div>
            
            {/* Text content */}
            <div className="flex-1">
              <h3 
                className="text-[#6B7A6E] mb-1"
                style={{
                  fontFamily: 'Georgia, serif',
                  fontWeight: 500,
                  fontSize: '16px',
                  letterSpacing: '0.01em',
                }}
              >
                Deep Breathing
              </h3>
              <p 
                className="text-[#6B7A6E]"
                style={{
                  fontFamily: 'Georgia, serif',
                  fontWeight: 300,
                  fontSize: '13px',
                  letterSpacing: '0.01em',
                  opacity: 0.75,
                  lineHeight: '1.5',
                }}
              >
                A quick 30-second reset to help you settle.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Let's do it Button */}
      <motion.div
        className="absolute z-20 w-full px-8"
        style={{ top: '68%' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 1 }}
      >
        <button 
          onClick={onStartExercise}
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
            Let's do it
          </span>
        </button>
      </motion.div>

      {/* Bottom Menu Bar */}
      <BottomNav
        activeScreen="activities"
        variant="sage"
        onNavigateHome={onNavigateHome}
        onNavigateJournal={onNavigateJournal}
        onNavigateProfile={onNavigateProfile}
        onNavigateHelp={onNavigateHelp}
      />
    </div>
  );
}