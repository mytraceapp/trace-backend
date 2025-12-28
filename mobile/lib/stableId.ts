import AsyncStorage from '@react-native-async-storage/async-storage';

const STABLE_ID_KEY = '@trace_stable_device_id';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getStableId(): Promise<string> {
  try {
    let id = await AsyncStorage.getItem(STABLE_ID_KEY);
    if (!id) {
      id = generateUUID();
      await AsyncStorage.setItem(STABLE_ID_KEY, id);
      console.log('🆔 TRACE created new stableId:', id);
    } else {
      console.log('🆔 TRACE using existing stableId:', id);
    }
    return id;
  } catch (err) {
    console.warn('⚠️ TRACE stableId error, generating temporary:', err);
    return generateUUID();
  }
}
