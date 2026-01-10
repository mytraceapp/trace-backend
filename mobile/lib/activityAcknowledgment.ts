const CHAT_API_BASE = 'https://ca2fbbde-8b20-444e-a3cf-9a3451f8b1e2-00-n5dvsa77hetw.spock.replit.dev';

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export async function logActivityCompletion(params: {
  userId: string | null;
  deviceId: string | null;
  activityType: string;
  durationSeconds: number;
}): Promise<void> {
  try {
    const response = await fetch(`${CHAT_API_BASE}/api/activity/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: params.userId,
        deviceId: params.deviceId,
        activityType: params.activityType,
        durationSeconds: params.durationSeconds,
        completedAt: new Date().toISOString(),
      }),
    });
    
    if (response.ok) {
      console.log('📝 Activity logged:', params.activityType);
    }
  } catch (err: any) {
    console.warn('Activity log failed:', err.message);
  }
}

export async function fetchActivityAcknowledgment(params: {
  userId: string | null;
  deviceId: string | null;
  activityType: string;
  durationSeconds?: number;
  activityCount?: number;
}): Promise<string | null> {
  try {
    const response = await fetch(`${CHAT_API_BASE}/api/activity-acknowledgment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: params.userId || params.deviceId,
        activityType: params.activityType,
        activityCount: params.activityCount || 1,
        lastActivityTime: null,
        timeOfDay: getTimeOfDay(),
        activityDuration: params.durationSeconds ? params.durationSeconds * 1000 : null,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('🎯 Activity acknowledgment:', data.message);
      return data.message || null;
    }
    return null;
  } catch (err: any) {
    console.warn('Activity acknowledgment failed:', err.message);
    return null;
  }
}
