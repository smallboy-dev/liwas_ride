"use client";

import { useMemo } from "react";
import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { useAdminTransactions, AdminTransaction } from "@/hooks/useAdminTransactions";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/admin/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { Timestamp } from "firebase/firestore";
import { formatOrderId } from "@/lib/utils";

function formatDate(value?: any): string {
  if (!value) return "—";
  try {
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "—";
  }
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function getStatusVariant(status?: string | null): "success" | "warning" | "destructive" | "default" {
  if (!status) return "default";
  const statusLower = status.toLowerCase();
  if (statusLower.includes("completed") || statusLower.includes("paid") || statusLower.includes("remitted")) {
    return "success";
  }
  if (statusLower.includes("pending") || statusLower.includes("awaiting")) {
    return "warning";
  }
  if (statusLower.includes("failed") || statusLower.includes("rejected")) {
    return "destructive";
  }
  return "default";
}

/**
 * Admin Transactions Page - Protected Route
 * Shows all transactions from both vendors and drivers
 */
export default function AdminTransactionsPage() {
  const { userData, loading: authLoading, isFullyAuthorized } = useRequireRoleAndApproval(
    ["admin"],
    false
  );

  const { transactions, loading: dataLoading, error } = useAdminTransactions();

  // Calculate totals - must be called before any early returns
  const totals = useMemo(() => {
    const vendorTotal = transactions
      .filter((t) => t.type === "vendor")
      .reduce((sum, t) => sum + (t.netAmount || 0), 0);
    
    const driverTotal = transactions
      .filter((t) => t.type === "driver")
      .reduce((sum, t) => sum + (t.netAmount || 0), 0);
    
    const totalCommission = transactions.reduce(
      (sum, t) => sum + (t.commissionAmount || 0),
      0
    );
    
    const totalGross = transactions.reduce(
      (sum, t) => sum + (t.grossAmount || 0),
      0
    );

    return {
      vendorTotal,
      driverTotal,
      totalCommission,
      totalGross,
      totalTransactions: transactions.length,
    };
  }, [transactions]);

  // Define columns - must be called before any early returns
  const columns = useMemo<ColumnDef<AdminTransaction>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: "Date",
        cell: ({ row }) => (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {formatDate(row.getValue("createdAt"))}
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
          const type = row.getValue("type") as string;
          return (
            <Badge variant={type === "vendor" ? "success" : "default"}>
              {type === "vendor" ? "Vendor" : "Driver"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "orderCode",
        header: "Order",
        cell: ({ row }) => {
          const orderCode = row.original.orderCode || row.original.orderId;
          return (
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {formatOrderId(orderCode)}
            </div>
          );
        },
      },
      {
        id: "vendor",
        header: "Vendor",
        cell: ({ row }) => (
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {row.original.vendorName || row.original.vendorId || "—"}
          </div>
        ),
      },
      {
        id: "driver",
        header: "Driver",
        cell: ({ row }) => (
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {row.original.driverName || row.original.driverId || "—"}
          </div>
        ),
      },
      {
        accessorKey: "transactionType",
        header: "Payment Type",
        cell: ({ row }) => (
          <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
            {(row.getValue("transactionType") as string)?.replace(/-/g, " ") || "—"}
          </div>
        ),
      },
      {
        accessorKey: "grossAmount",
        header: "Gross Amount",
        cell: ({ row }) => (
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatCurrency(row.getValue("grossAmount"))}
          </div>
        ),
      },
      {
        accessorKey: "commissionAmount",
        header: "Commission",
        cell: ({ row }) => (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {row.original.commissionAmount ? formatCurrency(row.original.commissionAmount) : "—"}
          </div>
        ),
      },
      {
        accessorKey: "netAmount",
        header: "Net Amount",
        cell: ({ row }) => (
          <div className="text-sm font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(row.getValue("netAmount"))}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <Badge variant={getStatusVariant(status)}>
              {status?.replace(/-/g, " ") || "—"}
            </Badge>
          );
        },
      },
    ],
    []
  );

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

  // Show loading state while loading data (but user is authorized)
  if (dataLoading) {
    return (
      <AdminLayout pageTitle="Transactions">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading transactions...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="All Transactions">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Transactions</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {totals.totalTransactions}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Gross</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {formatCurrency(totals.totalGross)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Commission</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
              {formatCurrency(totals.totalCommission)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Vendor Total</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {formatCurrency(totals.vendorTotal)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Driver Total</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
              {formatCurrency(totals.driverTotal)}
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Error: {error}</p>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <DataTable
            columns={columns}
            data={transactions}
            searchableFields={["orderCode", "orderId", "vendorName", "driverName", "transactionType", "status"]}
            searchPlaceholder="Search transactions..."
            onRefresh={() => {}}
            isLoading={dataLoading}
          />
        </div>
      </div>
    </AdminLayout>
  );
}

