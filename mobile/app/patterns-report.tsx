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
import { TrendingUp } from 'lucide-react-native';

import { Colors } from '../constants/colors';
import { FontFamily, TraceWordmark } from '../constants/typography';
import { Shadows } from '../constants/shadows';
import { getStableId } from '../lib/stableId';
import { fetchPatternsWeeklySummary } from '../lib/chat';

const API_BASE = 'https://ca2fbbde-8b20-444e-a3cf-9a3451f8b1e2-00-n5dvsa77hetw.spock.replit.dev';

interface LastHourResult {
  ok: boolean;
  hasHistory: boolean;
  summaryText: string | null;
}

async function fetchLastHourSummary(params: { userId: string | null; deviceId: string }): Promise<LastHourResult> {
  const res = await fetch(`${API_BASE}/api/patterns/last-hour`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const json = await res.json();
  return {
    ok: json.ok ?? false,
    hasHistory: json.hasHistory ?? false,
    summaryText: json.summaryText ?? null,
  };
}

export default function PatternsReport() {
  console.log('💠 [TRACE PATTERNS] PatternsReport RENDER');
  
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
  const [lastHourSummary, setLastHourSummary] = useState<string | null>(null);
  const [hasLastHourHistory, setHasLastHourHistory] = useState(false);
  const [isLastHourLoading, setIsLastHourLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patternsSummary, setPatternsSummary] = useState<string | null>(null);
  const [isPatternsSummaryLoading, setPatternsSummaryLoading] = useState(false);

  console.log(
    '💠 [TRACE PATTERNS] stableId / lastHour state =',
    stableId,
    { lastHourSummary, hasLastHourHistory, isLastHourLoading }
  );

  useEffect(() => {
    const loadStableId = async () => {
      const id = await getStableId();
      console.log('💠 [TRACE PATTERNS] stableId loaded:', id);
      setStableId(id);
    };
    loadStableId();
  }, []);

  const loadLastHourSummary = useCallback(async () => {
    console.log('🧠 [TRACE PATTERNS] last-hour loader invoked');

    try {
      if (!stableId) {
        console.log('🧠 [TRACE PATTERNS] no stable device id yet, skipping last-hour');
        return;
      }

      setIsLastHourLoading(true);
      setError(null);

      const result = await fetchLastHourSummary({
        userId: null,
        deviceId: stableId,
      });

      console.log('🧠 [TRACE PATTERNS] last-hour result:', result);

      setHasLastHourHistory(result.hasHistory);
      setLastHourSummary(result.summaryText);
    } catch (err) {
      console.error('🧠 [TRACE PATTERNS] last-hour fetch error:', err);
      setHasLastHourHistory(false);
      setLastHourSummary(null);
      setError('Connection error');
    } finally {
      setIsLastHourLoading(false);
    }
  }, [stableId]);

  const loadWeeklySummary = useCallback(async () => {
    try {
      if (!stableId) {
        console.log('🧠 TRACE weekly-summary: no stable device id yet, skipping');
        return;
      }

      setPatternsSummaryLoading(true);

      const result = await fetchPatternsWeeklySummary({
        userId: null,
        deviceId: stableId,
        userName: null,
        peakWindowLabel: null,
        energyRhythmLabel: null,
        energyRhythmDetail: null,
        behaviorSignatures: [],
      });

      console.log('🧠 TRACE weekly-summary result:', result);

      setPatternsSummary(result.summaryText);
    } catch (err) {
      console.error('🧠 TRACE weekly-summary fetch error:', err);
      setPatternsSummary(null);
    } finally {
      setPatternsSummaryLoading(false);
    }
  }, [stableId]);

  useEffect(() => {
    console.log('💠 [TRACE PATTERNS] useEffect -> loadLastHourSummary');
    loadLastHourSummary();
  }, [loadLastHourSummary]);

  useEffect(() => {
    console.log('💠 [TRACE PATTERNS] useEffect -> loadWeeklySummary');
    loadWeeklySummary();
  }, [loadWeeklySummary]);

  useFocusEffect(
    useCallback(() => {
      console.log('💠 [TRACE PATTERNS] useFocusEffect -> loadLastHourSummary');
      loadLastHourSummary();
    }, [loadLastHourSummary])
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
            Reflections from your recent conversations
          </Text>
        </View>

        <View style={styles.lastHourPill}>
          <Text style={styles.lastHourPillText}>
            {isLastHourLoading
              ? '•••'
              : hasLastHourHistory
              ? 'Last hour noted'
              : 'No recent chat'}
          </Text>
        </View>

        {!!lastHourSummary && (
          <Text style={styles.lastHourSummaryDebug}>
            {lastHourSummary}
          </Text>
        )}

        <View style={styles.card}>
          <Text style={[styles.cardTitle, { fontFamily: canelaFont }]}>
            Last Hour with TRACE
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
            <Text style={[styles.errorText, { fontFamily: canelaFont }]}>
              {error}
            </Text>
          )}

          {!isLastHourLoading && !error && (
            <>
              {hasLastHourHistory && lastHourSummary ? (
                <Text style={[styles.summaryText, { fontFamily: canelaFont }]}>
                  {lastHourSummary}
                </Text>
              ) : (
                <Text style={[styles.emptyText, { fontFamily: canelaFont }]}>
                  No conversations in the last hour. That's okay - sometimes quiet is what we need.
                </Text>
              )}
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={[styles.cardTitle, { fontFamily: canelaFont }]}>
            Your Week
          </Text>
          <Text style={[styles.summaryText, { fontFamily: canelaFont }]}>
            {isPatternsSummaryLoading
              ? 'Tracing your week...'
              : patternsSummary ??
                'As you keep checking in, TRACE will gently offer a small reflection on how your week is unfolding.'}
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
  lastHourPill: {
    alignSelf: 'center',
    backgroundColor: 'rgba(107, 123, 110, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  lastHourPillText: {
    fontSize: 13,
    color: '#4A5A4C',
    fontWeight: '500',
  },
  lastHourSummaryDebug: {
    marginTop: 4,
    paddingHorizontal: 24,
    fontSize: 11,
    color: 'rgba(74, 90, 76, 0.6)',
    textAlign: 'center',
    marginBottom: 16,
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
  cardTitle: {
    fontSize: 18,
    color: '#4A5A4C',
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  emptyText: {
    fontSize: 14,
    color: '#6B7B6E',
    fontStyle: 'italic',
    lineHeight: 22,
  },
});
