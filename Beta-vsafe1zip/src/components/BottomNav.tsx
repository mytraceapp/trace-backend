import { motion } from 'motion/react';
import { Home, Activity, BookMarked, User, HelpCircle } from 'lucide-react';
import { useTheme } from '../state/ThemeContext';

interface BottomNavProps {
  activeScreen: 'chat' | 'activities' | 'journal' | 'entries' | 'profile' | 'help';
  onNavigateHome?: () => void;
  onNavigateActivities?: () => void;
  onNavigateJournal?: () => void;
  onNavigateProfile?: () => void;
  onNavigateHelp?: () => void;
  variant?: 'sage' | 'sage-fixed' | 'neutral' | 'transparent'; // sage for main screens (adapts to theme), sage-fixed for activities (always light), neutral for other screens, transparent for immersive screens
  disableAnimation?: boolean; // disable entrance animation when parent handles it
}

export function BottomNav({ 
  activeScreen, 
  onNavigateHome, 
  onNavigateActivities, 
  onNavigateJournal, 
  onNavigateProfile,
  onNavigateHelp,
  variant = 'sage',
  disableAnimation = false
}: BottomNavProps) {
  const { theme } = useTheme();
  const isSage = variant === 'sage' || variant === 'sage-fixed';
  const isSageFixed = variant === 'sage-fixed';
  const isTransparent = variant === 'transparent';
  const isDark = theme === 'night';
  
  // Sage variant (main screens) - adapts to theme
  const sageStyles = {
    background: isDark 
      ? 'linear-gradient(to top, rgba(30, 32, 30, 1) 0%, rgba(42, 46, 42, 0.95) 40%, rgba(58, 64, 58, 0.7) 75%, transparent 100%)'
      : 'linear-gradient(to top, rgba(107, 122, 110, 1) 0%, rgba(125, 145, 128, 0.95) 40%, rgba(154, 176, 156, 0.7) 75%, transparent 100%)',
    iconColor: isDark ? '#D4D8D0' : '#EDE8DB',
    textColor: isDark ? '#D4D8D0' : '#EDE8DB',
  };
  
  // Sage-fixed variant (activity screens) - always light sage, never adapts to dark mode
  const sageFixedStyles = {
    background: 'linear-gradient(to top, rgba(107, 122, 110, 1) 0%, rgba(125, 145, 128, 0.95) 40%, rgba(154, 176, 156, 0.7) 75%, transparent 100%)',
    iconColor: '#EDE8DB',
    textColor: '#EDE8DB',
  };
  
  // Neutral variant (other screens) - adapts to theme
  const neutralStyles = {
    background: isDark 
      ? 'linear-gradient(to bottom, rgba(30, 32, 30, 0.15), rgba(42, 46, 42, 0.25))'
      : 'linear-gradient(to bottom, rgba(244, 241, 236, 0.15), rgba(232, 228, 221, 0.25))',
    iconColor: isDark ? '#8A8F86' : '#A8A19A',
    iconColorActive: isDark ? '#D4D8D0' : '#5A4A3A',
    textColor: isDark ? '#8A8F86' : '#A8A19A',
    textColorActive: isDark ? '#D4D8D0' : '#5A4A3A',
  };
  
  // Transparent variant (immersive screens like Echo, Rain Window) - no background
  const transparentStyles = {
    background: 'transparent',
    iconColor: 'rgba(212, 196, 168, 0.6)',
    iconColorActive: 'rgba(212, 196, 168, 0.9)',
    textColor: 'rgba(212, 196, 168, 0.6)',
    textColorActive: 'rgba(212, 196, 168, 0.9)',
  };
  
  const styles = isSageFixed ? sageFixedStyles : (isSage ? sageStyles : (isTransparent ? transparentStyles : neutralStyles));

  return (
    <motion.div
      className="sticky bottom-0 left-0 right-0 z-30"
      initial={disableAnimation ? false : { y: 100, opacity: 0 }}
      animate={disableAnimation ? {} : { y: 0, opacity: 1 }}
      transition={disableAnimation ? {} : { 
        delay: 0.2, 
        duration: 1.2, 
        ease: [0.16, 1, 0.3, 1]
      }}
    >
      <div
        className="w-full px-8 py-5"
        style={{
          background: styles.background,
          backdropFilter: isTransparent ? 'none' : 'blur(20px)',
          borderTop: 'none',
          boxShadow: (isSage || isTransparent) ? 'none' : (isDark ? '0 -4px 20px rgba(0, 0, 0, 0.15)' : '0 -4px 20px rgba(90, 74, 58, 0.08)'),
          transition: 'background 0.8s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className="flex items-center justify-between max-w-sm mx-auto">
          {/* Home */}
          <button
            onClick={onNavigateHome}
            className="flex flex-col items-center gap-1 hover:opacity-70 active:scale-95"
            style={{ transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            {activeScreen === 'chat' && !isSage ? (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: isDark 
                    ? 'linear-gradient(135deg, #2A2E2A 0%, #3A403A 100%)' 
                    : 'linear-gradient(135deg, #D3CFC8 0%, #C4BFB8 100%)',
                  boxShadow: isDark 
                    ? '0 2px 8px rgba(0, 0, 0, 0.25)' 
                    : '0 2px 8px rgba(90, 74, 58, 0.15)',
                }}
              >
                <Home size={20} style={{ color: neutralStyles.iconColorActive, strokeWidth: 1.8 }} />
              </div>
            ) : (
              <Home 
                size={22} 
                style={{ 
                  color: isSage ? styles.iconColor : (activeScreen === 'chat' ? styles.iconColor : neutralStyles.iconColor), 
                  strokeWidth: 1.5 
                }} 
              />
            )}
            <span
              style={{
                fontFamily: 'Georgia, serif',
                color: isSage ? styles.textColor : (activeScreen === 'chat' && !isSage ? neutralStyles.textColorActive : neutralStyles.textColor),
                fontSize: '10px',
                fontWeight: activeScreen === 'chat' && !isSage ? 500 : 300,
                letterSpacing: isSage ? '0.05em' : '0.02em',
                opacity: isSage ? 0.8 : 1,
              }}
            >
              Home
            </span>
          </button>

          {/* Activities */}
          <button
            onClick={onNavigateActivities}
            className="flex flex-col items-center gap-1 hover:opacity-70 active:scale-95"
            style={{ transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            {activeScreen === 'activities' && !isSage ? (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: isDark 
                    ? 'linear-gradient(135deg, #2A2E2A 0%, #3A403A 100%)' 
                    : 'linear-gradient(135deg, #D3CFC8 0%, #C4BFB8 100%)',
                  boxShadow: isDark 
                    ? '0 2px 8px rgba(0, 0, 0, 0.25)' 
                    : '0 2px 8px rgba(90, 74, 58, 0.15)',
                }}
              >
                <Activity size={20} style={{ color: neutralStyles.iconColorActive, strokeWidth: 1.8 }} />
              </div>
            ) : (
              <Activity 
                size={22} 
                style={{ 
                  color: isSage ? styles.iconColor : neutralStyles.iconColor, 
                  strokeWidth: 1.5 
                }} 
              />
            )}
            <span
              style={{
                fontFamily: 'Georgia, serif',
                color: isSage ? styles.textColor : (activeScreen === 'activities' && !isSage ? neutralStyles.textColorActive : neutralStyles.textColor),
                fontSize: '10px',
                fontWeight: activeScreen === 'activities' && !isSage ? 500 : 300,
                letterSpacing: isSage ? '0.05em' : '0.02em',
                opacity: isSage ? 0.8 : 1,
              }}
            >
              Activity
            </span>
          </button>

          {/* Entries */}
          <button
            onClick={onNavigateJournal}
            className="flex flex-col items-center gap-1 hover:opacity-70 active:scale-95"
            style={{ transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            {(activeScreen === 'journal' || activeScreen === 'entries') && !isSage ? (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: isDark 
                    ? 'linear-gradient(135deg, #2A2E2A 0%, #3A403A 100%)' 
                    : 'linear-gradient(135deg, #D3CFC8 0%, #C4BFB8 100%)',
                  boxShadow: isDark 
                    ? '0 2px 8px rgba(0, 0, 0, 0.25)' 
                    : '0 2px 8px rgba(90, 74, 58, 0.15)',
                }}
              >
                <BookMarked size={20} style={{ color: neutralStyles.iconColorActive, strokeWidth: 1.8 }} />
              </div>
            ) : (
              <BookMarked 
                size={22} 
                style={{ 
                  color: isSage ? styles.iconColor : neutralStyles.iconColor, 
                  strokeWidth: 1.5 
                }} 
              />
            )}
            <span
              style={{
                fontFamily: 'Georgia, serif',
                color: isSage ? styles.textColor : ((activeScreen === 'journal' || activeScreen === 'entries') && !isSage ? neutralStyles.textColorActive : neutralStyles.textColor),
                fontSize: '10px',
                fontWeight: (activeScreen === 'journal' || activeScreen === 'entries') && !isSage ? 500 : 300,
                letterSpacing: isSage ? '0.05em' : '0.02em',
                opacity: isSage ? 0.8 : 1,
              }}
            >
              Entries
            </span>
          </button>

          {/* Profile */}
          <button
            onClick={onNavigateProfile}
            className="flex flex-col items-center gap-1 hover:opacity-70 active:scale-95"
            style={{ transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            {activeScreen === 'profile' && !isSage ? (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: isDark 
                    ? 'linear-gradient(135deg, #2A2E2A 0%, #3A403A 100%)' 
                    : 'linear-gradient(135deg, #D3CFC8 0%, #C4BFB8 100%)',
                  boxShadow: isDark 
                    ? '0 2px 8px rgba(0, 0, 0, 0.25)' 
                    : '0 2px 8px rgba(90, 74, 58, 0.15)',
                }}
              >
                <User size={20} style={{ color: neutralStyles.iconColorActive, strokeWidth: 1.8 }} />
              </div>
            ) : (
              <User 
                size={22} 
                style={{ 
                  color: isSage ? styles.iconColor : neutralStyles.iconColor, 
                  strokeWidth: 1.5 
                }} 
              />
            )}
            <span
              style={{
                fontFamily: 'Georgia, serif',
                color: isSage ? styles.textColor : (activeScreen === 'profile' && !isSage ? neutralStyles.textColorActive : neutralStyles.textColor),
                fontSize: '10px',
                fontWeight: activeScreen === 'profile' && !isSage ? 500 : 300,
                letterSpacing: isSage ? '0.05em' : '0.02em',
                opacity: isSage ? 0.8 : 1,
              }}
            >
              Profile
            </span>
          </button>

          {/* Help */}
          <button
            onClick={onNavigateHelp}
            className="flex flex-col items-center gap-1 hover:opacity-70 active:scale-95"
            style={{ transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            {activeScreen === 'help' && !isSage ? (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{
                  background: isDark 
                    ? 'linear-gradient(135deg, #2A2E2A 0%, #3A403A 100%)' 
                    : 'linear-gradient(135deg, #D3CFC8 0%, #C4BFB8 100%)',
                  boxShadow: isDark 
                    ? '0 2px 8px rgba(0, 0, 0, 0.25)' 
                    : '0 2px 8px rgba(90, 74, 58, 0.15)',
                }}
              >
                <HelpCircle size={20} style={{ color: neutralStyles.iconColorActive, strokeWidth: 1.8 }} />
              </div>
            ) : (
              <HelpCircle 
                size={22} 
                style={{ 
                  color: isSage ? styles.iconColor : neutralStyles.iconColor, 
                  strokeWidth: 1.5 
                }} 
              />
            )}
            <span
              style={{
                fontFamily: 'Georgia, serif',
                color: isSage ? styles.textColor : (activeScreen === 'help' && !isSage ? neutralStyles.textColorActive : neutralStyles.textColor),
                fontSize: '10px',
                fontWeight: activeScreen === 'help' && !isSage ? 500 : 300,
                letterSpacing: isSage ? '0.05em' : '0.02em',
                opacity: isSage ? 0.8 : 1,
              }}
            >
              Help
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}