import { useState } from 'react';
import { motion } from 'motion/react';
import { BottomNav } from './BottomNav';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { useTheme } from '../state/ThemeContext';

interface PrivacyScreenProps {
  onBackToHelp?: () => void;
  onNavigateToActivities?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToPatterns?: () => void;
  onNavigateToJournal?: () => void;
  onReturnToChat?: () => void;
}

export function PrivacyScreen({ 
  onBackToHelp, 
  onNavigateToActivities, 
  onNavigateToProfile, 
  onNavigateToPatterns: _onNavigateToPatterns,
  onNavigateToJournal,
  onReturnToChat,
}: PrivacyScreenProps) {
  void _onNavigateToPatterns;
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
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
          {/* Header Section */}
          <motion.div
            className="relative z-10 text-center space-y-3 pt-8 pb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <h2
              style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: '30px',
                fontWeight: 500,
                letterSpacing: '0.04em',
                color: 'var(--text-primary)',
              }}
            >
              Privacy & Your Data
            </h2>
            <p
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                fontWeight: 300,
                letterSpacing: '0.03em',
                color: 'var(--text-secondary)',
                fontStyle: 'italic',
                marginTop: '-0.6rem',
              }}
            >
              Kept safe. Never sold.
            </p>
          </motion.div>

          {/* Main Card */}
          <motion.div
            className="w-full rounded-[28px] p-8"
            style={{
              background: 'var(--card)',
              boxShadow: isDark
                ? '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)'
                : '0 8px 32px rgba(75, 75, 75, 0.08), 0 2px 8px rgba(75, 75, 75, 0.04)',
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.08)'
                : '1px solid rgba(255, 255, 255, 0.5)',
              marginTop: '-1rem',
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            {/* Section 1: What we store */}
            <div className="mb-8">
              <h3
                className="mb-3"
                style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '18px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.02em',
                }}
              >
                What we store
              </h3>
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '15px',
                  fontWeight: 300,
                  color: 'var(--text-secondary)',
                  lineHeight: '1.7',
                  letterSpacing: '0.01em',
                }}
              >
                Your messages, entries, and patterns so you can revisit them.
              </p>
            </div>

            {/* Subtle Divider */}
            <div 
              className="w-full h-[1px] mb-8"
              style={{
                background: isDark
                  ? 'linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)'
                  : 'linear-gradient(to right, transparent 0%, rgba(75, 75, 75, 0.08) 50%, transparent 100%)',
              }}
            />

            {/* Section 2: What we don't do */}
            <div className="mb-8">
              <h3
                className="mb-3"
                style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '18px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.02em',
                }}
              >
                What we don't do
              </h3>
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '15px',
                  fontWeight: 300,
                  color: 'var(--text-secondary)',
                  lineHeight: '1.7',
                  letterSpacing: '0.01em',
                }}
              >
                No selling data. No ads based on your feelings.
              </p>
            </div>

            {/* Subtle Divider */}
            <div 
              className="w-full h-[1px] mb-8"
              style={{
                background: isDark
                  ? 'linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)'
                  : 'linear-gradient(to right, transparent 0%, rgba(75, 75, 75, 0.08) 50%, transparent 100%)',
              }}
            />

            {/* Section 3: Your control */}
            <div>
              <h3
                className="mb-3"
                style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '18px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.02em',
                }}
              >
                Your control
              </h3>
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '15px',
                  fontWeight: 300,
                  color: 'var(--text-secondary)',
                  lineHeight: '1.7',
                  letterSpacing: '0.01em',
                }}
              >
                Edit, export, or delete entries anytime.
              </p>
            </div>

            {/* Subtle Divider */}
            <div 
              className="w-full h-[1px] mt-8 mb-6"
              style={{
                background: isDark
                  ? 'linear-gradient(to right, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)'
                  : 'linear-gradient(to right, transparent 0%, rgba(75, 75, 75, 0.08) 50%, transparent 100%)',
              }}
            />

            {/* Document Links */}
            <div className="space-y-3">
              <button
                onClick={() => setShowPrivacyModal(true)}
                className="w-full text-left py-3 px-4 rounded-2xl transition-all duration-300"
                style={{ backgroundColor: isDark ? 'transparent' : 'transparent' }}
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
                  Open Full Privacy Policy
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

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal 
        isOpen={showPrivacyModal} 
        onClose={() => setShowPrivacyModal(false)} 
      />
    </div>
  );
}