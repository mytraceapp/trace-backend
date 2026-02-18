import { apiFetch } from '../lib/apiFetch';
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useFonts } from 'expo-font';
import { TrendingUp, Clock, Calendar, Sparkles } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Colors } from '../constants/colors';
import { FontFamily, TraceWordmark } from '../constants/typography';
import { Shadows } from '../constants/shadows';
import { getStableId } from '../lib/stableId';
import { fetchPatternsInsights, PatternsInsightsResult } from '../lib/chat';
import { supabase } from '../lib/supabase';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

interface LastHourSections {
  emotionalArc?: string;
  whatCameUp?: string;
  whatHelped?: string;
}


async function loadRecentChatMessages(userId: string | null): Promise<ChatMessage[]> {
  if (!userId) return [];
  try {
    const key = `trace:conversation_history:${userId}`;
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return [];
    const messages: ChatMessage[] = JSON.parse(stored);
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return messages.filter(m => {
      if (!m.timestamp) return true;
      return new Date(m.timestamp).getTime() >= oneHourAgo;
    });
  } catch (err) {
    console.error('Failed to load chat messages:', err);
    return [];
  }
}


interface LastHourResult {
  ok: boolean;
  hasHistory: boolean;
  summaryText: string | null;
  sections: LastHourSections | null;
}

