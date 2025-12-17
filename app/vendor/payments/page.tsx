"use client";

import { useState, useEffect, Suspense } from "react";
import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { useVendorStripeConnect, VendorStripeAccountStatusResponse } from "@/hooks/useVendorStripeConnect";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";
import { useSearchParams } from "next/navigation";

function getStatusBadgeVariant(statusCode?: string): "success" | "warning" | "destructive" | "default" {
  switch (statusCode) {
    case "verified":
      return "success";
    case "pending":
    case "not_setup":
      return "warning";
    case "requirements_missing":
      return "destructive";
    default:
      return "default";
  }
}

function VendorPaymentsContent() {
  const { userData, loading: authLoading, isFullyAuthorized } = useRequireRoleAndApproval(
    ["vendor"],
    true
  );
  const searchParams = useSearchParams();
  const { setupStripeConnect, getAccountStatus, loading, error } = useVendorStripeConnect();
  
  const [accountStatus, setAccountStatus] = useState<VendorStripeAccountStatusResponse | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [settingUp, setSettingUp] = useState(false);

  // Check for return/refresh params
  useEffect(() => {
    const returnParam = searchParams?.get("return");
    const refreshParam = searchParams?.get("refresh");
    
    if (returnParam === "true" || refreshParam === "true") {
      toast.success("Returned from Stripe onboarding. Checking account status...");
      loadAccountStatus();
    }
  }, [searchParams]);

  // Load account status on mount
  useEffect(() => {
    if (isFullyAuthorized) {
      loadAccountStatus();
    }
  }, [isFullyAuthorized]);

  const loadAccountStatus = async () => {
    setLoadingStatus(true);
    try {
      const status = await getAccountStatus();
      setAccountStatus(status);
    } catch (error: any) {
      console.error("Error loading account status:", error);
      // Check for CORS or network errors
      if (error.message?.includes("CORS") || error.message?.includes("Failed to fetch") || error.code === "functions/unavailable") {
        toast.error("Unable to connect to payment service. Please ensure the functions are deployed and try again.");
      } else {
        toast.error(error.message || "Failed to load account status");
      }
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleSetupPayments = async () => {
    setSettingUp(true);
    try {
      const result = await setupStripeConnect();
      toast.success("Onboarding link generated! Redirecting to Stripe...");
      
      // Redirect to Stripe onboarding URL
      if (result.onboarding_url) {
        window.location.href = result.onboarding_url;
      } else {
        throw new Error("No onboarding URL received");
      }
    } catch (error: any) {
      console.error("Error setting up payments:", error);
      // Check for CORS or network errors
      if (error.message?.includes("CORS") || error.message?.includes("Failed to fetch") || error.code === "functions/unavailable") {
        toast.error("Unable to connect to payment service. Please ensure the functions are deployed and try again.");
      } else if (error.message?.includes("Stripe Connect is not enabled") || error.message?.includes("signed up for Connect")) {
        toast.error(
          "Stripe Connect is not enabled. Please contact your administrator to enable Stripe Connect in the Stripe Dashboard.",
          { duration: 6000 }
        );
      } else {
        toast.error(error.message || "Failed to generate onboarding link");
      }
    } finally {
      setSettingUp(false);
    }
  };

  // Don't render anything if not authorized - wait for redirect
  if (authLoading || !isFullyAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {authLoading ? "Loading..." : "Redirecting..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <VendorLayout pageTitle="Payout Setup">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Set up Stripe Connect to receive payouts from your orders
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Error: {error}</p>
          </div>
        )}

        {/* Main Content Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          {loadingStatus ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading account status...</p>
              </div>
            </div>
          ) : accountStatus ? (
            <div className="space-y-6">
              {/* Account Status Section */}
              {accountStatus.stripe_account_id ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Account Status
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Verification Status
                      </label>
                      <Badge variant={getStatusBadgeVariant(accountStatus.status_code)} className="text-sm">
                        {accountStatus.status}
                      </Badge>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Stripe Account ID
                      </label>
                      <code className="text-xs font-mono text-gray-900 dark:text-white">
                        {accountStatus.stripe_account_id.substring(0, 20)}...
                      </code>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Charges Enabled
                      </label>
                      <Badge variant={accountStatus.charges_enabled ? "success" : "warning"}>
                        {accountStatus.charges_enabled ? "Yes" : "No"}
                      </Badge>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                        Payouts Enabled
                      </label>
                      <Badge variant={accountStatus.payouts_enabled ? "success" : "warning"}>
                        {accountStatus.payouts_enabled ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>

                  {/* Requirements Missing */}
                  {accountStatus.requirements && 
                   accountStatus.requirements.currently_due.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                        Additional Information Required
                      </h4>
                      <ul className="list-disc list-inside text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                        {accountStatus.requirements.currently_due.map((req, index) => (
                          <li key={index}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Setup Payments Button (if not verified) */}
                  {accountStatus.status_code !== "verified" && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={handleSetupPayments}
                        disabled={settingUp || loading}
                        className={`w-full md:w-auto px-6 py-3 text-sm font-medium text-white bg-brand-primary-600 hover:bg-brand-primary-700 rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                          settingUp || loading ? "opacity-50 cursor-not-allowed" : ""
                        }`}
                      >
                        {settingUp || loading ? (
                          <>
                            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Setting up...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>Continue Setup</span>
                          </>
                        )}
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        Complete your Stripe account setup to receive payouts
                      </p>
                    </div>
                  )}

                  {/* Success Message */}
                  {accountStatus.status_code === "verified" && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-start">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                            Account Verified
                          </h4>
                          <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                            Your Stripe account is fully set up and ready to receive payouts. You will receive payments automatically after orders are completed.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* No Account - Setup Button */
                <div className="text-center py-12">
                  <div className="mb-6">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Set Up Payments
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                      Connect your Stripe account to start receiving payouts from your orders. The setup process takes just a few minutes.
                    </p>
                  </div>

                  <button
                    onClick={handleSetupPayments}
                    disabled={settingUp || loading}
                    className={`px-8 py-3 text-base font-medium text-white bg-brand-primary-600 hover:bg-brand-primary-700 rounded-lg transition-colors flex items-center justify-center space-x-2 mx-auto ${
                      settingUp || loading ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {settingUp || loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Setting up...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Setup Payments</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">Unable to load payment status</p>
            </div>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                About Stripe Connect
              </h4>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                Stripe Connect allows you to receive payouts directly to your bank account. Once your account is verified, 
                you'll automatically receive payments for completed orders. All transactions are secure and handled by Stripe.
              </p>
            </div>
          </div>
        </div>
      </div>
    </VendorLayout>
  );
}

export default function VendorPaymentsPage() {
  return (
    <Suspense fallback={
      <VendorLayout pageTitle="Payments">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </VendorLayout>
    }>
      <VendorPaymentsContent />
    </Suspense>
  );
}
