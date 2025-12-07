import { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { BottomNav } from './BottomNav';
import { useTheme } from '../state/ThemeContext';
import { useEntries } from '../state/EntriesContext';
import traceLogo from 'figma:asset/513ec3c351285cce0b15e678c8f6d864d8269d64.png';
import { 
  getCurrentUserId, 
  saveLastHourStitch, 
  getLastHourSummary, 
  EmotionalStitch 
} from '../lib/messageService';
import { supabase } from '../lib/supabaseClient';

interface FullPatternsReportScreenProps {
  onBack: () => void;
  onNavigateHome?: () => void;
  onNavigateJournal?: () => void;
  onNavigateProfile?: () => void;
  onNavigateHelp?: () => void;
  onNavigateActivities?: () => void;
  onNavigatePatterns?: () => void;
}

type HourSummary = {
  total: number;
  calm: number;
  flat: number;
  heavy: number;
  anxious: number;
  avgIntensity: number;
  arc: "softening" | "rising" | "steady" | null;
};

function getJournalingWhisper(
  lastHourSummary: HourSummary | null,
  weeklyStitches: EmotionalStitch[]
): string | null {
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
    (s) => s.total > 0 && (s.heavy + s.anxious) / s.total >= 0.5
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
    options = [
      "Steady seasons matter too. If you want, we can jot down a few quiet details about what's been sustaining you lately.",
      "If things have felt neutral or steady, we can still trace what's been quietly supporting you underneath it all.",
    ];
  }

  if (options.length === 0) return null;
  return options[Math.floor(Math.random() * options.length)];
}

