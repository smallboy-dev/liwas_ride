"use client";

import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { useCallback, useMemo, useState } from "react";
import { useDriverData, type DriverOrder } from "@/hooks/useDriverData";
import { DriverLayout } from "@/components/vendor/DriverLayout";
import { StatCard } from "@/components/admin/StatCard";
import { StatusSelector } from "@/components/ui/StatusSelector";
import dynamic from "next/dynamic";
import {
  MapPinIcon,
  DollarSignIcon,
  TrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
} from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { CompleteDeliveryModal } from "@/components/driver/CompleteDeliveryModal";
const DriverCharts = dynamic(() => import("@/components/driver/DriverCharts").then(m => m.DriverCharts), {
  ssr: false,
});

function formatDate(value?: any): string {
  if (!value) return "N/A";
  try {
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "N/A";
  }
}

function formatAddressLines(address: any): string[] {
  if (address === null || address === undefined) return [];

  if (typeof address === "string" || typeof address === "number") {
    return String(address)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  if (Array.isArray(address)) {
    return address
      .flatMap((entry) => formatAddressLines(entry))
      .map((line) => line.trim())
      .filter(Boolean);
  }

  if (typeof address === "object") {
    const preferredKeys = [
      "label",
      "line1",
      "line2",
      "street",
      "streetAddress",
      "city",
      "state",
      "province",
      "postalCode",
      "zip",
      "country",
    ];
    const lines: string[] = [];
    const seen = new Set<string>();

    preferredKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(address, key)) {
        seen.add(key);
        lines.push(...formatAddressLines(address[key]));
      }
    });

    Object.keys(address).forEach((key) => {
      if (seen.has(key)) return;
      const value = address[key];
      if (value === null || value === undefined || value === "") return;
      lines.push(...formatAddressLines(value));
    });

    return Array.from(new Set(lines.map((line) => line.trim()).filter(Boolean)));
  }

  return [];
}

/**
 * Driver Dashboard - Protected Route
 * Requires: driver role and approval status
 * Unapproved drivers are redirected to /application-status
 */
