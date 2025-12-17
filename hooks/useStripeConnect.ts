"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/firebase/init";

export interface StripeConnectSetupResponse {
  success: boolean;
  onboarding_url: string;
  stripe_account_id: string;
}

export interface StripeAccountStatusResponse {
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
 * Hook to manage Stripe Connect for vendors
 */
export function useStripeConnect() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Setup Stripe Connect for a vendor
   * Creates Express account and generates onboarding URL
   */
  const setupVendorStripeConnect = async (
    vendorId: string
  ): Promise<StripeConnectSetupResponse> => {
    setLoading(true);
    setError(null);

    try {
      const setupFunction = httpsCallable<{ vendorId: string }, StripeConnectSetupResponse>(
        functions,
        "setupVendorStripeConnect"
      );

      const result = await setupFunction({ vendorId });
      return result.data;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to set up Stripe Connect";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get Stripe account status for a vendor
   */
  const getVendorStripeAccountStatus = async (
    vendorId: string
  ): Promise<StripeAccountStatusResponse> => {
    setLoading(true);
    setError(null);

    try {
      const statusFunction = httpsCallable<{ vendorId: string }, StripeAccountStatusResponse>(
        functions,
        "getVendorStripeAccountStatus"
      );

      const result = await statusFunction({ vendorId });
      return result.data;
    } catch (err: any) {
      const errorMessage = err.message || "Failed to get Stripe account status";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    setupVendorStripeConnect,
    getVendorStripeAccountStatus,
    loading,
    error,
  };
}
