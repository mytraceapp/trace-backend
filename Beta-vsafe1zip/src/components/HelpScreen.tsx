import { motion } from 'motion/react';
import { BookOpen, AlertCircle, Shield, FileText } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useTheme } from '../state/ThemeContext';

interface HelpScreenProps {
  onReturnToChat: () => void;
  onNavigateToActivities?: () => void;
  onNavigateToJournal?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToPatterns?: () => void;
  onNavigateToInThisSpace?: () => void;
  onNavigateToCrisis?: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToTerms?: () => void;
}

export function HelpScreen({ 
  onReturnToChat, 
  onNavigateToActivities, 
  onNavigateToJournal,
  onNavigateToProfile,
  onNavigateToPatterns: _onNavigateToPatterns,
  onNavigateToInThisSpace,
  onNavigateToCrisis,
  onNavigateToPrivacy,
  onNavigateToTerms,
}: HelpScreenProps) {
  void _onNavigateToPatterns;
  const { theme } = useTheme();
  const isDark = theme === 'night';

  const helpCards = [
    {
      icon: BookOpen,
      title: 'In This Space',
      subtext: 'What TRACE can and can\'t do.',
      onClick: onNavigateToInThisSpace,
    },
    {
      icon: AlertCircle,
      title: 'If You\'re in Crisis',
      subtext: 'Immediate options when things feel unsafe.',
      onClick: onNavigateToCrisis,
    },
    {
      icon: Shield,
      title: 'Privacy & Your Data',
      subtext: 'How your words are protected.',
      onClick: onNavigateToPrivacy,
    },
    {
      icon: FileText,
      title: 'Terms & Safety Commitment',
      subtext: 'The serious stuff, explained simply.',
      onClick: onNavigateToTerms,
    },
  ];

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{
        background: 'transparent',
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

      {/* TRACE Brand Name - fixed position */}
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
            opacity: 0.85,
            paddingLeft: '1em',
          }}
        >
          TRACE
        </h1>
      </motion.div>

      {/* Scrollable Content Wrapper */}
      <div 
        className="relative z-10 flex flex-col h-full pb-24"
        style={{
          overflowY: 'auto',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE and Edge
        }}
        // Hide scrollbar for Chrome, Safari and Opera
        onLoad={(_e) => {
          const style = document.createElement('style');
          style.textContent = `
            .relative.z-10.flex.flex-col.h-full.pb-24::-webkit-scrollbar {
              display: none;
            }
          `;
          if (!document.head.querySelector('style[data-help-scrollbar]')) {
            style.setAttribute('data-help-scrollbar', 'true');
            document.head.appendChild(style);
          }
        }}
      >
        <div className="flex-shrink-0" style={{ height: '8%' }} />

        {/* Title Section with ambient vignette for night mode */}
        <motion.div
          className="w-full px-6 text-center pt-8 pb-2 flex-shrink-0 relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1 }}
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
            className="mb-2 relative"
            style={{
              fontFamily: 'Georgia, serif',
              color: 'var(--text-primary)',
              fontWeight: 400,
              fontSize: '32px',
              letterSpacing: '-0.02em',
              opacity: isDark ? 0.95 : 1,
            }}
          >
            Help
          </h2>
          <p
            className="mb-2 relative"
            style={{
              fontFamily: 'Georgia, serif',
              color: 'var(--text-secondary)',
              fontWeight: 300,
              fontSize: '15px',
              letterSpacing: '0.01em',
              marginTop: '-0.5rem',
              opacity: isDark ? 0.92 : 1,
            }}
          >
            Support, safety, and how TRACE works.
          </p>
        </motion.div>

        {/* Help Cards */}
        <motion.div
          className="w-full px-6 space-y-4 flex-shrink-0"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 1 }}
        >
          {helpCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.button
                key={card.title}
                onClick={card.onClick}
                className="w-full p-6 text-left transition-all duration-300 hover:scale-[1.01] active:scale-[0.98]"
                style={{
                  background: 'var(--card)',
                  borderRadius: isDark ? '26px' : '24px',
                  boxShadow: isDark
                    ? '0 6px 20px rgba(0, 0, 0, 0.3), 0 2px 6px rgba(0, 0, 0, 0.2)'
                    : '0 6px 20px rgba(90, 74, 58, 0.08), 0 2px 6px rgba(90, 74, 58, 0.04)',
                  border: isDark
                    ? '1px solid rgba(255, 255, 255, 0.08)'
                    : '1px solid rgba(255, 255, 255, 0.4)',
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + index * 0.1, duration: 0.8 }}
              >
                <div className="flex items-start gap-4">
                  {/* Icon - ghost-like in night mode */}
                  <div
                    className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                    style={{
                      background: isDark
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'linear-gradient(135deg, #E8E4DD 0%, #DDD9D2 100%)',
                      boxShadow: isDark
                        ? 'none'
                        : '0 2px 8px rgba(90, 74, 58, 0.06)',
                    }}
                  >
                    <Icon 
                      size={20} 
                      style={{ 
                        color: 'var(--text-secondary)', 
                        strokeWidth: 1.5,
                        opacity: isDark ? 0.94 : 1,
                      }} 
                    />
                  </div>

                  {/* Text Content */}
                  <div className="flex-1">
                    <h3
                      className="mb-1"
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                        fontSize: '17px',
                        letterSpacing: '0.01em',
                        opacity: isDark ? 0.95 : 1,
                      }}
                    >
                      {card.title}
                    </h3>
                    <p
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: 'var(--text-secondary)',
                        fontWeight: 300,
                        fontSize: '14px',
                        letterSpacing: '0.005em',
                        lineHeight: '1.5',
                        opacity: isDark ? 0.93 : 1,
                      }}
                    >
                      {card.subtext}
                    </p>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* Spacer for bottom nav */}
        <div className="flex-1 min-h-[20px]" />
      </div>

      {/* Bottom Navigation Bar */}
      <BottomNav
        activeScreen="help"
        variant="sage"
        onNavigateHome={onReturnToChat}
        onNavigateActivities={onNavigateToActivities}
        onNavigateJournal={onNavigateToJournal}
        onNavigateProfile={onNavigateToProfile}
        onNavigateHelp={() => {}}
      />
    </div>
  );
}