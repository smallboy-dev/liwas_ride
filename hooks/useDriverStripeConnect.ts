"use client";

import { useState } from "react";
import { auth } from "@/firebase/init";

export interface DriverStripeConnectSetupResponse {
  success: boolean;
  onboarding_url: string;
  stripe_account_id: string;
}

export interface DriverStripeAccountStatusResponse {
  success: boolean;
  stripe_account_id: string | null;
  status: string;
  status_code: "not_setup" | "pending" | "verified" | "requirements_missing";
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    pending_verification: string[];
  } | null;
}

/**
 * Hook for drivers to manage their own Stripe Connect account
 */
export function useDriverStripeConnect() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Setup Stripe Connect for the current driver
   * Creates Express account and generates onboarding URL
   */
  const setupStripeConnect = async (): Promise<DriverStripeConnectSetupResponse> => {
    setLoading(true);
    setError(null);

    try {
      // Get Firebase ID token
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }
      const idToken = await user.getIdToken();

      // Get function URL
      const functionUrl = `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net/setupDriverStripeConnectSelfService`;

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to set up Stripe Connect";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get Stripe account status for the current driver
   */
  const getAccountStatus = async (): Promise<DriverStripeAccountStatusResponse> => {
    setLoading(true);
    setError(null);

    try {
      // Get Firebase ID token
      const user = auth.currentUser;
      if (!user) {
        throw new Error("User not authenticated");
      }
      const idToken = await user.getIdToken();

      // Get function URL
      const functionUrl = `https://us-central1-${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net/getDriverStripeAccountStatusSelfService`;

      const response = await fetch(functionUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to get Stripe account status";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    setupStripeConnect,
    getAccountStatus,
    loading,
    error,
  };
}

