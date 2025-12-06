import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useUser, PlanTier } from '../state/PlanContext';

interface OnboardingScreenProps {
  onContinue?: () => void;
}

export function OnboardingScreen({ onContinue }: OnboardingScreenProps) {
  const { selectedPlan, setSelectedPlan } = useUser();
  const [expandedTier, setExpandedTier] = React.useState<PlanTier | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const voiceAudio = new Audio('/audio/trace-intro.mp3');
    voiceAudio.volume = 0;
    voiceAudio.playbackRate = 1.05;
    audioRef.current = voiceAudio;

    const bgAudio = new Audio('/audio/ambient-loop.mp3');
    bgAudio.volume = 0;
    bgAudio.loop = true;
    bgAudioRef.current = bgAudio;
    
    const playAudio = () => {
      bgAudio.play().then(() => {
        let bgVol = 0;
        const bgFadeIn = setInterval(() => {
          bgVol += 0.02;
          if (bgVol >= 0.25) {
            bgVol = 0.25;
            clearInterval(bgFadeIn);
          }
          bgAudio.volume = bgVol;
        }, 100);
      }).catch(() => {});

      voiceAudio.play().then(() => {
        let vol = 0;
        const fadeIn = setInterval(() => {
          vol += 0.05;
          if (vol >= 0.9) {
            vol = 0.9;
            clearInterval(fadeIn);
          }
          voiceAudio.volume = vol;
        }, 100);
      }).catch(() => {});
    };

    const timer = setTimeout(playAudio, 1000);

    return () => {
      clearTimeout(timer);
      if (audioRef.current) {
        const fadeOut = setInterval(() => {
          if (audioRef.current && audioRef.current.volume > 0.05) {
            audioRef.current.volume -= 0.05;
          } else {
            clearInterval(fadeOut);
            audioRef.current?.pause();
          }
        }, 50);
      }
      if (bgAudioRef.current) {
        const bgFadeOut = setInterval(() => {
          if (bgAudioRef.current && bgAudioRef.current.volume > 0.02) {
            bgAudioRef.current.volume -= 0.02;
          } else {
            clearInterval(bgFadeOut);
            bgAudioRef.current?.pause();
          }
        }, 50);
      }
    };
  }, []);

  const handleTierClick = (tier: PlanTier) => {
    if (selectedPlan === tier && expandedTier === tier) {
      setExpandedTier(null);
    } else if (selectedPlan === tier) {
      setExpandedTier(tier);
    } else {
      setSelectedPlan(tier);
      setExpandedTier(tier);
    }
  };

  // Generate liquid light swirls with sage, pearl, and pale aqua (from HomeScreen)
  const generateLiquidSwirls = () => {
    const swirls = [];
    const centerX = 100;
    const centerY = 100;
    
    const colors = [
      { r: 255, g: 255, b: 255 },
      { r: 248, g: 252, b: 250 },
      { r: 230, g: 240, b: 235 },
      { r: 210, g: 235, b: 230 },
      { r: 240, g: 248, b: 245 },
      { r: 200, g: 218, b: 215 },
    ];
    
    for (let i = 0; i < 40; i++) {
      const angle = (i * 137.5) % 360;
      const radius = 15 + (i % 12) * 5;
      const sweep = 100 + (i % 10) * 20;
      
      const startAngle = angle + (i % 8) * 4;
      const endAngle = startAngle + sweep;
      const midAngle = startAngle + sweep / 2;
      
      const x1 = centerX + Math.cos((startAngle * Math.PI) / 180) * radius;
      const y1 = centerY + Math.sin((startAngle * Math.PI) / 180) * radius;
      
      const curvature = radius * 1.2 + (i % 5) * 3;
      const x2 = centerX + Math.cos((midAngle * Math.PI) / 180) * curvature;
      const y2 = centerY + Math.sin((midAngle * Math.PI) / 180) * curvature;
      
      const x3 = centerX + Math.cos((endAngle * Math.PI) / 180) * radius;
      const y3 = centerY + Math.sin((endAngle * Math.PI) / 180) * radius;
      
      const pathD = `M ${x1} ${y1} Q ${x2} ${y2}, ${x3} ${y3}`;
      
      const colorIndex = i % colors.length;
      const color = colors[colorIndex];
      const opacity = 0.18 + (i % 8) * 0.02;
      
      const strokeWidth = 4 + (i % 8) * 2;
      const blur = 3 + (i % 4) * 1.5;
      const duration = 40 + (i % 30);
      const direction = i % 2 === 0 ? [0, 360] : [360, 0];
      const delay = (i % 15) * 0.15;
      
      swirls.push(
        <motion.svg
          key={`swirl-${i}`}
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 200 200"
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

  // Generate smoke particles spreading outward (cleaner, reduced)
  const generateSmokeParticles = () => {
    const particles = [];
    
    for (let i = 0; i < 4; i++) {
      const angle = (i * 90) % 360;
      const delay = i * 0.5;
      const duration = 12 + (i % 2) * 2;
      
      particles.push(
        <motion.div
          key={`smoke-${i}`}
          className="absolute w-[40px] h-[40px] rounded-full"
          style={{
            left: '50%',
            top: '50%',
            marginLeft: '-20px',
            marginTop: '-20px',
            background: `radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(240,248,245,0.03) 40%, transparent 70%)`,
            filter: 'blur(20px)',
          }}
          animate={{
            x: Math.cos((angle * Math.PI) / 180) * 60,
            y: Math.sin((angle * Math.PI) / 180) * 60,
            scale: [0.7, 1.2, 0.7],
            opacity: [0, 0.2, 0],
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
      className="relative w-full h-full flex flex-col overflow-y-auto scrollbar-hide"
      style={{
        background: 'linear-gradient(to bottom, #8DA18F 0%, #7D9180 100%)',
      }}
    >
      {/* Soft vignette overlay - fades to transparent at bottom to avoid band */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 140% 120% at 50% 30%, rgba(75, 75, 75, 0.08) 0%, rgba(75, 75, 75, 0.05) 40%, rgba(75, 75, 75, 0) 65%, transparent 100%)',
        }}
      />

      {/* Ambient background glow */}
      <div className="absolute inset-0 flex items-start justify-center pt-20">
        <motion.div 
          className="w-[220px] h-[220px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(232, 226, 212, 0.25) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center w-full px-6 pt-6 pb-8">
        
        {/* TRACE Brand Name - at very top */}
        <motion.div
          className="w-full text-center mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 1.5, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <h1 
            style={{ 
              fontFamily: 'ALORE, Georgia, serif',
              color: '#EDE8DB',
              fontWeight: 300,
              letterSpacing: '1em',
              fontSize: '11px',
              textShadow: '0 2px 5px rgba(0,0,0,0.45), 0 1px 2px rgba(0,0,0,0.3)',
              opacity: 0.95,
            }}
          >
            TRACE
          </h1>
        </motion.div>
        
        {/* Central Orb - smaller, tighter */}
        <motion.div 
          className="relative flex items-center justify-center mb-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ 
            opacity: 1, 
            scale: [0.98, 1.02, 0.98],
          }}
          transition={{ 
            opacity: { duration: 1.5, ease: [0.22, 0.61, 0.36, 1] },
            scale: {
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }
          }}
        >
          <div className="w-[140px] h-[140px] relative">
            {/* Faint glowing halo around orb */}
            <motion.div
              className="absolute inset-[-40px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(230,240,235,0.1) 25%, rgba(210,235,230,0.06) 40%, transparent 65%)',
                filter: 'blur(30px)',
              }}
              animate={{
                scale: [0.95, 1.05, 0.95],
                opacity: [0.2, 0.35, 0.2],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Secondary halo layer */}
            <motion.div
              className="absolute inset-[-55px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(210,235,230,0.12) 0%, rgba(200,218,215,0.06) 30%, transparent 55%)',
                filter: 'blur(35px)',
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.12, 0.25, 0.12],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Main orb body - translucent */}
            <div 
              className="absolute inset-0 rounded-full overflow-hidden" 
              style={{
                background: 'radial-gradient(circle at 45% 35%, rgba(255,255,255,0.35) 0%, rgba(245,250,245,0.3) 20%, rgba(230,240,235,0.25) 40%, rgba(210,230,225,0.2) 60%, rgba(195,220,215,0.15) 80%, transparent 100%)',
                boxShadow: '0 8px 30px rgba(236,230,216,0.18)',
              }}
            >
              {/* Liquid light swirls inside */}
              <div className="absolute inset-0">
                {generateLiquidSwirls()}
              </div>

              {/* White smoke diffusion spreading outward */}
              <div className="absolute inset-0">
                {generateSmokeParticles()}
              </div>

              {/* Soft inner core glow */}
              <motion.div
                className="absolute inset-[18%] rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.32) 0%, rgba(248,252,250,0.22) 35%, rgba(240,248,245,0.12) 60%, transparent 80%)',
                  filter: 'blur(18px)',
                }}
                animate={{
                  scale: [0.85, 1.15, 0.85],
                  opacity: [0.22, 0.4, 0.22],
                }}
                transition={{
                  duration: 7,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Pearlescent highlight - top left */}
              <motion.div
                className="absolute top-[20%] left-[32%] w-[60px] h-[60px] rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.45) 0%, rgba(248,252,250,0.28) 45%, rgba(230,240,235,0.12) 70%, transparent 85%)',
                  filter: 'blur(14px)',
                }}
                animate={{
                  opacity: [0.35, 0.65, 0.35],
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
                className="absolute bottom-[30%] right-[28%] w-[50px] h-[50px] rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(210,235,230,0.38) 0%, rgba(200,218,215,0.18) 55%, transparent 80%)',
                  filter: 'blur(12px)',
                }}
                animate={{
                  opacity: [0.28, 0.5, 0.28],
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
                scale: [1, 1.012, 1],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ pointerEvents: 'none' }}
            />
          </div>
        </motion.div>

        {/* Intro Paragraph - tighter spacing */}
        <motion.div 
          className="text-center px-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
        >
          <div 
            className="text-[#EDE8DB]"
            style={{
              fontFamily: 'Georgia, serif',
              fontWeight: 300,
              fontSize: '15px',
              lineHeight: '1.65',
              letterSpacing: '0.03em',
              opacity: 0.92,
              maxWidth: '320px',
              margin: '0 auto',
            }}
          >
            <p style={{ marginBottom: '4px' }}>
              <span style={{ fontSize: '14px', letterSpacing: '0.08em', opacity: 0.85 }}>Meet</span>
              {' '}
              <span style={{ fontFamily: 'ALORE, Georgia, serif', letterSpacing: '0.35em', fontSize: '16px' }}>TRACE</span>
            </p>
            <p style={{ fontSize: '14px', opacity: 0.75, marginBottom: '16px', letterSpacing: '0.04em' }}>
              your calm space to slow down
            </p>
            <p>
              A steady companion for checking in, breathing, reflecting, and finding a moment of peace when you need it.
            </p>
          </div>
        </motion.div>

        {/* Plan Selection Cards - with expandable details */}
        <motion.div 
          className="w-full max-w-[340px] space-y-3 mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
        >
          
          {/* Light Tier */}
          <motion.button
            onClick={() => handleTierClick('light')}
            className="w-full rounded-3xl px-6 py-4 text-left transition-all duration-300 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #A89585 0%, #A08D7D 100%)',
              boxShadow: selectedPlan === 'light' 
                ? '0 12px 32px rgba(168, 149, 133, 0.45), 0 4px 12px rgba(0, 0, 0, 0.15)' 
                : '0 6px 20px rgba(168, 149, 133, 0.35), 0 2px 8px rgba(0, 0, 0, 0.1)',
              border: selectedPlan === 'light' ? '2px solid #7A6A5A' : '2px solid transparent',
            }}
            animate={{
              scale: selectedPlan === 'light' ? 1.02 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 
                  className="text-[#F5F0E8]" 
                  style={{ 
                    letterSpacing: '0.05em',
                    fontWeight: 500,
                    fontSize: '15px',
                  }}
                >
                  Light {selectedPlan === 'light' && <span style={{ fontSize: '13px', color: '#F5F0E8' }}>✓</span>}
                </h3>
                <p 
                  className="text-[#F5F0E8] opacity-75 mt-0.5" 
                  style={{ 
                    fontSize: '12px', 
                    letterSpacing: '0.02em',
                    fontWeight: 300,
                  }}
                >
                  Start with the basics.
                </p>
              </div>
              <span 
                className="text-[#F5F0E8] opacity-65" 
                style={{ 
                  fontSize: '11px', 
                  letterSpacing: '0.05em',
                  fontWeight: 400,
                }}
              >
                Free
              </span>
            </div>
            
            <AnimatePresence>
              {expandedTier === 'light' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 border-t border-[#F5F0E8]/20 mt-2">
                    <ul className="space-y-1.5 text-[#F5F0E8] opacity-75" style={{ fontSize: '11px', letterSpacing: '0.02em', fontWeight: 300 }}>
                      <li>• Daily check-ins with TRACE</li>
                      <li>• Basic breathing exercises</li>
                      <li>• Mood tracking + journal</li>
                      <li>• 5–4–3–2–1 grounding + 1 visual pattern</li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Premium Tier */}
          <motion.button
            onClick={() => handleTierClick('premium')}
            className="w-full rounded-3xl px-6 py-4 text-left transition-all duration-300 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #998675 0%, #8F7C6B 100%)',
              boxShadow: selectedPlan === 'premium' 
                ? '0 12px 32px rgba(153, 134, 117, 0.45), 0 4px 12px rgba(0, 0, 0, 0.15)' 
                : '0 6px 20px rgba(153, 134, 117, 0.35), 0 2px 8px rgba(0, 0, 0, 0.1)',
              border: selectedPlan === 'premium' ? '2px solid #6A5A4A' : '2px solid transparent',
            }}
            animate={{
              scale: selectedPlan === 'premium' ? 1.02 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 
                  className="text-[#F5F0E8]" 
                  style={{ 
                    letterSpacing: '0.05em',
                    fontWeight: 500,
                    fontSize: '15px',
                  }}
                >
                  Premium {selectedPlan === 'premium' && <span style={{ fontSize: '13px', color: '#F5F0E8' }}>✓</span>}
                </h3>
                <p 
                  className="text-[#F5F0E8] opacity-80 mt-0.5" 
                  style={{ 
                    fontSize: '12px', 
                    letterSpacing: '0.02em',
                    fontWeight: 300,
                  }}
                >
                  More support, whenever you need it.
                </p>
              </div>
              <span 
                className="text-[#F5F0E8] opacity-65" 
                style={{ 
                  fontSize: '11px', 
                  letterSpacing: '0.05em',
                  fontWeight: 400,
                }}
              >
                $9.99 / month
              </span>
            </div>
            
            <AnimatePresence>
              {expandedTier === 'premium' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 border-t border-[#F5F0E8]/20 mt-2">
                    <ul className="space-y-1.5 text-[#F5F0E8] opacity-75" style={{ fontSize: '11px', letterSpacing: '0.02em', fontWeight: 300 }}>
                      <li>• Everything in Light</li>
                      <li>• Unlimited TRACE conversations</li>
                      <li>• Full breathing + grounding library</li>
                      <li>• Save sessions to your Activities Hub</li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Studio Tier */}
          <motion.button
            onClick={() => handleTierClick('studio')}
            className="w-full rounded-3xl px-6 py-4 text-left transition-all duration-300 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #857365 0%, #796A5B 100%)',
              boxShadow: selectedPlan === 'studio' 
                ? '0 12px 32px rgba(133, 115, 101, 0.48), 0 4px 12px rgba(0, 0, 0, 0.18)' 
                : '0 6px 20px rgba(133, 115, 101, 0.38), 0 2px 8px rgba(0, 0, 0, 0.12)',
              border: selectedPlan === 'studio' ? '2px solid #5A4A3A' : '2px solid transparent',
            }}
            animate={{
              scale: selectedPlan === 'studio' ? 1.02 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 
                  className="text-[#F5F0E8]" 
                  style={{ 
                    letterSpacing: '0.05em',
                    fontWeight: 500,
                    fontSize: '15px',
                  }}
                >
                  Studio {selectedPlan === 'studio' && <span style={{ fontSize: '13px', color: '#F5F0E8' }}>✓</span>}
                </h3>
                <p 
                  className="text-[#F5F0E8] opacity-80 mt-0.5" 
                  style={{ 
                    fontSize: '12px', 
                    letterSpacing: '0.02em',
                    fontWeight: 300,
                  }}
                >
                  For creators + the full experience.
                </p>
              </div>
              <span 
                className="text-[#F5F0E8] opacity-65" 
                style={{ 
                  fontSize: '11px', 
                  letterSpacing: '0.05em',
                  fontWeight: 400,
                }}
              >
                $14.99 / month
              </span>
            </div>
            
            <AnimatePresence>
              {expandedTier === 'studio' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 border-t border-[#F5F0E8]/20 mt-2">
                    <ul className="space-y-1.5 text-[#F5F0E8] opacity-75" style={{ fontSize: '11px', letterSpacing: '0.02em', fontWeight: 300 }}>
                      <li>• Everything in Premium</li>
                      <li>• Full Patterns™ weekly map</li>
                      <li>• Studio-level visuals + sessions</li>
                      <li>• Deeper journaling + guided prompts</li>
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

        </motion.div>

        {/* Continue Button */}
        <motion.button
          onClick={onContinue}
          className="w-full max-w-[340px] py-3.5 px-6 rounded-full bg-[#E8E2D4] text-[#889582] transition-all duration-300 hover:shadow-lg hover:scale-[1.02] mb-4"
          style={{
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            letterSpacing: '0.05em',
            fontWeight: 500,
            fontSize: '14px',
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
        >
          Choose this plan
        </motion.button>

        {/* Terms Text */}
        <motion.p 
          className="text-[#E8E2D4] text-center opacity-50 px-6 max-w-[340px]"
          style={{
            fontSize: '10px',
            lineHeight: '1.5',
            letterSpacing: '0.02em',
            fontWeight: 300,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.9, duration: 1 }}
        >
          By tapping Continue or logging into an existing TRACE account, you agree to our Terms and acknowledge our Privacy Policy.
        </motion.p>

      </div>
    </div>
  );
}