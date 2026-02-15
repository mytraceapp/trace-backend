import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, getApiUrl } from './apiFetch';

export interface PatternContext {
  peakWindow?: string | null;
  peakWindowConfidence?: 'high' | 'medium' | 'low' | 'insufficient' | null;
  stressEchoes?: string | null;
  stressEchoesConfidence?: 'high' | 'medium' | 'low' | 'insufficient' | null;
  mostHelpfulActivity?: string | null;
  mostHelpfulCount?: number | null;
  mostHelpfulConfidence?: 'high' | 'medium' | 'low' | 'insufficient' | null;
  weeklyRhythmPeak?: string | null;
  lastCalculatedAt?: string | null;
}

export interface ClientState {
  mode?: 'chat' | 'audio_player' | 'activity_reflection';
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'late_night';
  recentSentiment?: string | null;
  nowPlaying?: { trackId: string; title: string; album?: string } | null;
  lastNowPlaying?: { trackId: string; title: string; album?: string; stoppedAt: number } | null;
  currentSoundState?: string | null;
  lastSuggestion?: { suggestion_id?: string; type: string; id: string; ts: number; accepted?: boolean | null } | null;
  lastActivity?: { id: string; ts: number } | null;
  doorwayState?: Record<string, unknown> | null;
  sessionTurnCount?: number;
  lastHookAt?: number | null;
  lastHookGlobalAt?: number | null;
  localNow?: number;
}

export interface WeatherContext {
  temperature?: number;
  windSpeed?: number;
  summary?: string;
  cloudCover?: number;
  isDayTime?: boolean;
}

