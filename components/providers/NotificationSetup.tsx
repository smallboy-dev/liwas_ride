"use client";

import { useEffect } from "react";
import { useFCM, useFCMListener, useFCMCleanup } from "@/hooks/useFCM";
import { useAuth } from "@/context/AuthContext";

/**
 * Notification Setup Component
 * Initializes FCM and sets up notification listeners globally
 * Should be placed in the root layout
 */
export function NotificationSetup() {
  const { currentUser, loading } = useAuth();
  const { token, isInitialized, error } = useFCM();
  const { clearToken } = useFCMCleanup();

  // Setup FCM message listener
  useFCMListener((payload) => {
    console.log("FCM message received in app:", payload);
  });

  // Clear token on logout
  useEffect(() => {
    if (!currentUser && !loading) {
      clearToken();
    }
  }, [currentUser, loading, clearToken]);

  // Log initialization status (only on success)
  useEffect(() => {
    if (isInitialized) {
      console.log("✓ Notifications initialized successfully");
    }
    // Don't log errors - they're expected if VAPID key is missing or permissions denied
  }, [isInitialized, error]);

  // This component doesn't render anything
  return null;
}

export default NotificationSetup;
