declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

let isInitialized = false;

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
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    
    if (!isInitialized) {
      console.log("[OneSignal] Starting initialization with native SDK...");
      
      window.OneSignalDeferred.push(async function(OneSignal: any) {
        try {
          await OneSignal.init({
            appId,
            allowLocalhostAsSecureOrigin: true,
          });
          console.log("[OneSignal] Initialized successfully");
          
          if (userId) {
            console.log("[OneSignal] Calling login for user:", userId);
            await OneSignal.login(userId);
            console.log("[OneSignal] Logged in user:", userId);
          }

          console.log("[OneSignal] Requesting notification permission...");
          const permission = await OneSignal.Notifications.requestPermission();
          console.log("[OneSignal] Permission result:", permission);

          console.log("[OneSignal] push opted in?", OneSignal.User?.pushSubscription?.getOptedIn?.() ?? OneSignal.User?.PushSubscription?.optedIn);
          console.log("[OneSignal] push token?", OneSignal.User?.pushSubscription?.getToken?.() ?? OneSignal.User?.PushSubscription?.token);
          console.log("[OneSignal] subscription id?", OneSignal.User?.pushSubscription?.getId?.() ?? OneSignal.User?.PushSubscription?.id);
        } catch (err: any) {
          console.error("[OneSignal] Init error inside deferred:", err?.message || err);
        }
      });
      
      isInitialized = true;
    } else if (userId && window.OneSignal) {
      console.log("[OneSignal] Already initialized, logging in user:", userId);
      await window.OneSignal.login(userId);
      console.log("[OneSignal] Logged in user:", userId);
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error("[OneSignal] Initialization error:", err?.message || err, err);
  }
}
