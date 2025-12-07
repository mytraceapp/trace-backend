import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BottomNav } from './BottomNav';
import { patternsData, Pattern } from '../data/patterns';
import { usePlanTier } from '../hooks/usePlanTier';
import { useTheme } from '../state/ThemeContext';
import { fetchRecentMessagesForPatterns, PatternMessage, getCurrentUserId, saveLastHourStitch, getLastHourSummary, EmotionalStitch } from '../lib/messageService';
import { supabase } from '../lib/supabaseClient';

interface TracePatternsScreenProps {
  onViewFull?: () => void;
  onNavigateHome?: () => void;
  onNavigateToActivities?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToHelp?: () => void;
  onNavigateToJournal?: () => void;
}

interface PatternModalProps {
  pattern: Pattern | null;
  onClose: () => void;
  onViewFull?: () => void;
}

function PatternModal({ pattern, onClose, onViewFull }: PatternModalProps) {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'night';
  
  if (!pattern) return null;

  return (
    <AnimatePresence>
      {pattern && (
        <motion.div
          className="fixed z-50 flex items-center justify-center px-5"
          style={{ 
            top: '100px',
            left: 0,
            right: 0,
            bottom: '90px',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="fixed inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full max-w-[340px] rounded-[24px] flex flex-col"
            style={{
              backgroundColor: isDark ? 'rgba(38, 42, 38, 0.98)' : '#E9E2D8',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(43, 30, 21, 0.12)',
              boxShadow: isDark 
                ? '0 20px 60px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3)'
                : '0 20px 60px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1)',
              maxHeight: '100%',
              overflow: 'hidden',
            }}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <div className="p-5 pb-0 flex-shrink-0">
              <button
                onClick={onClose}
                className="flex items-center justify-center rounded-full transition-colors"
                style={{ 
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '32px',
                  height: '32px',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(90, 74, 58, 0.1)',
                  zIndex: 10,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M1 1L13 13M1 13L13 1"
                    stroke={isDark ? '#F2F0EC' : '#5A4A3A'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>

              <div style={{ paddingRight: '32px' }}>
                <h3
                  style={{
                    fontFamily: 'Playfair Display, Georgia, serif',
                    fontSize: '20px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    marginBottom: '4px',
                    letterSpacing: '0.01em',
                  }}
                >
                  {pattern.title}
                </h3>
                <p
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '12px',
                    fontWeight: 400,
                    color: 'var(--text-secondary)',
                    marginBottom: '12px',
                  }}
                >
                  {pattern.subtitle}
                </p>
              </div>

              {pattern.timeWindow && (
                <div
                  className="px-4 py-2.5 mb-3"
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    border: isDark ? '1px solid rgba(168, 179, 154, 0.2)' : '1px solid rgba(141, 161, 143, 0.2)',
                    borderRadius: '16px',
                  }}
                >
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                    }}
                  >
                  {pattern.timeWindow}
                </p>
              </div>
            )}
            </div>

            <div 
              className="flex-1 overflow-y-auto px-5"
              style={{
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '1px',
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(43, 30, 21, 0.1)',
                  marginBottom: '12px',
                }}
              />

              <div style={{ marginBottom: '14px' }}>
                <h4
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}
                >
                  What this means for you
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {pattern.insightBullets.map((bullet, index) => (
                    <li
                      key={index}
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: '13px',
                        fontWeight: 300,
                        color: 'var(--text-primary)',
                        lineHeight: '1.5',
                        marginBottom: '6px',
                        paddingLeft: '14px',
                        position: 'relative',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          color: 'var(--accent)',
                        }}
                      >
                        •
                      </span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <h4
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: '8px',
                  }}
                >
                  How to work with this pattern
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {pattern.suggestedActions.map((action, index) => (
                    <li
                      key={index}
                      style={{
                        fontFamily: 'Georgia, serif',
                        fontSize: '13px',
                        fontWeight: 300,
                        color: 'var(--text-primary)',
                        lineHeight: '1.5',
                        marginBottom: '6px',
                        paddingLeft: '14px',
                        position: 'relative',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          left: 0,
                          color: isDark ? '#C49A6C' : '#A9683A',
                        }}
                      >
                        →
                      </span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onViewFull?.();
                }}
                className="w-full mb-2 transition-all duration-200"
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '6px 0',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--accent)',
                    letterSpacing: '0.01em',
                  }}
                >
                  Open full weekly map →
                </span>
              </button>
            </div>

            <div className="p-5 pt-3 flex-shrink-0">
              <button
                onClick={onClose}
                className="w-full px-5 py-3 transition-all duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#D7C8B5',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(43, 30, 21, 0.1)',
                  borderRadius: '20px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'var(--text-primary)',
                    letterSpacing: '0.02em',
                  }}
                >
                  Done
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function UpsellModal({ isOpen, onClose }: UpsellModalProps) {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'night';
  
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full max-w-[320px] rounded-[24px] p-6"
            style={{
              backgroundColor: isDark ? 'rgba(38, 42, 38, 0.95)' : '#E9E2D8',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(43, 30, 21, 0.12)',
              boxShadow: isDark 
                ? '0 20px 60px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3)'
                : '0 20px 60px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1)',
            }}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-full transition-colors"
              style={{ 
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(90, 74, 58, 0.1)' 
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 1L13 13M1 13L13 1"
                  stroke={isDark ? '#F2F0EC' : '#5A4A3A'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--accent-soft)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h3
              style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: '20px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '12px',
                letterSpacing: '0.01em',
                paddingRight: '32px',
              }}
            >
              Unlock Your Full Rhythm
            </h3>

            <p
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '15px',
                fontWeight: 300,
                color: 'var(--text-primary)',
                lineHeight: '1.65',
                marginBottom: '24px',
              }}
            >
              This pattern deep dive lives in TRACE Studio. Upgrade to unlock your full rhythm map and discover the nuances of your emotional landscape.
            </p>

            <button
              onClick={() => {
                console.log('Upgrade clicked - integrate with payment flow');
                onClose();
              }}
              className="w-full px-6 py-4 transition-all duration-200 active:scale-[0.98] mb-3"
              style={{
                backgroundColor: 'var(--accent)',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(43, 30, 21, 0.1)',
                borderRadius: '20px',
              }}
            >
              <span
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  letterSpacing: '0.02em',
                }}
              >
                Upgrade to Studio
              </span>
            </button>

            <button
              onClick={onClose}
              className="w-full transition-all duration-200"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '8px 0',
              }}
            >
              <span
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: 'var(--text-secondary)',
                }}
              >
                Maybe later
              </span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function WeeklyRhythmInfoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'night';
  
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full max-w-[320px] rounded-[24px] p-6"
            style={{
              backgroundColor: isDark ? 'rgba(38, 42, 38, 0.98)' : '#E9E2D8',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(43, 30, 21, 0.12)',
              boxShadow: isDark 
                ? '0 20px 60px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.3)'
                : '0 20px 60px rgba(0,0,0,0.15), 0 8px 24px rgba(0,0,0,0.1)',
            }}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-full transition-colors"
              style={{ 
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(90, 74, 58, 0.1)' 
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 1L13 13M1 13L13 1"
                  stroke={isDark ? '#F2F0EC' : '#5A4A3A'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div
              className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--accent-soft)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 12h4l3-9 4 18 3-9h4"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h3
              style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: '20px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '16px',
                letterSpacing: '0.01em',
                paddingRight: '32px',
              }}
            >
              Weekly Rhythm Map
            </h3>

            <div className="space-y-4">
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '14px',
                  fontWeight: 300,
                  color: 'var(--text-primary)',
                  lineHeight: '1.7',
                }}
              >
                The Weekly Rhythm Map reflects how your emotional or behavioral energy moves through the week.
              </p>
              
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '14px',
                  fontWeight: 300,
                  color: 'var(--text-primary)',
                  lineHeight: '1.7',
                }}
              >
                Small rises might mean clarity or ease. Dips may show stress, fatigue, or recovery time.
              </p>
              
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '14px',
                  fontWeight: 300,
                  color: 'var(--text-primary)',
                  lineHeight: '1.7',
                }}
              >
                Patterns that repeat on similar days help you understand your natural rhythm — not fix it.
              </p>
              
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: 'var(--text-secondary)',
                  lineHeight: '1.7',
                  fontStyle: 'italic',
                }}
              >
                It's simply awareness, not evaluation.
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-full px-5 py-3 mt-6 transition-all duration-200 active:scale-[0.98]"
              style={{
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#D7C8B5',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(43, 30, 21, 0.1)',
                borderRadius: '20px',
              }}
            >
              <span
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.02em',
                }}
              >
                Got it
              </span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Soft whisper helper - chooses gentle journaling invitation based on emotional data
