export async function sendChatMessage({ messages, userName, chatStyle, localTime, localDay, localDate, userId, deviceId, timezone }: {
  messages: Array<{ role: string; content: string }>;
  userName?: string | null;
  chatStyle?: string;
  localTime?: string;
  localDay?: string;
  localDate?: string;
  userId?: string | null;
  deviceId?: string | null;
  timezone?: string | null;
}) {
  console.log(
    '🆔 TRACE sendChatMessage ids:',
    'userId =',
    userId || 'null',
    'deviceId =',
    deviceId || 'null'
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(
      'https://ca2fbbde-8b20-444e-a3cf-9a3451f8b1e2-00-n5dvsa77hetw.spock.replit.dev/api/chat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          userName,
          chatStyle,
          localTime,
          localDay,
          localDate,
          userId: userId || null,
          deviceId: deviceId || null,
          timezone: timezone || null,
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

    return {
      message: data.message || "mm, I'm here.",
      activity_suggestion: data.activity_suggestion || {
        name: null,
        reason: null,
        should_navigate: false,
      },
    };
  } catch (err: any) {
    clearTimeout(timeout);

    console.log('Chat API failed:', err?.message);

    return {
      message: "I'm here — seems like we're offline for a moment.",
      activity_suggestion: {
        name: null,
        reason: null,
        should_navigate: false,
      },
    };
  }
}

const TRACE_API_URL = 'https://ca2fbbde-8b20-444e-a3cf-9a3451f8b1e2-00-n5dvsa77hetw.spock.replit.dev/api';

export async function fetchWelcomeGreeting(params: {
  userName?: string | null;
  chatStyle?: string;
  localTime?: string | null;
  localDay?: string | null;
  localDate?: string | null;
  userId?: string | null;
  deviceId?: string | null;
  timezone?: string | null;
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
  } = params;

  const url = `${TRACE_API_URL}/greeting`;
  console.log('✨ TRACE greeting: sending to', url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userName,
        chatStyle,
        localTime,
        localDay,
        localDate,
        userId,
        deviceId,
        timezone,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.error('✨ TRACE greeting error status:', res.status);
      throw new Error(`Greeting failed with status ${res.status}`);
    }

    const json = await res.json();
    console.log('✨ TRACE greeting payload:', json);

    const text: string =
      (json && (json.message || json.greeting)) ||
      "I'm really glad you're here with me.";

    return { text };
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

  const url = `${TRACE_API_URL}/patterns/weekly-summary`;

  console.log('🧠 TRACE weekly-summary: sending to', url, {
    userId,
    deviceId,
    peakWindowLabel,
    energyRhythmLabel,
    energyRhythmDetail,
    behaviorSignatures,
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  };
}

export interface PeakWindowResult {
  label: string;
  startHour: number | null;
  endHour: number | null;
  percentage: number | null;
}

export interface MostHelpfulActivityResult {
  label: string;
  topActivity: string | null;
  percentage: number | null;
}

export interface LastHourSummary {
  checkinsLastHour: number;
  checkinsToday: number;
  comparisonLabel: 'heavier' | 'lighter' | 'similar' | null;
}

export interface PatternsInsightsResult {
  peakWindow: PeakWindowResult;
  mostHelpfulActivity: MostHelpfulActivityResult;
  lastHourSummary?: LastHourSummary;
  sampleSize: number;
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
    sampleSize: 0,
  };
  
  const queryParams = new URLSearchParams();
  if (userId) queryParams.append('userId', userId);
  if (deviceId) queryParams.append('deviceId', deviceId);
  
  const url = `${TRACE_API_URL}/patterns/insights?${queryParams.toString()}`;
  console.log('📊 TRACE patterns/insights: fetching from', url);
  
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!res.ok) {
      console.error('📊 TRACE patterns/insights error status:', res.status);
      return fallback;
    }
    
    const json = await res.json();
    console.log('📊 TRACE patterns/insights result:', json);
    
    return {
      peakWindow: json.peakWindow || fallback.peakWindow,
      mostHelpfulActivity: json.mostHelpfulActivity || fallback.mostHelpfulActivity,
      lastHourSummary: json.lastHourSummary || fallback.lastHourSummary,
      sampleSize: json.sampleSize || 0,
    };
  } catch (err) {
    console.error('📊 TRACE patterns/insights fetch error:', err);
    return fallback;
  }
}
