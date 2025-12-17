"use client";

import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { useAdminData } from "@/hooks/useAdminData";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import {
  ShoppingBagIcon,
  UsersIcon,
  StoreIcon,
  DollarSignIcon,
  TrendingUpIcon,
} from "@/components/ui/icons";
import dynamic from "next/dynamic";

const DashboardCharts = dynamic(() => import("@/components/admin/DashboardCharts").then(m => m.DashboardCharts), {
  ssr: false,
});

/**
 * Admin Dashboard - Protected Route
 * Requires: admin role (approval not required for admins)
 */
export default function AdminDashboardPage() {
  // Protect route: requires admin role (approval not needed for admins)
  const { userData, loading: authLoading, isFullyAuthorized } = useRequireRoleAndApproval(
    ["admin"],
    false
  );

  // Fetch admin data (vendors, drivers, and total users)
  const { vendors, drivers, users, totalUsers, loading: dataLoading, error } =
    useAdminData();

  const loading = authLoading || dataLoading;

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

  if (error) {
    return (
      <AdminLayout pageTitle="Dashboard">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      </AdminLayout>
    );
  }

  const approvedVendors = vendors.filter((v) => v.isApproved).length;
  const pendingVendors = vendors.length - approvedVendors;
  const approvedDrivers = drivers.filter((d) => d.isApproved).length;

  return (
    <AdminLayout pageTitle="Dashboard">
      <div className="space-y-6">
        {/* Summary Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Orders"
            value="97"
            icon={<ShoppingBagIcon className="w-6 h-6" />}
            iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Total Earnings"
            value="$0.00"
            icon={<DollarSignIcon className="w-6 h-6" />}
            iconBgColor="bg-blue-100 dark:bg-blue-900/30"
            trend={{ value: 0, isPositive: false }}
          />
          <StatCard
            title="Total Vendors"
            value={vendors.length}
            icon={<StoreIcon className="w-6 h-6" />}
            iconBgColor="bg-pink-100 dark:bg-pink-900/30"
            trend={{
              value: pendingVendors > 0 ? Math.round((pendingVendors / vendors.length) * 100) : 0,
              isPositive: false,
            }}
          />
          <StatCard
            title="Total Clients"
            value={totalUsers}
            icon={<UsersIcon className="w-6 h-6" />}
            iconBgColor="bg-yellow-100 dark:bg-yellow-900/30"
            trend={{ value: 8, isPositive: true }}
          />
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Approved Vendors
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {approvedVendors}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {pendingVendors} pending approval
                </p>
              </div>
              <TrendingUpIcon className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Approved Drivers
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {approvedDrivers}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {drivers.length - approvedDrivers} pending approval
                </p>
              </div>
              <TrendingUpIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Platform Growth
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {totalUsers}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Total registered users
                </p>
              </div>
              <UsersIcon className="w-8 h-8 text-brand-primary-600" />
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <DashboardCharts
          vendors={vendors}
          drivers={drivers}
          users={users}
          totalUsers={totalUsers}
        />
      </div>
    </AdminLayout>
  );
}
