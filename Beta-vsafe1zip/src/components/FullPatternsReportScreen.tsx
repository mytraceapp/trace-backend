import React from 'react';
import { motion } from 'motion/react';
import { BottomNav } from './BottomNav';
import { patternsData, PatternCategory } from '../data/patterns';

interface FullPatternsReportScreenProps {
  onBack: () => void;
  onNavigateHome?: () => void;
  onNavigateJournal?: () => void;
  onNavigateProfile?: () => void;
  onNavigateHelp?: () => void;
  onNavigateActivities?: () => void;
  onNavigatePatterns?: () => void;
  highlightPattern?: PatternCategory;
}

export function FullPatternsReportScreen({
  onBack,
  onNavigateHome,
  onNavigateJournal,
  onNavigateProfile,
  onNavigateHelp,
  onNavigateActivities,
  highlightPattern,
}: FullPatternsReportScreenProps) {
  // Weekly data for the rhythm map
  const weekData = [
    { day: 'Mon', value: 45, label: 'Quieter start' },
    { day: 'Tue', value: 55, label: 'Building momentum' },
    { day: 'Wed', value: 38, label: 'Midweek friction' },
    { day: 'Thu', value: 48, label: 'Gentle recovery' },
    { day: 'Fri', value: 68, label: 'Clear afternoon' },
    { day: 'Sat', value: 75, label: 'Weekend resetting' },
    { day: 'Sun', value: 62, label: 'Evening tension' },
  ];

  const behaviorSignatures = [
    'Evening Overthinking',
    'Midweek Burnout',
    'Morning Sharpness',
    'Solitude Recovery',
    'Late-Night Clarity',
    'Weekend Resetting',
    'Emotional Lag Days',
    'Stress Echo Triggers',
  ];

  const suggestions = [
    'Protect your mornings—they\'re your window of clarity.',
    'Midweek breaks prevent burnout.',
    'Evenings carry mental noise; keep them light.',
  ];

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: 'linear-gradient(to bottom, #E8E0D5 0%, #D7CDBF 100%)' }}>
      {/* Subtle grain texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Math notebook grid overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.25]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 24 0 L 0 0 0 24' fill='none' stroke='%238DA18F' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: '24px 24px',
          backgroundRepeat: 'repeat',
        }}
      />

      {/* TRACE Brand Name - absolute position like patterns page */}
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

      {/* Scrollable Content Wrapper - Centered */}
      <div className="relative z-10 flex flex-col h-full overflow-y-auto overflow-x-hidden pb-32" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>
          {`
            div::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>

        <div className="flex-shrink-0" style={{ height: '7%' }} />

        {/* Centered Content Container */}
        <div className="w-full max-w-md mx-auto px-6 flex flex-col items-center">
          {/* Main Title Section */}
          <motion.div
            className="text-center mb-8 w-full"
            style={{ marginTop: '32px' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
          >
            <h2
              style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: '32px',
                fontWeight: 500,
                letterSpacing: '0.04em',
                color: '#4A3526',
                marginBottom: '8px',
              }}
            >
              PATTERNS™
            </h2>
            <p
              style={{
                fontFamily: 'Georgia, serif',
                color: '#7D5D47',
                fontWeight: 300,
                fontSize: '16px',
                letterSpacing: '0.03em',
                opacity: 0.8,
                marginBottom: '6px',
              }}
            >
              Full Report
            </p>
            <p
              style={{
                fontFamily: 'Georgia, serif',
                color: '#7D5D47',
                fontWeight: 300,
                fontSize: '14px',
                letterSpacing: '0.03em',
                opacity: 0.7,
              }}
            >
              Your week, understood in detail.
            </p>
          </motion.div>

          {/* Section 1 — Expanded Weekly Orb Insight */}
          <motion.div
            className="mb-10 w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 1 }}
          >
            <div className="flex flex-col items-center">
              {/* Large glowing orb */}
              <motion.div
                className="relative w-[77px] h-[77px] mb-6"
                animate={{
                  scale: [1, 1.05, 1],
                  rotate: [0, 5, 0],
                }}
                transition={{
                  duration: 10,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {/* Outer glow */}
                <motion.div
                  className="absolute inset-[-14px] rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(141, 161, 143, 0.13) 0%, rgba(141, 161, 143, 0.02) 40%, transparent 70%)',
                    filter: 'blur(12px)',
                  }}
                  animate={{
                    scale: [0.9, 1.2, 0.9],
                    opacity: [0.13, 0.43, 0.13],
                  }}
                  transition={{
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                
                {/* Main orb */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: 'radial-gradient(circle at 40% 30%, rgba(215, 205, 191, 0.73) 0%, rgba(141, 161, 143, 0.43) 50%, rgba(106, 88, 75, 0.23) 100%)',
                    boxShadow: '0 8px 32px rgba(106, 88, 75, 0.15)',
                  }}
                />

                {/* Inner highlight */}
                <div
                  className="absolute top-[20%] left-[30%] w-[29px] h-[29px] rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(237, 232, 219, 0.63) 0%, transparent 70%)',
                    filter: 'blur(8px)',
                  }}
                />
              </motion.div>

              {/* Overall Tone */}
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  color: '#6A584B',
                  fontWeight: 300,
                  fontSize: '15px',
                  letterSpacing: '0.02em',
                  textAlign: 'center',
                }}
              >
                <span style={{ opacity: 0.6 }}>Overall Tone: </span>
                <span style={{ fontStyle: 'italic' }}>"Steady, reflective, and subtly rising."</span>
              </p>
            </div>
          </motion.div>

          {/* Section 2 — Detailed Rhythm Map */}
          <motion.div
            className="mb-10 w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
          >
            <div
              className="rounded-3xl p-6"
              style={{
                background: 'rgba(237, 232, 219, 0.5)',
                boxShadow: '0 4px 20px rgba(106, 88, 75, 0.08)',
              }}
            >
              <h3
                className="mb-4"
                style={{
                  fontFamily: 'Georgia, serif',
                  color: '#6A584B',
                  fontWeight: 400,
                  fontSize: '16px',
                  letterSpacing: '0.03em',
                }}
              >
                Weekly Rhythm Map
              </h3>

              {/* Graph */}
              <div className="relative h-[180px] mb-3">
                {/* Background grid */}
                <svg className="absolute inset-0 w-full h-full">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <line
                      key={i}
                      x1="0"
                      y1={i * 45}
                      x2="100%"
                      y2={i * 45}
                      stroke="rgba(106, 88, 75, 0.08)"
                      strokeWidth="1"
                    />
                  ))}
                </svg>

                {/* Line graph */}
                <svg className="absolute inset-0 w-full h-full">
                  {/* Path */}
                  <motion.path
                    d={weekData.map((d, i) => {
                      const x = (i / (weekData.length - 1)) * 100;
                      const y = 100 - d.value;
                      return `${i === 0 ? 'M' : 'L'} ${x}% ${y}%`;
                    }).join(' ')}
                    fill="none"
                    stroke="#8DA18F"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 2, ease: "easeOut" }}
                  />

                  {/* Dots at each point */}
                  {weekData.map((d, i) => {
                    const x = (i / (weekData.length - 1)) * 100;
                    const y = 100 - d.value;
                    return (
                      <motion.circle
                        key={i}
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r="4"
                        fill="#8DA18F"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
                      />
                    );
                  })}
                </svg>

                {/* Day labels */}
                <div className="absolute bottom-0 w-full flex justify-between">
                  {weekData.map((d, i) => (
                    <p
                      key={i}
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: '#6A584B',
                        fontSize: '11px',
                        opacity: 0.5,
                      }}
                    >
                      {d.day}
                    </p>
                  ))}
                </div>
              </div>

              <p
                className="text-center"
                style={{
                  fontFamily: 'Georgia, serif',
                  color: '#6A584B',
                  fontWeight: 300,
                  fontSize: '12px',
                  letterSpacing: '0.02em',
                  opacity: 0.6,
                }}
              >
                Your emotional flow across the week.
              </p>
            </div>
          </motion.div>

          {/* Section 3 — Daily Breakdown Timeline */}
          <motion.div
            className="mb-10 w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 1 }}
          >
            <div
              className="rounded-3xl p-6"
              style={{
                background: 'rgba(237, 232, 219, 0.5)',
                boxShadow: '0 4px 20px rgba(106, 88, 75, 0.08)',
              }}
            >
              <h3
                className="mb-6"
                style={{
                  fontFamily: 'Georgia, serif',
                  color: '#6A584B',
                  fontWeight: 400,
                  fontSize: '16px',
                  letterSpacing: '0.03em',
                }}
              >
                Daily Breakdown
              </h3>

              {/* Vertical timeline */}
              <div className="space-y-5">
                {weekData.map((day, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center gap-4"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2 + i * 0.1, duration: 0.5 }}
                  >
                    {/* Mini orb */}
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-full"
                      style={{
                        background: `radial-gradient(circle, rgba(141, 161, 143, ${day.value / 100}) 0%, rgba(141, 161, 143, ${day.value / 150}) 70%, transparent 100%)`,
                        boxShadow: '0 2px 8px rgba(141, 161, 143, 0.2)',
                      }}
                    />

                    {/* Day info */}
                    <div className="flex-1">
                      <p
                        style={{
                          fontFamily: 'Georgia, serif',
                          color: '#6A584B',
                          fontWeight: 500,
                          fontSize: '13px',
                          marginBottom: '2px',
                        }}
                      >
                        {day.day}
                      </p>
                      <p
                        style={{
                          fontFamily: 'Georgia, serif',
                          color: '#6A584B',
                          fontWeight: 300,
                          fontSize: '12px',
                          opacity: 0.6,
                          fontStyle: 'italic',
                        }}
                      >
                        {day.label}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Section 4 — Behavior Signatures */}
          <motion.div
            className="mb-10 w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 1 }}
          >
            <h3
              className="mb-4"
              style={{
                fontFamily: 'Georgia, serif',
                color: '#6A584B',
                fontWeight: 400,
                fontSize: '16px',
                letterSpacing: '0.03em',
              }}
            >
              Behavior Signatures
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {behaviorSignatures.map((signature, i) => (
                <motion.button
                  key={i}
                  className="rounded-2xl p-4 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: '#D7CDBF',
                    boxShadow: '0 2px 12px rgba(106, 88, 75, 0.1)',
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.4 + i * 0.05, duration: 0.4 }}
                >
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#5B4A3F',
                      fontWeight: 400,
                      fontSize: '13px',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {signature}
                  </p>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Section 5 — Signature Insight Box */}
          <motion.div
            className="mb-10 w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.6, duration: 1 }}
          >
            <div
              className="rounded-3xl p-6"
              style={{
                background: 'rgba(237, 232, 219, 0.7)',
                boxShadow: '0 4px 20px rgba(106, 88, 75, 0.1)',
              }}
            >
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  color: '#6A584B',
                  fontWeight: 300,
                  fontSize: '14px',
                  lineHeight: '1.8',
                  letterSpacing: '0.01em',
                }}
              >
                Your rhythm shows a quiet rise in clarity, midweek emotional friction, and a weekend re-centering pattern.
                <br /><br />
                TRACE uses these signatures to help you understand when your mind is most open, and when it needs gentleness.
              </p>
            </div>
          </motion.div>

          {/* Section 6 — Gentle Suggestions */}
          <motion.div
            className="mb-10 w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 1 }}
          >
            <h3
              className="mb-4"
              style={{
                fontFamily: 'Georgia, serif',
                color: '#6A584B',
                fontWeight: 400,
                fontSize: '16px',
                letterSpacing: '0.03em',
              }}
            >
              Gentle Suggestions
            </h3>

            <div className="space-y-3">
              {suggestions.map((suggestion, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2 + i * 0.1, duration: 0.5 }}
                >
                  <div
                    className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2"
                    style={{ background: '#8DA18F' }}
                  />
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#6A584B',
                      fontWeight: 300,
                      fontSize: '13px',
                      lineHeight: '1.6',
                      letterSpacing: '0.01em',
                      opacity: 0.8,
                    }}
                  >
                    {suggestion}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Footer Buttons */}
          <motion.div
            className="mb-8 w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.2, duration: 1 }}
          >
            <button
              onClick={onBack}
              className="w-full rounded-full px-8 py-4 mb-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: '#EDE8DB',
                boxShadow: '0 4px 16px rgba(106, 88, 75, 0.12)',
              }}
            >
              <span
                style={{
                  fontFamily: 'Georgia, serif',
                  color: '#6A584B',
                  fontWeight: 500,
                  fontSize: '15px',
                  letterSpacing: '0.03em',
                }}
              >
                Return to Activity
              </span>
            </button>

            <button
              className="w-full text-center transition-opacity duration-300 hover:opacity-70"
            >
              <span
                style={{
                  fontFamily: 'Georgia, serif',
                  color: '#6A584B',
                  fontWeight: 300,
                  fontSize: '13px',
                  letterSpacing: '0.02em',
                  opacity: 0.6,
                }}
              >
                Export My Patterns (Studio only)
              </span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        variant="sage"
        activeScreen="activities"
        onNavigateHome={onNavigateHome}
        onNavigateActivities={onNavigateActivities}
        onNavigateJournal={onNavigateJournal}
        onNavigateProfile={onNavigateProfile}
        onNavigateHelp={onNavigateHelp}
      />
    </div>
  );
}