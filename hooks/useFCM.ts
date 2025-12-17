/**
 * useFCM Hook
 * React hook for managing FCM token initialization and listeners
 */

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  setupFCMComplete,
  setupFCMListener,
  clearFCMToken,
  handleFCMError,
} from "@/lib/notifications/fcm";

interface UseFCMReturn {
  token: string | null;
  isInitialized: boolean;
  error: string | null;
  isLoading: boolean;
}

/**
 * Hook to initialize FCM and manage notifications
 */
export function useFCM(): UseFCMReturn {
  const { currentUser } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize FCM on mount or when user changes
  useEffect(() => {
    if (!currentUser?.uid) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    let unsubscribeFCMListener: (() => void) | null = null;

    const initFCM = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Setup FCM completely
        const result = await setupFCMComplete(currentUser.uid);

        if (isMounted) {
          if (result.success && result.token) {
            setToken(result.token);
            setIsInitialized(true);

            // Setup foreground message listener
            unsubscribeFCMListener = setupFCMListener();
          } else {
            // Don't set error if VAPID key is missing or permissions denied
            // These are expected scenarios, not errors
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
              // VAPID key not configured - this is expected, not an error
              setIsInitialized(false);
            } else if (typeof window !== "undefined" && Notification.permission === "denied") {
              // User denied permissions - this is expected, not an error
              setIsInitialized(false);
            } else {
              // Other failure - set error
              setError("Failed to initialize notifications");
            }
          }
        }
      } catch (err: any) {
        if (isMounted) {
          const errorMessage = handleFCMError(err);
          setError(errorMessage);
          console.error("FCM initialization error:", err);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initFCM();

    // Cleanup
    return () => {
      isMounted = false;
      if (unsubscribeFCMListener) {
        unsubscribeFCMListener();
      }
    };
  }, [currentUser?.uid]);

  return {
    token,
    isInitialized,
    error,
    isLoading,
  };
}

/**
 * Hook to listen for FCM messages
 */
export function useFCMListener(callback?: (payload: any) => void) {
  useEffect(() => {
    const handleFCMMessage = (event: CustomEvent) => {
      if (callback) {
        callback(event.detail);
      }
    };

    window.addEventListener("fcm-message", handleFCMMessage as EventListener);

    return () => {
      window.removeEventListener("fcm-message", handleFCMMessage as EventListener);
    };
  }, [callback]);
}

/**
 * Hook to clear FCM token on logout
 */
export function useFCMCleanup() {
  const { currentUser } = useAuth();

  const clearToken = useCallback(async () => {
    if (currentUser?.uid) {
      try {
        await clearFCMToken(currentUser.uid);
        console.log("FCM token cleared on logout");
      } catch (error) {
        console.error("Error clearing FCM token:", error);
      }
    }
  }, [currentUser?.uid]);

  return { clearToken };
}
