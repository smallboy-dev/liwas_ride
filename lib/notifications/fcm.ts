/**
 * Firebase Cloud Messaging (FCM) Setup
 * Handles FCM initialization, token retrieval, and storage
 */

import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";
import { firestore } from "@/firebase/init";
import { doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { showToast } from "@/components/providers/ToastProvider";

// Alias for convenience
const db = firestore;

// ============================================================================
// FCM INITIALIZATION
// ============================================================================

let messagingInstance: Messaging | null = null;

/**
 * Get or initialize Firebase Messaging instance
 */
export function getMessagingInstance(): Messaging {
  if (!messagingInstance) {
    messagingInstance = getMessaging();
  }
  return messagingInstance;
}

/**
 * Request notification permission and get FCM token
 */
export async function initializeFCM(): Promise<string | null> {
  try {
    // Check if notifications are supported
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return null;
    }

    // Check if VAPID key is configured
    if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
      // VAPID key not configured - silently return (notifications are optional)
      return null;
    }

    // Check if already granted
    if (Notification.permission === "granted") {
      return await retrieveFCMToken();
    }

    // Request permission
    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        return await retrieveFCMToken();
      }
      // Permission denied or default - silently return (user preference)
    }
    // Permission was previously denied - silently return (user preference)

    return null;
  } catch (error: any) {
    console.warn("Error initializing FCM:", error.message || error);
    return null;
  }
}

/**
 * Retrieve FCM token from Firebase
 */
export async function retrieveFCMToken(): Promise<string | null> {
  try {
    // Check if VAPID key is configured
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      // VAPID key not configured - silently return (notifications are optional)
      return null;
    }

    const messaging = getMessagingInstance();

    // Get the token
    const token = await getToken(messaging, {
      vapidKey: vapidKey,
    });

    if (token) {
      console.log("FCM Token retrieved successfully");
      return token;
    }

    // Don't log warning - this is expected if permissions are denied or VAPID key is missing
    return null;
  } catch (error: any) {
    // Handle specific FCM errors gracefully - don't log warnings for expected scenarios
    // These are user preferences or configuration issues, not errors
    if (error.code === "messaging/permission-blocked" || 
        error.code === "messaging/permission-denied" ||
        error.code === "messaging/unsupported-browser") {
      // Expected scenarios - don't log
      return null;
    }
    // Only log unexpected errors
    if (error.code !== "messaging/failed-service-worker-registration") {
      console.warn("FCM token error:", error.message || error.code || error);
    }
    return null;
  }
}

/**
 * Store FCM token in Firestore user document
 */
export async function storeFCMToken(userId: string, token: string): Promise<boolean> {
  try {
    if (!userId || !token) {
      console.warn("Missing userId or token");
      return false;
    }

    const userRef = doc(db, "users", userId);

    // Check if token already exists
    const userDoc = await getDoc(userRef);
    const existingToken = userDoc.data()?.fcmToken;

    // Only update if token is different
    if (existingToken !== token) {
      await updateDoc(userRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: new Date(),
      });

      console.log("FCM token stored successfully");
      return true;
    }

    return true;
  } catch (error) {
    console.error("Error storing FCM token:", error);
    return false;
  }
}

/**
 * Register device in devices collection
 */
export async function registerDevice(
  userId: string,
  token: string,
  deviceType: "ios" | "android" | "web" = "web"
): Promise<boolean> {
  try {
    if (!userId || !token) {
      console.warn("Missing userId or token");
      return false;
    }

    // Generate device ID based on token hash
    const deviceId = `device_${userId}_${deviceType}_${Date.now()}`;

    const deviceRef = doc(db, "devices", deviceId);

    await setDoc(
      deviceRef,
      {
        userId,
        deviceType,
        pushToken: token,
        isActive: true,
        lastUsedAt: new Date(),
        createdAt: new Date(),
      },
      { merge: true }
    );

    console.log("Device registered successfully");
    return true;
  } catch (error) {
    console.error("Error registering device:", error);
    return false;
  }
}

/**
 * Set up listener for foreground messages
 */