type LastHourSummaryType = {
  total: number;
  calm: number;
  flat: number;
  heavy: number;
  anxious: number;
  avgIntensity: number;
  arc: "softening" | "rising" | "steady" | null;
};

function getJournalingWhisper(
  lastHourSummary: LastHourSummaryType | null,
  weeklyStitches: EmotionalStitch[]
): string | null {
  // No data = no whisper
  if (!lastHourSummary && weeklyStitches.length === 0) return null;

  const arc = lastHourSummary?.arc ?? null;
  const avgIntensity = lastHourSummary?.avgIntensity ?? 0;
  const total = lastHourSummary?.total ?? 0;

  const todayStitch = weeklyStitches.find(
    (s) => s.summary_date === new Date().toISOString().slice(0, 10)
  );

  const todayIsHeavyish =
    !!todayStitch &&
    todayStitch.total > 0 &&
    (todayStitch.heavy + todayStitch.anxious) / todayStitch.total >= 0.4;

  const hasHeavyDayThisWeek = weeklyStitches.some(
    (s) =>
      s.total > 0 &&
      (s.heavy + s.anxious) / s.total >= 0.5
  );

  let options: string[] = [];

  if (todayIsHeavyish || (total >= 3 && (arc === "rising" || avgIntensity >= 3))) {
    options = [
      "If any of this still feels alive in you, we can gently write a few lines about it together. No pressure to fix it — just giving it language.",
      "If your heart feels full or stretched, it might help to let a few sentences land somewhere safe. I can hold space while you write.",
    ];
  } else if (arc === "softening" || (todayStitch && todayStitch.arc === "softening")) {
    options = [
      "It seemed like things eased a little over time. If you'd like, we can capture what helped you soften, so you can return to it later.",
      "As the day unwinds, we can write down a few small things that brought you even a little bit of relief.",
    ];
  } else if (hasHeavyDayThisWeek) {
    options = [
      "If that heavier day still echoes a bit, we can gently name what it held — just a few lines, in your own words, at your own pace.",
    ];
  } else {
    // Steady/neutral week
    options = [
      "Steady seasons matter too. If you want, we can jot down a few quiet details about what's been sustaining you lately.",
      "If things have felt neutral or steady, we can still trace what's been quietly supporting you underneath it all.",
    ];
  }

  if (options.length === 0) return null;
  return options[Math.floor(Math.random() * options.length)];
}

