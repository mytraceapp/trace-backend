import AsyncStorage from '@react-native-async-storage/async-storage';

const DISCLAIMER_ACCEPTED_KEY = 'trace_disclaimer_accepted';
const DISCLAIMER_TIMESTAMP_KEY = 'trace_disclaimer_accepted_at';

/**
 * Check if user has accepted the disclaimer
 * @returns true if accepted, false otherwise
 */
export async function getDisclaimerAcceptance(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(DISCLAIMER_ACCEPTED_KEY);
    return value === 'true';
  } catch (error) {
    console.log('[Disclaimer] Failed to read acceptance:', error);
    return false;
  }
}

/**
 * Get the timestamp when disclaimer was accepted
 * @returns ISO timestamp string or null if not accepted
 */
export async function getDisclaimerTimestamp(): Promise<string | null> {
  try {
    const value = await AsyncStorage.getItem(DISCLAIMER_TIMESTAMP_KEY);
    return value;
  } catch (error) {
    console.log('[Disclaimer] Failed to read timestamp:', error);
    return null;
  }
}

/**
 * Save disclaimer acceptance with current timestamp
 */
export async function acceptDisclaimer(): Promise<void> {
  const timestamp = new Date().toISOString();
  try {
    await AsyncStorage.setItem(DISCLAIMER_ACCEPTED_KEY, 'true');
    await AsyncStorage.setItem(DISCLAIMER_TIMESTAMP_KEY, timestamp);
    console.log('[Disclaimer] Accepted at:', timestamp);
  } catch (error) {
    console.log('[Disclaimer] Failed to save acceptance:', error);
    throw error;
  }
}