export async function sendChatMessage({ messages, userName, chatStyle, localTime, localDay, localDate, userId, deviceId, timezone, patternContext, tonePreference, traceStudiosContext, client_state, weatherContext, isGreetingResponse, greetingText, conversation_id }: {
  messages: Array<{ role: string; content: string }>;
  userName?: string | null;
  chatStyle?: string;
  localTime?: string;
  localDay?: string;
  localDate?: string;
  userId?: string | null;
  deviceId?: string | null;
  timezone?: string | null;
  patternContext?: PatternContext | null;
  tonePreference?: 'neutral' | 'faith' | null;
  traceStudiosContext?: string | null;
  client_state?: ClientState | null;
  weatherContext?: WeatherContext | null;
  isGreetingResponse?: boolean;
  greetingText?: string | null;
  conversation_id?: string | null;
}) {
  console.log(
    '🆔 TRACE sendChatMessage ids:',
    'userId =',
    userId || 'null',
    'deviceId =',
    deviceId || 'null'
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout for retry system

  try {
    const res = await apiFetch(
      '/api/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          messages,
          conversation_id: conversation_id || null,
          userName,
          chatStyle,
          localTime,
          localDay,
          localDate,
          userId: userId || null,
          deviceId: deviceId || null,
          timezone: timezone || null,
          patternContext: patternContext || null,
          tonePreference: tonePreference || 'neutral',
          traceStudiosContext: traceStudiosContext || null,
          client_state: client_state || null,
          weatherContext: weatherContext || null,
          isGreetingResponse: isGreetingResponse || false,
          greetingText: greetingText || null,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error('Server error');
    }

    let data = await res.json();

    if (!data || typeof data !== 'object') {
      data = {};
    }

    const activitySuggestion = data.activity_suggestion || {
      name: null,
      reason: null,
      should_navigate: false,
      dreamscapeTrackId: null,
    };
    
    // Ensure dreamscapeTrackId is always present (even if null)
    if (!('dreamscapeTrackId' in activitySuggestion)) {
      activitySuggestion.dreamscapeTrackId = null;
    }
    
    // Handle pattern_metadata for explainability
    const patternMetadata = data.pattern_metadata || null;
    
    // Extract traceStudios context for tracking music reveal conversations
    const traceStudios = data.traceStudios || null;
    
    // Extract audio_action for Night Swim / Spotify playback
    const audio_action = data.audio_action || null;
    
    // Extract client_state_patch for state updates (doorways, suggestions, etc.)
    const client_state_patch = data.client_state_patch || null;
    
    // Extract doorway info if triggered
    const doorway = data.doorway || null;
    
    // Extract brain suggestion if present
    const suggestion = data.suggestion || null;
    
    // Extract curiosity hook if present
    const curiosity_hook = data.curiosity_hook || null;

    const sound_state = data.sound_state || null;

    const crisis_resources = data.crisis_resources || null;

    const echo_offer = data.echo_offer || null;

    return {
      message: data.message || "mm, I'm here.",
      messages: data.messages || null,
      isCrisisMultiMessage: data.isCrisisMultiMessage || false,
      isCrisisMode: data.isCrisisMode || false,
      activity_suggestion: activitySuggestion,
      pattern_metadata: patternMetadata,
      traceStudios,
      audio_action,
      client_state_patch,
      doorway,
      suggestion,
      curiosity_hook,
      sound_state,
      crisis_resources,
      echo_offer,
      response_source: data.response_source || null,
    };
  } catch (err: any) {
    clearTimeout(timeout);

    console.log('Chat API failed:', err?.message);

    // Sound like TRACE even when there's a connection issue
    return {
      message: "mm, I missed that for a second. Say that again?",
      activity_suggestion: {
        name: null,
        reason: null,
        should_navigate: false,
        dreamscapeTrackId: null,
      },
    };
  }
}


// Helper to gather user context for greeting

export interface GreetingContext {
  hasRecentCheckIn: boolean;
  justDidActivity: boolean;
  recentActivityName: string | null;
  recentTopic: string | null;
  stressLevel: 'low' | 'medium' | 'high' | null;
}

export async function gatherGreetingContext(): Promise<GreetingContext> {
  try {
    // Check for recent activity completion (within last 30 minutes)
    const pendingActivityRaw = await AsyncStorage.getItem('trace:pendingActivityCompletion');
    let justDidActivity = false;
    let recentActivityName: string | null = null;
    
    if (pendingActivityRaw) {
      const pendingActivity = JSON.parse(pendingActivityRaw);
      const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
      if (pendingActivity.timestamp > thirtyMinutesAgo) {
        justDidActivity = true;
        recentActivityName = pendingActivity.activity || null;
      }
    }
    
    // Check for last completed activity name
    if (!recentActivityName) {
      recentActivityName = await AsyncStorage.getItem('lastCompletedActivityName');
    }
    
    // Check for recent check-in (within last 24 hours)
    const lastCheckInRaw = await AsyncStorage.getItem('trace:lastCheckIn');
    let hasRecentCheckIn = false;
    let stressLevel: 'low' | 'medium' | 'high' | null = null;
    
    if (lastCheckInRaw) {
      const lastCheckIn = JSON.parse(lastCheckInRaw);
      const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000);
      if (lastCheckIn.timestamp > twentyFourHoursAgo) {
        hasRecentCheckIn = true;
        stressLevel = lastCheckIn.stressLevel || null;
      }
    }
    
    // Get recent topic from last chat message (simplified)
    const lastTopicRaw = await AsyncStorage.getItem('trace:lastChatTopic');
    const recentTopic = lastTopicRaw || null;
    
    return {
      hasRecentCheckIn,
      justDidActivity,
      recentActivityName,
      recentTopic,
      stressLevel,
    };
  } catch (error) {
    console.warn('[GREETING CONTEXT] Error gathering context:', error);
    return {
      hasRecentCheckIn: false,
      justDidActivity: false,
      recentActivityName: null,
      recentTopic: null,
      stressLevel: null,
    };
  }
}

