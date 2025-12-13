import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Platform,
  TextInput,
  Modal,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useFonts } from 'expo-font';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '../../constants/colors';
import { FontFamily, TraceWordmark, ScreenTitle, BodyText } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { Spacing } from '../../constants/spacing';
import { useAmbientAudio } from '../../hooks/useAmbientAudio';
import { 
  listEntries,
  addEntry,
  seedDemoEntriesIfEmpty,
  Entry 
} from '../../lib/entries';

type MoodType = 'calm' | 'okay' | 'heavy' | 'overwhelmed';

interface MoodOption {
  type: MoodType;
  label: string;
  description: string;
  color: string;
}

const moodOptions: MoodOption[] = [
  {
    type: 'calm',
    label: 'Calm',
    description: 'Peaceful & centered',
    color: '#F4F1EC',
  },
  {
    type: 'okay',
    label: 'Okay',
    description: 'Steady & manageable',
    color: '#D3CFC8',
  },
  {
    type: 'heavy',
    label: 'Heavy',
    description: 'Weighed down',
    color: '#B3ABA0',
  },
  {
    type: 'overwhelmed',
    label: 'Overwhelmed',
    description: 'Intense & difficult',
    color: '#8A8680',
  },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
    const entryDate = new Date(entry.createdAt);
    const entryKey = formatDateKey(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate());
    return entryKey === dateKey;
  });
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const { play, pause, isLoaded } = useAmbientAudio({
    volume: 0.35,
    fadeInDuration: 6000,
    fadeOutDuration: 1500,
    loop: true,
    playbackRate: 0.90,
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;

  const now = new Date();
  const [currentMonthIndex, setCurrentMonthIndex] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(now.getDate());
  const [expandedDay, setExpandedDay] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [newEntryText, setNewEntryText] = useState('');
  const [newEntryMood, setNewEntryMood] = useState<MoodType>('calm');
  const [aiReflection, setAiReflection] = useState<string>('"I\'m here whenever you\'re ready. No rush, no pressure."');
  const [isLoadingReflection, setIsLoadingReflection] = useState(false);

  const toothpickAnim = useRef(new Animated.Value(0)).current;

  const todayDate = now.getDate();
  const todayMonth = now.getMonth();
  const todayYear = now.getFullYear();
  const isViewingCurrentMonth = currentMonthIndex === todayMonth && currentYear === todayYear;

  const loadEntries = async () => {
    await seedDemoEntriesIfEmpty();
    const allEntries = await listEntries();
    setEntries(allEntries);
  };

  useEffect(() => {
    loadEntries();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
      if (isLoaded) {
        play();
      }
      return () => {
        pause();
      };
    }, [isLoaded, play, pause])
  );

  useEffect(() => {
    if (expandedDay !== null) {
      Animated.spring(toothpickAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 8,
      }).start();
    } else {
      toothpickAnim.setValue(0);
    }
  }, [expandedDay]);

  const goToPreviousMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentMonthIndex === 0) {
      setCurrentMonthIndex(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonthIndex(currentMonthIndex - 1);
    }
    setSelectedDay(null);
    setExpandedDay(null);
  };

  const goToNextMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentMonthIndex === 11) {
      setCurrentMonthIndex(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonthIndex(currentMonthIndex + 1);
    }
    setSelectedDay(null);
    setExpandedDay(null);
  };

  const generateCalendarDays = (): (number | null)[] => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonthIndex);
    const firstDayOfWeek = getFirstDayOfMonth(currentYear, currentMonthIndex);
    const days: (number | null)[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const dayHasEntries = (day: number): boolean => {
    const dayEntries = getEntriesForDate(entries, currentYear, currentMonthIndex, day);
    return dayEntries.length > 0;
  };

  const handleDayPress = (day: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDay(day);
    if (expandedDay === day) {
      setExpandedDay(null);
    } else {
      setExpandedDay(day);
    }
  };

  const selectedDayEntries = selectedDay 
    ? getEntriesForDate(entries, currentYear, currentMonthIndex, selectedDay)
    : [];

  const handleRefreshReflection = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsLoadingReflection(true);
    setTimeout(() => {
      const reflections = [
        '"Take a moment to breathe. Every step forward counts."',
        '"You\'re doing better than you think. Keep going."',
        '"It\'s okay to rest. Tomorrow is a new beginning."',
        '"Small progress is still progress. Be gentle with yourself."',
      ];
      setAiReflection(reflections[Math.floor(Math.random() * reflections.length)]);
      setIsLoadingReflection(false);
    }, 1500);
  };

  const handleLogNewMoment = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowNewEntryModal(true);
  };

  const handleSaveEntry = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const moodLabel = moodOptions.find(m => m.type === newEntryMood)?.label || 'Moment';
    await addEntry({
      type: 'journal',
      group: 'notes',
      title: `Feeling ${moodLabel}`,
      preview: newEntryText || `Checked in feeling ${moodLabel.toLowerCase()}.`,
      meta: {
        mood: newEntryMood,
      },
    });
    setNewEntryText('');
    setNewEntryMood('calm');
    setShowNewEntryModal(false);
    loadEntries();
  };

  const handleCancelEntry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNewEntryText('');
    setNewEntryMood('calm');
    setShowNewEntryModal(false);
  };

  const calendarDays = generateCalendarDays();
  const currentMonth = MONTHS[currentMonthIndex];

  const getLoggedMoods = (): string[] => {
    return selectedDayEntries
      .filter(e => e.meta?.mood)
      .map(e => e.meta?.mood as string);
  };

  const baseLengths = [120, 70, 95, 50];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[...Colors.day.backgroundGradient]}
        locations={[0, 0.6, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={[styles.vignetteOverlay, StyleSheet.absoluteFill]} pointerEvents="none" />

      <View style={[styles.fixedHeader, { paddingTop: insets.top + 4 }]}>
        <Pressable onPress={() => router.push('/(tabs)/chat')}>
          <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
        </Pressable>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.traceToTitle, paddingBottom: insets.bottom + 140 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { fontFamily: canelaFont }]}>Journal</Text>
          <Text style={[styles.subtitle, { fontFamily: canelaFont }]}>
            Your thoughts, gently organized.
          </Text>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.monthSelector}>
            <Pressable 
              onPress={goToPreviousMonth}
              style={styles.monthArrow}
            >
              <Ionicons name="chevron-back" size={20} color="#8A8680" />
            </Pressable>

            <Text style={[styles.monthText, { fontFamily: canelaFont }]}>
              {currentMonth} {currentYear}
            </Text>

            <Pressable 
              onPress={goToNextMonth}
              style={styles.monthArrow}
            >
              <Ionicons name="chevron-forward" size={20} color="#8A8680" />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((day, index) => (
              <Text key={index} style={[styles.weekdayText, { fontFamily: canelaFont }]}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => {
              const isToday = isViewingCurrentMonth && day === todayDate;
              const hasEntries = day ? dayHasEntries(day) : false;
              const isSelected = day === selectedDay;

              return (
                <Pressable
                  key={index}
                  onPress={() => day && handleDayPress(day)}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                  ]}
                  disabled={!day}
                >
                  {day && (
                    <>
                      <Text style={[
                        styles.dayText,
                        { fontFamily: canelaFont },
                        isToday && styles.dayTextToday,
                      ]}>
                        {day}
                      </Text>

                      {isToday && (
                        <View style={styles.todayDot} />
                      )}

                      {hasEntries && !isToday && (
                        <View style={styles.entryDotsContainer}>
                          <View style={styles.entryDot} />
                          <View style={styles.entryDot} />
                        </View>
                      )}
                    </>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        {expandedDay && selectedDayEntries.length > 0 && (
          <Animated.View 
            style={[
              styles.toothpickContainer,
              {
                opacity: toothpickAnim,
                transform: [{
                  translateY: toothpickAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                }],
              },
            ]}
          >
            {moodOptions.map((mood, index) => {
              const loggedMoods = getLoggedMoods();
              const isLogged = loggedMoods.includes(mood.type);
              const barWidth = isLogged ? SCREEN_WIDTH - 80 : baseLengths[index];

              return (
                <View
                  key={mood.type}
                  style={[
                    styles.toothpickBar,
                    {
                      width: barWidth,
                      backgroundColor: mood.color,
                    },
                    isLogged && styles.toothpickBarLogged,
                  ]}
                />
              );
            })}
          </Animated.View>
        )}

        <View style={styles.reflectionCard}>
          <View style={styles.reflectionHeader}>
            <View style={styles.reflectionTitleRow}>
              <Ionicons name="sparkles" size={16} color="#5A4A3A" />
              <Text style={[styles.reflectionTitle, { fontFamily: canelaFont }]}>
                Today's Reflection
              </Text>
            </View>
            <Pressable onPress={handleRefreshReflection} style={styles.refreshButton}>
              <Ionicons 
                name="refresh" 
                size={14} 
                color="#8A8680" 
                style={isLoadingReflection ? styles.spinning : undefined}
              />
            </Pressable>
          </View>

          <Text style={[styles.reflectionText, { fontFamily: canelaFont }]}>
            {isLoadingReflection ? 'Reflecting on your day...' : aiReflection}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 65 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.logMomentButton,
            Shadows.button,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
          ]}
          onPress={handleLogNewMoment}
        >
          <Text style={[styles.logMomentButtonText, { fontFamily: canelaFont }]}>
            Log a New Moment
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={showNewEntryModal}
        transparent
        animationType="fade"
        onRequestClose={handleCancelEntry}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={handleCancelEntry} />
          
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontFamily: canelaFont }]}>New Moment</Text>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.modalScrollContent}
            >
              <Text style={[styles.modalDate, { fontFamily: canelaFont }]}>
                {currentMonth} {todayDate}, {currentYear}
              </Text>

              <Text style={[styles.modalLabel, { fontFamily: canelaFont }]}>
                How are you feeling?
              </Text>

              <View style={styles.moodOptionsContainer}>
                {moodOptions.map((mood) => {
                  const isSelected = newEntryMood === mood.type;
                  const isDark = mood.type === 'heavy' || mood.type === 'overwhelmed';
                  
                  return (
                    <Pressable
                      key={mood.type}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setNewEntryMood(mood.type);
                      }}
                      style={[
                        styles.moodOption,
                        { backgroundColor: mood.color },
                        isSelected && styles.moodOptionSelected,
                      ]}
                    >
                      <Text style={[
                        styles.moodLabel,
                        { fontFamily: canelaFont },
                        isDark && styles.moodLabelLight,
                      ]}>
                        {mood.label}
                      </Text>
                      <Text style={[
                        styles.moodDescription,
                        { fontFamily: canelaFont },
                        isDark && styles.moodDescriptionLight,
                      ]}>
                        {mood.description}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.modalLabel, { fontFamily: canelaFont }]}>
                What's on your mind?
              </Text>

              <TextInput
                value={newEntryText}
                onChangeText={setNewEntryText}
                placeholder="Write as much or as little as you need..."
                placeholderTextColor="#A49485"
                multiline
                scrollEnabled
                style={[styles.textInput, { fontFamily: canelaFont }]}
              />

              <View style={styles.modalButtonsRow}>
                <Pressable
                  onPress={handleCancelEntry}
                  style={[styles.modalButton, styles.cancelButton]}
                >
                  <Text style={[styles.cancelButtonText, { fontFamily: canelaFont }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveEntry}
                  style={[styles.modalButton, styles.saveButton]}
                >
                  <Text style={[styles.saveButtonText, { fontFamily: canelaFont }]}>Save</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  vignetteOverlay: {
    backgroundColor: 'transparent',
    opacity: 0.05,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    alignItems: 'center',
    paddingBottom: Spacing.md,
    backgroundColor: 'transparent',
  },
  traceLabel: {
    fontSize: TraceWordmark.fontSize,
    fontWeight: TraceWordmark.fontWeight,
    letterSpacing: TraceWordmark.letterSpacing,
    marginLeft: TraceWordmark.marginLeft,
    color: TraceWordmark.color,
    opacity: TraceWordmark.opacity,
    transform: [{ translateX: TraceWordmark.translateX }],
    ...Shadows.traceWordmark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
  },
  header: {
    marginBottom: Spacing.sectionGap,
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    marginTop: -6,
  },
  title: {
    fontSize: ScreenTitle.fontSize,
    fontWeight: ScreenTitle.fontWeight,
    marginBottom: 2,
    color: ScreenTitle.color,
    letterSpacing: ScreenTitle.letterSpacing,
  },
  subtitle: {
    fontSize: BodyText.fontSize,
    fontWeight: BodyText.fontWeight,
    color: Colors.day.textSecondary,
    letterSpacing: BodyText.letterSpacing,
  },
  calendarCard: {
    backgroundColor: '#F4F1EC',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#4B4B4B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  monthArrow: {
    padding: 8,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#4B4B4B',
    letterSpacing: 0.3,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '300',
    color: '#8A8680',
    letterSpacing: 0.5,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  dayCellSelected: {
    backgroundColor: 'rgba(138, 134, 128, 0.15)',
    shadowColor: '#4B4B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '300',
    color: '#6B6761',
    letterSpacing: 0.1,
  },
  dayTextToday: {
    fontWeight: '500',
    color: '#4B4B4B',
  },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#8A8680',
    shadowColor: '#8A8680',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  entryDotsContainer: {
    position: 'absolute',
    bottom: 4,
    flexDirection: 'row',
    gap: 2,
  },
  entryDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#8A8680',
    opacity: 0.6,
  },
  toothpickContainer: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    marginBottom: 16,
  },
  toothpickBar: {
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#4B4B4B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  toothpickBarLogged: {
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  reflectionCard: {
    backgroundColor: 'rgba(90, 74, 58, 0.08)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(90, 74, 58, 0.1)',
    shadowColor: '#4B4B4B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
  },
  reflectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reflectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reflectionTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#5A4A3A',
    letterSpacing: 0.1,
  },
  refreshButton: {
    padding: 4,
  },
  spinning: {
    opacity: 0.5,
  },
  reflectionText: {
    fontSize: 14,
    fontWeight: '300',
    color: '#6B6761',
    lineHeight: 24,
    fontStyle: 'italic',
    paddingLeft: 4,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.screenPadding,
    backgroundColor: 'transparent',
  },
  logMomentButton: {
    backgroundColor: 'rgba(107, 103, 97, 0.2)',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(107, 103, 97, 0.3)',
  },
  logMomentButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#5A5651',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(75, 75, 75, 0.4)',
  },
  modalContent: {
    backgroundColor: '#D9D4CA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalScrollContent: {
    flexGrow: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#4B4B4B',
    letterSpacing: 0.1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDate: {
    fontSize: 13,
    fontWeight: '300',
    color: '#8A8680',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B4B4B',
    marginBottom: 8,
  },
  moodOptionsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  moodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(180, 170, 158, 0.3)',
    shadowColor: '#4B4B4B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  moodOptionSelected: {
    borderColor: 'rgba(138, 134, 128, 0.3)',
    shadowOpacity: 0.12,
  },
  moodLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B4B4B',
  },
  moodLabelLight: {
    color: '#F4F1EC',
  },
  moodDescription: {
    fontSize: 11,
    fontWeight: '300',
    color: '#8A8680',
  },
  moodDescriptionLight: {
    color: 'rgba(244, 241, 236, 0.8)',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(138, 134, 128, 0.25)',
    padding: 12,
    fontSize: 14,
    fontWeight: '300',
    color: '#4B4B4B',
    minHeight: 120,
    maxHeight: 180,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(138, 134, 128, 0.3)',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#8A8680',
  },
  saveButton: {
    backgroundColor: '#F4F1EC',
    shadowColor: '#4B4B4B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B4B4B',
  },
});
