import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useFonts } from 'expo-font';
import * as Haptics from 'expo-haptics';

import { FontFamily, TraceWordmark } from '../../constants/typography';
import { Shadows } from '../../constants/shadows';
import { Spacing } from '../../constants/spacing';
import { EntryAccordion } from '../../components/EntryAccordion';
import { EntryPreviewCard } from '../../components/EntryPreviewCard';
import { 
  getEntryCounts, 
  getEntriesByGroup, 
  seedDemoEntriesIfEmpty,
  Entry 
} from '../../lib/entries';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  const timeStr = date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  if (diffDays === 0) {
    return `Today · ${timeStr}`;
  } else if (diffDays === 1) {
    return `Yesterday · ${timeStr}`;
  } else if (diffDays < 7) {
    return `${diffDays} days ago · ${timeStr}`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago · ${timeStr}`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` · ${timeStr}`;
  }
}

export default function EntriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [fontsLoaded] = useFonts({
    'Alore': require('../../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;

  const [expandedAccordion, setExpandedAccordion] = useState<'daily' | 'notes' | null>('notes');
  const [counts, setCounts] = useState({ daily: 0, notes: 0, total: 0 });
  const [dailyEntries, setDailyEntries] = useState<Entry[]>([]);
  const [notesEntries, setNotesEntries] = useState<Entry[]>([]);

  const loadData = async () => {
    await seedDemoEntriesIfEmpty();
    const entryCounts = await getEntryCounts();
    setCounts(entryCounts);
    
    const daily = await getEntriesByGroup('daily');
    const notes = await getEntriesByGroup('notes');
    setDailyEntries(daily);
    setNotesEntries(notes);
  };

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleAccordionToggle = (accordion: 'daily' | 'notes') => {
    if (expandedAccordion === accordion) {
      setExpandedAccordion(null);
    } else {
      setExpandedAccordion(accordion);
    }
  };

  const handleTracePress = () => {
    router.replace('/(tabs)/chat');
  };

  const handleJournalPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/journal/new');
  };

  const handleEntryPress = (entry: Entry) => {
    console.log('Entry pressed:', entry.id);
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#FAF8F5', '#F5F2ED', '#EDE9E3', '#E8E4DD', '#E3DFD8']}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 140 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={handleTracePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.traceLabel, { fontFamily: aloreFont }]}>TRACE</Text>
          </Pressable>
          
          <Text style={[styles.title, { fontFamily: canelaFont }]}>Your Entries</Text>
          <Text style={[styles.subtitle, { fontFamily: canelaFont }]}>
            {counts.total} entries saved
          </Text>
        </View>

        <View style={styles.accordions}>
          <EntryAccordion
            title="Daily sessions"
            count={counts.daily}
            type="daily"
            isExpanded={expandedAccordion === 'daily'}
            onToggle={() => handleAccordionToggle('daily')}
          >
            {dailyEntries.slice(0, 3).map((entry) => (
              <EntryPreviewCard
                key={entry.id}
                title={entry.title}
                preview={entry.preview || ''}
                timestamp={formatRelativeTime(entry.createdAt)}
                onPress={() => handleEntryPress(entry)}
              />
            ))}
            {dailyEntries.length === 0 && (
              <Text style={[styles.emptyText, { fontFamily: canelaFont }]}>
                Complete activities to see them here
              </Text>
            )}
          </EntryAccordion>

          <EntryAccordion
            title="Emotional notes"
            count={counts.notes}
            type="notes"
            isExpanded={expandedAccordion === 'notes'}
            onToggle={() => handleAccordionToggle('notes')}
          >
            {notesEntries.slice(0, 3).map((entry) => (
              <EntryPreviewCard
                key={entry.id}
                title={entry.title}
                preview={entry.preview || ''}
                timestamp={formatRelativeTime(entry.createdAt)}
                onPress={() => handleEntryPress(entry)}
              />
            ))}
            {notesEntries.length === 0 && (
              <Text style={[styles.emptyText, { fontFamily: canelaFont }]}>
                No emotional notes yet
              </Text>
            )}
          </EntryAccordion>
        </View>
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
          <Text style={[styles.journalButtonText, { fontFamily: canelaFont }]}>Journal</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  traceLabel: {
    fontSize: TraceWordmark.fontSize,
    fontWeight: TraceWordmark.fontWeight,
    letterSpacing: TraceWordmark.letterSpacing,
    marginLeft: TraceWordmark.marginLeft,
    color: TraceWordmark.color,
    opacity: TraceWordmark.opacity,
    ...Shadows.traceWordmark,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '300',
    color: '#4B4B4B',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '300',
    color: '#8A8680',
    letterSpacing: 0.3,
  },
  accordions: {
    gap: 0,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '300',
    color: '#A49485',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.screenPadding,
    backgroundColor: 'transparent',
  },
  journalButton: {
    backgroundColor: '#FDFCFA',
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(180, 170, 158, 0.2)',
  },
  journalButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#4B4B4B',
    letterSpacing: 0.5,
  },
});
