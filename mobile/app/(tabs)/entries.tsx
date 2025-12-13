import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Pressable, 
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useFonts } from 'expo-font';
import * as Haptics from 'expo-haptics';
import { BookOpen } from 'lucide-react-native';

import { Colors } from '../../constants/colors';
import { FontFamily, TraceWordmark, ScreenTitle, BodyText } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { Spacing } from '../../constants/spacing';
import { useAmbientAudio } from '../../hooks/useAmbientAudio';
import { EntryAccordion } from '../../components/EntryAccordion';
import { EntryPreviewCard } from '../../components/EntryPreviewCard';
import { 
  listEntries,
  seedDemoEntriesIfEmpty,
  Entry 
} from '../../lib/entries';

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function EntriesScreen() {
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

  const [entries, setEntries] = useState<Entry[]>([]);
  const [dailyExpanded, setDailyExpanded] = useState(true);
  const [notesExpanded, setNotesExpanded] = useState(false);

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

  const dailyEntries = entries.filter(e => e.group === 'daily');
  const notesEntries = entries.filter(e => e.group === 'notes');
  const totalEntries = entries.length;

  const handleJournalPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/journal');
  };

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
          <Text style={[styles.title, { fontFamily: canelaFont }]}>Your Entries</Text>
          <Text style={[styles.subtitle, { fontFamily: canelaFont }]}>
            {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'} saved
          </Text>
        </View>

        <EntryAccordion
          title="Daily sessions"
          count={dailyEntries.length}
          type="daily"
          isExpanded={dailyExpanded}
          onToggle={() => setDailyExpanded(!dailyExpanded)}
        >
          {dailyEntries.map((entry) => (
            <EntryPreviewCard
              key={entry.id}
              title={entry.title}
              preview={entry.preview}
              timestamp={formatTimestamp(new Date(entry.createdAt))}
            />
          ))}
        </EntryAccordion>

        <EntryAccordion
          title="Emotional notes"
          count={notesEntries.length}
          type="notes"
          isExpanded={notesExpanded}
          onToggle={() => setNotesExpanded(!notesExpanded)}
        >
          {notesEntries.map((entry) => (
            <EntryPreviewCard
              key={entry.id}
              title={entry.title}
              preview={entry.preview}
              timestamp={formatTimestamp(new Date(entry.createdAt))}
            />
          ))}
        </EntryAccordion>
      </ScrollView>

      <View style={[styles.bottomButtonContainer, { paddingBottom: insets.bottom + 90 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.journalButton,
            Shadows.button,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }
          ]}
          onPress={handleJournalPress}
        >
          <BookOpen size={18} color="#FDFCFA" strokeWidth={1.5} style={styles.journalIcon} />
          <Text style={[styles.journalButtonText, { fontFamily: canelaFont }]}>
            Journal
          </Text>
        </Pressable>
      </View>
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
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.screenPadding,
    alignItems: 'center',
  },
  journalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6B6761',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 28,
    minWidth: 160,
  },
  journalIcon: {
    marginRight: 8,
  },
  journalButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#FDFCFA',
    letterSpacing: 0.3,
  },
});
