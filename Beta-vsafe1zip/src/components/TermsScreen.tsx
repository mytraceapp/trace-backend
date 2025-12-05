import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Heart, AlertCircle } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { TermsOfUseModal } from './TermsOfUseModal';
import { SafetyCommitmentModal } from './SafetyCommitmentModal';

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

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      style={{ 
        background: 'linear-gradient(to bottom, #E8E4DC 0%, #D8D4CC 100%)' 
      }}
    >
      {/* Subtle grain texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Soft vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(75, 75, 75, 0.04) 100%)',
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
                fontSize: '28px',
                fontWeight: 500,
                letterSpacing: '0.03em',
                color: '#5A4A3A',
                lineHeight: '1.3',
              }}
            >
              Terms & Safety Commitment
            </h2>
            <p
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                fontWeight: 300,
                letterSpacing: '0.03em',
                color: '#7D6D5D',
                fontStyle: 'italic',
                marginTop: '-0.5rem',
              }}
            >
              The serious stuff, written softly.
            </p>
          </motion.div>

          {/* Main Card */}
          <motion.div
            className="w-full rounded-[28px] p-8"
            style={{
              background: 'linear-gradient(135deg, #F7F4F0 0%, #F2EFE9 100%)',
              boxShadow: '0 8px 32px rgba(75, 75, 75, 0.08), 0 2px 8px rgba(75, 75, 75, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
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
                color: '#5A4A3A',
                lineHeight: '1.8',
                letterSpacing: '0.01em',
              }}
            >
              TRACE supports calm and reflection, not diagnosis, treatment, or emergency care.
            </p>

            {/* Subtle Divider */}
            <div 
              className="w-full h-[1px] mb-8"
              style={{
                background: 'linear-gradient(to right, transparent 0%, rgba(75, 75, 75, 0.08) 50%, transparent 100%)',
              }}
            />

            {/* Bullet Sections */}
            <div className="space-y-6 mb-8">
              {/* Not medical advice */}
              <div className="flex items-start gap-4">
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center mt-0.5"
                  style={{
                    backgroundColor: '#D9CFC2',
                  }}
                >
                  <AlertCircle size={16} style={{ color: '#5A4A3A', strokeWidth: 2 }} />
                </div>
                <div>
                  <h3
                    className="mb-2"
                    style={{
                      fontFamily: 'Playfair Display, Georgia, serif',
                      fontSize: '16px',
                      fontWeight: 500,
                      color: '#5A4A3A',
                      letterSpacing: '0.01em',
                    }}
                  >
                    Not medical advice
                  </h3>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '14px',
                      fontWeight: 300,
                      color: '#75655A',
                      lineHeight: '1.6',
                      letterSpacing: '0.005em',
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
                    backgroundColor: '#D9CFC2',
                  }}
                >
                  <Heart size={16} style={{ color: '#5A4A3A', strokeWidth: 2 }} />
                </div>
                <div>
                  <h3
                    className="mb-2"
                    style={{
                      fontFamily: 'Playfair Display, Georgia, serif',
                      fontSize: '16px',
                      fontWeight: 500,
                      color: '#5A4A3A',
                      letterSpacing: '0.01em',
                    }}
                  >
                    Respectful space
                  </h3>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '14px',
                      fontWeight: 300,
                      color: '#75655A',
                      lineHeight: '1.6',
                      letterSpacing: '0.005em',
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
                    backgroundColor: '#D9CFC2',
                  }}
                >
                  <Shield size={16} style={{ color: '#5A4A3A', strokeWidth: 2 }} />
                </div>
                <div>
                  <h3
                    className="mb-2"
                    style={{
                      fontFamily: 'Playfair Display, Georgia, serif',
                      fontSize: '16px',
                      fontWeight: 500,
                      color: '#5A4A3A',
                      letterSpacing: '0.01em',
                    }}
                  >
                    Safety first
                  </h3>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '14px',
                      fontWeight: 300,
                      color: '#75655A',
                      lineHeight: '1.6',
                      letterSpacing: '0.005em',
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
                background: 'linear-gradient(to right, transparent 0%, rgba(75, 75, 75, 0.08) 50%, transparent 100%)',
              }}
            />

            {/* Document Links */}
            <div className="space-y-3">
              <button
                onClick={() => setShowTermsModal(true)}
                className="w-full text-left py-3 px-4 rounded-2xl transition-all duration-300 hover:bg-black/5"
              >
                <span
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: '#5A4A3A',
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
                className="w-full text-left py-3 px-4 rounded-2xl transition-all duration-300 hover:bg-black/5"
              >
                <span
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: '#5A4A3A',
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
                background: 'linear-gradient(135deg, #D9CFC2 0%, #CEC4B8 100%)',
                boxShadow: '0 6px 24px rgba(75, 75, 75, 0.1), 0 2px 8px rgba(75, 75, 75, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              <span
                style={{
                  fontFamily: 'Georgia, serif',
                  color: '#4A3A2A',
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