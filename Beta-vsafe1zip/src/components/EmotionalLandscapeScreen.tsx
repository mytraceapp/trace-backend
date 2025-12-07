import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BottomNav } from './BottomNav';

interface EmotionalLandscapeScreenProps {
  onReturnToChat: () => void;
  onViewJournal: () => void;
  onNavigateToActivities?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToHelp?: () => void;
}

type MoodType = 'calm' | 'okay' | 'heavy' | 'overwhelmed' | null;

interface DayMood {
  day: number;
  mood: MoodType;
}

export function EmotionalLandscapeScreen({ onReturnToChat, onViewJournal, onNavigateToActivities, onNavigateToProfile, onNavigateToHelp }: EmotionalLandscapeScreenProps) {
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null);

  // Example mood data for February 2025
  const moodData: DayMood[] = [
    { day: 1, mood: 'calm' },
    { day: 2, mood: 'okay' },
    { day: 3, mood: 'calm' },
    { day: 4, mood: null },
    { day: 5, mood: 'heavy' },
    { day: 6, mood: 'okay' },
    { day: 7, mood: 'calm' },
    { day: 8, mood: 'overwhelmed' },
    { day: 9, mood: 'heavy' },
    { day: 10, mood: 'okay' },
    { day: 11, mood: 'calm' },
    { day: 12, mood: 'calm' },
    { day: 13, mood: null },
    { day: 14, mood: 'okay' },
    { day: 15, mood: 'heavy' },
    { day: 16, mood: 'calm' },
    { day: 17, mood: 'okay' },
    { day: 18, mood: 'overwhelmed' },
    { day: 19, mood: 'heavy' },
    { day: 20, mood: 'okay' },
    { day: 21, mood: 'calm' },
    { day: 22, mood: 'calm' },
    { day: 23, mood: 'okay' },
    { day: 24, mood: 'calm' },
    { day: 25, mood: null },
    { day: 26, mood: null },
    { day: 27, mood: null },
    { day: 28, mood: null },
  ];

  // Get mood color based on type
  const getMoodColor = (mood: MoodType) => {
    switch (mood) {
      case 'calm':
        return {
          bg: '#F4F1EC', // pale beige
          glow: 'rgba(244, 241, 236, 0.6)',
          shadow: '0 2px 8px rgba(211, 207, 200, 0.3)',
        };
      case 'okay':
        return {
          bg: '#D3CFC8', // light taupe
          glow: 'rgba(211, 207, 200, 0.7)',
          shadow: '0 2px 10px rgba(179, 171, 160, 0.35)',
        };
      case 'heavy':
        return {
          bg: '#B3ABA0', // deeper warm brown
          glow: 'rgba(179, 171, 160, 0.8)',
          shadow: '0 3px 12px rgba(138, 134, 128, 0.4)',
        };
      case 'overwhelmed':
        return {
          bg: '#8A8680', // denser brown
          glow: 'rgba(138, 134, 128, 0.9)',
          shadow: '0 4px 16px rgba(107, 103, 97, 0.5)',
        };
      default:
        return {
          bg: '#FAFAF9', // very pale neutral for no data
          glow: 'rgba(250, 250, 249, 0.3)',
          shadow: '0 1px 4px rgba(211, 207, 200, 0.15)',
        };
    }
  };

  // Generate calendar grid (7 columns for days of week)
  const generateCalendarGrid = () => {
    const firstDayOfWeek = 6; // February 1, 2025 is Saturday
    const grid = [];

    // Add empty cells before first day
    for (let i = 0; i < firstDayOfWeek; i++) {
      grid.push(null);
    }

    // Add all days
    grid.push(...moodData);

    return grid;
  };

  const calendarGrid = generateCalendarGrid();
  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Get selected day mood
  const selectedDayMood = selectedDay ? moodData.find(d => d.day === selectedDay)?.mood : null;

  return (
    <div
      className="relative w-full h-full flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(to bottom, #F4F1EC 0%, #E8E4DD 50%, #D3CFC8 100%)',
      }}
    >
      {/* Soft vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 0%, rgba(75, 75, 75, 0.04) 100%)',
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
            color: '#6B6761',
            fontWeight: 300,
            letterSpacing: '1em',
            fontSize: '11px',
            opacity: 0.6,
            paddingLeft: '1em',
          }}
        >
          TRACE
        </h1>
      </motion.div>

      {/* Scrollable Content Wrapper - Centered */}
      <div className="relative z-10 flex flex-col h-full overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
          {/* Title Section */}
          <motion.div
            className="w-full text-center pt-16 pb-4 flex-shrink-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 1 }}
          >
            <h2
              className="mb-2"
              style={{
                fontFamily: 'Georgia, serif',
                color: '#4B4B4B',
                fontWeight: 400,
                fontSize: '28px',
                letterSpacing: '-0.02em',
              }}
            >
              Emotional Landscape
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
              Your month, in soft patterns.
            </p>
          </motion.div>

          {/* Monthly Mood Orb Map */}
          <motion.div
            className="w-full pb-4 flex-shrink-0"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1 }}
          >
            {/* Month Label */}
            <div className="text-center mb-4">
              <h3
                style={{
                  fontFamily: 'Georgia, serif',
                  color: '#6B6761',
                  fontWeight: 400,
                  fontSize: '16px',
                  letterSpacing: '0.02em',
                }}
              >
                February 2025
              </h3>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-3 px-2">
              {weekDays.map((day, index) => (
                <div
                  key={index}
                  className="text-center"
                  style={{
                    fontFamily: 'Georgia, serif',
                    color: '#8A8680',
                    fontSize: '10px',
                    fontWeight: 300,
                    letterSpacing: '0.05em',
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Orb Grid */}
            <div className="grid grid-cols-7 gap-2 px-2">
              {calendarGrid.map((dayData, index) => {
                if (!dayData) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const { day, mood } = dayData as DayMood;
                const moodColors = getMoodColor(mood);
                const isSelected = selectedDay === day;

                return (
                  <motion.button
                    key={day}
                    onClick={() => setSelectedDay(day)}
                    className="relative aspect-square flex items-center justify-center rounded-full transition-transform active:scale-95"
                    style={{
                      background: moodColors.bg,
                      boxShadow: isSelected
                        ? `${moodColors.shadow}, inset 0 1px 2px rgba(255, 255, 255, 0.3), 0 0 0 2px ${moodColors.glow}`
                        : `${moodColors.shadow}, inset 0 1px 2px rgba(255, 255, 255, 0.3)`,
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Subtle glow for overwhelmed state */}
                    {mood === 'overwhelmed' && (
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: `radial-gradient(circle, ${moodColors.glow} 0%, transparent 70%)`,
                          filter: 'blur(8px)',
                        }}
                        animate={{
                          opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                    )}

                    {/* Day number */}
                    <span
                      style={{
                        fontFamily: 'Georgia, serif',
                        color: mood === 'heavy' || mood === 'overwhelmed' ? '#F4F1EC' : '#6B6761',
                        fontSize: '12px',
                        fontWeight: 400,
                        letterSpacing: '0.01em',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {day}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Subtle Divider */}
          <div
            className="w-full h-px my-3 flex-shrink-0"
            style={{
              background: 'linear-gradient(to right, transparent 0%, rgba(138, 134, 128, 0.15) 50%, transparent 100%)',
            }}
          />

          {/* Mood Footprint Detail (Interactive Pane) */}
          <AnimatePresence mode="wait">
            {selectedDay && selectedDayMood && (
              <motion.div
                className="w-full pb-4 flex-shrink-0"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
              >
                {/* Label */}
                <div className="text-center mb-4">
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#6B6761',
                      fontWeight: 300,
                      fontSize: '13px',
                      letterSpacing: '0.01em',
                      fontStyle: 'italic',
                    }}
                  >
                    Your emotional flow for this day.
                  </p>
                </div>

                {/* Footprint Waveform Visualization */}
                <div className="relative w-full h-32 flex items-center justify-center">
                  {/* Layer 1 - Deepest/widest */}
                  <motion.div
                    className="absolute rounded-full"
                    style={{
                      width: '85%',
                      height: '24px',
                      background: 'linear-gradient(to right, #E8E4DD, #D3CFC8, #E8E4DD)',
                      boxShadow: '0 3px 12px rgba(138, 134, 128, 0.15), inset 0 1px 3px rgba(255, 255, 255, 0.4)',
                    }}
                    initial={{ opacity: 0, scaleX: 0.8 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.1, duration: 0.6 }}
                  />

                  {/* Layer 2 */}
                  <motion.div
                    className="absolute rounded-full"
                    style={{
                      width: '70%',
                      height: '20px',
                      top: '25%',
                      background: selectedDayMood === 'calm' 
                        ? 'linear-gradient(to right, #F4F1EC, #E8E4DD, #F4F1EC)'
                        : selectedDayMood === 'okay'
                        ? 'linear-gradient(to right, #D3CFC8, #C4BFB8, #D3CFC8)'
                        : selectedDayMood === 'heavy'
                        ? 'linear-gradient(to right, #B3ABA0, #A29A8F, #B3ABA0)'
                        : 'linear-gradient(to right, #8A8680, #7A726D, #8A8680)',
                      boxShadow: '0 2px 10px rgba(138, 134, 128, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.35)',
                    }}
                    initial={{ opacity: 0, scaleX: 0.8 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                  />

                  {/* Layer 3 */}
                  <motion.div
                    className="absolute rounded-full"
                    style={{
                      width: '55%',
                      height: '16px',
                      top: '42%',
                      background: 'linear-gradient(to right, #C4BFB8, #B3ABA0, #C4BFB8)',
                      boxShadow: '0 2px 8px rgba(138, 134, 128, 0.18), inset 0 1px 2px rgba(255, 255, 255, 0.3)',
                    }}
                    initial={{ opacity: 0, scaleX: 0.8 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                  />

                  {/* Layer 4 - Top/lightest */}
                  <motion.div
                    className="absolute rounded-full"
                    style={{
                      width: '40%',
                      height: '14px',
                      top: '58%',
                      background: 'linear-gradient(to right, #F4F1EC, #E8E4DD, #F4F1EC)',
                      boxShadow: '0 2px 6px rgba(138, 134, 128, 0.12), inset 0 1px 2px rgba(255, 255, 255, 0.4)',
                    }}
                    initial={{ opacity: 0, scaleX: 0.8 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                  />

                  {/* Layer 5 - Accent highlight */}
                  <motion.div
                    className="absolute rounded-full"
                    style={{
                      width: '25%',
                      height: '10px',
                      top: '72%',
                      background: selectedDayMood === 'overwhelmed'
                        ? 'linear-gradient(to right, #8A8680, #6B6761, #8A8680)'
                        : 'linear-gradient(to right, #D3CFC8, #C4BFB8, #D3CFC8)',
                      boxShadow: '0 2px 5px rgba(138, 134, 128, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.35)',
                    }}
                    initial={{ opacity: 0, scaleX: 0.8 }}
                    animate={{ opacity: 1, scaleX: 1 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                  />
                </div>

                {/* Day info */}
                <div className="text-center mt-4">
                  <p
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#4B4B4B',
                      fontWeight: 400,
                      fontSize: '14px',
                      letterSpacing: '0.01em',
                    }}
                  >
                    February {selectedDay}, 2025
                  </p>
                  <p
                    className="mt-1 capitalize"
                    style={{
                      fontFamily: 'Georgia, serif',
                      color: '#8A8680',
                      fontWeight: 300,
                      fontSize: '13px',
                      letterSpacing: '0.02em',
                    }}
                  >
                    {selectedDayMood}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spacer */}
          <div className="flex-1 min-h-[40px]" />

          {/* Footer Buttons - Always Visible */}
          <motion.div
            className="w-full pt-3 pb-4 space-y-3 flex-shrink-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1 }}
          >
            {/* View Journal Entry */}
            <button
              onClick={onViewJournal}
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
                View Journal Entry
              </span>
            </button>

            {/* Return to Chat */}
            <button
              onClick={onReturnToChat}
              className="w-full rounded-full px-8 py-4 transition-all duration-300 hover:scale-[1.01] active:scale-[0.98]"
              style={{
                background: 'transparent',
                boxShadow: 'none',
                border: '1.5px solid #8A8680',
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
                Return to Chat
              </span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav
        activeScreen="journal"
        variant="sage"
        onNavigateHome={onReturnToChat}
        onNavigateActivities={onNavigateToActivities}
        onNavigateJournal={onViewJournal}
        onNavigateProfile={onNavigateToProfile}
        onNavigateHelp={onNavigateToHelp}
      />
    </div>
  );
}