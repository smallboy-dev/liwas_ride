"use client";

import { useCallback, useMemo, useState } from "react";
import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { useVendorData, type VendorTransaction } from "@/hooks/useVendorData";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/badge";
import { DollarSignIcon, ShoppingBagIcon, TrendingUpIcon } from "@/components/ui/icons";
import { RemitDriverCashModal } from "@/components/vendor/RemitDriverCashModal";
import { toast } from "react-hot-toast";

function formatCurrency(amount?: number | null) {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return "N/A";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
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

const statusVariantMap: Record<string, string> = {
  "awaiting-remittance": "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  remitted: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  reconciled: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

function getStatusVariant(status?: string | null) {
  if (!status) return "bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-200";
  const key = status.toLowerCase();
  return statusVariantMap[key] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-200";
}

export default function VendorTransactionsPage() {
  const { userData, loading, isFullyAuthorized } = useRequireRoleAndApproval(["vendor"], true);

  const {
    transactions,
    loading: dataLoading,
    error: dataError,
    remitDriverCash,
    remittingTransactionId,
  } = useVendorData(userData?.uid || null);

  const [selectedTransaction, setSelectedTransaction] = useState<VendorTransaction | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const handleOpenRemit = useCallback((transaction: VendorTransaction) => {
    setSelectedTransaction(transaction);
  }, []);

  const handleCloseRemit = useCallback(() => {
    setSelectedTransaction(null);
  }, []);

  const handleRemit = useCallback(
    async (transaction: VendorTransaction, signature: Blob) => {
      try {
        setSubmittingId(transaction.id);
        await remitDriverCash(transaction, signature);
        toast.success("Remittance confirmed");
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to confirm remittance");
        throw err;
      } finally {
        setSubmittingId(null);
      }
    },
    [remitDriverCash]
  );

  const totalNet = useMemo(
    () =>
      transactions.reduce(
        (sum, transaction) =>
          transaction.netAmount ? sum + Number(transaction.netAmount) : sum,
        0
      ),
    [transactions]
  );

  const totalCommission = useMemo(
    () =>
      transactions.reduce(
        (sum, transaction) =>
          transaction.commissionAmount ? sum + Number(transaction.commissionAmount) : sum,
        0
      ),
    [transactions]
  );

  const pendingAmount = useMemo(
    () =>
      transactions.reduce(
        (sum, transaction) =>
          transaction.status === "awaiting-remittance" && transaction.netAmount
            ? sum + Number(transaction.netAmount)
            : sum,
        0
      ),
    [transactions]
  );

  if (loading || dataLoading || !isFullyAuthorized) {
    return (
      <VendorLayout pageTitle="Transactions">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading transactions...</p>
          </div>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout pageTitle="Transactions">
      <div className="space-y-6">
        {dataError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Error: {dataError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Net COD Received"
            value={formatCurrency(totalNet)}
            icon={<DollarSignIcon className="w-6 h-6" />}
            iconBgColor="bg-green-100 dark:bg-green-900/30"
          />
          <StatCard
            title="Commission Paid"
            value={formatCurrency(totalCommission)}
            icon={<TrendingUpIcon className="w-6 h-6" />}
            iconBgColor="bg-purple-100 dark:bg-purple-900/30"
          />
          <StatCard
            title="Awaiting Remittance"
            value={formatCurrency(pendingAmount)}
            icon={<ShoppingBagIcon className="w-6 h-6" />}
            iconBgColor="bg-amber-100 benches dark:bg-amber-900/30"
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {transactions.length === 0 ? (
            <div className="p-8 text-center">
              <DollarSignIcon className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 text-lg">No transactions yet</p>
              <p className="text-gray-500 dark:text-gray-500 text-sm mt-1">
                Completed cash-on-delivery orders will appear here once funds are remitted.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Net Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Commission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map((transaction: VendorTransaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(transaction.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex flex-col">
                          <span className="font-medium">{transaction.orderCode || transaction.orderId}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {(transaction.type || "").replace(/-/g, " ")}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {transaction.driverName || transaction.driverId || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(transaction.netAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        {transaction.commissionAmount ? formatCurrency(transaction.commissionAmount) : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusVariant(transaction.status)}>
                          {(transaction.status || "pending").replace(/-/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {transaction.status === "awaiting-remittance" && transaction.driverTransactionId ? (
                          <button
                            onClick={() => handleOpenRemit(transaction)}
                            disabled={submittingId === transaction.id || Boolean(remittingTransactionId)}
                            className="inline-flex items-center rounded-lg bg-brand-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {submittingId === transaction.id || remittingTransactionId === transaction.id
                              ? "Submitting..."
                              : "Confirm remittance"}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <RemitDriverCashModal
        transaction={selectedTransaction}
        onClose={handleCloseRemit}
        onRemit={handleRemit}
      />
    </VendorLayout>
  );
}
