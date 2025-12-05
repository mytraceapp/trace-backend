import React from 'react';
import { motion } from 'motion/react';
import traceLogo from 'figma:asset/513ec3c351285cce0b15e678c8f6d864d8269d64.png';
import { EtherealTone } from './EtherealTone';

interface HomeScreenProps {
  onNavigateToAuth?: () => void;
}

export function HomeScreen({ onNavigateToAuth }: HomeScreenProps) {
  const [isLogoLowered, setIsLogoLowered] = React.useState(false);
  const [isAwakened, setIsAwakened] = React.useState(false);

  // When logo finishes lowering, trigger orb awakening
  React.useEffect(() => {
    if (isLogoLowered && !isAwakened) {
      // Wait for logo to finish lowering (2.8s), then awaken orb
      const awakenTimer = setTimeout(() => {
        setIsAwakened(true);
      }, 2800);

      return () => clearTimeout(awakenTimer);
    }
  }, [isLogoLowered, isAwakened]);

  // Auto-transition to auth page after orb rises (5s) + 1 second pause
  React.useEffect(() => {
    if (isAwakened && onNavigateToAuth) {
      // Orb rise animation takes 5 seconds, then wait 1 second
      const transitionTimer = setTimeout(() => {
        onNavigateToAuth();
      }, 6000); // Navigate at 6s (5s rise + 1s pause)

      return () => {
        clearTimeout(transitionTimer);
      };
    }
  }, [isAwakened, onNavigateToAuth]);

  const handleLogoClick = () => {
    if (!isLogoLowered) {
      setIsLogoLowered(true);
    }
  };

  // Generate liquid light swirls with sage, pearl, and pale aqua
  const generateLiquidSwirls = () => {
    const swirls = [];
    const centerX = 160;
    const centerY = 160;
    
    // Soft white, sage, pearl, and pale aqua colors for liquid light
    const colors = [
      { r: 255, g: 255, b: 255, name: 'white' },      // soft white
      { r: 248, g: 252, b: 250, name: 'pearl' },      // pearl
      { r: 230, g: 240, b: 235, name: 'sage-light' }, // pale sage
      { r: 210, g: 235, b: 230, name: 'aqua' },       // pale aqua
      { r: 240, g: 248, b: 245, name: 'mist' },       // mist
      { r: 200, g: 218, b: 215, name: 'sage' },       // sage
    ];
    
    // Create flowing liquid swirls
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

  // Generate smoke particles spreading outward
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
    <div 
      className="relative w-full h-full flex items-center justify-center" 
      style={{ backgroundColor: '#8DA18F' }}
    >
      {/* Ethereal tone - plays when orb awakens */}
      <EtherealTone trigger={isAwakened} />
      
      {/* TRACE Brand Name - lowered another 0.5% to 7% */}
      <motion.div
        className="absolute z-10"
        style={{ top: '7%' }}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 1.5, ease: [0.22, 0.61, 0.36, 1] }}
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

      {/* Awakening orb - starts small behind logo, rises just below TRACE text */}
      {isAwakened && (
        <motion.div
          className="absolute w-[200px] h-[200px]"
          style={{ top: '55%' }}
          initial={{ y: 0, opacity: 0, scale: 0.2 }}
          animate={{
            y: -340,
            opacity: 1,
            scale: 1,
          }}
          transition={{
            y: { duration: 5, ease: [0.12, 0.78, 0.38, 0.98] }, // Even slower, more intentional
            opacity: { duration: 3.5, ease: "easeOut" },
            scale: { duration: 5, ease: [0.12, 0.78, 0.38, 0.98] }, // Slow, graceful expansion
          }}
        >
          {/* Faint glowing halo around orb */}
          <motion.div
            className="absolute inset-[-60px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(230,240,235,0.12) 25%, rgba(210,235,230,0.08) 40%, transparent 65%)',
              filter: 'blur(40px)',
            }}
            initial={{ opacity: 0 }}
            animate={{
              scale: [0.95, 1.05, 0.95],
              opacity: [0.25, 0.4, 0.25],
            }}
            transition={{
              delay: 2,
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
            initial={{ opacity: 0 }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.15, 0.3, 0.15],
            }}
            transition={{
              delay: 2.2,
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
              initial={{ opacity: 0 }}
              animate={{
                scale: [0.85, 1.15, 0.85],
                opacity: [0.25, 0.45, 0.25],
              }}
              transition={{
                delay: 1.5,
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
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.4, 0.7, 0.4],
                scale: [0.9, 1.15, 0.9],
              }}
              transition={{
                delay: 2,
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
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.3, 0.55, 0.3],
                scale: [0.95, 1.12, 0.95],
              }}
              transition={{
                delay: 2.3,
                duration: 6.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>

          {/* Breathing pulse animation - starts after awakening */}
          <motion.div
            className="absolute inset-0 rounded-full"
            initial={{ scale: 1 }}
            animate={{
              scale: [1, 1.015, 1],
            }}
            transition={{
              delay: 3,
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ pointerEvents: 'none' }}
          />
        </motion.div>
      )}

      {/* TRACE Logo - starts at mid screen, lowers on click, then orb rises */}
      <motion.button
        onClick={handleLogoClick}
        className="absolute z-30 cursor-pointer"
        style={{ 
          background: 'transparent',
          border: 'none',
          padding: 0,
        }}
        initial={{ opacity: 0, scale: 0.92, top: '40%' }}
        animate={{ 
          opacity: 1, 
          scale: isAwakened ? 1 : [1, 1.03, 1],
          top: isLogoLowered ? '55%' : '40%',
        }}
        transition={{ 
          opacity: { delay: 0.3, duration: 1.5, ease: [0.22, 0.61, 0.36, 1] },
          scale: isAwakened ? { duration: 0.4 } : { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
          top: { duration: 2.8, ease: [0.15, 0.65, 0.35, 1] },
        }}
        whileHover={!isLogoLowered ? { scale: 1.05 } : {}}
        whileTap={!isLogoLowered ? { scale: 0.95 } : {}}
      >
        {/* Logo outer glow */}
        <motion.div
          className="absolute inset-[-20px] rounded-[32px] pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(236,230,216,0.4) 0%, rgba(236,230,216,0.2) 40%, transparent 70%)',
            filter: 'blur(25px)',
          }}
          animate={{
            opacity: isAwakened ? [0.3, 0.5, 0.3] : [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Logo image - transparent background outside cream border, all interior preserved */}
        <motion.img
          src={traceLogo}
          alt="TRACE"
          className="relative w-[90px] h-[90px] pointer-events-none"
          style={{
            filter: 'drop-shadow(0 4px 20px rgba(236,230,216,0.4))',
          }}
          animate={{
            filter: [
              'drop-shadow(0 4px 20px rgba(236,230,216,0.4))',
              'drop-shadow(0 6px 28px rgba(236,230,216,0.55))',
              'drop-shadow(0 4px 20px rgba(236,230,216,0.4))',
            ],
          }}
          transition={{
            delay: 2,
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.button>
    </div>
  );
}