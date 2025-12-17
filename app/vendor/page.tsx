"use client";

import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { useVendorData } from "@/hooks/useVendorData";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { StatCard } from "@/components/admin/StatCard";
import { Toggle } from "@/components/ui/Toggle";
import dynamic from "next/dynamic";
import {
  ShoppingBagIcon,
  DollarSignIcon,
  StoreIcon,
} from "@/components/ui/icons";
const VendorCharts = dynamic(() => import("@/components/vendor/VendorCharts").then(m => m.VendorCharts), {
  ssr: false,
});

/**
 * Vendor Dashboard - Protected Route
 * Requires: vendor role and approval status
 * Unapproved vendors are redirected to /application-status
 */
export default function VendorDashboardPage() {
  // Protect route: requires vendor role and approval
  const { userData, loading, isFullyAuthorized } = useRequireRoleAndApproval(['vendor'], true);
  
  // Fetch vendor-specific data for summary stats only
  const {
    totalOrders,
    totalEarnings,
    activeProducts,
    loading: dataLoading,
    error: dataError,
    isOpen,
    setIsOpen,
    updatingStatus,
    orders,
    transactions,
  } = useVendorData(userData?.uid || null);

  // Don't render anything if not authorized - wait for redirect
  // Show loading while checking auth or redirecting
  if (loading || !isFullyAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {loading ? "Loading..." : "Redirecting..."}
          </p>
        </div>
      </div>
    );
  }

  // Show loading state while loading data (but user is authorized)
  if (dataLoading) {
    return (
      <VendorLayout pageTitle="Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </VendorLayout>
    );
  }

  // Format earnings for display
  const formattedEarnings = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalEarnings);

  return (
    <VendorLayout pageTitle="Dashboard">
      <div className="space-y-6">
        {/* Welcome Card with Open/Closed Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <p className="text-gray-600 dark:text-gray-400">
                Welcome, {userData?.email}! This is your vendor dashboard.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Your role: <span className="font-semibold">{userData?.role}</span> | 
                Status: <span className="font-semibold">{userData?.isApproved ? 'Approved' : 'Pending'}</span>
              </p>
            </div>
            <div className="flex flex-col items-start md:items-end space-y-2">
              <Toggle
                checked={isOpen}
                onChange={setIsOpen}
                disabled={updatingStatus}
                label={isOpen ? "Open" : "Closed"}
              />
              {updatingStatus && (
                <span className="text-xs text-gray-500 dark:text-gray-400">Updating...</span>
              )}
            </div>
          </div>
        </div>

        {/* Error message */}
        {dataError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Error: {dataError}</p>
          </div>
        )}

        {/* Summary Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          <StatCard
            title="Total Orders"
            value={totalOrders}
            icon={<ShoppingBagIcon className="w-6 h-6" />}
            iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
          />
          <StatCard
            title="Earnings"
            value={formattedEarnings}
            icon={<DollarSignIcon className="w-6 h-6" />}
            iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          />
          <StatCard
            title="Active Products"
            value={activeProducts}
            icon={<StoreIcon className="w-6 h-6" />}
            iconBgColor="bg-pink-100 dark:bg-pink-900/30"
          />
        </div>

        {/* Charts */}
        <VendorCharts orders={orders || []} transactions={transactions || []} />

      </div>
    </VendorLayout>
  );
}

