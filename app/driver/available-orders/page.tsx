"use client";

import { useCallback, useMemo, useState } from "react";
import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { DriverLayout } from "@/components/vendor/DriverLayout";
import { DataTable } from "@/components/admin/DataTable";
import { Badge } from "@/components/ui/badge";
import { ShoppingBagIcon, MapPinIcon } from "@/components/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";
import { useAvailableOrders } from "@/hooks/useAvailableOrders";

interface AvailableOrder {
  id: string;
  customerName?: string;
  customerEmail?: string;
  totalAmount?: number;
  deliveryFee?: number;
  deliveryAddress?: any;
  pickupLocation?: any;
  pickupOrder?: boolean;
  paymentMethod?: string;
  createdAt?: any;
  availableAt?: any;
  vendorName?: string;
  products?: Array<{
    productId: string;
    productName: string;
    quantity: number;
  }>;
}

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
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "N/A";
  }
}

function formatAddressLines(address: any): string {
  if (address === null || address === undefined) return "N/A";

  if (typeof address === "string" || typeof address === "number") {
    return String(address);
  }

  if (Array.isArray(address)) {
    return address
      .flatMap((item) => formatAddressLines(item))
      .join(", ");
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

    preferredKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(address, key)) {
        lines.push(...formatAddressLines(address[key]));
      }
    });

    return lines.join(", ") || "N/A";
  }

  return "N/A";
}

export default function AvailableOrdersPage() {
  // Protect route: requires driver role and approval
  const { userData, loading: authLoading, isFullyAuthorized } = useRequireRoleAndApproval(
    ["driver"],
    true
  );

  // Fetch available orders
  const {
    orders,
    loading: ordersLoading,
    error: ordersError,
    acceptOrder,
    acceptingOrderId,
  } = useAvailableOrders();

  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [viewingOrder, setViewingOrder] = useState<AvailableOrder | null>(null);

  const handleAcceptOrder = useCallback(async (orderId: string) => {
    if (!userData?.uid) return;

    try {
      setAcceptingId(orderId);
      await acceptOrder(orderId, userData.uid);
      // Success - order will be removed from available orders list automatically
    } catch (error) {
      console.error("Failed to accept order:", error);
      // Error handling is done in the hook
    } finally {
      setAcceptingId(null);
    }
  }, [userData?.uid, acceptOrder]);

  const columns = useMemo<ColumnDef<AvailableOrder>[]>(
    () => [
      {
        accessorKey: "id",
        header: "Order ID",
        cell: ({ row }) => {
          const id: string = row.original.id;
          return <span className="font-medium text-gray-900 dark:text-gray-100">{id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id}</span>;
        },
      },
      {
        accessorKey: "customerName",
        header: "Customer",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {row.original.customerName || "Unknown"}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {row.original.customerEmail || "—"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "vendorName",
        header: "Vendor",
        cell: ({ row }) => (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {row.original.vendorName || "—"}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
          const isPickup = row.original.pickupOrder;
          return (
            <Badge className={isPickup ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"}>
              {isPickup ? "Pickup" : "Delivery"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => {
          const isPickup = row.original.pickupOrder;
          const location = isPickup
            ? formatAddressLines(row.original.pickupLocation)
            : formatAddressLines(row.original.deliveryAddress);

          return (
            <div className="flex items-center space-x-2">
              <MapPinIcon className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300 max-w-32 truncate" title={location}>
                {location}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "totalAmount",
        header: "Total",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(row.original.totalAmount)}
            </span>
            {row.original.deliveryFee && row.original.deliveryFee > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{formatCurrency(row.original.deliveryFee)} delivery
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const isAccepting = acceptingId === row.original.id || acceptingOrderId === row.original.id;

          return (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setViewingOrder(row.original)}
                className="px-4 py-2 text-sm font-medium text-brand-primary-600 dark:text-brand-primary-400 border border-brand-primary-200 dark:border-brand-primary-700 rounded-lg hover:bg-brand-primary-50 dark:hover:bg-brand-primary-900/20 transition-colors"
              >
                View Details
              </button>
              <button
                onClick={() => handleAcceptOrder(row.original.id)}
                disabled={isAccepting}
                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isAccepting ? "Accepting..." : "Accept Order"}
              </button>
            </div>
          );
        },
      },
    ],
    [acceptingId, acceptingOrderId, handleAcceptOrder]
  );

  const isLoading = authLoading || ordersLoading || !isFullyAuthorized;

  if (isLoading) {
    return (
      <DriverLayout pageTitle="Available Orders">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading available orders...</p>
          </div>
        </div>
      </DriverLayout>
    );
  }

  return (
    <DriverLayout pageTitle="Available Orders">
      <div className="space-y-6">
        {ordersError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Error: {ordersError}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Available Orders</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Browse and accept delivery orders
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{orders.length}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Available Orders</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <DataTable
              columns={columns}
              data={orders}
              searchableFields={[
                "id",
                "customerName",
                "customerEmail",
                "vendorName",
              ]}
              searchPlaceholder="Search available orders..."
              isLoading={ordersLoading}
            />
            {orders.length === 0 && !ordersLoading && (
              <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
                <ShoppingBagIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p>No available orders at the moment.</p>
                <p className="mt-1">New orders will appear here automatically.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setViewingOrder(null)}
          />
          <div className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Order Details</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Review the order information before accepting.</p>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Order ID</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{viewingOrder.id}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Vendor</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{viewingOrder.vendorName || "—"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Customer</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{viewingOrder.customerName || "—"}</p>
                  {viewingOrder.customerEmail && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">{viewingOrder.customerEmail}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Order Type</p>
                  <Badge className={viewingOrder.pickupOrder ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"}>
                    {viewingOrder.pickupOrder ? "Pickup" : "Delivery"}
                  </Badge>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Pickup Location</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {formatAddressLines(viewingOrder.pickupLocation)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Delivery Address</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {viewingOrder.pickupOrder ? "Customer pickup" : formatAddressLines(viewingOrder.deliveryAddress)}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Total Amount</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(viewingOrder.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Delivery Fee</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{formatCurrency(viewingOrder.deliveryFee)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-2">Items</p>
                {viewingOrder.products && viewingOrder.products.length > 0 ? (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden">
                    {viewingOrder.products.map((product) => (
                      <div key={product.productId} className="flex items-center justify-between px-4 py-2 text-sm text-gray-700 dark:text-gray-300">
                        <span>{product.productName}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Qty: {product.quantity}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No items listed.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DriverLayout>
  );
}
