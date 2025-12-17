"use client";

import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { useDriverData, type DriverOrder } from "@/hooks/useDriverData";
import { DriverLayout } from "@/components/vendor/DriverLayout";
import { Badge } from "@/components/ui/badge";
import { CheckCircleIcon } from "@/components/ui/icons";

const statusVariantMap: Record<string, string> = {
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
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

export default function DeliveredOrdersPage() {
  const { userData, loading, isFullyAuthorized } = useRequireRoleAndApproval(["driver"], true);

  const {
    deliveryHistory,
    loading: dataLoading,
    error: dataError,
  } = useDriverData(userData?.uid || null);

  if (loading || dataLoading || !isFullyAuthorized) {
    return (
      <DriverLayout pageTitle="Delivered Orders">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading delivered orders...</p>
          </div>
        </div>
      </DriverLayout>
    );
  }

  return (
    <DriverLayout pageTitle="Delivered Orders">
      <div className="space-y-6">
        {dataError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Error: {dataError}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {deliveryHistory.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircleIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">No delivered orders yet</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                Delivered orders you complete will appear here automatically.
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
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Delivered At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Driver Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Signature
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {deliveryHistory.map((order: DriverOrder) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {order.id.length > 16 ? `${order.id.slice(0, 10)}…${order.id.slice(-4)}` : order.id}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex flex-col">
                          <span className="font-medium">{order.customerName ?? "Unknown"}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{order.customerEmail ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(order.updatedAt ?? order.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(order.totalAmount ?? 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusVariant(order.driverStatus || order.orderStatus)}>
                          {(order.driverStatus || order.orderStatus || "delivered").replace(/-/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {order.proofOfDeliverySignatureUrl ? (
                          <a
                            href={order.proofOfDeliverySignatureUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-brand-primary-600 hover:text-brand-primary-700"
                          >
                            View signature
                          </a>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Not captured</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200 text-sm">
            Total delivered orders: <span className="font-semibold">{deliveryHistory.length}</span>
          </p>
        </div>
      </div>
    </DriverLayout>
  );
}
