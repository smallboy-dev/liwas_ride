"use client";

import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { useDriverData, type DriverOrder } from "@/hooks/useDriverData";
import { DriverLayout } from "@/components/vendor/DriverLayout";
import { Badge } from "@/components/ui/badge";
import { MapPinIcon } from "@/components/ui/icons";

const statusVariantMap: Record<string, string> = {
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "in-transit": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  assigned: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
};

function getStatusVariant(status?: string) {
  if (!status) return "bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-200";
  const key = status.toLowerCase();
  return statusVariantMap[key] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-200";
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
 * Driver Active Deliveries Page
 * Displays all active deliveries (assigned or in-transit status)
 */
export default function DriverDeliveriesPage() {
  // Protect route: requires driver role and approval
  const { userData, loading, isFullyAuthorized } = useRequireRoleAndApproval(['driver'], true);

  // Fetch driver-specific data
  const {
    activeDeliveries,
    loading: dataLoading,
    error: dataError,
  } = useDriverData(userData?.uid || null);

  // Show loading state while checking auth or loading data
  if (loading || dataLoading || !isFullyAuthorized) {
    return (
      <DriverLayout pageTitle="Active Deliveries">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading deliveries...</p>
          </div>
        </div>
      </DriverLayout>
    );
  }

  return (
    <DriverLayout pageTitle="Active Deliveries">
      <div className="space-y-6">
        {/* Error message */}
        {dataError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Error: {dataError}</p>
          </div>
        )}

        {/* Active Deliveries Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {activeDeliveries.length === 0 ? (
            <div className="p-8 text-center">
              <MapPinIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">No active deliveries</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                You don't have any deliveries assigned or in transit right now.
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
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Created Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {activeDeliveries.map((delivery: DriverOrder) => (
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusVariant(delivery.orderStatus)}>
                          {delivery.orderStatus || "Unknown"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(delivery.createdAt)}
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
            You have <span className="font-semibold">{activeDeliveries.length}</span> active{" "}
            {activeDeliveries.length === 1 ? "delivery" : "deliveries"}.
          </p>
        </div>
      </div>
    </DriverLayout>
  );
}
