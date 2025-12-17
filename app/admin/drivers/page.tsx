"use client";

import { useState } from "react";
import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { useAdminData, DriverData } from "@/hooks/useAdminData";
import { SortableTable } from "@/components/admin/SortableTable";
import { updateUserApprovalStatus } from "@/lib/admin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";

/**
 * Admin Drivers Page - Protected Route
 * Lists all drivers with approve/reject functionality
 */
export default function DriversPage() {
  const { userData, loading: authLoading } = useRequireRoleAndApproval(
    ["admin"],
    false
  );

  const { drivers, loading: dataLoading, error } = useAdminData();

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const loading = authLoading || dataLoading;

  const handleApprove = async (row: DriverData) => {
    setProcessingIds((prev) => new Set(prev).add(row.userId));
    setNotification(null);

    try {
      await updateUserApprovalStatus(row.userId, true);
      setNotification({
        type: "success",
        message: "Driver approved successfully!",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Approval error:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to approve driver.",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(row.userId);
        return next;
      });
    }
  };

  const handleReject = async (row: DriverData) => {
    setProcessingIds((prev) => new Set(prev).add(row.userId));
    setNotification(null);

    try {
      await updateUserApprovalStatus(row.userId, false);
      setNotification({
        type: "success",
        message: "Driver rejected successfully!",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Rejection error:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to reject driver.",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(row.userId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <AdminLayout pageTitle="Driver Management">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading drivers...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout pageTitle="Driver Management">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Driver Management">
      <div className="space-y-6">
        {notification && (
          <div
            className={`p-4 rounded-lg ${
              notification.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            }`}
          >
            <p
              className={
                notification.type === "success"
                  ? "text-green-800 dark:text-green-200"
                  : "text-red-800 dark:text-red-200"
              }
            >
              {notification.message}
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <SortableTable
            data={drivers}
            columns={[
              {
                key: "name",
                label: "Name",
                sortable: true,
              },
              {
                key: "email",
                label: "Email",
                sortable: true,
              },
              {
                key: "driverType",
                label: "Type",
                sortable: true,
              },
              {
                key: "phone",
                label: "Phone",
                sortable: true,
              },
              {
                key: "isApproved",
                label: "Status",
                sortable: true,
                render: (value) => (
                  <Badge
                    variant={value === true ? "success" : "warning"}
                  >
                    {value === true ? "Approved" : "Pending"}
                  </Badge>
                ),
              },
              {
                key: "id",
                label: "Actions",
                sortable: false,
                render: (_, row) => {
                  const isProcessing = processingIds.has(row.userId);
                  return (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleApprove(row)}
                        disabled={isProcessing || row.isApproved === true}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          isProcessing || row.isApproved === true
                            ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                            : "bg-green-500 hover:bg-green-600 text-white"
                        }`}
                      >
                        {isProcessing ? "Processing..." : "Approve"}
                      </button>
                      <button
                        onClick={() => handleReject(row)}
                        disabled={isProcessing || row.isApproved === false}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          isProcessing || row.isApproved === false
                            ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                            : "bg-red-500 hover:bg-red-600 text-white"
                        }`}
                      >
                        {isProcessing ? "Processing..." : "Reject"}
                      </button>
                    </div>
                  );
                },
              },
            ]}
            searchableFields={["name", "email", "driverType", "phone"]}
            title="Drivers"
            loading={loading}
            onApprove={handleApprove}
            onReject={handleReject}
            processingIds={processingIds}
          />
        </div>
      </div>
    </AdminLayout>
  );
}

