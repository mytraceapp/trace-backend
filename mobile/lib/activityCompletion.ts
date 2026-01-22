import AsyncStorage from '@react-native-async-storage/async-storage';
import { logSuggestionCompleted } from './telemetry';

export async function storePendingActivityCompletion(activity: string, durationSeconds: number): Promise<void> {
  try {
    await AsyncStorage.setItem('trace:pendingActivityCompletion', JSON.stringify({
      activity,
      duration: durationSeconds,
      timestamp: Date.now(),
    }));
    console.log(`[${activity}] Stored pending activity completion`);
    
    // ===== TELEMETRY: Check if this activity was a suggestion =====
    const pendingSuggestionRaw = await AsyncStorage.getItem('trace:pendingSuggestion');
    if (pendingSuggestionRaw) {
      const pendingSuggestion = JSON.parse(pendingSuggestionRaw);
      if (pendingSuggestion.activity_name === activity.toLowerCase()) {
        const userIdRaw = await AsyncStorage.getItem('user_id');
        if (userIdRaw) {
          logSuggestionCompleted(
            userIdRaw,
            pendingSuggestion.suggestion_id,
            activity,
            pendingSuggestion.accepted_ts
          );
          console.log(`[${activity}] Logged suggestion_completed telemetry`);
        }
        // Clear the pending suggestion after logging
        await AsyncStorage.removeItem('trace:pendingSuggestion');
      }
    }
  } catch (e) {
    console.warn(`[${activity}] Failed to store pending activity:`, e);
  }
}