export function FullPatternsReportScreen({
  onBack,
  onNavigateHome,
  onNavigateJournal,
  onNavigateProfile,
  onNavigateHelp,
  onNavigateActivities,
}: FullPatternsReportScreenProps) {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'night';
  const { addEmotionalNoteEntry } = useEntries();

  const [userId, setUserId] = useState<string | null>(null); // Used for data fetching
  const [lastHourSummary, setLastHourSummary] = useState<HourSummary | null>(null);
  const [weeklyStitches, setWeeklyStitches] = useState<EmotionalStitch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [reflectionText, setReflectionText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      const uid = await getCurrentUserId();
      if (!uid || cancelled) {
        setIsLoading(false);
        return;
      }
      setUserId(uid);

      await saveLastHourStitch(uid);

      const summary = await getLastHourSummary(uid);
      if (!cancelled && summary) {
        setLastHourSummary(summary as HourSummary);
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const startDate = sevenDaysAgo.toISOString().slice(0, 10);

      const { data: stitches } = await supabase
        .from('emotional_stitches')
        .select('*')
        .eq('user_id', uid)
        .gte('summary_date', startDate)
        .order('summary_date', { ascending: false })
        .limit(7);

      if (!cancelled && stitches) {
        setWeeklyStitches(stitches as EmotionalStitch[]);
      }

      setIsLoading(false);
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  const narratives = useMemo(() => {
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
      (s) => s.total > 0 && (s.heavy + s.anxious) / s.total >= 0.5
    );

    const heaviestDay = weeklyStitches.reduce<{ dayName: string; ratio: number } | null>((acc, s) => {
      if (s.total === 0) return acc;
      const ratio = (s.heavy + s.anxious) / s.total;
      if (!acc || ratio > acc.ratio) {
        const d = new Date(s.summary_date + 'T12:00:00');
        return { dayName: d.toLocaleDateString('en-US', { weekday: 'long' }), ratio };
      }
      return acc;
    }, null);

    let todayNarrative = "";
    if (todayIsHeavyish) {
      todayNarrative = "Today seemed to carry a bit more weight than usual. That's okay — some days ask more of us, and it's alright to notice that without needing to fix anything.";
    } else if (todayStitch && todayStitch.arc === "softening") {
      todayNarrative = "It felt like today eased a little as it went on. Something in you may have found its way to soften, even if just slightly.";
    } else if (todayStitch) {
      todayNarrative = "Today appeared to move at its own pace — neither too heavy nor too light. Just present.";
    } else {
      todayNarrative = "TRACE is still gathering today's moments. As you move through the day, the shape of it will gently come into focus.";
    }

    let lastHourNarrative = "";
    if (total === 0) {
      lastHourNarrative = "This hour has been quiet so far. Sometimes the spaces between words are just as meaningful.";
    } else if (arc === "softening") {
      lastHourNarrative = "This last hour seemed to soften toward the end. Something in the rhythm of your words appeared to ease.";
    } else if (arc === "rising" || avgIntensity >= 3) {
      lastHourNarrative = "This last hour felt a bit more activated. Whatever was moving through you, it's okay that it showed up here.";
    } else {
      lastHourNarrative = "This last hour felt fairly steady. You moved through it at your own pace, and that's enough.";
    }

    let weeklyNarrative = "";
    if (weeklyStitches.length < 3) {
      weeklyNarrative = "TRACE is still learning your weekly rhythm. A few more days and the shape of your week will start to appear.";
    } else {
      const sorted = [...weeklyStitches].sort((a, b) => a.summary_date.localeCompare(b.summary_date));
      const firstTwo = sorted.slice(0, 2);
      const lastTwo = sorted.slice(-2);
      const avgI = (arr: EmotionalStitch[]) => arr.reduce((s, x) => s + (x.avg_intensity ?? 2), 0) / arr.length;
      const startAvg = avgI(firstTwo);
      const endAvg = avgI(lastTwo);

      if (endAvg <= startAvg - 0.5) {
        weeklyNarrative = "It seemed like your week gently softened as it went on. Something in you may have found its way to ease, even if it felt subtle.";
      } else if (endAvg >= startAvg + 0.5) {
        weeklyNarrative = "This week felt a bit more activated toward the end. That's neither good nor bad — just the shape of things right now.";
      } else {
        weeklyNarrative = "Your week appeared fairly steady. The rhythm stayed mostly consistent, without sharp rises or dips.";
      }
    }

    let stressEchoNarrative = "";
    if (hasHeavyDayThisWeek && heaviestDay) {
      stressEchoNarrative = `${heaviestDay.dayName} seemed to feel a bit heavier than other days this week. If any part of that still resonates, it's okay to let it rest here — you don't have to unpack anything unless you want to.`;
    }

    return { todayNarrative, lastHourNarrative, weeklyNarrative, stressEchoNarrative };
  }, [lastHourSummary, weeklyStitches]);

  const whisper = useMemo(() => {
    return getJournalingWhisper(lastHourSummary, weeklyStitches);
  }, [lastHourSummary, weeklyStitches]);

  const handleSaveReflection = () => {
    if (!reflectionText.trim()) return;

    setIsSaving(true);
    try {
      addEmotionalNoteEntry(
        'Patterns Reflection',
        reflectionText.trim(),
        ['calm']
      );
      setSavedMessage("Saved to your journal.");
      setReflectionText('');
      setTimeout(() => setSavedMessage(''), 3000);
    } catch (err) {
      console.error("TRACE/FullReport save error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const textStyle = {
    fontFamily: 'Georgia, serif',
    fontSize: '15px',
    fontWeight: 300 as const,
    color: isDark ? 'rgba(200, 195, 188, 0.85)' : '#4C443D',
    lineHeight: 1.45,
  };

  const headingStyle = {
    fontFamily: 'Playfair Display, Georgia, serif',
    fontSize: '18px',
    fontWeight: 400 as const,
    color: isDark ? 'rgba(242, 240, 236, 0.9)' : '#3D3830',
    marginBottom: '0',
    letterSpacing: '0.01em',
  };

  const sageUnderline = {
    display: 'block',
    width: '40px',
    height: '1px',
    backgroundColor: isDark ? 'rgba(141, 161, 143, 0.4)' : 'rgba(141, 161, 143, 0.6)',
    marginTop: '8px',
    marginBottom: '16px',
  };

  const cardStyle = {
    backgroundColor: isDark ? 'rgba(30, 32, 28, 0.76)' : 'rgba(225, 212, 195, 0.78)',
    borderRadius: '17px',
    padding: '24px 20px',
    boxShadow: isDark 
      ? '0 2px 2px rgba(0, 0, 0, 0.08)' 
      : '0 2px 2px rgba(90, 74, 58, 0.07)',
  };

  const sageCardBorder = isDark 
    ? '1px solid rgba(141, 161, 143, 0.25)' 
    : '1px solid rgba(141, 161, 143, 0.35)';

  const mochaCardBorder = isDark 
    ? '1px solid rgba(180, 155, 130, 0.25)' 
    : '1px solid rgba(165, 132, 107, 0.35)';

  const paragraphContainer = {
    maxWidth: '85%',
    margin: '0 auto 0 0',
  };

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: 'transparent' }}>
      {/* Math notebook grid texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(${isDark ? 'rgba(45, 58, 42, 0.06)' : 'rgba(141, 161, 143, 0.12)'} 1px, transparent 1px),
            linear-gradient(90deg, ${isDark ? 'rgba(45, 58, 42, 0.06)' : 'rgba(141, 161, 143, 0.12)'} 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
          zIndex: 0,
        }}
      />


      <div className="relative z-10 flex flex-col h-full overflow-y-auto overflow-x-hidden pb-32" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style>
          {`
            div::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>

        <div className="flex-shrink-0" style={{ height: '8%' }} />

        <div className="w-full max-w-md mx-auto px-6 flex flex-col items-center">
          <motion.div
            className="text-center mb-4 w-full"
            style={{ marginTop: '16px' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <h2
              style={{
                fontFamily: 'Playfair Display, Georgia, serif',
                fontSize: '24px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '6px',
                letterSpacing: '0.01em',
              }}
            >
              Your Emotional Reflection
            </h2>
            
            {/* Subtle maze identity seal */}
            <div 
              className="relative mx-auto"
              style={{ width: '54px', height: '54px', marginBottom: '4px' }}
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: isDark 
                    ? 'radial-gradient(circle, rgba(141, 161, 143, 0.12) 0%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(141, 161, 143, 0.1) 0%, transparent 70%)',
                  transform: 'scale(1.4)',
                  filter: 'blur(6px)',
                }}
              />
              <img 
                src={traceLogo} 
                alt="" 
                className="w-full h-full relative"
                style={{ opacity: 0.5 }}
              />
            </div>
            
            <p
              style={{
                ...textStyle,
                fontSize: '13px',
                fontStyle: 'italic',
                opacity: 0.15,
              }}
            >
              A gentle look at what's been moving through you.
            </p>
            
            {/* Subtle anchoring line - "this is where reflection begins" */}
            <div 
              style={{
                width: 'calc(100% - 32px)',
                height: '1px',
                background: isDark 
                  ? 'linear-gradient(90deg, transparent 0%, rgba(120, 95, 70, 0.4) 20%, rgba(120, 95, 70, 0.4) 80%, transparent 100%)'
                  : 'linear-gradient(90deg, transparent 0%, rgba(120, 95, 70, 0.4) 20%, rgba(120, 95, 70, 0.4) 80%, transparent 100%)',
                marginTop: '16px',
                marginLeft: '16px',
                marginRight: '16px',
                filter: 'blur(0.5px)',
              }}
            />
          </motion.div>

          {isLoading ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ ...textStyle, fontStyle: 'italic', textAlign: 'center' }}
            >
              Gathering your moments...
            </motion.p>
          ) : (
            <>
              <motion.section
                className="w-full text-left"
                style={{ ...cardStyle, marginBottom: '16px', border: sageCardBorder }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
              >
                <h3 style={headingStyle}>Today</h3>
                <span style={sageUnderline} />
                <div style={paragraphContainer}>
                  <p style={textStyle}>{narratives.todayNarrative}</p>
                </div>
              </motion.section>

              <motion.section
                className="w-full text-left"
                style={{ ...cardStyle, marginBottom: '16px', border: sageCardBorder }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
              >
                <h3 style={headingStyle}>This Last Hour</h3>
                <span style={sageUnderline} />
                <div style={paragraphContainer}>
                  <p style={textStyle}>{narratives.lastHourNarrative}</p>
                </div>
              </motion.section>

              <motion.section
                className="w-full text-left"
                style={{ ...cardStyle, marginBottom: '16px', border: sageCardBorder }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
                <h3 style={headingStyle}>Your Week</h3>
                <span style={sageUnderline} />
                <div style={paragraphContainer}>
                  <p style={textStyle}>{narratives.weeklyNarrative}</p>
                </div>
              </motion.section>

              {narratives.stressEchoNarrative && (
                <motion.section
                  className="w-full text-left"
                  style={{ ...cardStyle, marginBottom: '16px', border: sageCardBorder }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                >
                  <h3 style={headingStyle}>A Quiet Echo</h3>
                  <span style={sageUnderline} />
                  <div style={paragraphContainer}>
                    <p style={textStyle}>{narratives.stressEchoNarrative}</p>
                  </div>
                </motion.section>
              )}

              {whisper && (
                <motion.div
                  className="w-full"
                  style={{
                    marginTop: '12px',
                    marginBottom: '24px',
                    paddingLeft: '12px',
                    paddingRight: '12px',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.8 }}
                >
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: '13px',
                      fontWeight: 300,
                      fontStyle: 'italic',
                      color: isDark ? 'rgba(180, 175, 168, 0.5)' : 'rgba(90, 80, 70, 0.45)',
                      lineHeight: 1.7,
                      textAlign: 'center',
                      maxWidth: '90%',
                      margin: '0 auto',
                    }}
                  >
                    {whisper}
                  </p>
                </motion.div>
              )}

              <motion.section
                className="w-full"
                style={{
                  ...cardStyle,
                  marginTop: '16px',
                  border: mochaCardBorder,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.9 }}
              >
                <h3 style={{ ...headingStyle, fontSize: '16px' }}>
                  A space for your words
                </h3>
                <span style={{ ...sageUnderline, backgroundColor: isDark ? 'rgba(165, 132, 107, 0.4)' : 'rgba(165, 132, 107, 0.5)' }} />

                <textarea
                  value={reflectionText}
                  onChange={(e) => {
                    setReflectionText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  placeholder="No pressure, you can write it here."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.6)',
                    border: isDark
                      ? '1px solid rgba(255, 255, 255, 0.08)'
                      : '1px solid rgba(90, 74, 58, 0.12)',
                    fontFamily: 'Georgia, serif',
                    fontSize: '15px',
                    fontWeight: 300,
                    color: 'var(--text-primary)',
                    resize: 'none',
                    outline: 'none',
                    overflow: 'hidden',
                    minHeight: '80px',
                  }}
                />

                <div className="mt-4">
                  <button
                    onClick={handleSaveReflection}
                    disabled={isSaving || !reflectionText.trim()}
                    className="w-full rounded-full px-8 py-4 transition-all duration-300 hover:scale-[1.01] active:scale-[0.98]"
                    style={{
                      background: 'var(--card)',
                      boxShadow: 'var(--shadow)',
                      border: '1px solid var(--border)',
                      opacity: !reflectionText.trim() ? 0.5 : 1,
                      cursor: !reflectionText.trim() ? 'default' : 'pointer',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                        fontSize: '15px',
                        letterSpacing: '0.02em',
                      }}
                    >
                      {isSaving ? 'Saving...' : 'Journal'}
                    </span>
                  </button>

                  {savedMessage && (
                    <motion.p
                      className="text-center mt-3"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        ...textStyle,
                        fontSize: '13px',
                        fontStyle: 'italic',
                        color: isDark ? 'rgba(180, 200, 180, 0.7)' : 'rgba(90, 120, 90, 0.7)',
                      }}
                    >
                      {savedMessage}
                    </motion.p>
                  )}
                </div>
              </motion.section>

              {/* Back to Patterns button at bottom */}
              <motion.div
                className="w-full flex justify-center"
                style={{ marginTop: '32px', marginBottom: '16px' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1, duration: 0.6 }}
              >
                <button
                  onClick={onBack}
                  className="flex items-center gap-2 transition-opacity hover:opacity-70"
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: isDark ? 'rgba(180, 175, 168, 0.6)' : 'rgba(90, 80, 70, 0.5)',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M10 12L6 8L10 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Back to Patterns
                </button>
              </motion.div>
            </>
          )}
        </div>
      </div>

      <BottomNav
        activeScreen="activities"
        variant="sage"
        onNavigateHome={onNavigateHome}
        onNavigateActivities={onNavigateActivities}
        onNavigateJournal={onNavigateJournal}
        onNavigateProfile={onNavigateProfile}
        onNavigateHelp={onNavigateHelp}
      />
    </div>
  );
}
