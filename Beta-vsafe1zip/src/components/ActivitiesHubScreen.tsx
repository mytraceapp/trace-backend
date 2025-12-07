import { motion } from 'motion/react';
import { Wind, Compass, Footprints, Moon, Sparkles, Hand, Activity } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useTheme } from '../state/ThemeContext';

interface ActivitiesHubScreenProps {
  onStartBreathing: () => void;
  onStartMaze: () => void;
  onStartWalking: () => void;
  onStartPowerNap: () => void;
  onStartPearlRipple?: () => void;
  onStartGrounding?: () => void;
  onStartRainWindow: () => void;
  onStartEcho?: () => void;
  onReturnToChat: () => void;
  onNavigateToPatterns?: () => void;
  onNavigateToJournal?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToHelp?: () => void;
}

export function ActivitiesHubScreen({
  onStartBreathing,
  onStartMaze,
  onStartWalking,
  onStartPowerNap,
  onStartPearlRipple,
  onStartGrounding,
  onStartRainWindow,
  onStartEcho,
  onReturnToChat,
  onNavigateToPatterns,
  onNavigateToJournal,
  onNavigateToProfile,
  onNavigateToHelp,
}: ActivitiesHubScreenProps) {
  useTheme();
  
  return (
    <div 
      className="relative w-full h-full overflow-y-auto transition-colors duration-300"
      style={{
        background: 'transparent',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {/* Hide scrollbar for Chrome, Safari and Opera */}
      <style>{`
        .relative.w-full.h-full.overflow-y-auto::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Soft vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(75, 75, 75, 0.05) 100%)',
        }}
      />

      {/* TRACE Brand - Fixed */}
      <div className="sticky top-0 left-0 right-0 z-40 text-center pointer-events-none transition-colors duration-300" style={{ paddingTop: '55px', paddingBottom: '12px', background: `linear-gradient(to bottom, var(--bg), var(--bg), transparent)` }}>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
          style={{
            fontFamily: 'ALORE, Georgia, serif',
            color: 'var(--text-tertiary)',
            fontWeight: 300,
            letterSpacing: '1em',
            fontSize: '10px',
            opacity: 0.6,
            textTransform: 'uppercase',
            marginTop: '0.2rem',
          }}
        >
          TRACE
        </motion.h1>
      </div>

      {/* Content wrapper */}
      <div className="relative w-full p-6" style={{ paddingTop: '0' }}>
        {/* Title Section */}
        <motion.div
          className="w-full px-6 text-center mb-8"
          style={{ marginTop: '-6px' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 1 }}
        >
          {/* Activities Title */}
          <h2
            className="mb-0.5"
            style={{
              fontFamily: 'Georgia, serif',
              color: 'var(--text-primary)',
              fontWeight: 400,
              fontSize: '28px',
              letterSpacing: '-0.02em',
            }}
          >
            Activities
          </h2>

          {/* Subtitle */}
          <p
            style={{
              fontFamily: 'Georgia, serif',
              color: '#8A8680',
              fontWeight: 300,
              fontSize: '15px',
              letterSpacing: '0.01em',
            }}
          >
            Choose what feels right.
          </p>
        </motion.div>

        {/* Activities Grid */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 1 }}
        >
          <div className="grid grid-cols-2 gap-4">
            {/* Card 1 - Breathing */}
            <motion.button
              onClick={onStartBreathing}
              className="rounded-[24px] p-5 transition-all duration-300 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #F4F1EC 0%, #EEEBE6 100%)',
                boxShadow: '0 8px 24px rgba(75, 75, 75, 0.08), 0 2px 8px rgba(75, 75, 75, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
              }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            >
              <div className="flex flex-col items-start gap-3 h-[160px]">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(138, 134, 128, 0.12) 0%, rgba(138, 134, 128, 0.06) 100%)',
                  }}
                >
                  <Wind size={20} style={{ color: '#4B4B4B' }} strokeWidth={1.5} />
                </div>

                <div className="flex-1 flex flex-col items-start justify-end text-left">
                  <h3
                    className="mb-1"
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#4B4B4B',
                      fontWeight: 500,
                      fontSize: '16px',
                      letterSpacing: '0.01em',
                    }}
                  >
                    Breathing
                  </h3>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#8A8680',
                      fontWeight: 300,
                      fontSize: '12px',
                      letterSpacing: '0.005em',
                      lineHeight: '1.4',
                    }}
                  >
                    A calming 30-second reset.
                  </p>
                </div>
              </div>
            </motion.button>

            {/* Card 2 - Trace the Maze */}
            <motion.button
              onClick={onStartMaze}
              className="rounded-[24px] p-5 transition-all duration-300 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #D3CFC8 0%, #CCC8C1 100%)',
                boxShadow: '0 8px 24px rgba(75, 75, 75, 0.08), 0 2px 8px rgba(75, 75, 75, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            >
              <div className="flex flex-col items-start gap-3 h-[160px]">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(162, 148, 133, 0.2) 0%, rgba(162, 148, 133, 0.1) 100%)',
                  }}
                >
                  <Compass size={20} style={{ color: '#A29485' }} strokeWidth={1.5} />
                </div>

                <div className="flex-1 flex flex-col items-start justify-end text-left">
                  <h3
                    className="mb-1"
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#4B4B4B',
                      fontWeight: 500,
                      fontSize: '16px',
                      letterSpacing: '0.01em',
                    }}
                  >
                    Trace the Maze
                  </h3>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#6B6761',
                      fontWeight: 300,
                      fontSize: '12px',
                      letterSpacing: '0.005em',
                      lineHeight: '1.4',
                    }}
                  >
                    Slow your mind with gentle tracing.
                  </p>
                </div>
              </div>
            </motion.button>

            {/* Card 3 - Walking Reset */}
            <motion.button
              onClick={onStartWalking}
              className="rounded-[24px] p-5 transition-all duration-300 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #DDD9D2 0%, #D3CFC8 100%)',
                boxShadow: '0 8px 24px rgba(75, 75, 75, 0.08), 0 2px 8px rgba(75, 75, 75, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
              }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            >
              <div className="flex flex-col items-start gap-3 h-[160px]">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(138, 134, 128, 0.15) 0%, rgba(138, 134, 128, 0.08) 100%)',
                  }}
                >
                  <Footprints size={20} style={{ color: '#4B4B4B' }} strokeWidth={1.5} />
                </div>

                <div className="flex-1 flex flex-col items-start justify-end text-left">
                  <h3
                    className="mb-1"
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#4B4B4B',
                      fontWeight: 500,
                      fontSize: '16px',
                      letterSpacing: '0.01em',
                    }}
                  >
                    Walking Reset
                  </h3>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#8A8680',
                      fontWeight: 300,
                      fontSize: '12px',
                      letterSpacing: '0.005em',
                      lineHeight: '1.4',
                    }}
                  >
                    One minute of slow-paced movement.
                  </p>
                </div>
              </div>
            </motion.button>

            {/* Card 4 - Rest / Power Nap */}
            <motion.button
              onClick={onStartPowerNap}
              className="rounded-[24px] p-5 transition-all duration-300 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #E8E4DD 0%, #DDD9D2 100%)',
                boxShadow: '0 8px 24px rgba(75, 75, 75, 0.08), 0 2px 8px rgba(75, 75, 75, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
              }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.8 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            >
              <div className="flex flex-col items-start gap-3 h-[160px]">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(138, 134, 128, 0.18) 0%, rgba(138, 134, 128, 0.09) 100%)',
                  }}
                >
                  <Moon size={20} style={{ color: '#4B4B4B' }} strokeWidth={1.5} />
                </div>

                <div className="flex-1 flex flex-col items-start justify-end text-left">
                  <h3
                    className="mb-1"
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#4B4B4B',
                      fontWeight: 500,
                      fontSize: '16px',
                      letterSpacing: '0.01em',
                    }}
                  >
                    Rest
                  </h3>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#8A8680',
                      fontWeight: 300,
                      fontSize: '12px',
                      letterSpacing: '0.005em',
                      lineHeight: '1.4',
                    }}
                  >
                    Five minutes of quiet stillness.
                  </p>
                </div>
              </div>
            </motion.button>

            {/* Card 5 - Ripple */}
            {onStartPearlRipple && (
              <motion.button
                onClick={onStartPearlRipple}
                className="rounded-[24px] p-5 transition-all duration-300 active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, #FDFCFB 0%, #F5F3F0 100%)',
                  boxShadow: '0 8px 24px rgba(75, 75, 75, 0.08), 0 2px 8px rgba(75, 75, 75, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.8 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              >
                <div className="flex flex-col items-start gap-3 h-[160px]">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(190, 185, 180, 0.15) 0%, rgba(190, 185, 180, 0.08) 100%)',
                    }}
                  >
                    <Sparkles size={20} style={{ color: '#9A8778' }} strokeWidth={1.5} />
                  </div>

                  <div className="flex-1 flex flex-col items-start justify-end text-left">
                    <h3
                      className="mb-1"
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: '#4B4B4B',
                        fontWeight: 500,
                        fontSize: '16px',
                        letterSpacing: '0.01em',
                      }}
                    >
                      Ripple
                    </h3>
                    <p
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: '#8A8680',
                        fontWeight: 300,
                        fontSize: '12px',
                        letterSpacing: '0.005em',
                        lineHeight: '1.4',
                      }}
                    >
                      One minute of flowing light.
                    </p>
                  </div>
                </div>
              </motion.button>
            )}

            {/* Card 6 - Grounding */}
            {onStartGrounding && (
              <motion.button
                onClick={onStartGrounding}
                className="rounded-[24px] p-5 transition-all duration-300 active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, #FDFCFB 0%, #F5F3F0 100%)',
                  boxShadow: '0 8px 24px rgba(75, 75, 75, 0.08), 0 2px 8px rgba(75, 75, 75, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.5)',
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.8 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              >
                <div className="flex flex-col items-start gap-3 h-[160px]">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(190, 185, 180, 0.15) 0%, rgba(190, 185, 180, 0.08) 100%)',
                    }}
                  >
                    <Hand size={20} style={{ color: '#9A8778' }} strokeWidth={1.5} />
                  </div>

                  <div className="flex-1 flex flex-col items-start justify-end text-left">
                    <h3
                      className="mb-1"
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: '#4B4B4B',
                        fontWeight: 500,
                        fontSize: '16px',
                        letterSpacing: '0.01em',
                      }}
                    >
                      Grounding
                    </h3>
                    <p
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: '#8A8680',
                        fontWeight: 300,
                        fontSize: '12px',
                        letterSpacing: '0.005em',
                        lineHeight: '1.4',
                      }}
                    >
                      Connect with your surroundings.
                    </p>
                  </div>
                </div>
              </motion.button>
            )}

            {/* Card 7 - Rain Window */}
            <motion.button
              onClick={onStartRainWindow}
              className="rounded-[24px] p-5 transition-all duration-300 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #C9C3BA 0%, #B8B2A8 100%)',
                boxShadow: '0 8px 24px rgba(75, 75, 75, 0.08), 0 2px 8px rgba(75, 75, 75, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
              }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.8 }}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            >
              <div className="flex flex-col items-start gap-3 h-[160px]">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(120, 110, 100, 0.18) 0%, rgba(120, 110, 100, 0.09) 100%)',
                  }}
                >
                  <svg 
                    width="20" 
                    height="20" 
                    viewBox="0 0 24 24" 
                    fill="none"
                  >
                    <path 
                      d="M12 2.5C12 2.5 5 10 5 14.5C5 18.366 8.134 21.5 12 21.5C15.866 21.5 19 18.366 19 14.5C19 10 12 2.5 12 2.5Z" 
                      stroke="#6B6358"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </svg>
                </div>

                <div className="flex-1 flex flex-col items-start justify-end text-left">
                  <h3
                    className="mb-1"
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#4B4B4B',
                      fontWeight: 500,
                      fontSize: '16px',
                      letterSpacing: '0.01em',
                    }}
                  >
                    Window
                  </h3>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#6B6761',
                      fontWeight: 300,
                      fontSize: '12px',
                      letterSpacing: '0.005em',
                      lineHeight: '1.4',
                    }}
                  >
                    Watch the rain. Drift away.
                  </p>
                </div>
              </div>
            </motion.button>

            {/* Card 8 - Echo */}
            {onStartEcho && (
              <motion.button
                onClick={onStartEcho}
                className="rounded-[24px] p-5 transition-all duration-300 active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, #D8D4CD 0%, #D0CCC5 100%)',
                  boxShadow: '0 8px 24px rgba(75, 75, 75, 0.08), 0 2px 8px rgba(75, 75, 75, 0.04), inset 0 1px 2px rgba(255, 255, 255, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              >
                <div className="flex flex-col items-start gap-3 h-[160px]">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(107, 124, 107, 0.18) 0%, rgba(107, 124, 107, 0.08) 100%)',
                    }}
                  >
                    <Activity size={20} style={{ color: '#6b7c6b' }} strokeWidth={1.5} />
                  </div>

                  <div className="flex-1 flex flex-col items-start justify-end text-left">
                    <h3
                      className="mb-1"
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: '#4B4B4B',
                        fontWeight: 500,
                        fontSize: '16px',
                        letterSpacing: '0.01em',
                      }}
                    >
                      Echo
                    </h3>
                    <p
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: '#6B6761',
                        fontWeight: 300,
                        fontSize: '12px',
                        letterSpacing: '0.005em',
                        lineHeight: '1.4',
                      }}
                    >
                      Gentle waves of calm.
                    </p>
                  </div>
                </div>
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* View Patterns Button */}
        <motion.div
          className="w-full mt-8 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 1 }}
        >
          <button
            onClick={onNavigateToPatterns}
            className="w-full rounded-full px-8 py-4 transition-all duration-300 hover:scale-[1.01] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #D3CFC8 0%, #CCC8C1 100%)',
              boxShadow: '0 6px 20px rgba(75, 75, 75, 0.1), 0 2px 6px rgba(75, 75, 75, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
          >
            <span
              style={{
                fontFamily: 'Georgia, serif',
                color: '#4B4B4B',
                fontWeight: 500,
                fontSize: '15px',
                letterSpacing: '0.02em',
              }}
            >
              View Patterns
            </span>
          </button>
        </motion.div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        activeScreen="activities"
        onNavigateHome={onReturnToChat}
        onNavigateActivities={() => {}}
        onNavigateJournal={onNavigateToJournal}
        onNavigateProfile={onNavigateToProfile}
        onNavigateHelp={onNavigateToHelp}
        variant="sage"
      />
    </div>
  );
}