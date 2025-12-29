export async function sendChatMessage({ messages, userName, chatStyle, localTime, localDay, localDate, userId, deviceId }: {
  messages: Array<{ role: string; content: string }>;
  userName?: string | null;
  chatStyle?: string;
  localTime?: string;
  localDay?: string;
  localDate?: string;
  userId?: string | null;
  deviceId?: string | null;
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
}) {
  const {
    userName,
    chatStyle = 'conversation',
    localTime,
    localDay,
    localDate,
    userId,
    deviceId,
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