export function setupFCMListener(onMessageCallback?: (payload: any) => void): () => void {
  try {
    const messaging = getMessagingInstance();

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);

      // Extract notification data
      const notification = payload.notification;
      const data = payload.data;

      // Show toast notification
      if (notification?.title && notification?.body) {
        showToast.success(`${notification.title}: ${notification.body}`);
      }

      // Call custom callback if provided
      if (onMessageCallback) {
        onMessageCallback(payload);
      }

      // Emit custom event for app-wide handling
      window.dispatchEvent(
        new CustomEvent("fcm-message", {
          detail: { notification, data },
        })
      );
    });

    return unsubscribe;
  } catch (error) {
    console.error("Error setting up FCM listener:", error);
    return () => {};
  }
}

/**
 * Handle background messages (via service worker)
 * This is configured in the service worker file
 */
export function setupServiceWorkerMessaging() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/firebase-messaging-sw.js", {
        scope: "/",
      })
      .then((registration) => {
        console.log("✓ Service Worker registered for FCM");
        return registration;
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  }
}

/**
 * Deactivate device token
 */
export async function deactivateDevice(deviceId: string): Promise<boolean> {
  try {
    const deviceRef = doc(db, "devices", deviceId);

    await updateDoc(deviceRef, {
      isActive: false,
      updatedAt: new Date(),
    });

    console.log("Device deactivated");
    return true;
  } catch (error) {
    console.error("Error deactivating device:", error);
    return false;
  }
}

/**
 * Get all active devices for a user
 */
export async function getUserDevices(userId: string): Promise<any[]> {
  try {
    const devicesRef = doc(db, "userDevices", userId);
    const devicesDoc = await getDoc(devicesRef);

    if (devicesDoc.exists()) {
      return devicesDoc.data().devices || [];
    }

    return [];
  } catch (error) {
    console.error("Error getting user devices:", error);
    return [];
  }
}

/**
 * Clear FCM token from user document
 */
export async function clearFCMToken(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, "users", userId);

    await updateDoc(userRef, {
      fcmToken: null,
      fcmTokenUpdatedAt: new Date(),
    });

    console.log("FCM token cleared");
    return true;
  } catch (error) {
    console.error("Error clearing FCM token:", error);
    return false;
  }
}

// ============================================================================
// FCM CONFIGURATION
// ============================================================================

/**
 * Complete FCM setup flow
 */
export async function setupFCMComplete(userId: string): Promise<{
  token: string | null;
  success: boolean;
}> {
  try {
    // Check if VAPID key is configured
    if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) {
      // VAPID key not configured - silently return (notifications are optional)
      return { token: null, success: false };
    }

    // 1. Initialize FCM and request permission
    const token = await initializeFCM();

    if (!token) {
      // This is not necessarily an error - user might have denied permissions
      // or notifications might not be supported
      return { token: null, success: false };
    }

    // 2. Store token in user document
    const tokenStored = await storeFCMToken(userId, token);

    if (!tokenStored) {
      console.warn("Could not store FCM token");
      return { token, success: false };
    }

    // 3. Register device
    const deviceRegistered = await registerDevice(userId, token, "web");

    if (!deviceRegistered) {
      console.warn("Could not register device");
      return { token, success: false };
    }

    // 4. Setup foreground message listener
    setupFCMListener();

    // 5. Setup service worker for background messages
    setupServiceWorkerMessaging();

    console.log("FCM setup complete");
    return { token, success: true };
  } catch (error) {
    console.error("Error in FCM setup:", error);
    return { token: null, success: false };
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Handle FCM errors gracefully
 */
export function handleFCMError(error: any): string {
  if (error.code === "messaging/permission-blocked") {
    return "Notifications are blocked. Please enable them in your browser settings.";
  }

  if (error.code === "messaging/unsupported-browser") {
    return "Your browser does not support notifications.";
  }

  if (error.code === "messaging/failed-service-worker-registration") {
    return "Service Worker registration failed. Notifications may not work.";
  }

  return "An error occurred with notifications. Please try again.";
}
