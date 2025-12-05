import React from 'react';
import { motion } from 'motion/react';

export function MistOrb() {
  // Generate liquid marble swirls - pearlescent with sage, teal, gold
  const generateSwirls = () => {
    const swirls = [];
    const centerX = 120;
    const centerY = 120;
    
    // Define color palette - off-white, cream, sage for paint-mixing effect
    const colors = [
      { r: 255, g: 255, b: 255, name: 'pure-white' },       // Pure white
      { r: 250, g: 250, b: 250, name: 'bright-white' },     // Bright white
      { r: 245, g: 245, b: 245, name: 'off-white' },        // Off-white
      { r: 240, g: 242, b: 242, name: 'cream-white' },      // Cream white
      { r: 235, g: 238, b: 238, name: 'light-cream' },      // Light cream
      { r: 220, g: 235, b: 225, name: 'soft-sage' },        // Soft sage
      { r: 200, g: 230, b: 220, name: 'pale-sage' },        // Pale sage green
      { r: 195, g: 230, b: 225, name: 'sage-mist' },        // Sage mist
    ];
    
    // Create flowing liquid marble swirls
    for (let i = 0; i < 80; i++) {
      const angle = (i * 137.5) % 360; // Golden angle distribution
      const radius = 15 + (i % 18) * 8;
      const sweep = 140 + (i % 12) * 20;
      
      // Generate smooth curved paths
      const startAngle = angle + (i % 10) * 5;
      const endAngle = startAngle + sweep;
      const midAngle = startAngle + sweep / 2;
      
      const x1 = centerX + Math.cos((startAngle * Math.PI) / 180) * radius;
      const y1 = centerY + Math.sin((startAngle * Math.PI) / 180) * radius;
      
      const curvature = radius * 1.15 + (i % 7) * 3;
      const x2 = centerX + Math.cos((midAngle * Math.PI) / 180) * curvature;
      const y2 = centerY + Math.sin((midAngle * Math.PI) / 180) * curvature;
      
      const x3 = centerX + Math.cos((endAngle * Math.PI) / 180) * radius;
      const y3 = centerY + Math.sin((endAngle * Math.PI) / 180) * radius;
      
      const pathD = `M ${x1} ${y1} Q ${x2} ${y2}, ${x3} ${y3}`;
      
      // Color selection - blend between white, sage, teal, gold
      const colorIndex = i % colors.length;
      const color = colors[colorIndex];
      const opacity = 0.3 + (i % 12) * 0.05;
      
      const strokeWidth = 8 + (i % 10) * 4;
      const blur = 0.5 + (i % 5) * 0.8; // Sharpened - less blur
      const duration = 40 + (i % 50);
      const direction = i % 2 === 0 ? [0, 360] : [360, 0];
      const delay = (i % 20) * 0.15;
      
      swirls.push(
        <motion.svg
          key={`swirl-${i}`}
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 240 240"
          style={{ zIndex: 10 + (i % 15) }}
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
    
    // Add vortex center swirls - tighter spirals
    for (let v = 0; v < 25; v++) {
      const spiralTurns = 2;
      const points = [];
      
      for (let t = 0; t <= 1; t += 0.2) {
        const spiralAngle = t * spiralTurns * 360 + (v * 360) / 25;
        const spiralRadius = 5 + t * (35 + (v % 8) * 5);
        const px = centerX + Math.cos((spiralAngle * Math.PI) / 180) * spiralRadius;
        const py = centerY + Math.sin((spiralAngle * Math.PI) / 180) * spiralRadius;
        points.push([px, py]);
      }
      
      const pathD = `M ${points[0][0]} ${points[0][1]} ${points.slice(1).map(p => `L ${p[0]} ${p[1]}`).join(' ')}`;
      
      const colorIndex = v % colors.length;
      const color = colors[colorIndex];
      const opacity = 0.4 + (v % 8) * 0.04;
      const strokeWidth = 6 + (v % 6) * 3;
      const blur = 1.5 + (v % 4) * 0.8;
      const duration = 50 + (v % 40);
      const direction = v % 2 === 0 ? [0, 360] : [360, 0];
      
      swirls.push(
        <motion.svg
          key={`vortex-${v}`}
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 240 240"
          style={{ zIndex: 30 }}
          animate={{
            rotate: direction,
            opacity: [opacity * 0.7, opacity, opacity * 0.7],
          }}
          transition={{
            rotate: { duration, repeat: Infinity, ease: "linear" },
            opacity: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: v * 0.1 },
          }}
        >
          <path
            d={pathD}
            fill="none"
            stroke={`rgba(${color.r}, ${color.g}, ${color.b}, ${opacity})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: `blur(${blur}px)` }}
          />
        </motion.svg>
      );
    }
    
    return swirls;
  };

  return (
    <div className="relative w-[240px] h-[240px]">
      {/* Outer smoke/mist ring drifting outward */}
      {[...Array(16)].map((_, i) => {
        const angle = (i * 360) / 16;
        const startRadius = 135;
        const x = Math.cos((angle * Math.PI) / 180);
        const y = Math.sin((angle * Math.PI) / 180);
        
        return (
          <motion.div
            key={`smoke-${i}`}
            className="absolute rounded-full"
            style={{
              width: `${16 + (i % 5) * 6}px`,
              height: `${16 + (i % 5) * 6}px`,
              left: '50%',
              top: '50%',
              marginLeft: `${x * startRadius}px`,
              marginTop: `${y * startRadius}px`,
              background: `radial-gradient(circle, rgba(255,255,255,${0.45 - i * 0.015}) 0%, rgba(240,248,243,${0.3 - i * 0.01}) 50%, transparent 70%)`,
              filter: `blur(${6 + (i % 4) * 2}px)`,
            }}
            animate={{
              y: [0, -6, 0],
              opacity: [0.3, 0.45, 0.3],
              scale: [0.9, 1.1, 0.9],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        );
      })}

      {/* Halo glow - off-white + pale sage - pulsing */}
      <motion.div
        className="absolute inset-[-60px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(245,245,245,0.4) 20%, rgba(235,238,238,0.3) 40%, rgba(220,235,225,0.2) 60%, transparent 80%)',
        }}
        animate={{
          opacity: [0.4, 0.7, 0.4],
          filter: ['blur(40px)', 'blur(70px)', 'blur(40px)'],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Secondary halo layer */}
      <motion.div
        className="absolute inset-[-45px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(250,250,250,0.4) 0%, rgba(240,242,242,0.3) 30%, rgba(220,235,225,0.2) 55%, transparent 75%)',
          filter: 'blur(35px)',
        }}
        animate={{
          scale: [0.95, 1.1, 0.95],
          opacity: [0.5, 0.75, 0.5],
        }}
        transition={{
          duration: 5.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3,
        }}
      />

      {/* Inner glow - luminous */}
      <motion.div
        className="absolute inset-[-25px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,255,255,0.7) 0%, rgba(248,252,248,0.5) 30%, rgba(200,230,220,0.3) 60%, transparent 80%)',
          filter: 'blur(25px)',
        }}
        animate={{
          scale: [0.92, 1.15, 0.92],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Main orb container - breathing effect */}
      <motion.div
        className="absolute inset-0 rounded-full overflow-hidden"
        style={{
          background: 'radial-gradient(circle at 45% 35%, rgba(255,255,255,0.95) 0%, rgba(245,250,245,0.9) 20%, rgba(230,240,235,0.85) 40%, rgba(210,230,225,0.8) 60%, rgba(195,220,215,0.75) 80%, rgba(180,210,205,0.7) 100%)',
          boxShadow: '0 15px 50px rgba(180,210,205,0.4), inset 0 3px 20px rgba(255,255,255,0.8), inset 0 -3px 20px rgba(200,230,220,0.3)',
        }}
        animate={{
          scale: [1, 1.04, 1],
          opacity: [0.85, 1, 0.85],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Volumetric inner glow */}
        <motion.div
          className="absolute inset-[5%] rounded-full"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.6) 0%, rgba(248,252,248,0.4) 35%, transparent 70%)',
            filter: 'blur(20px)',
          }}
          animate={{
            scale: [0.9, 1.2, 0.9],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Liquid marble swirls */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          {generateSwirls()}
        </div>

        {/* Faint rotating pattern overlay - off-white and spiritual */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `
              repeating-conic-gradient(
                from 0deg at 50% 50%,
                rgba(255, 255, 255, 0.08) 0deg,
                rgba(245, 245, 245, 0.12) 30deg,
                rgba(240, 248, 243, 0.1) 60deg,
                rgba(255, 255, 255, 0.08) 90deg
              )
            `,
            mixBlendMode: 'overlay',
          }}
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 45,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Pearlescent highlight - top left */}
        <motion.div
          className="absolute top-[18%] left-[30%] w-[70px] h-[70px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(250,250,250,0.7) 50%, transparent 75%)',
            filter: 'blur(12px)',
          }}
        />

        {/* Off-white cream reflection - right side */}
        <motion.div
          className="absolute top-[35%] right-[20%] w-[55px] h-[55px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(250,250,250,0.8) 0%, rgba(240,242,242,0.5) 60%, transparent 80%)',
            filter: 'blur(10px)',
          }}
          animate={{
            opacity: [0.5, 0.85, 0.5],
            x: [0, 3, 0],
            y: [0, -2, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />

        {/* Additional off-white highlight - top right */}
        <motion.div
          className="absolute top-[22%] right-[28%] w-[42px] h-[42px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.75) 0%, rgba(245,245,245,0.45) 65%, transparent 85%)',
            filter: 'blur(8px)',
          }}
          animate={{
            opacity: [0.45, 0.8, 0.45],
            scale: [0.9, 1.05, 0.9],
          }}
          transition={{
            duration: 5.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.2,
          }}
        />

        {/* Off-white cream accent - center left */}
        <motion.div
          className="absolute top-[48%] left-[18%] w-[38px] h-[38px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(245,245,245,0.65) 0%, rgba(235,238,238,0.4) 70%, transparent 90%)',
            filter: 'blur(7px)',
          }}
          animate={{
            opacity: [0.4, 0.7, 0.4],
            x: [0, 2, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.8,
          }}
        />

        {/* Teal-sage reflection - bottom left */}
        <motion.div
          className="absolute bottom-[25%] left-[25%] w-[45px] h-[45px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(195,230,225,0.6) 0%, rgba(180,225,215,0.35) 65%, transparent 85%)',
            filter: 'blur(9px)',
          }}
          animate={{
            opacity: [0.4, 0.75, 0.4],
            x: [0, -2, 0],
            y: [0, 3, 0],
          }}
          transition={{
            duration: 5.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        {/* Cinematic light sweep - off-white */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(125deg, rgba(255,255,255,0.4) 0%, transparent 30%, rgba(250,250,250,0.3) 60%, transparent 100%)',
            mixBlendMode: 'overlay',
          }}
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Subtle breathing inner mist */}
        <motion.div
          className="absolute inset-[10%] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(248,252,248,0.5) 0%, rgba(230,240,235,0.3) 45%, transparent 75%)',
            filter: 'blur(18px)',
          }}
          animate={{
            scale: [0.85, 1.15, 0.85],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 6.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2,
          }}
        />

        {/* Flowing gradient overlay - adds depth */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 60% 40%, rgba(255,255,255,0.3) 0%, transparent 50%, rgba(200,230,220,0.2) 100%)',
            mixBlendMode: 'soft-light',
          }}
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </div>
  );
}