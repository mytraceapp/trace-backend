import AsyncStorage from '@react-native-async-storage/async-storage';

export async function storePendingActivityCompletion(activity: string, durationSeconds: number): Promise<void> {
  try {
    await AsyncStorage.setItem('trace:pendingActivityCompletion', JSON.stringify({
      activity,
      duration: durationSeconds,
      timestamp: Date.now(),
    }));
    console.log(`[${activity}] Stored pending activity completion`);
  } catch (e) {
    console.warn(`[${activity}] Failed to store pending activity:`, e);
  }
}
