import React from 'react';
import { motion } from 'motion/react';
import { Phone, MessageCircle, Mail } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useTheme } from '../state/ThemeContext';

interface CrisisScreenProps {
  onReturnToChat?: () => void;
  onBackToHelp?: () => void;
  onNavigateToActivities?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToPatterns?: () => void;
  onNavigateToJournal?: () => void;
}

export function CrisisScreen({ 
  onReturnToChat,
  onBackToHelp, 
  onNavigateToActivities, 
  onNavigateToProfile, 
  onNavigateToPatterns,
  onNavigateToJournal 
}: CrisisScreenProps) {
  const { theme } = useTheme();
  const isDark = theme === 'night';

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      style={{ 
        background: 'transparent' 
      }}
    >
      {/* Soft vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.08) 100%)'
            : 'radial-gradient(circle at center, transparent 0%, rgba(75, 75, 75, 0.05) 100%)',
        }}
      />

      {/* TRACE Brand Name - fixed position below camera earpiece */}
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
            color: 'var(--text-primary)',
            fontWeight: 300,
            letterSpacing: '1em',
            fontSize: '11px',
            textShadow: `0 0 15px var(--orb-glow), 0 0 30px var(--orb-glow), 0 2px 4px rgba(0,0,0,0.15)`,
            opacity: 0.88,
            paddingLeft: '1em',
          }}
        >
          TRACE
        </h1>
      </motion.div>

      {/* Scrollable Content Wrapper */}
      <div 
        className="relative z-10 flex flex-col h-full overflow-y-auto overflow-x-hidden pb-32" 
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
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
          {/* Header Section with ambient vignette for night mode */}
          <motion.div
            className="relative z-10 text-center pt-8 pb-6"
            style={{ marginBottom: '-1rem' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
          >
            {/* Subtle ambient vignette behind header for night mode */}
            {isDark && (
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(0, 0, 0, 0.03) 0%, transparent 70%)',
                }}
              />
            )}
            <h2
              className="relative"
              style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: '30px',
                fontWeight: 500,
                letterSpacing: '0.04em',
                color: 'var(--text-primary)',
                marginBottom: '-0.15rem',
                opacity: isDark ? 0.95 : 1,
              }}
            >
              If You're in Crisis
            </h2>
            <p
              className="relative"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '15px',
                fontWeight: 400,
                letterSpacing: '0.02em',
                color: 'var(--text-primary)',
                marginBottom: '0.5rem',
                opacity: isDark ? 0.93 : 1,
              }}
            >
              You're not alone.
            </p>
            <p
              className="relative"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                fontWeight: 300,
                letterSpacing: '0.03em',
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
                opacity: isDark ? 0.92 : 1,
              }}
            >
              Real-world help comes first.
            </p>
          </motion.div>

          {/* Main Card - softer corners in night mode */}
          <motion.div
            className="w-full p-8 mt-0"
            style={{
              background: 'var(--card)',
              borderRadius: isDark ? '30px' : '28px',
              boxShadow: isDark
                ? '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
                : '0 8px 32px rgba(75, 75, 75, 0.08), 0 2px 8px rgba(75, 75, 75, 0.04)',
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.08)'
                : '1px solid rgba(255, 255, 255, 0.5)',
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            {/* Important Notice */}
            <p
              className="mb-6 text-center"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '0.01em',
                lineHeight: '1.6',
                opacity: isDark ? 0.95 : 1,
              }}
            >
              TRACE can't respond to emergencies.
            </p>

            {/* Emergency Contacts - Three Mini Cards */}
            <div className="space-y-4 mb-6">
              {/* 911 Card */}
              <div
                className="p-5 flex items-start gap-4"
                style={{
                  borderRadius: isDark ? '22px' : '20px',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#EDE8E0',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(75, 75, 75, 0.08)',
                  boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#D9CFC2',
                  }}
                >
                  <Phone size={18} style={{ color: 'var(--text-primary)', strokeWidth: 2, opacity: isDark ? 0.93 : 1 }} />
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                      letterSpacing: '0.01em',
                      opacity: isDark ? 0.95 : 1,
                    }}
                  >
                    Call 911
                  </p>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '14px',
                      fontWeight: 300,
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5',
                      letterSpacing: '0.005em',
                      opacity: isDark ? 0.93 : 1,
                    }}
                  >
                    If you're in immediate danger.
                  </p>
                </div>
              </div>

              {/* 988 Card */}
              <div
                className="p-5 flex items-start gap-4"
                style={{
                  borderRadius: isDark ? '22px' : '20px',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#EDE8E0',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(75, 75, 75, 0.08)',
                  boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#D9CFC2',
                  }}
                >
                  <MessageCircle size={18} style={{ color: 'var(--text-primary)', strokeWidth: 2, opacity: isDark ? 0.93 : 1 }} />
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                      letterSpacing: '0.01em',
                      opacity: isDark ? 0.95 : 1,
                    }}
                  >
                    Call or text 988
                  </p>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '14px',
                      fontWeight: 300,
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5',
                      letterSpacing: '0.005em',
                      opacity: isDark ? 0.93 : 1,
                    }}
                  >
                    U.S. Suicide & Crisis Lifeline.
                  </p>
                </div>
              </div>

              {/* Crisis Text Line Card */}
              <div
                className="p-5 flex items-start gap-4"
                style={{
                  borderRadius: isDark ? '22px' : '20px',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#EDE8E0',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(75, 75, 75, 0.08)',
                  boxShadow: isDark ? '0 2px 8px rgba(0, 0, 0, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#D9CFC2',
                  }}
                >
                  <Mail size={18} style={{ color: 'var(--text-primary)', strokeWidth: 2, opacity: isDark ? 0.93 : 1 }} />
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '4px',
                      letterSpacing: '0.01em',
                      opacity: isDark ? 0.95 : 1,
                    }}
                  >
                    Text HOME to 741741
                  </p>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '14px',
                      fontWeight: 300,
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5',
                      letterSpacing: '0.005em',
                      opacity: isDark ? 0.93 : 1,
                    }}
                  >
                    Crisis Text Line.
                  </p>
                </div>
              </div>
            </div>

            {/* Compassionate Message */}
            <p
              className="text-center"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '15px',
                fontWeight: 300,
                color: 'var(--text-primary)',
                lineHeight: '1.7',
                letterSpacing: '0.01em',
                fontStyle: 'italic',
                opacity: isDark ? 0.92 : 1,
              }}
            >
              Real people can help.
            </p>
          </motion.div>

          {/* Bottom Buttons */}
          <motion.div
            className="w-full pt-8 pb-2 space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            {/* Return to Chat Button */}
            <button
              onClick={onReturnToChat}
              className="w-full rounded-full px-8 py-5 transition-all duration-300 hover:scale-[1.01] active:scale-[0.98]"
              style={{
                background: isDark
                  ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)'
                  : 'linear-gradient(135deg, #D9CFC2 0%, #CEC4B8 100%)',
                boxShadow: isDark
                  ? '0 6px 24px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1)'
                  : '0 6px 24px rgba(75, 75, 75, 0.1), 0 2px 8px rgba(75, 75, 75, 0.05)',
                border: isDark
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              <span
                style={{
                  fontFamily: 'Georgia, serif',
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                }}
              >
                Return to Chat
              </span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        activeScreen="help"
        variant="sage"
        onNavigateHome={onReturnToChat}
        onNavigateActivities={onNavigateToActivities}
        onNavigateJournal={onNavigateToJournal}
        onNavigateProfile={onNavigateToProfile}
        onNavigateHelp={onBackToHelp}
      />
    </div>
  );
}