async function fetchLastHourSummary(params: { 
  userId: string | null; 
  deviceId: string;
  recentMessages?: ChatMessage[];
}): Promise<LastHourResult> {
  const res = await apiFetch('/api/patterns/last-hour', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  const json = await res.json();
  const sections = json.sections ?? null;
  const hasSections = sections && (sections.emotionalArc || sections.whatCameUp || sections.whatHelped);
  return {
    ok: json.ok ?? false,
    hasHistory: json.hasHistory ?? false,
    summaryText: json.summaryText ?? null,
    sections: hasSections ? sections : null,
  };
}

interface WeeklySectionsData {
  weekShape?: string | null;
  recurringThemes?: string | null;
  whatsShifting?: string | null;
  whatWorked?: string | null;
}

async function fetchWeeklySummary(params: {
  userId: string | null;
  deviceId: string | null;
}): Promise<string | null> {
  try {
    const res = await apiFetch('/api/patterns/weekly-summary', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.weeklyNarrative && typeof json.weeklyNarrative === 'string') {
      return json.weeklyNarrative;
    }
    if (json.summaryText && typeof json.summaryText === 'string') {
      return json.summaryText;
    }
    return null;
  } catch (err) {
    console.error('[PATTERNS] weekly-summary fetch error:', err);
    return null;
  }
}

export default function PatternsReport() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [fontsLoaded] = useFonts({
    'Alore': require('../assets/fonts/Alore-Regular.otf'),
    'Canela': require('../assets/fonts/Canela-Regular.ttf'),
  });

  const fallbackSerifFont = Platform.select({ ios: 'Georgia', android: 'serif' }) || 'Georgia';
  const canelaFont = fontsLoaded ? FontFamily.canela : fallbackSerifFont;
  const aloreFont = fontsLoaded ? FontFamily.alore : fallbackSerifFont;

  const [stableId, setStableId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastHourNarrative, setLastHourNarrative] = useState<string | null>(null);
  const [hasLastHourHistory, setHasLastHourHistory] = useState(false);
  const [isLastHourLoading, setIsLastHourLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patternsSummary, setPatternsSummary] = useState<string | null>(null);
  const [weeklyNarrative, setWeeklyNarrative] = useState<string | null>(null);
  const [isPatternsSummaryLoading, setPatternsSummaryLoading] = useState(false);

  const [insights, setInsights] = useState<PatternsInsightsResult | null>(null);
  const [isInsightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    const initPatterns = async () => {
      const deviceId = await getStableId();
      setStableId(deviceId);
      
      let authUserId: string | null = null;
      
      try {
        authUserId = await AsyncStorage.getItem('trace:auth_user_id');
      } catch (e) {}
      
      if (!authUserId) {
        try {
          const { data } = await supabase.auth.getUser();
          authUserId = data?.user?.id ?? null;
        } catch (e) {}
      }
      
      if (!authUserId) {
        try {
          authUserId = await AsyncStorage.getItem('user_id');
        } catch (e) {}
      }
      
      setUserId(authUserId);
    };
    
    initPatterns();
  }, []);

  const loadLastHourSummary = useCallback(async () => {
    try {
      if (!stableId || !userId) return;

      setIsLastHourLoading(true);
      setError(null);

      const recentMessages = await loadRecentChatMessages(userId);

      const result = await fetchLastHourSummary({
        userId: userId,
        deviceId: stableId,
        recentMessages,
      });

      setHasLastHourHistory(result.hasHistory);
      if (result.sections) {
        const parts = [result.sections.emotionalArc, result.sections.whatCameUp, result.sections.whatHelped].filter(Boolean);
        setLastHourNarrative(parts.length > 0 ? parts.join(' ') : result.summaryText);
      } else {
        setLastHourNarrative(result.summaryText);
      }
    } catch (err) {
      console.error('[PATTERNS] last-hour fetch error:', err);
      setHasLastHourHistory(false);
      setLastHourNarrative(null);
      setError('Connection error');
    } finally {
      setIsLastHourLoading(false);
    }
  }, [stableId, userId]);

  const loadInsights = useCallback(async () => {
    try {
      if (!userId) return;

      setInsightsLoading(true);
      setPatternsSummaryLoading(true);

      const result = await fetchPatternsInsights({ userId, deviceId: stableId });

      setInsights(result);

      setWeeklyNarrative(result?.weeklyNarrative || null);
    } catch (err) {
      console.error('[PATTERNS] insights fetch error:', err);
      setInsights(null);
      setPatternsSummary(null);
      setWeeklyNarrative(null);
    } finally {
      setInsightsLoading(false);
      setPatternsSummaryLoading(false);
    }
  }, [stableId, userId]);

  useEffect(() => { loadLastHourSummary(); }, [loadLastHourSummary]);
  useEffect(() => { loadInsights(); }, [loadInsights]);

  useFocusEffect(
    useCallback(() => {
      loadLastHourSummary();
      loadInsights();
    }, [loadLastHourSummary, loadInsights])
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E8E2D8', '#D9D0C3', '#C8BBAA']}
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
          { paddingTop: insets.top + 70, paddingBottom: insets.bottom + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <TrendingUp size={28} color="#6B7B6E" strokeWidth={1.5} />
          <Text style={[styles.screenTitle, { fontFamily: canelaFont }]}>
            Patterns
          </Text>
          <Text style={[styles.subtitle, { fontFamily: canelaFont }]}>
            What your check-ins are telling you
          </Text>
        </View>

        {/* ─── LAST HOUR CARD ─── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Clock size={18} color="#6B7B6E" strokeWidth={1.5} />
            <Text style={[styles.cardTitle, { fontFamily: canelaFont }]}>
              Right Now
            </Text>
          </View>
          <Text style={[styles.cardSubtitle, { fontFamily: canelaFont }]}>
            Your last hour with TRACE
          </Text>

          {isLastHourLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#6B7B6E" />
              <Text style={[styles.loadingText, { fontFamily: canelaFont }]}>
                Reading your recent moments...
              </Text>
            </View>
          )}

          {!isLastHourLoading && error && (
            <Text style={[styles.errorText, { fontFamily: canelaFont }]}>{error}</Text>
          )}

          {!isLastHourLoading && !error && (
            <>
              {hasLastHourHistory && lastHourNarrative ? (
                <Text style={[styles.narrativeText, { fontFamily: canelaFont }]}>
                  {lastHourNarrative}
                </Text>
              ) : (
                <Text style={[styles.emptyText, { fontFamily: canelaFont }]}>
                  No check-ins in the last hour. That's okay — sometimes quiet is what you need.
                </Text>
              )}
            </>
          )}
        </View>

        {/* ─── WEEKLY CARD ─── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Calendar size={18} color="#6B7B6E" strokeWidth={1.5} />
            <Text style={[styles.cardTitle, { fontFamily: canelaFont }]}>
              Your Week
            </Text>
          </View>
          <Text style={[styles.cardSubtitle, { fontFamily: canelaFont }]}>
            Patterns across the last 7 days
          </Text>

          {isPatternsSummaryLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#6B7B6E" />
              <Text style={[styles.loadingText, { fontFamily: canelaFont }]}>
                Tracing your week...
              </Text>
            </View>
          )}

          {!isPatternsSummaryLoading && weeklyNarrative ? (
            <Text style={[styles.narrativeText, { fontFamily: canelaFont }]}>
              {weeklyNarrative}
            </Text>
          ) : !isPatternsSummaryLoading ? (
            <Text style={[styles.emptyText, { fontFamily: canelaFont }]}>
              As you keep checking in, TRACE will start noticing the shape of your week.
            </Text>
          ) : null}
        </View>

        {/* ─── WHAT HELPS MOST CARD ─── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Sparkles size={18} color="#6B7B6E" strokeWidth={1.5} />
            <Text style={[styles.cardTitle, { fontFamily: canelaFont }]}>
              What Helps Most
            </Text>
          </View>
          <Text style={[styles.summaryText, { fontFamily: canelaFont }]}>
            {isInsightsLoading
              ? 'Noticing your patterns...'
              : insights?.mostHelpfulActivity?.label || "Once you've tried a few activities, I'll start noticing which ones you return to the most."}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E2D8',
  },
  vignetteOverlay: {
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 100,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 40,
    paddingBottom: 8,
  },
  traceLabel: {
    fontSize: TraceWordmark.fontSize,
    letterSpacing: TraceWordmark.letterSpacing,
    color: '#6B7B6E',
    textAlign: 'center',
    paddingLeft: TraceWordmark.paddingLeft,
    ...Shadows.traceWordmark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  screenTitle: {
    fontSize: 28,
    color: '#4A5A4C',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7B6E',
    marginTop: 6,
    textAlign: 'center',
    opacity: 0.9,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.55)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 20,
    color: '#4A5A4C',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#8A9A8C',
    marginBottom: 18,
    marginLeft: 28,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7B6E',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 14,
    color: '#A67C5B',
  },
  summaryText: {
    fontSize: 16,
    color: '#4A5A4C',
    lineHeight: 24,
  },
  narrativeText: {
    fontSize: 15,
    color: '#4A5A4C',
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7B6E',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(107, 123, 110, 0.18)',
  },
  metaPill: {
    backgroundColor: 'rgba(107, 123, 110, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  metaPillText: {
    fontSize: 12,
    color: '#5A6A5C',
    fontWeight: '500',
  },
});
