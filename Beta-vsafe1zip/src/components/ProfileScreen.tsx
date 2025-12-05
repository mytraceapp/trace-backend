import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Lock, Download, Trash2, Volume2, VolumeX, X, Copy, Check, Sun, Moon } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useUser, planLabels, PlanTier } from '../state/PlanContext';
import { useTheme } from '../state/ThemeContext';
import { AboutTraceModal } from './AboutTraceModal';

interface ProfileScreenProps {
  onNavigateToActivities?: () => void;
  onNavigateToChat?: () => void;
  onNavigateToPatterns?: () => void;
  onNavigateToHelp?: () => void;
  onNavigateToJournal?: () => void;
  onNavigateToOnboarding?: () => void;
  onNavigateToPrivacy?: () => void;
  onNavigateToTerms?: () => void;
}

export function ProfileScreen({ 
  onNavigateToActivities,
  onNavigateToChat,
  onNavigateToPatterns,
  onNavigateToHelp,
  onNavigateToJournal,
  onNavigateToOnboarding,
  onNavigateToPrivacy,
  onNavigateToTerms
}: ProfileScreenProps) {
  const { profile, selectedPlan, generateReferralCode, updatePlan, setIsUpgrading, ambienceEnabled, setAmbienceEnabled, ambienceVolume, setAmbienceVolume } = useUser();
  const { theme, setTheme } = useTheme();
  const [showThemePopup, setShowThemePopup] = React.useState(false);
  
  const [showManagePlanPopup, setShowManagePlanPopup] = React.useState(false);
  const [showUpgradePromoPopup, setShowUpgradePromoPopup] = React.useState(false);
  const [showReferralCodePopup, setShowReferralCodePopup] = React.useState(false);
  const [showAboutTraceModal, setShowAboutTraceModal] = React.useState(false);
  const [promoCode, setPromoCode] = React.useState('');
  const [promoApplied, setPromoApplied] = React.useState(false);
  const [promoMessage, setPromoMessage] = React.useState('');
  const [generatedCode, setGeneratedCode] = React.useState('');
  const [codeCopied, setCodeCopied] = React.useState(false);

  const currentPlan = profile?.plan || selectedPlan;
  const currentPlanLabel = planLabels[currentPlan].label;
  const userName = profile?.name || 'Your Name';
  const userEmail = profile?.email || 'name@email.com';
  
  const getInitial = (name: string) => {
    const firstName = name.trim().split(' ')[0];
    return firstName.charAt(0).toUpperCase();
  };
  const userInitial = getInitial(userName);

  const handleUpgradePlan = () => {
    setShowManagePlanPopup(false);
    setShowUpgradePromoPopup(false);
    setIsUpgrading(true);
    onNavigateToOnboarding?.();
  };

  const handleCancelPlan = () => {
    updatePlan('light', true);
    setShowManagePlanPopup(false);
  };

  const handleApplyPromoCode = () => {
    const code = promoCode.trim().toUpperCase();
    if (code.length >= 6) {
      if (code.includes('PREM') || code.includes('PREMIUM')) {
        setPromoMessage('3 months free Premium access applied!');
        updatePlan('premium', true);
        setPromoApplied(true);
      } else if (code.includes('STUDIO') || code.includes('STU')) {
        setPromoMessage('3 months free Studio access applied!');
        updatePlan('studio', true);
        setPromoApplied(true);
      } else {
        setPromoMessage('Invalid code. Please try again.');
        setPromoApplied(false);
      }
    } else {
      setPromoMessage('Please enter a valid referral code.');
      setPromoApplied(false);
    }
  };

  const handleGenerateReferralCode = () => {
    const code = generateReferralCode();
    setGeneratedCode(code);
    setCodeCopied(false);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const canUpgrade = currentPlan !== 'studio';

  const isDark = theme === 'night';

  return (
    <div 
      className="relative w-full h-full overflow-hidden transition-all duration-300"
      style={{ 
        background: 'transparent'
      }}
    >
      {/* Subtle background orb */}
      <motion.div
        className="absolute rounded-full pointer-events-none blur-3xl transition-all duration-200"
        style={{
          width: '280px',
          height: '280px',
          background: `radial-gradient(circle, var(--orb-glow) 0%, transparent 70%)`,
          top: '35%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: [0.22, 0.61, 0.36, 1] }}
      />

      {/* Breathing glow behind orb - Night Mode only */}
      {isDark && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: '340px',
            height: '340px',
            background: `radial-gradient(circle, rgba(180, 191, 170, 0.25) 0%, rgba(160, 175, 155, 0.12) 35%, rgba(140, 155, 135, 0.05) 55%, transparent 75%)`,
            top: '35%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            filter: 'blur(40px)',
          }}
          animate={{
            opacity: [0.4, 0.7, 0.4],
            scale: [0.95, 1.08, 0.95],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Subtle grain texture overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          mixBlendMode: 'overlay',
        }}
      />

      {/* TRACE Brand Name at top */}
      <motion.div
        className="absolute w-full text-center z-20"
        style={{ top: '7%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 1.5, ease: [0.22, 0.61, 0.36, 1] }}
      >
        <h1
          className="transition-all duration-200"
          style={{
            fontFamily: 'ALORE, Georgia, serif',
            color: 'var(--text-tertiary)',
            fontWeight: 300,
            letterSpacing: '1em',
            fontSize: '11px',
            textShadow: theme === 'night' 
              ? '0 0 15px rgba(180, 191, 179, 0.35), 0 0 30px rgba(180, 191, 179, 0.15), 0 2px 4px rgba(0,0,0,0.2)'
              : '0 0 15px rgba(106, 90, 74, 0.45), 0 0 30px rgba(106, 90, 74, 0.25), 0 2px 4px rgba(0,0,0,0.12)',
            opacity: 0.9,
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
            input[type="range"]::-webkit-slider-thumb {
              appearance: none;
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: #8A7A6A;
              cursor: pointer;
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
            }
            input[type="range"]::-moz-range-thumb {
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: #8A7A6A;
              cursor: pointer;
              border: none;
              box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
            }
          `}
        </style>

        {/* Top spacing for TRACE title */}
        <div className="flex-shrink-0" style={{ height: '13%' }} />

        {/* Small circular monogram below TRACE */}
        <motion.div
          className="flex justify-center mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 1 }}
        >
          <div className="relative">
            {/* Breathing glow behind initial circle - Night Mode only */}
            {isDark && (
              <motion.div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: '120px',
                  height: '120px',
                  background: `radial-gradient(circle, rgba(180, 191, 170, 0.35) 0%, rgba(160, 175, 155, 0.15) 40%, transparent 70%)`,
                  top: '-30%',
                  left: '-25%',
                  transform: 'translate(-50%, -50%)',
                  filter: 'blur(15px)',
                }}
                animate={{
                  opacity: [0.5, 0.85, 0.5],
                  scale: [0.9, 1.15, 0.9],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 relative z-10"
              style={{
                background: 'var(--card)',
                border: '1.5px solid var(--text-secondary)',
                boxShadow: `0 2px 12px var(--shadow)`,
              }}
            >
              <span
                style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '22px',
                  color: 'var(--text-secondary)',
                  fontWeight: 400,
                  letterSpacing: '0.02em',
                }}
              >
                {userInitial}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Centered Content Container */}
        <div className="w-full max-w-md mx-auto px-6 flex flex-col" style={{ marginTop: '-0.65rem' }}>
          
          {/* Section 1 — Account Overview */}
          <motion.div
            className="w-full rounded-[28px] p-7 mb-5 transition-all duration-200"
            style={{
              background: 'var(--card)',
              boxShadow: `0 2px 16px var(--shadow), 0 4px 24px var(--shadow)`,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div className="mb-5">
              <h3
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '17px',
                  fontWeight: 400,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.015em',
                  marginBottom: '6px',
                }}
              >
                {userName}
              </h3>
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '14px',
                  fontWeight: 300,
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.01em',
                }}
              >
                {userEmail}
              </p>
            </div>

            <div className="space-y-0">
              <div className="py-3 mb-2">
                <p
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    opacity: 0.6,
                    marginBottom: '4px',
                  }}
                >
                  Your plan
                </p>
                <p
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '15px',
                    color: 'var(--text-primary)',
                    fontWeight: 400,
                    letterSpacing: '0.01em',
                  }}
                >
                  {currentPlanLabel}
                </p>
              </div>
              <button
                className="w-full text-left py-3 transition-opacity duration-200 hover:opacity-70"
                onClick={() => setShowManagePlanPopup(true)}
              >
                <span
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    fontWeight: 300,
                    letterSpacing: '0.01em',
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  Manage Subscription
                </span>
              </button>

              <div 
                className="py-4 my-2 space-y-3"
                style={{
                  borderTop: '1px solid var(--border)',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <button
                  className="w-full flex items-center justify-between py-3 px-3 rounded-xl transition-all duration-200 hover:bg-black/5"
                  onClick={() => setShowUpgradePromoPopup(true)}
                >
                  <span
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 300,
                    }}
                  >
                    Apply Referral Code
                  </span>
                  <ChevronRight size={16} style={{ color: 'var(--text-secondary)', strokeWidth: 1.5 }} />
                </button>

                <div>
                  <button
                    className="w-full flex items-center justify-between py-3 px-3 rounded-xl transition-all duration-200 hover:bg-black/5"
                    onClick={() => {
                      if (!generatedCode && profile?.referralCode) {
                        setGeneratedCode(profile.referralCode);
                      }
                      setShowReferralCodePopup(true);
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        fontWeight: 300,
                      }}
                    >
                      Generate A Referral Code
                    </span>
                    <ChevronRight size={16} style={{ color: 'var(--text-secondary)', strokeWidth: 1.5 }} />
                  </button>
                  <p
                    className="mt-2 px-4"
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 300,
                      letterSpacing: '0.01em',
                      opacity: 0.85,
                    }}
                  >
                    Refer someone and get 3 months free TRACE Studio access
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Section 2 — Personalization */}
          <motion.div
            className="w-full rounded-[28px] p-6 mb-5 transition-all duration-200"
            style={{
              background: 'var(--card)',
              boxShadow: `0 2px 16px var(--shadow)`,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <h3
              className="mb-4"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '15px',
                fontWeight: 400,
                color: 'var(--text-primary)',
                letterSpacing: '0.02em',
              }}
            >
              Personalization
            </h3>

            <div className="space-y-1">
              {/* App Ambience */}
              <div className="py-3 px-3 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <span
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 300,
                      letterSpacing: '0.01em',
                    }}
                  >
                    App Ambience
                  </span>
                  <button
                    onClick={() => setAmbienceEnabled(!ambienceEnabled)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300"
                    style={{
                      background: ambienceEnabled ? 'var(--accent-soft)' : 'var(--accent-soft)',
                    }}
                  >
                    {ambienceEnabled ? (
                      <Volume2 size={14} style={{ color: 'var(--text-primary)', strokeWidth: 1.5 }} />
                    ) : (
                      <VolumeX size={14} style={{ color: 'var(--text-secondary)', strokeWidth: 1.5 }} />
                    )}
                    <span
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: ambienceEnabled ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '13px',
                        fontWeight: 300,
                      }}
                    >
                      {ambienceEnabled ? 'On' : 'Off'}
                    </span>
                  </button>
                </div>
                {ambienceEnabled && (
                  <div className="flex items-center gap-3 mt-2">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={ambienceVolume}
                      onChange={(e) => setAmbienceVolume(Number(e.target.value))}
                      className="flex-1 h-1 rounded-full appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, var(--text-secondary) 0%, var(--text-secondary) ${ambienceVolume}%, var(--accent-soft) ${ambienceVolume}%, var(--accent-soft) 100%)`,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: 'var(--text-secondary)',
                        fontSize: '12px',
                        fontWeight: 300,
                        width: '32px',
                        textAlign: 'right',
                      }}
                    >
                      {ambienceVolume}%
                    </span>
                  </div>
                )}
              </div>

              {/* Interface Theme */}
              <div className="py-3 px-3 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 300,
                      letterSpacing: '0.01em',
                    }}
                  >
                    Interface Theme
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTheme('day')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl transition-all duration-200"
                    style={{
                      background: theme === 'day' ? 'var(--accent-soft)' : 'var(--accent-soft)',
                      border: theme === 'day' ? '1.5px solid var(--border)' : '1.5px solid transparent',
                    }}
                  >
                    <Sun size={14} style={{ color: theme === 'day' ? 'var(--text-primary)' : 'var(--text-secondary)', strokeWidth: 1.5 }} />
                    <span
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: theme === 'day' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '13px',
                        fontWeight: theme === 'day' ? 400 : 300,
                      }}
                    >
                      Day
                    </span>
                  </button>
                  <button
                    onClick={() => setTheme('night')}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl transition-all duration-200"
                    style={{
                      background: theme === 'night' ? 'var(--accent-soft)' : 'var(--accent-soft)',
                      border: theme === 'night' ? '1.5px solid var(--border)' : '1.5px solid transparent',
                    }}
                  >
                    <Moon size={14} style={{ color: theme === 'night' ? 'var(--text-primary)' : 'var(--text-secondary)', strokeWidth: 1.5 }} />
                    <span
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: theme === 'night' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '13px',
                        fontWeight: theme === 'night' ? 400 : 300,
                      }}
                    >
                      Night
                    </span>
                  </button>
                </div>
                <p
                  className="mt-2"
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: 'var(--text-secondary)',
                    fontSize: '11px',
                    fontWeight: 300,
                    letterSpacing: '0.01em',
                    opacity: 0.85,
                  }}
                >
                  {theme === 'day' 
                    ? 'A light, soft palette designed to feel open, fresh, and steady.'
                    : 'A dimmed, grounding palette that reduces eye strain and supports evening reflection.'}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Section 3 — Privacy & Security */}
          <motion.div
            className="w-full rounded-[28px] p-6 mb-5 transition-all duration-200"
            style={{
              background: 'var(--card-alt)',
              boxShadow: `0 2px 16px var(--shadow)`,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <h3
              className="mb-4"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '15px',
                fontWeight: 400,
                color: 'var(--text-primary)',
                letterSpacing: '0.02em',
              }}
            >
              Privacy & Security
            </h3>

            <div className="space-y-1">
              <button
                className="w-full flex items-center justify-between py-3 px-3 rounded-xl transition-all duration-200 hover:bg-black/5"
              >
                <div className="flex items-center gap-3">
                  <Lock size={15} style={{ color: 'var(--text-secondary)', strokeWidth: 1.5 }} />
                  <span
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 300,
                      letterSpacing: '0.01em',
                    }}
                  >
                    Passcode / Face ID
                  </span>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-secondary)', strokeWidth: 1.5 }} />
              </button>

              <button
                className="w-full flex items-center justify-between py-3 px-3 rounded-xl transition-all duration-200 hover:bg-black/5"
              >
                <div className="flex items-center gap-3">
                  <Download size={15} style={{ color: 'var(--text-secondary)', strokeWidth: 1.5 }} />
                  <span
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 300,
                      letterSpacing: '0.01em',
                    }}
                  >
                    Export Entries
                  </span>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-secondary)', strokeWidth: 1.5 }} />
              </button>

              <button
                className="w-full flex items-center justify-between py-3 px-3 rounded-xl transition-all duration-200 hover:bg-black/5"
              >
                <div className="flex items-center gap-3">
                  <Download size={15} style={{ color: 'var(--text-secondary)', strokeWidth: 1.5 }} />
                  <span
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      fontWeight: 300,
                      letterSpacing: '0.01em',
                    }}
                  >
                    Download My Data
                  </span>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-secondary)', strokeWidth: 1.5 }} />
              </button>

              <button
                className="w-full flex items-center justify-between py-3 px-3 rounded-xl transition-all duration-200 hover:bg-black/5"
              >
                <div className="flex items-center gap-3">
                  <Trash2 size={15} style={{ color: 'var(--danger)', strokeWidth: 1.5 }} />
                  <span
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: 'var(--danger)',
                      fontSize: '14px',
                      fontWeight: 300,
                      letterSpacing: '0.01em',
                    }}
                  >
                    Delete Account
                  </span>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--danger)', strokeWidth: 1.5 }} />
              </button>
            </div>
          </motion.div>

          {/* Section 4 — About TRACE */}
          <motion.div
            className="w-full mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            <h3
              className="mb-4 px-3"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '15px',
                fontWeight: 400,
                color: 'var(--text-primary)',
                letterSpacing: '0.02em',
              }}
            >
              About TRACE
            </h3>

            <div className="space-y-1">
              <button
                onClick={() => setShowAboutTraceModal(true)}
                className="w-full flex items-center justify-between py-3 px-4 rounded-xl transition-all duration-200 hover:bg-black/5"
                style={{
                  background: 'var(--accent-soft)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: 300,
                    letterSpacing: '0.01em',
                  }}
                >
                  How TRACE Works
                </span>
                <ChevronRight size={16} style={{ color: 'var(--text-secondary)', strokeWidth: 1.5 }} />
              </button>

              <button
                onClick={onNavigateToTerms}
                className="w-full flex items-center justify-between py-3 px-4 rounded-xl transition-all duration-200 hover:bg-black/5"
                style={{
                  background: 'var(--accent-soft)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: 300,
                    letterSpacing: '0.01em',
                  }}
                >
                  Terms & Safety Commitment
                </span>
                <ChevronRight size={16} style={{ color: 'var(--text-secondary)', strokeWidth: 1.5 }} />
              </button>

              <button
                onClick={onNavigateToPrivacy}
                className="w-full flex items-center justify-between py-3 px-4 rounded-xl transition-all duration-200 hover:bg-black/5"
                style={{
                  background: 'var(--accent-soft)',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: 300,
                    letterSpacing: '0.01em',
                  }}
                >
                  Privacy & Your Data
                </span>
                <ChevronRight size={16} style={{ color: 'var(--text-secondary)', strokeWidth: 1.5 }} />
              </button>
            </div>
          </motion.div>

          {/* Gentle Reminder */}
          <motion.div
            className="px-3 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            <p
              className="text-center"
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '12px',
                fontWeight: 300,
                color: 'var(--text-secondary)',
                letterSpacing: '0.01em',
                opacity: 0.6,
                lineHeight: '1.5',
              }}
            >
              TRACE is a wellness companion, not a replacement for professional mental health care.
            </p>
          </motion.div>

          {/* Bottom spacing */}
          <div style={{ height: '20px' }} />
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        activeScreen="profile"
        variant="sage"
        onNavigateHome={onNavigateToChat}
        onNavigateActivities={onNavigateToActivities}
        onNavigateJournal={onNavigateToJournal}
        onNavigateProfile={() => {}}
        onNavigateHelp={onNavigateToHelp}
      />

      {/* Manage Plan Popup */}
      <AnimatePresence>
        {showManagePlanPopup && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowManagePlanPopup(false)}
            />
            <motion.div
              className="relative w-[85%] rounded-[24px] p-5"
              style={{
                background: '#F5F1EB',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                aspectRatio: '1 / 0.85',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <button
                className="absolute top-3 right-3 p-2 rounded-full hover:bg-black/5 transition-colors"
                onClick={() => setShowManagePlanPopup(false)}
              >
                <X size={18} style={{ color: '#8A7A6A' }} />
              </button>

              <h3
                className="text-center mt-4"
                style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '18px',
                  fontWeight: 400,
                  color: '#5A4A3A',
                  marginBottom: '6px',
                }}
              >
                Manage Plan
              </h3>
              <p
                className="text-center"
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '13px',
                  color: '#8A7A6A',
                  marginBottom: '20px',
                }}
              >
                Current plan: {currentPlanLabel}
              </p>

              <div className="space-y-3">
                {canUpgrade && (
                  <button
                    className="w-full py-3 px-4 rounded-xl transition-all duration-200 hover:opacity-90"
                    style={{
                      background: 'linear-gradient(135deg, #8A7A6A 0%, #6A5A4A 100%)',
                      boxShadow: '0 4px 12px rgba(138, 122, 106, 0.25)',
                    }}
                    onClick={handleUpgradePlan}
                  >
                    <span
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: '14px',
                        fontWeight: 400,
                        color: '#FFFFFF',
                      }}
                    >
                      Upgrade Plan
                    </span>
                  </button>
                )}

                {currentPlan !== 'light' && (
                  <button
                    className="w-full py-3 px-4 rounded-xl transition-all duration-200 hover:bg-black/5"
                    style={{
                      background: 'rgba(138, 122, 106, 0.08)',
                      border: '1px solid rgba(138, 122, 106, 0.15)',
                    }}
                    onClick={handleCancelPlan}
                  >
                    <span
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: '14px',
                        fontWeight: 400,
                        color: '#8A7A6A',
                      }}
                    >
                      Cancel Plan
                    </span>
                  </button>
                )}

                {currentPlan === 'light' && (
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '12px',
                      color: '#8A7A6A',
                      textAlign: 'center',
                      opacity: 0.7,
                    }}
                  >
                    You're on the free plan
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Apply Referral Code Popup */}
      <AnimatePresence>
        {showUpgradePromoPopup && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setShowUpgradePromoPopup(false);
                setPromoCode('');
                setPromoMessage('');
                setPromoApplied(false);
              }}
            />
            <motion.div
              className="relative w-[85%] rounded-[24px] p-5"
              style={{
                background: '#F5F1EB',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <button
                className="absolute top-3 right-3 p-2 rounded-full hover:bg-black/5 transition-colors"
                onClick={() => {
                  setShowUpgradePromoPopup(false);
                  setPromoCode('');
                  setPromoMessage('');
                  setPromoApplied(false);
                }}
              >
                <X size={18} style={{ color: '#8A7A6A' }} />
              </button>

              <h3
                className="text-center mt-4"
                style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '18px',
                  fontWeight: 400,
                  color: '#5A4A3A',
                  marginBottom: '16px',
                }}
              >
                Apply Referral Code
              </h3>

              <div>
                <p
                  className="text-center"
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '12px',
                    color: '#8A7A6A',
                    marginBottom: '14px',
                  }}
                >
                  Enter your referral code to unlock benefits
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter code"
                    className="flex-1 px-3 py-2.5 rounded-lg outline-none"
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '13px',
                      color: '#5A4A3A',
                      background: 'rgba(138, 122, 106, 0.08)',
                      border: '1px solid rgba(138, 122, 106, 0.15)',
                    }}
                  />
                  <button
                    className="px-4 py-2.5 rounded-lg transition-all duration-200 hover:opacity-90"
                    style={{
                      background: '#8A7A6A',
                    }}
                    onClick={handleApplyPromoCode}
                  >
                    <span
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: '13px',
                        color: '#FFFFFF',
                      }}
                    >
                      Apply
                    </span>
                  </button>
                </div>
                {promoMessage && (
                  <p
                    className="mt-3 text-center"
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '12px',
                      color: promoApplied ? '#6A8A6A' : '#A67A6A',
                    }}
                  >
                    {promoMessage}
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate A Referral Code Popup */}
      <AnimatePresence>
        {showReferralCodePopup && (
          <motion.div
            className="absolute inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowReferralCodePopup(false)}
            />
            <motion.div
              className="relative w-[85%] rounded-[24px] p-5"
              style={{
                background: '#F5F1EB',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <button
                className="absolute top-3 right-3 p-2 rounded-full hover:bg-black/5 transition-colors"
                onClick={() => setShowReferralCodePopup(false)}
              >
                <X size={18} style={{ color: '#8A7A6A' }} />
              </button>

              <h3
                className="text-center mt-4"
                style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '18px',
                  fontWeight: 400,
                  color: '#5A4A3A',
                  marginBottom: '6px',
                }}
              >
                Generate A Referral Code
              </h3>
              <p
                className="text-center"
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '12px',
                  color: '#8A7A6A',
                  marginBottom: '20px',
                  lineHeight: '1.5',
                }}
              >
                Share your code with friends. When they sign up, you both get 3 months free TRACE Studio access.
              </p>

              {generatedCode ? (
                <div className="space-y-3">
                  <div
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{
                      background: 'rgba(138, 122, 106, 0.08)',
                      border: '1px solid rgba(138, 122, 106, 0.15)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '16px',
                        fontWeight: 600,
                        color: '#5A4A3A',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {generatedCode}
                    </span>
                    <button
                      className="p-2 rounded-lg hover:bg-black/5 transition-colors"
                      onClick={handleCopyCode}
                    >
                      {codeCopied ? (
                        <Check size={16} style={{ color: '#6A8A6A' }} />
                      ) : (
                        <Copy size={16} style={{ color: '#8A7A6A' }} />
                      )}
                    </button>
                  </div>
                  {codeCopied && (
                    <p
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: '12px',
                        color: '#6A8A6A',
                        textAlign: 'center',
                      }}
                    >
                      Code copied to clipboard!
                    </p>
                  )}
                </div>
              ) : (
                <button
                  className="w-full py-3 px-4 rounded-xl transition-all duration-200 hover:opacity-90"
                  style={{
                    background: 'linear-gradient(135deg, #8A7A6A 0%, #6A5A4A 100%)',
                    boxShadow: '0 4px 12px rgba(138, 122, 106, 0.25)',
                  }}
                  onClick={handleGenerateReferralCode}
                >
                  <span
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '14px',
                      fontWeight: 400,
                      color: '#FFFFFF',
                    }}
                  >
                    Generate Code
                  </span>
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* About TRACE Modal */}
      <AboutTraceModal 
        isOpen={showAboutTraceModal} 
        onClose={() => setShowAboutTraceModal(false)} 
      />
    </div>
  );
}