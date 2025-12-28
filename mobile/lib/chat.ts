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
