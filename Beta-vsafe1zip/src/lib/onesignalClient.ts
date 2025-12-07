import OneSignal from "react-onesignal";

let isInitialized = false;
let initPromise: Promise<void> | null = null;

export async function initOneSignal(userId: string | null): Promise<void> {
  console.log("[OneSignal] initOneSignal called with userId:", userId);
  
  if (typeof window === "undefined") {
    console.log("[OneSignal] Not in browser, skipping");
    return;
  }

  const appId = import.meta.env.VITE_ONESIGNAL_APP_ID;
  console.log("[OneSignal] App ID:", appId ? appId.substring(0, 8) + "..." : "NOT SET");
  
  if (!appId) {
    console.warn("[OneSignal] VITE_ONESIGNAL_APP_ID not set, skipping initialization");
    return;
  }

  try {
    if (!isInitialized && !initPromise) {
      console.log("[OneSignal] Starting initialization...");
      initPromise = OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true,
      });
      await initPromise;
      isInitialized = true;
      console.log("[OneSignal] Initialized successfully");
    } else if (initPromise && !isInitialized) {
      console.log("[OneSignal] Waiting for existing init...");
      await initPromise;
    } else {
      console.log("[OneSignal] Already initialized");
    }

    if (userId) {
      console.log("[OneSignal] Calling login for user:", userId);
      await OneSignal.login(userId);
      console.log("[OneSignal] Logged in user:", userId);
    }

    console.log("[OneSignal] Requesting notification permission...");
    await OneSignal.Notifications.requestPermission();
    console.log("[OneSignal] Notification permission requested");
  } catch (error: unknown) {
    const err = error as Error;
    if (err?.message?.includes("already initialized")) {
      console.log("[OneSignal] SDK was already initialized, continuing...");
      isInitialized = true;
      if (userId) {
        try {
          await OneSignal.login(userId);
          console.log("[OneSignal] Logged in user:", userId);
          await OneSignal.Notifications.requestPermission();
          console.log("[OneSignal] Notification permission requested");
        } catch (loginErr) {
          console.error("[OneSignal] Login error:", loginErr);
        }
      }
    } else {
      console.error("[OneSignal] Initialization error:", err?.message || err, err);
    }
  }
}
