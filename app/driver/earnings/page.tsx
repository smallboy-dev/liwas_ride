"use client";

import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { useDriverData, type DriverOrder } from "@/hooks/useDriverData";
import { DriverLayout } from "@/components/vendor/DriverLayout";
import { Badge } from "@/components/ui/badge";
import { TrendingUpIcon } from "@/components/ui/icons";

function formatCurrency(amount?: number) {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return "N/A";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}

function formatDate(value?: any) {
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
      .flatMap((item) => formatAddressLines(item))
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

    for (const key of preferredKeys) {
      const value = address[key];
      if (value && typeof value === "string") {
        lines.push(value);
      }
    }

    return lines.length > 0 ? lines : [JSON.stringify(address)];
  }

  return [];
}

function truncateId(id: string, maxLength: number = 12): string {
  return id.length > maxLength ? `${id.substring(0, maxLength)}...` : id;
}

/**
 * Driver Delivery History Page
 * Displays all completed deliveries with earnings information
 */
export default function DriverEarningsPage() {
  // Protect route: requires driver role and approval
  const { userData, loading, isFullyAuthorized } = useRequireRoleAndApproval(['driver'], true);

  // Fetch driver-specific data
  const {
    deliveryHistory,
    totalEarnings,
    loading: dataLoading,
    error: dataError,
  } = useDriverData(userData?.uid || null);

  // Show loading state while checking auth or loading data
  if (loading || dataLoading || !isFullyAuthorized) {
    return (
      <DriverLayout pageTitle="Delivery History & Earnings">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading history...</p>
          </div>
        </div>
      </DriverLayout>
    );
  }

  return (
    <DriverLayout pageTitle="Delivery History & Earnings">
      <div className="space-y-6">
        {/* Error message */}
        {dataError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Error: {dataError}</p>
          </div>
        )}

        {/* Total Earnings Card */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 dark:text-green-300 text-sm font-medium">Total Earnings</p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">
                {formatCurrency(totalEarnings)}
              </p>
              <p className="text-green-600 dark:text-green-400 text-sm mt-2">
                From {deliveryHistory.length} completed {deliveryHistory.length === 1 ? "delivery" : "deliveries"}
              </p>
            </div>
            <TrendingUpIcon className="w-12 h-12 text-green-300 dark:text-green-700" />
          </div>
        </div>

        {/* Delivery History Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {deliveryHistory.length === 0 ? (
            <div className="p-8 text-center">
              <TrendingUpIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">No delivery history</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                You haven't completed any deliveries yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Pickup Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Dropoff Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Completion Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Earnings
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {deliveryHistory.map((delivery: DriverOrder) => (
                    <tr
                      key={delivery.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-help" title={delivery.id}>
                          {truncateId(delivery.id)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {formatAddressLines(delivery.pickupLocation).length > 0 ? (
                            <div className="space-y-1">
                              {formatAddressLines(delivery.pickupLocation).slice(0, 2).map((line, idx) => (
                                <div key={idx}>{line}</div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700 dark:text-gray-300">
                          {formatAddressLines(delivery.dropoffLocation).length > 0 ? (
                            <div className="space-y-1">
                              {formatAddressLines(delivery.dropoffLocation).slice(0, 2).map((line, idx) => (
                                <div key={idx}>{line}</div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(delivery.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(delivery.deliveryFee ?? undefined)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            You have completed <span className="font-semibold">{deliveryHistory.length}</span> {deliveryHistory.length === 1 ? "delivery" : "deliveries"} and earned{" "}
            <span className="font-semibold">{formatCurrency(totalEarnings)}</span>.
          </p>
        </div>
      </div>
    </DriverLayout>
  );
}
