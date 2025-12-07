import OneSignal from "react-onesignal";

let isInitialized = false;

export async function initOneSignal(userId: string | null): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  if (!appId) {
    console.warn("[OneSignal] VITE_ONESIGNAL_APP_ID not set, skipping initialization");
    return;
  }

  try {
    if (!isInitialized) {
      await OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
      });
      isInitialized = true;
      console.log("[OneSignal] Initialized successfully");
    }

    if (userId) {
      await OneSignal.login(userId);
      console.log("[OneSignal] Logged in user:", userId);
    }

    await OneSignal.Notifications.requestPermission();
    console.log("[OneSignal] Notification permission requested");
  } catch (error) {
    console.error("[OneSignal] Initialization error:", error);
  }
}