export async function fetchWelcomeGreeting(params: {
  userName?: string | null;
  chatStyle?: string;
  localTime?: string | null;
  localDay?: string | null;
  localDate?: string | null;
  userId?: string | null;
  deviceId?: string | null;
  timezone?: string | null;
  // New context fields
  hasRecentCheckIn?: boolean;
  justDidActivity?: boolean;
  recentActivityName?: string | null;
  recentTopic?: string | null;
  stressLevel?: 'low' | 'medium' | 'high' | null;
}) {
  const {
    userName,
    chatStyle = 'conversation',
    localTime,
    localDay,
    localDate,
    userId,
    deviceId,
    timezone,
    hasRecentCheckIn = false,
    justDidActivity = false,
    recentActivityName = null,
    recentTopic = null,
    stressLevel = null,
  } = params;

  const url = getApiUrl('/api/greeting');
  console.log('✨ TRACE greeting: sending to', url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const requestBody = {
      userName,
      chatStyle,
      localTime,
      localDay,
      localDate,
      userId,
      deviceId,
      timezone,
      // Include context for personalized greeting
      hasRecentCheckIn,
      justDidActivity,
      recentActivityName,
      recentTopic,
      stressLevel,
    };
    console.log('✨ TRACE greeting body:', JSON.stringify(requestBody));
    
    const res = await apiFetch('/api/greeting', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error('✨ TRACE greeting error status:', res.status);
      throw new Error(`Greeting failed with status ${res.status}`);
    }

    const json = await res.json();
    console.log('✨ TRACE greeting payload:', json);

    // If server says to skip greeting (during onboarding), return null
    if (json && json.skipGreeting === true) {
      console.log('✨ TRACE greeting: server says skip (onboarding in progress)');
      return { text: null, skipGreeting: true };
    }

    const text: string =
      (json && (json.message || json.greeting)) ||
      "I'm really glad you're here with me.";

    return { text, skipGreeting: false };
  } catch (err: any) {
    clearTimeout(timeout);
    console.error('✨ TRACE greeting error:', err?.message || err);
    throw err;
  }
}

export async function fetchPatternsWeeklySummary(params: {
  userId?: string | null;
  deviceId?: string | null;
  userName?: string | null;
  peakWindowLabel?: string | null;
  energyRhythmLabel?: string | null;
  energyRhythmDetail?: string | null;
  behaviorSignatures?: string[];
}) {
  const {
    userId = null,
    deviceId = null,
    userName = null,
    peakWindowLabel = null,
    energyRhythmLabel = null,
    energyRhythmDetail = null,
    behaviorSignatures = [],
  } = params || {};

  const url = getApiUrl('/api/patterns/weekly-summary');

  console.log('🧠 TRACE weekly-summary: sending to', url, {
    userId,
    deviceId,
    peakWindowLabel,
    energyRhythmLabel,
    energyRhythmDetail,
    behaviorSignatures,
  });

  const res = await apiFetch('/api/patterns/weekly-summary', {
    method: 'POST',
    body: JSON.stringify({
      userId,
      deviceId,
      userName,
      peakWindowLabel,
      energyRhythmLabel,
      energyRhythmDetail,
      behaviorSignatures,
    }),
  });

  if (!res.ok) {
    console.error('🧠 TRACE weekly-summary error status:', res.status);
    throw new Error(
      `Weekly patterns summary failed with status ${res.status}`,
    );
  }

  const json = await res.json();
  console.log('🧠 TRACE weekly-summary payload:', json);

  return {
    ok: !!json.ok,
    summaryText:
      (json && typeof json.summaryText === 'string'
        ? json.summaryText
        : null) ||
      null,
    sections: json.sections || null,
  };
}

export interface PeakWindowResult {
  label: string;
  startHour: number | null;
  endHour: number | null;
  percentage: number | null;
  confidence?: 'high' | 'medium' | 'low' | 'insufficient' | null;
  sampleSize?: number | null;
}

export interface MostHelpfulActivityResult {
  label: string;
  topActivity: string | null;
  percentage: number | null;
  count?: number | null;
  confidence?: 'high' | 'medium' | 'low' | 'insufficient' | null;
  sampleSize?: number | null;
}

export interface LastHourSummary {
  checkinsLastHour: number;
  checkinsToday: number;
  comparisonLabel: 'heavier' | 'lighter' | 'similar' | null;
}

