import { Platform } from 'react-native';
import { OneSignal, LogLevel } from 'react-native-onesignal';

const ONESIGNAL_APP_ID = '9f0ac5d7-d7bc-4ae5-8447-15c847bc53ba';

export function initOneSignal() {
  if (Platform.OS === 'web') return;

  try {
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    OneSignal.initialize(ONESIGNAL_APP_ID);
    OneSignal.Notifications.requestPermission(true);

    OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
      console.log('[ONESIGNAL] Notification received in foreground:', event.notification.title);
      event.preventDefault();
      event.getNotification().display();
    });

    OneSignal.Notifications.addEventListener('click', (event) => {
      console.log('[ONESIGNAL] Notification clicked:', event.notification.title);
    });

    console.log('[ONESIGNAL] Initialized with app ID:', ONESIGNAL_APP_ID.slice(0, 8));
  } catch (err: any) {
    console.warn('[ONESIGNAL] Init error (expected in Expo Go):', err.message);
  }
}

export function setOneSignalExternalId(userId: string) {
  if (Platform.OS === 'web') return;

  try {
    OneSignal.login(userId);
    console.log('[ONESIGNAL] External ID set:', userId.slice(0, 8));
  } catch (err: any) {
    console.warn('[ONESIGNAL] External ID error (expected in Expo Go):', err.message);
  }
}

export function removeOneSignalExternalId() {
  if (Platform.OS === 'web') return;

  try {
    OneSignal.logout();
    console.log('[ONESIGNAL] External ID removed');
  } catch (err: any) {
    console.warn('[ONESIGNAL] Logout error:', err.message);
  }
}
