"use client";

import { useMemo, useState } from "react";
import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import type { ColumnDef } from "@tanstack/react-table";
import { useAdminWallets, AdminWallet } from "@/hooks/useAdminWallets";
import { Badge } from "@/components/ui/badge";
import toast from "react-hot-toast";

function formatCurrency(value: number | null | undefined, currency = "USD") {
  if (value === null || value === undefined) return "$0.00";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value}`;
  }
}

export default function AdminWalletsPage() {
  const { userData, loading: authLoading, isFullyAuthorized } =
    useRequireRoleAndApproval(["admin"], false);

  const { wallets, loading: dataLoading, error, adjustBalance } = useAdminWallets();

  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const columns = useMemo<ColumnDef<AdminWallet>[]>(
    () => [
      {
        accessorKey: "userEmail",
        header: "User",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {row.original.userEmail || "—"}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {row.original.userId}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "balance",
        header: "Balance",
        cell: ({ row }) => (
          <div className="text-sm font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(row.original.balance, row.original.currency || "USD")}
          </div>
        ),
      },
      {
        accessorKey: "currency",
        header: "Currency",
        cell: ({ row }) => (
          <Badge variant="default" className="uppercase">
            {row.original.currency || "USD"}
          </Badge>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: "Updated",
        cell: ({ row }) => {
          const value = row.original.updatedAt;
          const date =
            value?.toDate?.() instanceof Date
              ? value.toDate()
              : value
              ? new Date(value)
              : null;
          return (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {date ? date.toLocaleString() : "—"}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <button
            onClick={() => {
              setAdjustingId(row.original.id);
              setAmount("");
              setReason("");
            }}
            className="px-3 py-1.5 text-sm bg-brand-primary-600 text-white rounded-lg hover:bg-brand-primary-700 transition-colors"
          >
            Adjust
          </button>
        ),
        enableSorting: false,
      },
    ],
    []
  );

  const handleAdjust = async () => {
    if (!adjustingId) return;
    const numericAmount = parseFloat(amount);
    if (Number.isNaN(numericAmount) || numericAmount === 0) {
      toast.error("Amount must be non-zero");
      return;
    }
    if (!reason.trim()) {
      toast.error("Reason is required");
      return;
    }
    try {
      toast.dismiss();
      toast.loading("Updating wallet...");
      await adjustBalance(adjustingId, numericAmount, reason, userData?.uid || "admin");
      toast.dismiss();
      toast.success("Wallet updated");
      setAdjustingId(null);
      setAmount("");
      setReason("");
    } catch (err: any) {
      toast.dismiss();
      toast.error(err?.message || "Failed to update wallet");
    }
  };

  // Auth guard
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

  if (dataLoading) {
    return (
      <AdminLayout pageTitle="Wallets">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading wallets...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Wallets">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage customer wallet balances
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Error: {error}</p>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <DataTable
            columns={columns}
            data={wallets}
            searchableFields={["userEmail", "userId", "currency"]}
            searchPlaceholder="Search wallets..."
            onRefresh={() => {}}
            isLoading={dataLoading}
          />
        </div>
      </div>

      {/* Adjust Modal */}
      {adjustingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Adjust Wallet Balance
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (use negative to debit)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-500"
                  placeholder="e.g. 25.00 or -10.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-500"
                  placeholder="e.g. Adjustment, goodwill credit, correction"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setAdjustingId(null)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjust}
                  className="px-4 py-2 rounded-lg bg-brand-primary-600 text-white hover:bg-brand-primary-700 transition-colors"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

