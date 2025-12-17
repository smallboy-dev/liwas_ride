"use client";

import { useState, useEffect } from "react";
import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { firestore } from "@/firebase/init";
import toast from "react-hot-toast";

interface PaymentSettings {
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  defaultCurrency?: string;
  updatedAt?: any;
  updatedBy?: string;
}

const DEFAULT_SETTINGS: PaymentSettings = {
  stripePublishableKey: "",
  stripeSecretKey: "",
  defaultCurrency: "USD",
};

/**
 * Admin Settings Page - Protected Route
 * Manages payment method and Stripe configuration
 */
export default function SettingsPage() {
  const { userData, loading: authLoading, isFullyAuthorized } = useRequireRoleAndApproval(
    ["admin"],
    false
  );

  const [settings, setSettings] = useState<PaymentSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSecretKey, setShowSecretKey] = useState(false);

  // Load settings configuration
  useEffect(() => {
    if (authLoading || !isFullyAuthorized) return;

    const settingsDocRef = doc(firestore, "systemConfig", "paymentSettings");

    const unsubscribe = onSnapshot(
      settingsDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setSettings({
            stripePublishableKey: data.stripePublishableKey ?? DEFAULT_SETTINGS.stripePublishableKey,
            stripeSecretKey: data.stripeSecretKey ?? DEFAULT_SETTINGS.stripeSecretKey,
            defaultCurrency: data.defaultCurrency ?? DEFAULT_SETTINGS.defaultCurrency,
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy,
          });
        } else {
          // Use defaults if document doesn't exist
          setSettings(DEFAULT_SETTINGS);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching settings:", err);
        setError(err.message || "Failed to load payment settings");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authLoading, isFullyAuthorized]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Validate inputs
      if (settings.stripePublishableKey && !settings.stripePublishableKey.startsWith("pk_")) {
        throw new Error("Stripe publishable key must start with 'pk_'");
      }
      if (settings.stripeSecretKey && !settings.stripeSecretKey.startsWith("sk_")) {
        throw new Error("Stripe secret key must start with 'sk_'");
      }
      if (settings.defaultCurrency && settings.defaultCurrency.length !== 3) {
        throw new Error("Currency code must be 3 characters (e.g., USD, EUR)");
      }

      const settingsDocRef = doc(firestore, "systemConfig", "paymentSettings");
      await setDoc(
        settingsDocRef,
        {
          stripePublishableKey: settings.stripePublishableKey || "",
          stripeSecretKey: settings.stripeSecretKey || "",
          defaultCurrency: settings.defaultCurrency || "USD",
          updatedAt: serverTimestamp(),
          updatedBy: userData?.uid || "admin",
        },
        { merge: true }
      );

      toast.success("Payment settings saved successfully!");
    } catch (err: any) {
      console.error("Error saving settings:", err);
      setError(err.message || "Failed to save payment settings");
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const maskSecret = (value: string): string => {
    if (!value || value.length < 8) return value;
    return value.substring(0, 4) + "..." + value.substring(value.length - 4);
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

  if (loading) {
    return (
      <AdminLayout pageTitle="Payment Settings">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading settings...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Payment Settings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Payment Method Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Configure payment methods and Stripe integration
            </p>
          </div>
          <a
            href="/admin/payment-method/test"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Test Payment</span>
          </a>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Error: {error}</p>
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSave} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
          {/* Stripe Configuration Section */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Stripe Configuration
            </h2>

            {/* Stripe Publishable Key */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stripe Publishable Key
              </label>
              <input
                type="text"
                value={settings.stripePublishableKey || ""}
                onChange={(e) =>
                  setSettings({ ...settings, stripePublishableKey: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="pk_test_..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your Stripe publishable key (starts with pk_)
              </p>
            </div>

            {/* Stripe Secret Key */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stripe Secret Key
              </label>
              <div className="relative">
                <input
                  type={showSecretKey ? "text" : "password"}
                  value={settings.stripeSecretKey || ""}
                  onChange={(e) =>
                    setSettings({ ...settings, stripeSecretKey: e.target.value })
                  }
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="sk_test_..."
                />
                <button
                  type="button"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showSecretKey ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.906 5.06m-4.637 1.765a9.96 9.96 0 01-1.563-3.029M15.536 8.464a3 3 0 11-4.243 4.243" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your Stripe secret key (starts with sk_). Keep this secure!
              </p>
            </div>

          </div>

          {/* Currency Section */}
          <div className="border-b border-gray-200 dark:border-gray-700 pb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Currency Settings
            </h2>

            {/* Default Currency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Default Currency
              </label>
              <select
                value={settings.defaultCurrency || "USD"}
                onChange={(e) =>
                  setSettings({ ...settings, defaultCurrency: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="NGN">NGN - Nigerian Naira</option>
                <option value="KES">KES - Kenyan Shilling</option>
                <option value="GHS">GHS - Ghanaian Cedi</option>
              </select>
            </div>
          </div>

          {/* Last Updated Info */}
          {settings.updatedAt && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Last updated:{" "}
              {settings.updatedAt?.toDate
                ? new Date(settings.updatedAt.toDate()).toLocaleString()
                : "Unknown"}
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-brand-primary-600 text-white rounded-lg hover:bg-brand-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>
          </div>
        </form>

        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Security Note
              </h4>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                Stripe secret keys are sensitive information. 
                Make sure to keep them secure and never expose them in client-side code.
                These settings are stored securely in Firestore and only accessible to admins.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