export default function DriverDashboardPage() {
  // Protect route: requires driver role and approval
  const { userData, loading, isFullyAuthorized } = useRequireRoleAndApproval(['driver'], true);
  
  // Fetch driver-specific data for summary stats only
  const [completingOrder, setCompletingOrder] = useState<DriverOrder | null>(null);

  const {
    activeDeliveries,
    totalActiveDeliveries,
    totalEarnings,
    totalDeliveryHistory,
    cashOnHand,
    loading: dataLoading,
    error: dataError,
    driverStatus,
    setDriverStatus,
    updatingStatus,
    markDeliveryPickedUp,
    completeDelivery,
    transactions,
  } = useDriverData(userData?.uid || null);

  const ongoingOrder = useMemo<DriverOrder | null>(() => {
    if (!activeDeliveries.length) return null;
    const sorted = [...activeDeliveries].sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || new Date(a.createdAt).getTime?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || new Date(b.createdAt).getTime?.() || 0;
      return bTime - aTime;
    });
    return sorted[0];
  }, [activeDeliveries]);

  const handleStartComplete = useCallback((order: DriverOrder) => {
    setCompletingOrder(order);
  }, []);

  const handleCompleteDelivery = useCallback(async (order: DriverOrder, signature: Blob) => {
    await completeDelivery(order.id, signature);
  }, [completeDelivery]);

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
      <DriverLayout pageTitle="Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </DriverLayout>
    );
  }

  // Format earnings for display
  const formattedEarnings = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(totalEarnings);
  const formattedCashOnHand = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cashOnHand);

  return (
    <DriverLayout pageTitle="Dashboard">
      <div className="space-y-6">
        {/* Welcome Card with Status Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <p className="text-gray-600 dark:text-gray-400">
                Welcome, {userData?.email}! This is your driver dashboard.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Your role: <span className="font-semibold">{userData?.role}</span> | 
                Status: <span className="font-semibold">{userData?.isApproved ? 'Approved' : 'Pending'}</span>
              </p>
            </div>
            <div className="flex flex-col items-start md:items-end space-y-2">
              <StatusSelector
                status={driverStatus}
                onChange={setDriverStatus}
                disabled={updatingStatus}
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

        {/* Ongoing Delivery */}
        {ongoingOrder ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-brand-primary-600" />
                  Ongoing delivery
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Stay enroute until it’s delivered and signed.</p>
              </div>
              <Badge className="capitalize">
                {(ongoingOrder.driverStatus || ongoingOrder.orderStatus || "enroute").replace(/-/g, " ")}
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Order ID</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100" title={ongoingOrder.id}>
                  {ongoingOrder.id.length > 18 ? `${ongoingOrder.id.slice(0, 10)}…${ongoingOrder.id.slice(-4)}` : ongoingOrder.id}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Customer</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ongoingOrder.customerName ?? "Unknown"}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{ongoingOrder.customerEmail ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Assigned</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {formatDate(ongoingOrder.createdAt)}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Pickup location</p>
                {ongoingOrder.pickupOrder ? (
                  <p className="text-sm text-gray-700 dark:text-gray-300">Customer pickup</p>
                ) : formatAddressLines(ongoingOrder.pickupLocation).length ? (
                  <div className="space-y-1">
                    {formatAddressLines(ongoingOrder.pickupLocation).map((line, index) => (
                      <p key={index} className="text-sm text-gray-700 dark:text-gray-300">
                        {line}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">N/A</p>
                )}
              </div>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Dropoff address</p>
                {ongoingOrder.pickupOrder ? (
                  <p className="text-sm text-gray-700 dark:text-gray-300">Customer pickup</p>
                ) : formatAddressLines(ongoingOrder.dropoffLocation ?? ongoingOrder.deliveryAddress).length ? (
                  <div className="space-y-1">
                    {formatAddressLines(ongoingOrder.dropoffLocation ?? ongoingOrder.deliveryAddress).map((line, index) => (
                      <p key={index} className="text-sm text-gray-700 dark:text-gray-300">
                        {line}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">N/A</p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3">
              {ongoingOrder.orderStatus === "assigned" || ongoingOrder.driverStatus === "awaiting-pickup" ? (
                <button
                  onClick={() => markDeliveryPickedUp(ongoingOrder.id)}
                  className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Mark as picked up
                </button>
              ) : null}
              <button
                onClick={() => handleStartComplete(ongoingOrder)}
                className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <span className="inline-flex items-center gap-2">
                  <CheckCircleIcon className="w-4 h-4" />
                  Collect signature & deliver
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 dark:text-gray-300">No active deliveries right now. Pick a new order from the Available Orders tab.</p>
          </div>
        )}

        {/* Summary Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <StatCard
            title="Active Deliveries"
            value={totalActiveDeliveries}
            icon={<MapPinIcon className="w-6 h-6" />}
            iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          />
          <StatCard
            title="Earnings"
            value={formattedEarnings}
            icon={<DollarSignIcon className="w-6 h-6" />}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
          />
          <StatCard
            title="Completed Deliveries"
            value={totalDeliveryHistory}
            icon={<TrendingUpIcon className="w-6 h-6" />}
            iconBgColor="bg-purple-100 dark:bg-purple-900/30"
          />
          <StatCard
            title="Cash to Remit"
            value={formattedCashOnHand}
            icon={<DollarSignIcon className="w-6 h-6" />}
            iconBgColor="bg-amber-100 dark:bg-amber-900/30"
          />
        </div>

        {/* Charts */}
        <DriverCharts activeDeliveries={activeDeliveries} transactions={transactions || []} />

      </div>
      <CompleteDeliveryModal
        order={completingOrder}
        onClose={() => setCompletingOrder(null)}
        onComplete={handleCompleteDelivery}
      />
    </DriverLayout>
  );
}