export function TracePatternsScreen({ onViewFull, onNavigateHome, onNavigateToActivities, onNavigateToProfile, onNavigateToHelp, onNavigateToJournal }: TracePatternsScreenProps) {
  const [activePattern, setActivePattern] = useState<Pattern | null>(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const [showWeeklyRhythmInfo, setShowWeeklyRhythmInfo] = useState(false);
  const { canAccessPattern } = usePlanTier();
  
  const [patternMessages, setPatternMessages] = useState<PatternMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  
  // Emotional summary data
  type HourSummary = {
    total: number;
    calm: number;
    flat: number;
    heavy: number;
    anxious: number;
    avgIntensity: number;
    arc: "softening" | "rising" | "steady" | null;
  };
  const [lastHourSummary, setLastHourSummary] = useState<HourSummary | null>(null);
  const [weeklyStitches, setWeeklyStitches] = useState<EmotionalStitch[]>([]);

  useEffect(() => {
    const loadMessages = async () => {
      setIsLoadingMessages(true);
      const userId = await getCurrentUserId();
      if (userId) {
        const msgs = await fetchRecentMessagesForPatterns(userId, 60);
        setPatternMessages(msgs);
      }
      setIsLoadingMessages(false);
    };
    loadMessages();
  }, []);

  // Update daily emotional stitch and fetch summaries on mount
  useEffect(() => {
    let cancelled = false;

    async function runStitchAndFetch() {
      try {
        const userId = await getCurrentUserId();
        if (!userId || cancelled) return;

        // Update stitch first
        await saveLastHourStitch(userId);
        if (!cancelled) {
          console.log("TRACE: Stitch updated for Patterns view");
        }

        // Fetch last-hour summary
        const summary = await getLastHourSummary(userId);
        if (!cancelled) {
          setLastHourSummary(summary);
        }

        // Fetch last 7 daily stitches
        const { data: stitches, error: stitchError } = await supabase
          .from("emotional_stitches")
          .select("*")
          .eq("user_id", userId)
          .order("summary_date", { ascending: false })
          .limit(7);

        if (!cancelled) {
          if (stitchError) {
            console.error("TRACE/weeklyStitches ❌", stitchError);
          } else if (stitches) {
            setWeeklyStitches(stitches as EmotionalStitch[]);
          }
        }
      } catch (err) {
        console.error("TRACE/Patterns stitch ❌", err);
      }
    }

    runStitchAndFetch();
    return () => { cancelled = true; };
  }, []);

  const totalMessages = patternMessages.length;
  const emotionCounts = { calm: 0, flat: 0, heavy: 0, anxious: 0 };
  patternMessages.forEach((msg) => {
    const e = msg.emotion?.toLowerCase() || 'flat';
    if (e in emotionCounts) {
      emotionCounts[e as keyof typeof emotionCounts]++;
    } else {
      emotionCounts.flat++;
    }
  });

  const calmPercent = totalMessages > 0 ? Math.round((emotionCounts.calm / totalMessages) * 100) : 0;
  const flatPercent = totalMessages > 0 ? Math.round((emotionCounts.flat / totalMessages) * 100) : 0;
  const heavyPercent = totalMessages > 0 ? Math.round((emotionCounts.heavy / totalMessages) * 100) : 0;
  const anxiousPercent = totalMessages > 0 ? Math.round((emotionCounts.anxious / totalMessages) * 100) : 0;

  const getInsightSentence = () => {
    if (emotionCounts.heavy > 0 || emotionCounts.anxious > 0) {
      return "It seemed like there were a few heavier moments — that's okay. Thank you for letting TRACE hold them with you.";
    } else if (emotionCounts.calm > emotionCounts.flat) {
      return "Overall, things appeared mostly steady and calm.";
    } else {
      return "Your tone seemed fairly neutral — TRACE is here whenever you need more space.";
    }
  };

  // Compute weekly rhythm direction from stitches
  const getWeeklyDirection = (): "softening" | "rising" | "steady" | null => {
    if (weeklyStitches.length < 3) return null;
    
    // Sort by date ascending for proper comparison
    const sorted = [...weeklyStitches].sort((a, b) => 
      a.summary_date.localeCompare(b.summary_date)
    );
    
    // Get first 2 and last 2 days
    const firstTwo = sorted.slice(0, 2);
    const lastTwo = sorted.slice(-2);
    
    const avgIntensity = (arr: EmotionalStitch[]) => {
      if (arr.length === 0) return 2;
      const sum = arr.reduce((acc, s) => acc + (s.avg_intensity ?? 2), 0);
      return sum / arr.length;
    };
    
    const startAvg = avgIntensity(firstTwo);
    const endAvg = avgIntensity(lastTwo);
    
    if (endAvg <= startAvg - 0.5) {
      return "softening";
    } else if (endAvg >= startAvg + 0.5) {
      return "rising";
    } else {
      return "steady";
    }
  };
  
  const weeklyDirection = getWeeklyDirection();

  // Find the heaviest day from weekly stitches
  const getHeaviestDay = (): { dayName: string; date: string } | null => {
    if (weeklyStitches.length === 0) return null;
    
    let heaviestStitch: EmotionalStitch | null = null;
    let highestScore = 0;
    
    for (const stitch of weeklyStitches) {
      const total = stitch.total || 1;
      const heavyRatio = ((stitch.heavy ?? 0) + (stitch.anxious ?? 0)) / total;
      const intensity = stitch.avg_intensity ?? 0;
      const score = heavyRatio * 10 + intensity;
      
      if (score > highestScore) {
        highestScore = score;
        heaviestStitch = stitch;
      }
    }
    
    if (!heaviestStitch || highestScore < 2) return null;
    
    const date = new Date(heaviestStitch.summary_date + "T12:00:00");
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    return { dayName, date: heaviestStitch.summary_date };
  };
  
  const heaviestDay = getHeaviestDay();

  const handlePatternClick = (pattern: Pattern) => {
    if (canAccessPattern(pattern.requiredTier)) {
      setActivePattern(pattern);
    } else {
      setShowUpsell(true);
    }
  };

  const peakWindowPattern = patternsData.find(p => p.key === 'peakWindow');
  const energyTidesPattern = patternsData.find(p => p.key === 'energyTides');
  const stressEchoesPattern = patternsData.find(p => p.key === 'stressEchoes');
  // Generate warm bronze-sage hybrid orb swirls
  const generateHybridSwirls = () => {
    const swirls = [];
    const centerX = 160;
    const centerY = 160;
    
    const colors = [
      { r: 169, g: 104, b: 58, opacity: 0.08 }, // soft bronze
      { r: 141, g: 161, b: 143, opacity: 0.1 }, // sage
      { r: 165, g: 132, b: 107, opacity: 0.06 }, // clay
      { r: 215, g: 200, b: 181, opacity: 0.08 }, // sand
      { r: 200, g: 218, b: 215, opacity: 0.07 }, // sage-light
    ];
    
    for (let i = 0; i < 45; i++) {
      const angle = (i * 137.5) % 360;
      const radius = 18 + (i % 15) * 6;
      const sweep = 110 + (i % 10) * 20;
      
      const startAngle = angle + (i % 8) * 3;
      const endAngle = startAngle + sweep;
      const midAngle = startAngle + sweep / 2;
      
      const x1 = centerX + Math.cos((startAngle * Math.PI) / 180) * radius;
      const y1 = centerY + Math.sin((startAngle * Math.PI) / 180) * radius;
      
      const curvature = radius * 1.3 + (i % 5) * 3;
      const x2 = centerX + Math.cos((midAngle * Math.PI) / 180) * curvature;
      const y2 = centerY + Math.sin((midAngle * Math.PI) / 180) * curvature;
      
      const x3 = centerX + Math.cos((endAngle * Math.PI) / 180) * radius;
      const y3 = centerY + Math.sin((endAngle * Math.PI) / 180) * radius;
      
      const pathD = `M ${x1} ${y1} Q ${x2} ${y2}, ${x3} ${y3}`;
      
      const colorIndex = i % colors.length;
      const color = colors[colorIndex];
      
      const strokeWidth = 5 + (i % 8) * 2;
      const blur = 2.5 + (i % 4) * 1.2;
      const duration = 70 + (i % 35);
      const direction = i % 2 === 0 ? [0, 360] : [360, 0];
      
      swirls.push(
        <motion.svg
          key={`swirl-${i}`}
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 320 320"
          animate={{
            rotate: direction,
            opacity: [color.opacity * 0.6, color.opacity, color.opacity * 0.6],
          }}
          transition={{
            rotate: { duration, repeat: Infinity, ease: "linear" },
            opacity: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <path
            d={pathD}
            fill="none"
            stroke={`rgba(${color.r}, ${color.g}, ${color.b}, ${color.opacity})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ filter: `blur(${blur}px)` }}
          />
        </motion.svg>
      );
    }
    
    return swirls;
  };

  // Generate liquid light swirls inside the orb
  const generateLiquidSwirls = () => {
    const swirls = [];
    const centerX = 100;
    const centerY = 100;
    
    const colors = [
      { r: 169, g: 104, b: 58, opacity: 0.08 }, // soft bronze
      { r: 141, g: 161, b: 143, opacity: 0.1 }, // sage
      { r: 165, g: 132, b: 107, opacity: 0.06 }, // clay
      { r: 215, g: 200, b: 181, opacity: 0.08 }, // sand
      { r: 200, g: 218, b: 215, opacity: 0.07 }, // sage-light
    ];
    
    for (let i = 0; i < 30; i++) {
      const angle = (i * 137.5) % 360;
      const radius = 18 + (i % 15) * 6;
      const sweep = 110 + (i % 10) * 20;
      
      const startAngle = angle + (i % 8) * 3;
      const endAngle = startAngle + sweep;
      const midAngle = startAngle + sweep / 2;
      
      const x1 = centerX + Math.cos((startAngle * Math.PI) / 180) * radius;
      const y1 = centerY + Math.sin((startAngle * Math.PI) / 180) * radius;
      
      const curvature = radius * 1.3 + (i % 5) * 3;
      const x2 = centerX + Math.cos((midAngle * Math.PI) / 180) * curvature;
      const y2 = centerY + Math.sin((midAngle * Math.PI) / 180) * curvature;
      
      const x3 = centerX + Math.cos((endAngle * Math.PI) / 180) * radius;
      const y3 = centerY + Math.sin((endAngle * Math.PI) / 180) * radius;
      
      const pathD = `M ${x1} ${y1} Q ${x2} ${y2}, ${x3} ${y3}`;
      
      const colorIndex = i % colors.length;
      const color = colors[colorIndex];
      
      const strokeWidth = 5 + (i % 8) * 2;
      const blur = 2.5 + (i % 4) * 1.2;
      const duration = 70 + (i % 35);
      const direction = i % 2 === 0 ? [0, 360] : [360, 0];
      
      swirls.push(
        <motion.svg
          key={`swirl-${i}`}
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 320 320"
          animate={{
            rotate: direction,
            opacity: [color.opacity * 0.6, color.opacity, color.opacity * 0.6],
          }}
          transition={{
            rotate: { duration, repeat: Infinity, ease: "linear" },
            opacity: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <path
            d={pathD}
            fill="none"
            stroke={`rgba(${color.r}, ${color.g}, ${color.b}, ${color.opacity})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ filter: `blur(${blur}px)` }}
          />
        </motion.svg>
      );
    }
    
    return swirls;
  };

  // Generate smoke particles for diffusion
  const generateSmokeParticles = () => {
    const particles = [];
    const centerX = 100;
    const centerY = 100;
    
    const colors = [
      { r: 255, g: 255, b: 255, opacity: 0.08 }, // white
      { r: 255, g: 255, b: 255, opacity: 0.1 }, // white
      { r: 255, g: 255, b: 255, opacity: 0.06 }, // white
      { r: 255, g: 255, b: 255, opacity: 0.08 }, // white
      { r: 255, g: 255, b: 255, opacity: 0.07 }, // white
    ];
    
    for (let i = 0; i < 20; i++) {
      const angle = (i * 137.5) % 360;
      const radius = 18 + (i % 15) * 6;
      const sweep = 110 + (i % 10) * 20;
      
      const startAngle = angle + (i % 8) * 3;
      const endAngle = startAngle + sweep;
      const midAngle = startAngle + sweep / 2;
      
      const x1 = centerX + Math.cos((startAngle * Math.PI) / 180) * radius;
      const y1 = centerY + Math.sin((startAngle * Math.PI) / 180) * radius;
      
      const curvature = radius * 1.3 + (i % 5) * 3;
      const x2 = centerX + Math.cos((midAngle * Math.PI) / 180) * curvature;
      const y2 = centerY + Math.sin((midAngle * Math.PI) / 180) * curvature;
      
      const x3 = centerX + Math.cos((endAngle * Math.PI) / 180) * radius;
      const y3 = centerY + Math.sin((endAngle * Math.PI) / 180) * radius;
      
      const pathD = `M ${x1} ${y1} Q ${x2} ${y2}, ${x3} ${y3}`;
      
      const colorIndex = i % colors.length;
      const color = colors[colorIndex];
      
      const strokeWidth = 5 + (i % 8) * 2;
      const blur = 2.5 + (i % 4) * 1.2;
      const duration = 70 + (i % 35);
      const direction = i % 2 === 0 ? [0, 360] : [360, 0];
      
      particles.push(
        <motion.svg
          key={`particle-${i}`}
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 320 320"
          animate={{
            rotate: direction,
            opacity: [color.opacity * 0.6, color.opacity, color.opacity * 0.6],
          }}
          transition={{
            rotate: { duration, repeat: Infinity, ease: "linear" },
            opacity: { duration: 6, repeat: Infinity, ease: "easeInOut" },
          }}
        >
          <path
            d={pathD}
            fill="none"
            stroke={`rgba(${color.r}, ${color.g}, ${color.b}, ${color.opacity})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{ filter: `blur(${blur}px)` }}
          />
        </motion.svg>
      );
    }
    
    return particles;
  };

  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'night';

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: 'transparent' }}>
      {/* Math notebook grid overlay - day mode */}
      {!isDark && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.25]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 24 0 L 0 0 0 24' fill='none' stroke='%238DA18F' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: '24px 24px',
            backgroundRepeat: 'repeat',
            zIndex: -1,
          }}
        />
      )}
      
      {/* Math notebook grid overlay - night mode */}
      {isDark && (
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.10]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 24 0 L 0 0 0 24' fill='none' stroke='%232D3A2A' stroke-width='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: '24px 24px',
            backgroundRepeat: 'repeat',
            zIndex: -1,
          }}
        />
      )}

      {/* Soft vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark 
            ? 'radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.1) 100%)'
            : 'radial-gradient(circle at center, transparent 0%, rgba(75, 75, 75, 0.05) 100%)',
        }}
      />

      {/* TRACE Brand Name - fixed position below camera earpiece, matching Journal */}
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
          {/* Header with Orb Below */}
          <div className="relative w-full">
            {/* Title Section - compact spacing */}
            <motion.div
              className="relative z-10 text-center space-y-2 pt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }}
            >
              <h2
                style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '32px',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  color: 'var(--text-primary)',
                }}
              >
                PATTERNS™
              </h2>
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '14px',
                  fontWeight: 300,
                  letterSpacing: '0.03em',
                  color: 'var(--text-secondary)',
                }}
              >
                Your weekly rhythm, quietly mapped.
              </p>
            </motion.div>

            {/* Original TRACE Orb - positioned right below subheader */}
            <div className="w-full flex justify-center pt-8 pb-4">
              <motion.div
                className="relative w-[150px] h-[150px]"
                initial={{ y: 600, opacity: 0 }}
                animate={{
                  y: 0,
                  opacity: 1,
                  scale: [0.98, 1.02, 0.98],
                }}
                transition={{
                  y: { duration: 2.5, ease: [0.22, 0.61, 0.36, 1] },
                  opacity: { duration: 2, ease: "easeOut" },
                  scale: {
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2.5,
                  },
                }}
              >
                {/* Solid background circle to mask grid */}
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    backgroundColor: isDark ? '#0E0F0D' : '#F5F1EB',
                  }}
                />
                {/* Faint glowing halo around orb */}
                <motion.div
                  className="absolute inset-[-60px] rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(141,161,143,0.18) 0%, rgba(141,161,143,0.1) 25%, rgba(169,104,58,0.08) 40%, transparent 65%)',
                    filter: 'blur(40px)',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{
                    scale: [0.95, 1.05, 0.95],
                    opacity: [0.3, 0.45, 0.3],
                  }}
                  transition={{
                    scale: {
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 2.5,
                    },
                    opacity: {
                      duration: 5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 2.5,
                    },
                  }}
                />

                {/* Secondary halo layer */}
                <motion.div
                  className="absolute inset-[-80px] rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(169,104,58,0.12) 0%, rgba(141,161,143,0.08) 30%, transparent 55%)',
                    filter: 'blur(50px)',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.2, 0.35, 0.2],
                  }}
                  transition={{
                    scale: {
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 2.7,
                    },
                    opacity: {
                      duration: 6,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 2.7,
                    },
                  }}
                />

                {/* Main orb body - translucent with sage/bronze blend */}
                <div 
                  className="absolute inset-0 rounded-full overflow-hidden" 
                  style={{
                    background: 'radial-gradient(circle at 45% 35%, rgba(215,200,181,0.4) 0%, rgba(200,218,215,0.35) 20%, rgba(141,161,143,0.3) 40%, rgba(169,104,58,0.2) 60%, rgba(125,93,71,0.15) 80%, transparent 100%)',
                    boxShadow: '0 10px 40px rgba(141,161,143,0.25)',
                  }}
                >
                  {/* Liquid light swirls inside */}
                  {generateLiquidSwirls()}

                  {/* White smoke diffusion spreading outward */}
                  <div className="absolute inset-0">
                    {generateSmokeParticles()}
                  </div>

                  {/* Soft inner core glow */}
                  <motion.div
                    className="absolute inset-[30%] rounded-full"
                    style={{
                      background: 'radial-gradient(circle, rgba(215,200,181,0.5) 0%, rgba(200,218,215,0.3) 40%, transparent 70%)',
                      filter: 'blur(15px)',
                    }}
                    animate={{
                      scale: [0.9, 1.1, 0.9],
                      opacity: [0.4, 0.6, 0.4],
                    }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />

                  {/* Gentle shimmer overlay */}
                  <motion.div
                    className="absolute inset-[20%] rounded-full"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(141,161,143,0.15) 100%)',
                      filter: 'blur(8px)',
                    }}
                    animate={{
                      rotate: [0, 360],
                      opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                      rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                      opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" },
                    }}
                  />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Last Hour Emotion Summary */}
          <motion.section
            className="w-full space-y-3 pt-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <div
              className="rounded-[18px] p-5"
              style={{
                backgroundColor: isDark ? 'rgba(14, 15, 13, 0.95)' : 'rgba(233, 226, 216, 0.98)',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(43, 30, 21, 0.08)',
              }}
            >
              <h2
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '6px',
                }}
              >
                Last hour with TRACE
              </h2>
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '12px',
                  fontWeight: 300,
                  color: 'var(--text-secondary)',
                  lineHeight: 1.5,
                }}
              >
                {isLoadingMessages
                  ? "Gathering your last hour with TRACE..."
                  : totalMessages === 0
                  ? "No recent chat to reflect on yet. When you talk with TRACE, this space will gently summarize how you've been feeling."
                  : `TRACE reflected on ${totalMessages} message${totalMessages === 1 ? "" : "s"} in the last hour.`}
              </p>
            </div>

            {!isLoadingMessages && totalMessages > 0 && (
              <div
                className="rounded-[18px] p-5 space-y-3"
                style={{
                  backgroundColor: isDark ? 'rgba(14, 15, 13, 0.95)' : 'rgba(233, 226, 216, 0.98)',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(43, 30, 21, 0.08)',
                }}
              >
                <h3
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                  }}
                >
                  Emotional tone (last 60 minutes)
                </h3>
                <ul
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '12px',
                    fontWeight: 300,
                    color: 'var(--text-secondary)',
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                  }}
                  className="space-y-1"
                >
                  <li>Calm: {calmPercent}%</li>
                  <li>Flat: {flatPercent}%</li>
                  <li>Heavy: {heavyPercent}%</li>
                  <li>Anxious: {anxiousPercent}%</li>
                </ul>
                <p
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '12px',
                    fontWeight: 300,
                    fontStyle: 'italic',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    paddingTop: '4px',
                  }}
                >
                  {getInsightSentence()}
                </p>
              </div>
            )}

            {!isLoadingMessages && lastHourSummary && lastHourSummary.total > 0 && lastHourSummary.arc && (
              <div
                className="rounded-[18px] p-5"
                style={{
                  backgroundColor: isDark ? 'rgba(14, 15, 13, 0.95)' : 'rgba(233, 226, 216, 0.98)',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(43, 30, 21, 0.08)',
                }}
              >
                <h3
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '6px',
                  }}
                >
                  Emotional arc
                </h3>
                <p
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '12px',
                    fontWeight: 300,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {lastHourSummary.arc === "softening" && "Things seemed to feel a bit intense at first, and appeared to soften toward the end."}
                  {lastHourSummary.arc === "rising" && "It felt like things became a little more activated toward the end of this hour."}
                  {lastHourSummary.arc === "steady" && "Your emotional rhythm seemed fairly steady this hour — at your own pace."}
                </p>
              </div>
            )}
          </motion.section>

          {/* Pattern Cards - generous vertical spacing */}
          <motion.div
            className="space-y-5 pt-4 w-full"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.2 }}
          >
            {/* Card 1: Peak Window */}
            <motion.div
              className="rounded-[22px] p-6 cursor-pointer relative"
              style={{
                backgroundColor: isDark ? 'rgba(14, 15, 13, 0.95)' : '#D7C8B5',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(43, 30, 21, 0.1)',
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.01)',
              }}
              onClick={() => peakWindowPattern && handlePatternClick(peakWindowPattern)}
              whileTap={{ scale: 0.98 }}
              whileHover={{ boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.25)' : '0 4px 12px rgba(0,0,0,0.06)' }}
            >
              {peakWindowPattern?.tag && (
                <span
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    fontFamily: 'Georgia, serif',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'var(--accent)',
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                  }}
                >
                  {peakWindowPattern.tag}
                </span>
              )}
              <h3
                style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '17px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  marginBottom: '6px',
                  letterSpacing: '0.01em',
                }}
              >
                {peakWindowPattern?.title || 'Peak Window'}
              </h3>
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '13px',
                  fontWeight: 300,
                  color: 'var(--text-primary)',
                  lineHeight: '1.5',
                  marginBottom: '14px',
                }}
              >
                {peakWindowPattern?.timeWindow ? `Your clarity gathers at ${peakWindowPattern.timeWindow}` : peakWindowPattern?.subtitle}
              </p>
              {/* Soft brown wavy line */}
              <svg width="100%" height="28" viewBox="0 0 200 28">
                <motion.path
                  d="M 10 18 Q 50 10, 100 12 T 190 16"
                  fill="none"
                  stroke="#A5846B"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.6 }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                />
              </svg>
            </motion.div>

            {/* Card 2: Energy Tides */}
            <motion.div
              className="rounded-[22px] p-6 cursor-pointer relative"
              style={{
                backgroundColor: isDark ? 'rgba(14, 15, 13, 0.95)' : '#D7C8B5',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(43, 30, 21, 0.1)',
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.01)',
              }}
              onClick={() => energyTidesPattern && handlePatternClick(energyTidesPattern)}
              whileTap={{ scale: 0.98 }}
              whileHover={{ boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.25)' : '0 4px 12px rgba(0,0,0,0.06)' }}
            >
              {energyTidesPattern?.tag && (
                <span
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    fontFamily: 'Georgia, serif',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'var(--accent)',
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                  }}
                >
                  {energyTidesPattern.tag}
                </span>
              )}
              <h3
                style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '17px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  marginBottom: '6px',
                  letterSpacing: '0.01em',
                }}
              >
                {energyTidesPattern?.title || 'Energy Tides'}
              </h3>
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '13px',
                  fontWeight: 300,
                  color: 'var(--text-primary)',
                  lineHeight: '1.5',
                  marginBottom: '14px',
                }}
              >
                {energyTidesPattern?.subtitle || 'Midweek dips, weekend rise.'}
              </p>
              {/* Sage wave rhythm line */}
              <svg width="100%" height="28" viewBox="0 0 200 28">
                <motion.path
                  d="M 10 14 Q 30 9, 50 14 T 90 14 Q 110 9, 130 14 T 190 14"
                  fill="none"
                  stroke="#8DA18F"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.6 }}
                  transition={{ duration: 1.5, delay: 0.7 }}
                />
              </svg>
            </motion.div>

            {/* Card 3: Stress Echoes */}
            <motion.div
              className="rounded-[22px] p-6 cursor-pointer relative"
              style={{
                backgroundColor: isDark ? 'rgba(14, 15, 13, 0.95)' : '#D7C8B5',
                border: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(43, 30, 21, 0.1)',
                boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.01)',
              }}
              onClick={() => stressEchoesPattern && handlePatternClick(stressEchoesPattern)}
              whileTap={{ scale: 0.98 }}
              whileHover={{ boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.25)' : '0 4px 12px rgba(0,0,0,0.06)' }}
            >
              {stressEchoesPattern && !canAccessPattern(stressEchoesPattern.requiredTier) ? (
                <span
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    fontFamily: 'Georgia, serif',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: isDark ? '#C49A6C' : '#A9683A',
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                      stroke={isDark ? '#C49A6C' : '#A9683A'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Deep
                </span>
              ) : stressEchoesPattern?.tag && (
                <span
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    fontFamily: 'Georgia, serif',
                    fontSize: '10px',
                    fontWeight: 500,
                    color: 'var(--accent)',
                    letterSpacing: '0.03em',
                    textTransform: 'uppercase',
                  }}
                >
                  {stressEchoesPattern.tag}
                </span>
              )}
              <h3
                style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '17px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  marginBottom: '6px',
                  letterSpacing: '0.01em',
                }}
              >
                {stressEchoesPattern?.title || 'Stress Echoes'}
              </h3>
              <p
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '13px',
                  fontWeight: 300,
                  color: 'var(--text-primary)',
                  lineHeight: '1.5',
                  marginBottom: '14px',
                }}
              >
                {heaviestDay 
                  ? `This week, ${heaviestDay.dayName} seemed to feel a bit heavier than other days. If any part of that still resonates, TRACE is here — you don't have to unpack anything unless you want to.`
                  : weeklyStitches.length > 0
                    ? "Your week appeared fairly balanced — no single day stood out as notably heavier."
                    : "TRACE is still gathering enough moments to notice what patterns might be there. Keep checking in whenever feels right."
                }
              </p>
              {/* Faint bronze ripple */}
              <svg width="100%" height="28" viewBox="0 0 200 28">
                <motion.circle
                  cx="100"
                  cy="14"
                  r="6"
                  fill="none"
                  stroke="#A9683A"
                  strokeWidth="1"
                  initial={{ r: 6, opacity: 0.6 }}
                  animate={{ r: 16, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.circle
                  cx="100"
                  cy="14"
                  r="6"
                  fill="none"
                  stroke="#A9683A"
                  strokeWidth="1"
                  initial={{ r: 6, opacity: 0.6 }}
                  animate={{ r: 16, opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
                />
              </svg>
            </motion.div>
          </motion.div>

          {/* Rhythm Map Section */}
          <motion.div
            className="rounded-[22px] p-6 mt-8"
            style={{
              backgroundColor: isDark ? 'rgba(14, 15, 13, 0.95)' : '#E9E2D8',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(43, 30, 21, 0.08)',
              boxShadow: isDark ? '0 3px 12px rgba(0,0,0,0.1)' : '0 3px 12px rgba(0,0,0,0.02)',
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-5">
              <p
                style={{
                  fontFamily: 'Playfair Display, Georgia, serif',
                  fontSize: '12px',
                  fontWeight: 400,
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.04em',
                }}
              >
                Weekly Rhythm Map
              </p>
              <button
                onClick={() => setShowWeeklyRhythmInfo(true)}
                className="flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
                style={{
                  width: '22px',
                  height: '22px',
                  backgroundColor: 'var(--accent-soft)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="var(--text-secondary)" strokeWidth="1.5" />
                  <path d="M12 16v-4M12 8h.01" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            
            {/* Minimalist Graph */}
            <svg width="100%" height="110" viewBox="0 0 300 110">
              {/* Very subtle grid lines */}
              <line x1="20" y1="90" x2="280" y2="90" stroke="#A5846B" strokeWidth="0.5" opacity="0.15" />
              <line x1="20" y1="65" x2="280" y2="65" stroke="#A5846B" strokeWidth="0.5" opacity="0.15" />
              <line x1="20" y1="40" x2="280" y2="40" stroke="#A5846B" strokeWidth="0.5" opacity="0.15" />
              
              {/* Main rhythm line - sage/clay blend */}
              <motion.path
                d="M 20 75 L 60 42 L 100 35 L 140 60 L 180 50 L 220 38 L 260 45 L 280 40"
                fill="none"
                stroke="#8DA18F"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, delay: 0.8, ease: "easeInOut" }}
              />
              
              {/* Peak dots - soft bronze */}
              <motion.circle
                cx="100"
                cy="35"
                r="2.5"
                fill="#A9683A"
                opacity="0.7"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.5, duration: 0.4 }}
              />
              <motion.circle
                cx="220"
                cy="38"
                r="2.5"
                fill="#A9683A"
                opacity="0.7"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.7, duration: 0.4 }}
              />
              
              {/* Soft area fill with sage tint */}
              <motion.path
                d="M 20 75 L 60 42 L 100 35 L 140 60 L 180 50 L 220 38 L 260 45 L 280 40 L 280 90 L 20 90 Z"
                fill="url(#sageGradient)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.5, delay: 1 }}
              />
              
              <defs>
                <linearGradient id="sageGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8DA18F" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#8DA18F" stopOpacity="0.02" />
                </linearGradient>
              </defs>
            </svg>
            
            {/* Weekly rhythm insight based on real data */}
            <p
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '12px',
                fontWeight: 300,
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                marginTop: '12px',
                fontStyle: 'italic',
              }}
            >
              {weeklyDirection === "softening" && "It seemed like your emotional tone gently softened over the last few days."}
              {weeklyDirection === "rising" && "It felt like your emotional energy was a bit more activated recently."}
              {weeklyDirection === "steady" && "Your emotional rhythm appeared fairly steady this week — at your own pace."}
              {weeklyDirection === null && weeklyStitches.length === 0 && "TRACE is still learning your weekly rhythm. Keep checking in whenever feels right."}
              {weeklyDirection === null && weeklyStitches.length > 0 && weeklyStitches.length < 3 && "A few more days and TRACE will start to notice what patterns might be there."}
            </p>
          </motion.div>

          {/* Behavior Signatures Section - softer approach */}
          <motion.div
            className="space-y-4 pt-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.6 }}
          >
            <h2
              className="mb-3"
              style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: '19px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                letterSpacing: '0.02em',
              }}
            >
              Behavior Signatures
            </h2>

            {['Evening Overthinking', 'Midweek Burnout', 'Morning Sharpness', 'Solitude Recovery Pattern'].map((signature, index) => (
              <motion.div
                key={signature}
                className="rounded-[18px] px-5 py-4"
                style={{
                  backgroundColor: isDark ? 'rgba(14, 15, 13, 0.95)' : '#E9E2D8',
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(43, 30, 21, 0.09)',
                  boxShadow: isDark ? 'inset 0 1px 2px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.08)' : 'inset 0 1px 2px rgba(0,0,0,0.03), 0 1px 4px rgba(0,0,0,0.02)',
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.8 + index * 0.1 }}
              >
                <p
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: 'var(--text-primary)',
                    letterSpacing: '0.01em',
                  }}
                >
                  {signature}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Weekly Reflection Block */}
          <motion.div
            className="rounded-[22px] p-8 mt-6"
            style={{
              backgroundColor: isDark ? 'rgba(14, 15, 13, 0.95)' : '#F2EFEA',
              border: isDark ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(43, 30, 21, 0.08)',
              boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.1)' : '0 4px 16px rgba(0,0,0,0.03)',
            }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.8 }}
          >
            <p
              style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: '15px',
                fontWeight: 300,
                color: 'var(--text-primary)',
                lineHeight: '1.8',
                letterSpacing: '0.01em',
                fontStyle: 'italic',
              }}
            >
              Your week shaped itself quietly.
              <br />
              Your rhythm softened midweek,
              <br />
              found stillness in solitude,
              <br />
              and gathered clarity in the mornings.
            </p>
          </motion.div>

          {/* Journaling Whisper - gentle invitation */}
          {(() => {
            const whisper = getJournalingWhisper(lastHourSummary, weeklyStitches);
            return whisper ? (
              <motion.div
                className="px-2 pt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.8 }}
              >
                <p
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '13px',
                    fontWeight: 300,
                    fontStyle: 'italic',
                    color: isDark ? 'rgba(242, 240, 236, 0.5)' : 'rgba(90, 74, 58, 0.55)',
                    lineHeight: 1.6,
                    textAlign: 'center',
                  }}
                >
                  {whisper}
                </p>
              </motion.div>
            ) : null;
          })()}

          {/* Bottom Footer Button */}
          <motion.div
            className="pt-6 pb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 1 }}
          >
            <button
              onClick={onViewFull}
              className="w-full rounded-[24px] px-8 py-5 transition-all duration-300 active:scale-[0.98]"
              style={{
                backgroundColor: isDark ? 'rgba(30, 32, 28, 0.76)' : 'rgba(225, 212, 195, 0.78)',
                border: isDark ? '1px solid rgba(141, 161, 143, 0.25)' : '1px solid rgba(141, 161, 143, 0.35)',
                boxShadow: isDark ? '0 2px 2px rgba(0, 0, 0, 0.08)' : '0 2px 2px rgba(90, 74, 58, 0.07)',
              }}
            >
              <span
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '15px',
                  fontWeight: 400,
                  color: 'var(--text-primary)',
                  letterSpacing: '0.02em',
                }}
              >
                View Full Patterns →
              </span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        activeScreen="activities"
        variant="sage"
        onNavigateHome={onNavigateHome}
        onNavigateActivities={onNavigateToActivities}
        onNavigateJournal={onNavigateToJournal}
        onNavigateProfile={onNavigateToProfile}
        onNavigateHelp={onNavigateToHelp}
      />

      {/* Pattern Modal */}
      <PatternModal
        pattern={activePattern}
        onClose={() => setActivePattern(null)}
        onViewFull={onViewFull}
      />

      {/* Upsell Modal for locked patterns */}
      <UpsellModal
        isOpen={showUpsell}
        onClose={() => setShowUpsell(false)}
      />

      {/* Weekly Rhythm Map Info Modal */}
      <WeeklyRhythmInfoModal
        isOpen={showWeeklyRhythmInfo}
        onClose={() => setShowWeeklyRhythmInfo(false)}
      />
    </div>
  );
}