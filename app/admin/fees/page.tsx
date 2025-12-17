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

interface FeesConfig {
  deliveryFee: number;
  commissionRate: number; // Percentage (e.g., 15 = 15%)
  taxRate: number; // Percentage (e.g., 8.5 = 8.5%)
  updatedAt?: any;
  updatedBy?: string;
}

const DEFAULT_FEES: FeesConfig = {
  deliveryFee: 5.00,
  commissionRate: 15.0,
  taxRate: 8.5,
};

/**
 * Admin Fees Management Page - Protected Route
 * Allows admin to configure delivery fee, commission rate, and tax rate
 */
export default function FeesManagementPage() {
  const { userData, loading: authLoading, isFullyAuthorized } = useRequireRoleAndApproval(
    ["admin"],
    false
  );

  const [fees, setFees] = useState<FeesConfig>(DEFAULT_FEES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load fees configuration
  useEffect(() => {
    if (authLoading || !isFullyAuthorized) return;

    const feesDocRef = doc(firestore, "systemConfig", "fees");

    const unsubscribe = onSnapshot(
      feesDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setFees({
            deliveryFee: data.deliveryFee ?? DEFAULT_FEES.deliveryFee,
            commissionRate: data.commissionRate ?? DEFAULT_FEES.commissionRate,
            taxRate: data.taxRate ?? DEFAULT_FEES.taxRate,
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy,
          });
        } else {
          // Use defaults if document doesn't exist
          setFees(DEFAULT_FEES);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching fees:", err);
        setError(err.message || "Failed to load fees configuration");
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
      if (fees.deliveryFee < 0) {
        throw new Error("Delivery fee cannot be negative");
      }
      if (fees.commissionRate < 0 || fees.commissionRate > 100) {
        throw new Error("Commission rate must be between 0 and 100");
      }
      if (fees.taxRate < 0 || fees.taxRate > 100) {
        throw new Error("Tax rate must be between 0 and 100");
      }

      const feesDocRef = doc(firestore, "systemConfig", "fees");
      await setDoc(
        feesDocRef,
        {
          deliveryFee: fees.deliveryFee,
          commissionRate: fees.commissionRate,
          taxRate: fees.taxRate,
          updatedAt: serverTimestamp(),
          updatedBy: userData?.uid || "admin",
        },
        { merge: true }
      );

      toast.success("Fees configuration saved successfully!");
    } catch (err: any) {
      console.error("Error saving fees:", err);
      setError(err.message || "Failed to save fees configuration");
      toast.error(err.message || "Failed to save fees");
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <AdminLayout pageTitle="Fees Management">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading fees configuration...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Fees Management">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            System Fees Configuration
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Configure delivery fees, commission rates, and tax rates for the platform
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Error: {error}</p>
          </div>
        )}

        {/* Fees Form */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Delivery Fee */}
            <div>
              <label
                htmlFor="deliveryFee"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Delivery Fee ($)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400">$</span>
                </div>
                <input
                  type="number"
                  id="deliveryFee"
                  step="0.01"
                  min="0"
                  value={fees.deliveryFee}
                  onChange={(e) =>
                    setFees({ ...fees, deliveryFee: parseFloat(e.target.value) || 0 })
                  }
                  required
                  className="block w-full pl-7 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-500"
                  placeholder="5.00"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Base delivery fee charged to customers
              </p>
            </div>

            {/* Commission Rate */}
            <div>
              <label
                htmlFor="commissionRate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Commission Rate (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="commissionRate"
                  step="0.1"
                  min="0"
                  max="100"
                  value={fees.commissionRate}
                  onChange={(e) =>
                    setFees({ ...fees, commissionRate: parseFloat(e.target.value) || 0 })
                  }
                  required
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-500"
                  placeholder="15.0"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400">%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Platform commission percentage (e.g., 15% = 15.0)
              </p>
            </div>

            {/* Tax Rate */}
            <div>
              <label
                htmlFor="taxRate"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Tax Rate (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="taxRate"
                  step="0.1"
                  min="0"
                  max="100"
                  value={fees.taxRate}
                  onChange={(e) =>
                    setFees({ ...fees, taxRate: parseFloat(e.target.value) || 0 })
                  }
                  required
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-500"
                  placeholder="8.5"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400">%</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tax percentage applied to orders (e.g., 8.5% = 8.5)
              </p>
            </div>

            {/* Last Updated Info */}
            {fees.updatedAt && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Last updated: {fees.updatedAt?.toDate?.() ? new Date(fees.updatedAt.toDate()).toLocaleString() : "—"}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="submit"
                disabled={saving}
                className={`px-6 py-2 bg-brand-primary-600 text-white rounded-lg hover:bg-brand-primary-700 transition-colors flex items-center space-x-2 ${
                  saving ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {saving ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
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
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

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
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                How Fees Work
              </h3>
              <ul className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                <li>
                  <strong>Delivery Fee:</strong> Fixed amount charged per delivery order
                </li>
                <li>
                  <strong>Commission Rate:</strong> Percentage of order total taken by platform
                </li>
                <li>
                  <strong>Tax Rate:</strong> Sales tax percentage applied to order subtotal
                </li>
                <li>Changes take effect immediately for new orders</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

