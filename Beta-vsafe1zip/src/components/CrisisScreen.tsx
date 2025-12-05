import React from 'react';
import { motion } from 'motion/react';
import { Phone, MessageCircle, Mail } from 'lucide-react';
import { BottomNav } from './BottomNav';

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
  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      style={{ 
        background: 'linear-gradient(to bottom, #D3C9BC 0%, #C4BAB0 100%)' 
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
          background: 'radial-gradient(circle at center, transparent 0%, rgba(75, 75, 75, 0.05) 100%)',
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
            className="relative z-10 text-center pt-8 pb-6"
            style={{ marginBottom: '-1rem' }}
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
                color: '#4A3A2A',
                marginBottom: '-0.15rem',
              }}
            >
              If You're in Crisis
            </h2>
            <p
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '15px',
                fontWeight: 400,
                letterSpacing: '0.02em',
                color: '#5A4A3A',
                marginBottom: '0.5rem',
              }}
            >
              You're not alone.
            </p>
            <p
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '14px',
                fontWeight: 300,
                letterSpacing: '0.03em',
                color: '#6D5D4D',
                fontStyle: 'italic',
              }}
            >
              Real-world help comes first.
            </p>
          </motion.div>

          {/* Main Card */}
          <motion.div
            className="w-full rounded-[28px] p-8 mt-0"
            style={{
              background: 'linear-gradient(135deg, #F7F4F0 0%, #F2EFE9 100%)',
              boxShadow: '0 8px 32px rgba(75, 75, 75, 0.08), 0 2px 8px rgba(75, 75, 75, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
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
                color: '#4A3A2A',
                letterSpacing: '0.01em',
                lineHeight: '1.6',
              }}
            >
              TRACE can't respond to emergencies.
            </p>

            {/* Emergency Contacts - Three Mini Cards */}
            <div className="space-y-4 mb-6">
              {/* 911 Card */}
              <div
                className="rounded-[20px] p-5 flex items-start gap-4"
                style={{
                  backgroundColor: '#EDE8E0',
                  border: '1px solid rgba(75, 75, 75, 0.08)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: '#D9CFC2',
                  }}
                >
                  <Phone size={18} style={{ color: '#5A4A3A', strokeWidth: 2 }} />
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#4A3A2A',
                      marginBottom: '4px',
                      letterSpacing: '0.01em',
                    }}
                  >
                    Call 911
                  </p>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '14px',
                      fontWeight: 300,
                      color: '#75655A',
                      lineHeight: '1.5',
                      letterSpacing: '0.005em',
                    }}
                  >
                    If you're in immediate danger.
                  </p>
                </div>
              </div>

              {/* 988 Card */}
              <div
                className="rounded-[20px] p-5 flex items-start gap-4"
                style={{
                  backgroundColor: '#EDE8E0',
                  border: '1px solid rgba(75, 75, 75, 0.08)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: '#D9CFC2',
                  }}
                >
                  <MessageCircle size={18} style={{ color: '#5A4A3A', strokeWidth: 2 }} />
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#4A3A2A',
                      marginBottom: '4px',
                      letterSpacing: '0.01em',
                    }}
                  >
                    Call or text 988
                  </p>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '14px',
                      fontWeight: 300,
                      color: '#75655A',
                      lineHeight: '1.5',
                      letterSpacing: '0.005em',
                    }}
                  >
                    U.S. Suicide & Crisis Lifeline.
                  </p>
                </div>
              </div>

              {/* Crisis Text Line Card */}
              <div
                className="rounded-[20px] p-5 flex items-start gap-4"
                style={{
                  backgroundColor: '#EDE8E0',
                  border: '1px solid rgba(75, 75, 75, 0.08)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                }}
              >
                <div
                  className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                  style={{
                    backgroundColor: '#D9CFC2',
                  }}
                >
                  <Mail size={18} style={{ color: '#5A4A3A', strokeWidth: 2 }} />
                </div>
                <div>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#4A3A2A',
                      marginBottom: '4px',
                      letterSpacing: '0.01em',
                    }}
                  >
                    Text HOME to 741741
                  </p>
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '14px',
                      fontWeight: 300,
                      color: '#75655A',
                      lineHeight: '1.5',
                      letterSpacing: '0.005em',
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
                color: '#5A4A3A',
                lineHeight: '1.7',
                letterSpacing: '0.01em',
                fontStyle: 'italic',
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
    </div>
  );
}