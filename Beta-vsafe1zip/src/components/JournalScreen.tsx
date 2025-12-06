import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X, Sparkles, RefreshCw } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { useEntries } from '../state/EntriesContext';
import { useTheme } from '../state/ThemeContext';
import { Entry } from '../models/entries';
import { generateDailyAssessment } from '../utils/aiAssessment';

interface JournalScreenProps {
  onReturnToChat: () => void;
  onNavigateToActivities?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToHelp?: () => void;
}

type MoodType = 'calm' | 'okay' | 'heavy' | 'overwhelmed';

interface MoodOption {
  type: MoodType;
  label: string;
  description: string;
  color: string;
  colorDark: string;
  glow: string;
  shadow: string;
}

const moodOptions: MoodOption[] = [
  {
    type: 'calm',
    label: 'Calm',
    description: 'Peaceful & centered',
    color: '#F4F1EC',
    colorDark: '#d4c4a8',
    glow: 'rgba(244, 241, 236, 0.6)',
    shadow: '0 2px 8px rgba(211, 207, 200, 0.3)',
  },
  {
    type: 'okay',
    label: 'Okay',
    description: 'Steady & manageable',
    color: '#D3CFC8',
    colorDark: '#6b7c6b',
    glow: 'rgba(211, 207, 200, 0.7)',
    shadow: '0 2px 10px rgba(179, 171, 160, 0.35)',
  },
  {
    type: 'heavy',
    label: 'Heavy',
    description: 'Weighed down',
    color: '#B3ABA0',
    colorDark: '#4a5a4a',
    glow: 'rgba(179, 171, 160, 0.8)',
    shadow: '0 3px 12px rgba(138, 134, 128, 0.4)',
  },
  {
    type: 'overwhelmed',
    label: 'Overwhelmed',
    description: 'Intense & difficult',
    color: '#8A8680',
    colorDark: '#2d3a4a',
    glow: 'rgba(138, 134, 128, 0.9)',
    shadow: '0 4px 16px rgba(107, 103, 97, 0.5)',
  },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getEntriesForDate(entries: Entry[], year: number, month: number, day: number): Entry[] {
  const dateKey = formatDateKey(year, month, day);
  return entries.filter(entry => {
    const entryDate = new Date(entry.timestamp);
    const entryKey = formatDateKey(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    return entryKey === dateKey;
  });
}

export function JournalScreen({ onReturnToChat, onNavigateToActivities, onNavigateToProfile, onNavigateToHelp }: JournalScreenProps) {
  const { entries, addEmotionalNoteEntry, addAIReflectionEntry } = useEntries();
  const { theme } = useTheme();
  const isDark = theme === 'night';
  
  // Initialize with current date
  const now = new Date();
  const [currentMonthIndex, setCurrentMonthIndex] = React.useState(now.getMonth());
  const [currentYear, setCurrentYear] = React.useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = React.useState<number | null>(now.getDate());
  const [expandedDay, setExpandedDay] = React.useState<number | null>(null);
  const [showReadBackModal, setShowReadBackModal] = React.useState(false);
  const [showNewEntryModal, setShowNewEntryModal] = React.useState(false);
  const [newEntryText, setNewEntryText] = React.useState('');
  const [newEntryMood, setNewEntryMood] = React.useState<MoodType>('calm');
  
  // Double-click detection
  const lastClickRef = React.useRef<{ day: number; time: number } | null>(null);
  
  // AI Assessment state
  const [aiAssessment, setAiAssessment] = React.useState<string | null>(null);
  const [isLoadingAssessment, setIsLoadingAssessment] = React.useState(false);
  
  // Handle day click with single/double click detection
  const handleDayClick = (day: number) => {
    const now = Date.now();
    const lastClick = lastClickRef.current;
    
    if (lastClick && lastClick.day === day && now - lastClick.time < 300) {
      // Double click - show read back modal
      setSelectedDay(day);
      setExpandedDay(day);
      setShowReadBackModal(true);
      lastClickRef.current = null;
    } else {
      // Single click - toggle expand feelings grid
      setSelectedDay(day);
      setExpandedDay(expandedDay === day ? null : day);
      lastClickRef.current = { day, time: now };
    }
  };

  const todayDate = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear = now.getFullYear();
  const isViewingCurrentMonth = currentMonthIndex === todayMonth && currentYear === todayYear;

  // Navigate to previous month
  const goToPreviousMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonthIndex(currentMonthIndex - 1);
    }
    setSelectedDay(null);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonthIndex(currentMonthIndex + 1);
    }
    setSelectedDay(null);
  };

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonthIndex);
    const firstDayOfWeek = getFirstDayOfMonth(currentYear, currentMonthIndex);
    const days: (number | null)[] = [];

    // Add empty cells for days before the first
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  // Check if a day has entries
  const dayHasEntries = (day: number): boolean => {
    const dayEntries = getEntriesForDate(entries, currentYear, currentMonthIndex, day);
    return dayEntries.length > 0;
  };

  // Get entries for selected day
  const selectedDayEntries = selectedDay 
    ? getEntriesForDate(entries, currentYear, currentMonthIndex, selectedDay)
    : [];

  // Get mood color for a day based on most recent emotional note
  const getDayMoodColor = (day: number): string | null => {
    const dayEntries = getEntriesForDate(entries, currentYear, currentMonthIndex, day);
    const emotionalNote = dayEntries.find(e => e.type === 'emotional_note' && e.metadata?.mood);
    if (emotionalNote?.metadata?.mood) {
      const mood = moodOptions.find(m => m.type === emotionalNote.metadata?.mood);
      return mood?.color || null;
    }
    return null;
  };

  // Get today's entries for AI assessment
  const todayEntries = getEntriesForDate(entries, todayYear, todayMonth, todayDate);

  // Generate AI assessment for today
  const handleGenerateAssessment = async () => {
    setIsLoadingAssessment(true);
    try {
      const assessment = await generateDailyAssessment(todayEntries);
      setAiAssessment(assessment);
      addAIReflectionEntry(assessment, 'Journal');
    } catch (error) {
      console.error('Failed to generate assessment:', error);
      setAiAssessment('Take a moment to breathe. Every step forward counts.');
    } finally {
      setIsLoadingAssessment(false);
    }
  };

  // Count of non-reflection entries for tracking changes
  const todayNonReflectionEntries = todayEntries.filter(e => e.type !== 'ai_reflection');
  const entryCount = todayNonReflectionEntries.length;
  const lastEntryRef = React.useRef<number>(0);
  
  // Auto-generate and update reflection when entries change
  React.useEffect(() => {
    const generateReflection = async () => {
      if (isLoadingAssessment) return;
      
      setIsLoadingAssessment(true);
      try {
        const assessment = await generateDailyAssessment(todayEntries);
        setAiAssessment(assessment);
      } catch (error) {
        console.error('Failed to generate assessment:', error);
      } finally {
        setIsLoadingAssessment(false);
      }
    };

    if (entryCount !== lastEntryRef.current) {
      lastEntryRef.current = entryCount;
      generateReflection();
    } else if (entryCount === 0 && !aiAssessment && !isLoadingAssessment) {
      generateReflection();
    }
  }, [entryCount]);

  const calendarDays = generateCalendarDays();
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const currentMonth = MONTHS[currentMonthIndex];

  return (
    <div
      className="relative w-full h-full overflow-hidden transition-colors duration-300"
      style={{
        background: 'transparent',
      }}
    >
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
            color: 'var(--text-primary)',
            fontWeight: 300,
            letterSpacing: '1em',
            fontSize: '11px',
            textShadow: `0 0 15px var(--orb-glow), 0 0 30px var(--orb-glow), 0 2px 4px rgba(0,0,0,0.15)`,
            opacity: 0.85,
          }}
        >
          TRACE
        </h1>
      </motion.div>

      {/* Scrollable Content Wrapper */}
      <div 
        className="relative z-10 flex flex-col h-full pb-40 overflow-y-auto"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <style>{`
          .relative.z-10.flex.flex-col::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {/* Title Section - moved up */}
        <motion.div
          className="w-full px-6 text-center pt-20 pb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1 }}
        >
          <h2
            className="mb-1"
            style={{
              fontFamily: 'Georgia, serif',
              color: '#4B4B4B',
              fontWeight: 400,
              fontSize: '28px',
              letterSpacing: '-0.02em',
            }}
          >
            Journal
          </h2>
          <p
            style={{
              fontFamily: 'Georgia, serif',
              color: '#8A8680',
              fontWeight: 300,
              fontSize: '15px',
              letterSpacing: '0.01em',
            }}
          >
            Your thoughts, gently organized.
          </p>
        </motion.div>

        {/* Calendar Card */}
        <motion.div
          className="w-full px-6 pb-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 1 }}
        >
          <div
            className="rounded-[24px] p-5"
            style={{
              background: 'linear-gradient(135deg, #F4F1EC 0%, #EEEBE6 100%)',
              boxShadow: '0 8px 24px rgba(75, 75, 75, 0.06), 0 2px 8px rgba(75, 75, 75, 0.03), inset 0 1px 2px rgba(255, 255, 255, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
            }}
          >
            {/* Month Selector */}
            <div className="flex items-center justify-between mb-5">
              <button
                className="p-2 hover:opacity-60 transition-opacity"
                onClick={goToPreviousMonth}
              >
                <ChevronLeft size={20} style={{ color: '#8A8680' }} strokeWidth={1.5} />
              </button>

              <h3
                style={{
                  fontFamily: 'Georgia, serif',
                  color: '#4B4B4B',
                  fontWeight: 400,
                  fontSize: '16px',
                  letterSpacing: '0.02em',
                }}
              >
                {currentMonth} {currentYear}
              </h3>

              <button
                className="p-2 hover:opacity-60 transition-opacity"
                onClick={goToNextMonth}
              >
                <ChevronRight size={20} style={{ color: '#8A8680' }} strokeWidth={1.5} />
              </button>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {weekDays.map((day, index) => (
                <div
                  key={index}
                  className="text-center"
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: '#8A8680',
                    fontSize: '11px',
                    fontWeight: 300,
                    letterSpacing: '0.05em',
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                const isToday = isViewingCurrentMonth && day === todayDate;
                const hasEntries = day ? dayHasEntries(day) : false;
                const moodColor = day ? getDayMoodColor(day) : null;
                const isSelected = day === selectedDay;
                
                return (
                  <button
                    key={index}
                    onClick={() => day && handleDayClick(day)}
                    className="relative aspect-square flex items-center justify-center rounded-lg transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: moodColor || (isSelected ? 'rgba(138, 134, 128, 0.15)' : 'transparent'),
                      boxShadow: moodColor 
                        ? '0 2px 8px rgba(75, 75, 75, 0.08), inset 0 1px 2px rgba(255, 255, 255, 0.3)'
                        : isSelected ? '0 2px 8px rgba(75, 75, 75, 0.06)' : 'none',
                      border: isSelected ? '1px solid rgba(138, 134, 128, 0.3)' : 'none',
                    }}
                    disabled={!day}
                  >
                    {day && (
                      <>
                        <span
                          style={{
                            fontFamily: 'Georgia, serif',
                            color: isToday ? '#4B4B4B' : '#6B6761',
                            fontSize: '14px',
                            fontWeight: isToday ? 500 : 300,
                            letterSpacing: '0.01em',
                          }}
                        >
                          {day}
                        </span>

                        {/* Today indicator - glowing dot */}
                        {isToday && (
                          <motion.div
                            className="absolute bottom-1"
                            style={{
                              width: '4px',
                              height: '4px',
                              borderRadius: '50%',
                              background: '#8A8680',
                              boxShadow: '0 0 6px rgba(138, 134, 128, 0.6)',
                            }}
                            animate={{
                              opacity: [0.6, 1, 0.6],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: 'easeInOut',
                            }}
                          />
                        )}

                        {/* Entry indicator - two tiny dots (not on today) */}
                        {hasEntries && !isToday && (
                          <div className="absolute bottom-1 flex gap-0.5">
                            <div
                              style={{
                                width: '3px',
                                height: '3px',
                                borderRadius: '50%',
                                background: '#8A8680',
                                opacity: 0.6,
                              }}
                            />
                            <div
                              style={{
                                width: '3px',
                                height: '3px',
                                borderRadius: '50%',
                                background: '#8A8680',
                                opacity: 0.6,
                              }}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Expandable Feelings Grid - shows on single click, positioned right below calendar */}
        <AnimatePresence>
          {expandedDay && selectedDayEntries.length > 0 && (
            <motion.div
              className="w-full px-6"
              style={{ marginTop: '-6px', marginBottom: '11px' }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              {/* Mood toothpick bars - transparent container */}
              <div className="flex flex-col items-center justify-center gap-2 py-2">
                {(() => {
                  const loggedMoods = selectedDayEntries
                    .filter(e => e.type === 'emotional_note' && e.metadata?.mood)
                    .map(e => e.metadata?.mood as string);
                  
                  const baseLengths = [120, 70, 95, 50];
                  
                  return moodOptions.map((mood, index) => {
                    const isLogged = loggedMoods.includes(mood.type);
                    const barWidth = isLogged ? 260 : baseLengths[index];
                    const barColor = isDark ? mood.colorDark : mood.color;
                    
                    return (
                      <div
                        key={mood.type}
                        style={{
                          width: `${barWidth}px`,
                          height: '6px',
                          borderRadius: '3px',
                          background: barColor,
                          boxShadow: isLogged 
                            ? (isDark ? '0 2px 12px rgba(0, 0, 0, 0.4)' : '0 2px 10px rgba(75, 75, 75, 0.25)')
                            : (isDark ? '0 1px 4px rgba(0, 0, 0, 0.3)' : '0 1px 3px rgba(75, 75, 75, 0.08)'),
                          border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.5)',
                          transition: 'width 0.4s ease, background 0.3s ease',
                        }}
                      />
                    );
                  });
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Daily Reflection */}
        <motion.div
          className="w-full px-6"
          style={{ marginTop: '-0.25rem' }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 1 }}
        >
          <div
            className="rounded-[24px] p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(90, 74, 58, 0.08) 0%, rgba(90, 74, 58, 0.04) 100%)',
              boxShadow: '0 8px 24px rgba(75, 75, 75, 0.06), 0 2px 8px rgba(75, 75, 75, 0.03), inset 0 1px 2px rgba(255, 255, 255, 0.45)',
              border: '1px solid rgba(90, 74, 58, 0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} style={{ color: '#5A4A3A' }} strokeWidth={1.5} />
                <h4
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: '#5A4A3A',
                    fontWeight: 500,
                    fontSize: '15px',
                    letterSpacing: '0.01em',
                  }}
                >
                  Today's Reflection
                </h4>
              </div>
              <button 
                className="p-1 hover:opacity-60 transition-opacity"
                onClick={handleGenerateAssessment}
                disabled={isLoadingAssessment}
              >
                <RefreshCw 
                  size={14} 
                  style={{ color: '#8A8680' }} 
                  strokeWidth={1.5}
                  className={isLoadingAssessment ? 'animate-spin' : ''}
                />
              </button>
            </div>

            <p
              className="pl-1"
              style={{
                fontFamily: 'Georgia, serif',
                color: '#6B6761',
                fontWeight: 300,
                fontSize: '14px',
                letterSpacing: '0.005em',
                lineHeight: '1.7',
                fontStyle: 'italic',
              }}
            >
              {isLoadingAssessment 
                ? 'Reflecting on your day...' 
                : aiAssessment 
                  ? `"${aiAssessment}"` 
                  : '"I\'m here whenever you\'re ready. No rush, no pressure."'}
            </p>
          </div>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          className="w-full px-6 pt-4 space-y-3 pb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 1 }}
        >
          {/* Log a New Moment */}
          <button
            onClick={() => setShowNewEntryModal(true)}
            className="w-full rounded-full px-8 py-4 transition-all duration-300 hover:scale-[1.01] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #F4F1EC 0%, #EEEBE6 100%)',
              boxShadow: '0 6px 20px rgba(75, 75, 75, 0.08), 0 2px 6px rgba(75, 75, 75, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.4)',
            }}
          >
            <span
              style={{
                fontFamily: 'Georgia, serif',
                color: '#4B4B4B',
                fontWeight: 500,
                fontSize: '15px',
                letterSpacing: '0.02em',
              }}
            >
              Log a New Moment
            </span>
          </button>

        </motion.div>
      </div>

      {/* New Entry Modal */}
      <AnimatePresence>
        {showNewEntryModal && (
          <>
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 z-30"
              style={{
                background: 'rgba(75, 75, 75, 0.4)',
                backdropFilter: 'blur(8px)',
                borderRadius: '43px',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNewEntryModal(false)}
            />

            {/* Modal */}
            <motion.div
              className="absolute z-40 rounded-[24px] p-5 flex flex-col"
              style={{
                top: '65px',
                left: '12px',
                right: '12px',
                bottom: '80px',
                background: 'linear-gradient(135deg, #F4F1EC 0%, #EEEBE6 100%)',
                boxShadow: '0 20px 60px rgba(75, 75, 75, 0.15), 0 8px 24px rgba(75, 75, 75, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                overflow: 'hidden',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: '#4B4B4B',
                    fontWeight: 500,
                    fontSize: '18px',
                    letterSpacing: '0.01em',
                  }}
                >
                  New Moment
                </h3>
                <button
                  onClick={() => setShowNewEntryModal(false)}
                  className="p-1 hover:opacity-60 transition-opacity"
                >
                  <X size={20} style={{ color: '#8A8680' }} strokeWidth={1.5} />
                </button>
              </div>

              {/* Date */}
              <p
                className="mb-3 flex-shrink-0"
                style={{
                  fontFamily: 'Georgia, serif',
                  color: '#8A8680',
                  fontWeight: 300,
                  fontSize: '13px',
                  letterSpacing: '0.01em',
                }}
              >
                {currentMonth} {todayDate}, {currentYear}
              </p>

              {/* Mood Selector */}
              <div className="mb-3 flex-shrink-0">
                <p
                  className="mb-2"
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: '#4B4B4B',
                    fontWeight: 500,
                    fontSize: '13px',
                    letterSpacing: '0.01em',
                  }}
                >
                  How are you feeling?
                </p>
                <div className="flex flex-col gap-2">
                  {moodOptions.map((mood) => {
                    const isSelected = newEntryMood === mood.type;
                    return (
                      <motion.button
                        key={mood.type}
                        onClick={() => setNewEntryMood(mood.type)}
                        className="px-4 py-2.5 text-left transition-all flex items-center justify-between"
                        style={{
                          background: mood.color,
                          borderRadius: '10px',
                          boxShadow: isSelected
                            ? '0 4px 16px rgba(75, 75, 75, 0.12), 0 0 0 2px rgba(138, 134, 128, 0.3)'
                            : '0 2px 8px rgba(75, 75, 75, 0.06), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                          border: '1px solid rgba(255, 255, 255, 0.4)',
                        }}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                      >
                        <h4
                          style={{
                            fontFamily: 'Georgia, serif',
                            color: mood.type === 'heavy' || mood.type === 'overwhelmed' ? '#F4F1EC' : '#4B4B4B',
                            fontWeight: 500,
                            fontSize: '13px',
                            letterSpacing: '0.01em',
                          }}
                        >
                          {mood.label}
                        </h4>
                        <p
                          style={{
                            fontFamily: 'Georgia, serif',
                            color: mood.type === 'heavy' || mood.type === 'overwhelmed' ? 'rgba(244, 241, 236, 0.8)' : '#8A8680',
                            fontWeight: 300,
                            fontSize: '11px',
                            letterSpacing: '0.01em',
                          }}
                        >
                          {mood.description}
                        </p>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Entry Text Area - Fills remaining space */}
              <div className="flex-1 flex flex-col min-h-0 mb-3">
                <p
                  className="mb-2 flex-shrink-0"
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: '#4B4B4B',
                    fontWeight: 500,
                    fontSize: '13px',
                    letterSpacing: '0.01em',
                  }}
                >
                  What's on your mind?
                </p>
                <textarea
                  value={newEntryText}
                  onChange={(e) => setNewEntryText(e.target.value)}
                  placeholder="Write as much or as little as you need..."
                  className="w-full p-3 resize-none flex-1"
                  style={{
                    background: 'rgba(255, 255, 255, 0.5)',
                    border: '1px solid rgba(138, 134, 128, 0.2)',
                    borderRadius: '10px',
                    fontFamily: 'Georgia, serif',
                    color: '#4B4B4B',
                    fontSize: '14px',
                    fontWeight: 300,
                    letterSpacing: '0.005em',
                    lineHeight: '1.6',
                    boxShadow: 'inset 0 2px 4px rgba(75, 75, 75, 0.05)',
                  }}
                />
              </div>

              {/* Buttons - Fixed at bottom */}
              <div className="flex-shrink-0 pt-2">
                {/* Save Button */}
                <button
                  onClick={() => {
                    const moodLabel = moodOptions.find(m => m.type === newEntryMood)?.label || 'Moment';
                    addEmotionalNoteEntry(
                      `Feeling ${moodLabel}`,
                      newEntryText || `Checked in feeling ${moodLabel.toLowerCase()}.`,
                      [newEntryMood]
                    );
                    setNewEntryText('');
                    setNewEntryMood('calm');
                    setShowNewEntryModal(false);
                  }}
                  className="w-full rounded-full px-6 py-2.5 mb-2 transition-all hover:scale-[1.01] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #F4F1EC 0%, #EEEBE6 100%)',
                    boxShadow: '0 4px 16px rgba(75, 75, 75, 0.08), 0 2px 4px rgba(75, 75, 75, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#4B4B4B',
                      fontWeight: 500,
                      fontSize: '14px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Save Moment
                  </span>
                </button>

                {/* Cancel Button */}
                <button
                  onClick={() => setShowNewEntryModal(false)}
                  className="w-full rounded-full px-6 py-2 transition-all hover:scale-[1.01] active:scale-[0.98]"
                  style={{
                    background: 'transparent',
                    border: '1px solid #A8A19A',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#6B6761',
                      fontWeight: 400,
                      fontSize: '13px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Cancel
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Read Back Modal - shows on double click */}
      <AnimatePresence>
        {showReadBackModal && selectedDay && (
          <>
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 z-30"
              style={{
                background: 'rgba(75, 75, 75, 0.4)',
                backdropFilter: 'blur(8px)',
                borderRadius: '43px',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReadBackModal(false)}
            />

            {/* Modal */}
            <motion.div
              className="absolute z-40 rounded-[24px] p-5 flex flex-col"
              style={{
                top: '65px',
                left: '12px',
                right: '12px',
                bottom: '80px',
                background: 'linear-gradient(135deg, #F4F1EC 0%, #EEEBE6 100%)',
                boxShadow: '0 20px 60px rgba(75, 75, 75, 0.15), 0 8px 24px rgba(75, 75, 75, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                overflow: 'hidden',
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: '#4B4B4B',
                    fontWeight: 500,
                    fontSize: '18px',
                    letterSpacing: '0.01em',
                  }}
                >
                  {currentMonth} {selectedDay}
                </h3>
                <button
                  onClick={() => setShowReadBackModal(false)}
                  className="p-1 hover:opacity-60 transition-opacity"
                >
                  <X size={20} style={{ color: '#8A8680' }} strokeWidth={1.5} />
                </button>
              </div>

              {/* Scrollable entries */}
              <div 
                className="flex-1 overflow-y-auto space-y-3"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {selectedDayEntries.length > 0 ? (
                  selectedDayEntries.map((entry, idx) => {
                    const mood = entry.metadata?.mood 
                      ? moodOptions.find(m => m.type === entry.metadata?.mood)
                      : null;
                    
                    return (
                      <div
                        key={idx}
                        className="rounded-[16px] p-4"
                        style={{
                          background: mood?.color || 'rgba(255, 255, 255, 0.5)',
                          boxShadow: '0 2px 8px rgba(75, 75, 75, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.4)',
                        }}
                      >
                        {/* Entry header */}
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="px-2 py-0.5 rounded-full"
                            style={{
                              background: 'rgba(138, 134, 128, 0.15)',
                              fontFamily: 'Georgia, serif',
                              color: '#6B6761',
                              fontWeight: 400,
                              fontSize: '11px',
                            }}
                          >
                            {entry.type === 'session' ? 'Activity' 
                              : entry.type === 'emotional_note' ? (mood?.label || 'Journal')
                              : entry.type === 'ai_reflection' ? 'Reflection'
                              : entry.type === 'check_in' ? 'Check-in'
                              : 'Pattern'}
                          </span>
                          <span
                            style={{
                              fontFamily: 'Georgia, serif',
                              color: '#8A8680',
                              fontSize: '11px',
                              fontWeight: 300,
                            }}
                          >
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        {/* Entry title */}
                        {entry.title && (
                          <p
                            style={{
                              fontFamily: 'Georgia, serif',
                              color: '#4B4B4B',
                              fontWeight: 500,
                              fontSize: '14px',
                              letterSpacing: '0.01em',
                              marginBottom: entry.body ? '0.5rem' : 0,
                            }}
                          >
                            {entry.title}
                          </p>
                        )}
                        
                        {/* Entry body */}
                        {entry.body && (
                          <p
                            style={{
                              fontFamily: 'Georgia, serif',
                              color: '#6B6761',
                              fontWeight: 300,
                              fontSize: '13px',
                              letterSpacing: '0.005em',
                              lineHeight: '1.6',
                            }}
                          >
                            {entry.body}
                          </p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div 
                    className="flex flex-col items-center justify-center h-full"
                    style={{ minHeight: '200px' }}
                  >
                    <p
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: '#8A8680',
                        fontWeight: 300,
                        fontSize: '14px',
                        fontStyle: 'italic',
                        textAlign: 'center',
                      }}
                    >
                      No entries for this day yet.
                    </p>
                  </div>
                )}
              </div>

              {/* Add Entry Button */}
              <div className="flex-shrink-0 pt-3">
                <button
                  onClick={() => {
                    setShowReadBackModal(false);
                    setShowNewEntryModal(true);
                  }}
                  className="w-full rounded-full px-6 py-2.5 transition-all hover:scale-[1.01] active:scale-[0.98]"
                  style={{
                    background: 'linear-gradient(135deg, #E8E4DD 0%, #DDD9D2 100%)',
                    boxShadow: '0 4px 12px rgba(75, 75, 75, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.4)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#4B4B4B',
                      fontWeight: 500,
                      fontSize: '14px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Add a Moment
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      <BottomNav
        activeScreen="journal"
        variant="sage"
        onNavigateHome={onReturnToChat}
        onNavigateActivities={onNavigateToActivities}
        onNavigateProfile={onNavigateToProfile}
        onNavigateHelp={onNavigateToHelp}
      />
    </div>
  );
}