export interface WeeklySections {
  weekShape?: string | null;
  recurringThemes?: string | null;
  whatsShifting?: string | null;
  whatWorked?: string | null;
}

export interface MoodTrendDirection {
  direction: 'up' | 'down' | 'stable';
  label: string;
}

export interface WeeklyMoodTrend {
  calm?: MoodTrendDirection;
  stress?: MoodTrendDirection;
}

export interface PatternsInsightsResult {
  peakWindow: PeakWindowResult;
  mostHelpfulActivity: MostHelpfulActivityResult;
  lastHourSummary?: LastHourSummary;
  weeklyNarrative?: string | null;
  weeklySections?: WeeklySections | null;
  predictiveHint?: string | null;
  sampleSize: number;
  messageSampleSize?: number;
  lastCalculatedAt?: string | null;
  presenceTrend?: string | null;
  emotionalLoadTrend?: string | null;
  reliefSpotlight?: string | null;
  energyTidesGlance?: string | null;
  stressEchoesLabel?: string | null;
  reliefLabel?: string | null;
  emotionalRhythmLabel?: string | null;
  energyRhythmLabel?: string | null;
  peakWindowLabel?: string | null;
  weeklyMoodTrend?: WeeklyMoodTrend | null;
  stillLearning?: boolean;
  journalSampleSize?: number;
}

export async function fetchPatternsInsights(params: {
  userId?: string | null;
  deviceId?: string | null;
}): Promise<PatternsInsightsResult> {
  const { userId, deviceId } = params;
  
  const fallback: PatternsInsightsResult = {
    peakWindow: {
      label: "Not enough data yet",
      startHour: null,
      endHour: null,
      percentage: null,
    },
    mostHelpfulActivity: {
      label: "Once you've tried a few activities, I'll start noticing which ones you return to the most.",
      topActivity: null,
      percentage: null,
    },
    lastHourSummary: {
      checkinsLastHour: 0,
      checkinsToday: 0,
      comparisonLabel: null,
    },
    weeklyNarrative: null,
    weeklySections: null,
    predictiveHint: null,
    sampleSize: 0,
  };
  
  console.log('📊 TRACE patterns/insights: fetching');
  
  try {
    const res = await apiFetch('/api/patterns/insights', {
      method: 'POST',
      body: JSON.stringify({ userId, deviceId }),
    });
    
    if (!res.ok) {
      console.error('📊 TRACE patterns/insights error status:', res.status);
      return fallback;
    }
    
    const json = await res.json();
    console.log('📊 TRACE patterns/insights result keys:', Object.keys(json));
    
    return {
      peakWindow: json.peakWindow || fallback.peakWindow,
      mostHelpfulActivity: json.mostHelpfulActivity || fallback.mostHelpfulActivity,
      lastHourSummary: json.lastHourSummary || fallback.lastHourSummary,
      weeklyNarrative: json.weeklyNarrative || null,
      weeklySections: json.weeklySections || null,
      predictiveHint: json.predictiveHint || null,
      sampleSize: json.sampleSize || 0,
      messageSampleSize: json.messageSampleSize || 0,
      lastCalculatedAt: json.lastCalculatedAt || null,
      presenceTrend: json.presenceTrend || null,
      emotionalLoadTrend: json.emotionalLoadTrend || null,
      reliefSpotlight: json.reliefSpotlight || null,
      energyTidesGlance: json.energyTidesGlance || null,
      stressEchoesLabel: json.stressEchoesLabel || null,
      reliefLabel: json.reliefLabel || null,
      emotionalRhythmLabel: json.emotionalRhythmLabel || null,
      energyRhythmLabel: json.energyRhythmLabel || null,
      peakWindowLabel: json.peakWindowLabel || null,
      weeklyMoodTrend: json.weeklyMoodTrend || null,
      stillLearning: json.stillLearning || false,
      journalSampleSize: json.journalSampleSize || 0,
    };
  } catch (err) {
    console.error('📊 TRACE patterns/insights fetch error:', err);
    return fallback;
  }
}
