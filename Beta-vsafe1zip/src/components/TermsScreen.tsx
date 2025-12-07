import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Heart, AlertCircle } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { TermsOfUseModal } from './TermsOfUseModal';
import { SafetyCommitmentModal } from './SafetyCommitmentModal';
import { useTheme } from '../state/ThemeContext';

interface TermsScreenProps {
  onReturnToChat?: () => void;
  onBackToHelp?: () => void;
  onNavigateToActivities?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToPatterns?: () => void;
  onNavigateToJournal?: () => void;
}

export function TermsScreen({ 
  onReturnToChat,
  onBackToHelp, 
  onNavigateToActivities, 
  onNavigateToProfile, 
  onNavigateToPatterns,
  onNavigateToJournal 
}: TermsScreenProps) {
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
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
            : 'radial-gradient(circle at center, transparent 0%, rgba(75, 75, 75, 0.04) 100%)',
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
            className="relative z-10 text-center space-y-3 pt-8 pb-6"
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
                fontSize: '28px',
                fontWeight: 500,
                letterSpacing: '0.03em',
                color: 'var(--text-primary)',
                lineHeight: '1.3',
                opacity: isDark ? 0.95 : 1,
              }}
            >
              Terms & Safety Commitment
            </h2>
            <p
              className="relative"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                fontWeight: 300,
                letterSpacing: '0.03em',
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
                marginTop: '-0.5rem',
                opacity: isDark ? 0.92 : 1,
              }}
            >
              The serious stuff, written softly.
            </p>
          </motion.div>

          {/* Main Card - softer corners in night mode */}
          <motion.div
            className="w-full p-8"
            style={{
              background: 'var(--card)',
              borderRadius: isDark ? '30px' : '28px',
              boxShadow: isDark
                ? '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
                : '0 8px 32px rgba(75, 75, 75, 0.08), 0 2px 8px rgba(75, 75, 75, 0.04)',
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.08)'
                : '1px solid rgba(255, 255, 255, 0.5)',
              marginTop: '-0.75rem',
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            {/* Opening Paragraph */}
            <p
              className="mb-8"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '15px',
                fontWeight: 300,
                color: 'var(--text-primary)',
                lineHeight: '1.8',
                letterSpacing: '0.01em',
                opacity: isDark ? 0.93 : 1,
              }}
            >
              TRACE supports calm and reflection, not diagnosis, treatment, or emergency care.
            </p>

            {/* Subtle Divider */}
            <div 
              className="w-full h-[1px] mb-8"
              style={{
                background: isDark
                  ? 'linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.08) 50%, transparent 100%)'
                  : 'linear-gradient(to right, transparent 0%, rgba(75, 75, 75, 0.08) 50%, transparent 100%)',
              }}
            />

            {/* Bullet Sections */}
            <div className="space-y-6 mb-8">
              {/* Not medical advice */}
              <div className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5"
                  style={{
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#D9CFC2',
                  }}
                >
                  <AlertCircle size={16} style={{ color: 'var(--text-primary)', strokeWidth: 2, opacity: isDark ? 0.93 : 1 }} />
                </div>
                <div>
                  <h3
                    className="mb-2"
                    style={{
                      fontFamily: 'Playfair Display, Georgia, serif',
                      fontSize: '16px',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      letterSpacing: '0.01em',
                      opacity: isDark ? 0.95 : 1,
                    }}
                  >
                    Not medical advice
                  </h3>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '14px',
                      fontWeight: 300,
                      color: 'var(--text-secondary)',
                      lineHeight: '1.6',
                      letterSpacing: '0.005em',
                      opacity: isDark ? 0.93 : 1,
                    }}
                  >
                    TRACE doesn't replace therapy or clinical care.
                  </p>
                </div>
              </div>

              {/* Respectful space */}
              <div className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5"
                  style={{
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#D9CFC2',
                  }}
                >
                  <Heart size={16} style={{ color: 'var(--text-primary)', strokeWidth: 2, opacity: isDark ? 0.93 : 1 }} />
                </div>
                <div>
                  <h3
                    className="mb-2"
                    style={{
                      fontFamily: 'Playfair Display, Georgia, serif',
                      fontSize: '16px',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      letterSpacing: '0.01em',
                      opacity: isDark ? 0.95 : 1,
                    }}
                  >
                    Respectful space
                  </h3>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '14px',
                      fontWeight: 300,
                      color: 'var(--text-secondary)',
                      lineHeight: '1.6',
                      letterSpacing: '0.005em',
                      opacity: isDark ? 0.93 : 1,
                    }}
                  >
                    Conversation stays kind and steady.
                  </p>
                </div>
              </div>

              {/* Safety first */}
              <div className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5"
                  style={{
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : '#D9CFC2',
                  }}
                >
                  <Shield size={16} style={{ color: 'var(--text-primary)', strokeWidth: 2, opacity: isDark ? 0.93 : 1 }} />
                </div>
                <div>
                  <h3
                    className="mb-2"
                    style={{
                      fontFamily: 'Playfair Display, Georgia, serif',
                      fontSize: '16px',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      letterSpacing: '0.01em',
                      opacity: isDark ? 0.95 : 1,
                    }}
                  >
                    Safety first
                  </h3>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '14px',
                      fontWeight: 300,
                      color: 'var(--text-secondary)',
                      lineHeight: '1.6',
                      letterSpacing: '0.005em',
                      opacity: isDark ? 0.93 : 1,
                    }}
                  >
                    We guide you toward real-world help when needed.
                  </p>
                </div>
              </div>
            </div>

            {/* Subtle Divider */}
            <div 
              className="w-full h-[1px] mb-6"
              style={{
                background: isDark
                  ? 'linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)'
                  : 'linear-gradient(to right, transparent 0%, rgba(75, 75, 75, 0.08) 50%, transparent 100%)',
              }}
            />

            {/* Document Links */}
            <div className="space-y-3">
              <button
                onClick={() => setShowTermsModal(true)}
                className="w-full text-left py-3 px-4 rounded-2xl transition-all duration-300"
              >
                <span
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: 'var(--text-primary)',
                    fontSize: '15px',
                    fontWeight: 400,
                    letterSpacing: '0.01em',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  Open Terms of Use
                </span>
              </button>
              
              <button
                onClick={() => setShowSafetyModal(true)}
                className="w-full text-left py-3 px-4 rounded-2xl transition-all duration-300"
              >
                <span
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: 'var(--text-primary)',
                    fontSize: '15px',
                    fontWeight: 400,
                    letterSpacing: '0.01em',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  Open Safety Commitment
                </span>
              </button>
            </div>
          </motion.div>

          {/* Bottom Buttons */}
          <motion.div
            className="w-full pt-8 pb-8 space-y-4"
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

      {/* Terms of Use Modal */}
      <TermsOfUseModal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)} 
      />

      {/* Safety Commitment Modal */}
      <SafetyCommitmentModal 
        isOpen={showSafetyModal} 
        onClose={() => setShowSafetyModal(false)} 
      />
    </div>
  );
}