import AsyncStorage from '@react-native-async-storage/async-storage';

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
  dreamscapeTrackId?: string | null;
  selectionMode?: 'ai_selected' | 'user_selected' | 'random' | null;
  selectionSource?: 'chat' | 'activities_tab' | 'direct' | null;
}): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
  
  try {
    const body: Record<string, any> = {
      userId: params.userId,
      deviceId: params.deviceId,
      activityType: params.activityType,
      durationSeconds: params.durationSeconds,
      completedAt: new Date().toISOString(),
    };
    
    // Include Dreamscape metadata if available
    if (params.dreamscapeTrackId) {
      body.dreamscapeTrackId = params.dreamscapeTrackId;
    }
    if (params.selectionMode) {
      body.selectionMode = params.selectionMode;
    }
    if (params.selectionSource) {
      body.selectionSource = params.selectionSource;
    }
    
    const response = await fetch(`${CHAT_API_BASE}/api/activity/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      console.log('📝 Activity logged:', params.activityType, params.dreamscapeTrackId ? `track=${params.dreamscapeTrackId}` : '');
    }
  } catch (err: any) {
    clearTimeout(timeout);
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
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout
  
  try {
    const response = await fetch(`${CHAT_API_BASE}/api/chat/activity-return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: params.userId || params.deviceId,
        activityType: params.activityType,
        activityCount: params.activityCount || 1,
        timeOfDay: getTimeOfDay(),
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      const data = await response.json();
      console.log('🎯 Activity acknowledgment:', data.message);
      return data.message || null;
    }
    return null;
  } catch (err: any) {
    clearTimeout(timeout);
    console.warn('Activity acknowledgment failed:', err.message);
    return null;
  }
}

// Trigger a journal conversation invite after saving a journal entry
export async function triggerJournalConversationInvite(params: {
  userId: string | null;
  journalContent: string;
  mood?: string;
}): Promise<void> {
  try {
    // Only trigger if entry has meaningful content
    if (!params.journalContent || params.journalContent.trim().length < 20) {
      console.log('[Journal] Entry too short for conversation invite');
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    const response = await fetch(`${CHAT_API_BASE}/api/journal/conversation-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: params.userId,
        journalExcerpt: params.journalContent.substring(0, 200),
        mood: params.mood,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      
      if (data.invitation) {
        // Store invitation message to be displayed when user opens chat
        await AsyncStorage.setItem('trace:pendingJournalInvite', JSON.stringify({
          message: data.invitation,
          timestamp: new Date().toISOString(),
        }));
        console.log('[Journal] Conversation invitation prepared:', data.invitation);
      }
    }
  } catch (error: any) {
    console.warn('[Journal] Failed to prepare conversation invite:', error.message);
    // Fail silently - journal still saved
  }
}
