"use client";

import { useState, useMemo } from "react";
import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { useAdminData, VendorData } from "@/hooks/useAdminData";
import { updateUserApprovalStatus } from "@/lib/admin";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { ActionMenu } from "@/components/admin/ActionMenu";
import { VendorDetailsModal } from "@/components/admin/VendorDetailsModal";
import { doc, deleteDoc } from "firebase/firestore";
import { firestore } from "@/firebase/init";
import { DataTable } from "@/components/admin/DataTable";
import type { ColumnDef } from "@tanstack/react-table";

/**
 * Admin Vendors Page - Protected Route
 * Lists all vendors with comprehensive management actions
 */
export default function VendorsPage() {
  const { userData, loading: authLoading, isFullyAuthorized } = useRequireRoleAndApproval(
    ["admin"],
    false
  );

  const { vendors, loading: dataLoading, error } = useAdminData();

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [selectedVendor, setSelectedVendor] = useState<VendorData | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const loading = authLoading || dataLoading;

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

  const handleApprove = async (vendor: VendorData) => {
    setProcessingIds((prev) => new Set(prev).add(vendor.userId));
    setNotification(null);

    try {
      await updateUserApprovalStatus(vendor.userId, true);
      setNotification({
        type: "success",
        message: "Vendor approved successfully!",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Approval error:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to approve vendor.",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(vendor.userId);
        return next;
      });
    }
  };

  const handleReject = async (vendor: VendorData) => {
    setProcessingIds((prev) => new Set(prev).add(vendor.userId));
    setNotification(null);

    try {
      await updateUserApprovalStatus(vendor.userId, false);
      setNotification({
        type: "success",
        message: "Vendor rejected successfully!",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Rejection error:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to reject vendor.",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(vendor.userId);
        return next;
      });
    }
  };

  const handleView = (vendor: VendorData) => {
    setSelectedVendor(vendor);
    setIsViewModalOpen(true);
  };

  const handleEdit = (vendor: VendorData) => {
    setSelectedVendor(vendor);
    // TODO: Implement edit functionality
    alert("Edit functionality will be implemented soon!");
  };

  const handleDelete = async (vendor: VendorData) => {
    setProcessingIds((prev) => new Set(prev).add(vendor.userId));
    setNotification(null);

    try {
      // Delete vendor document
      const vendorDocRef = doc(firestore, "vendors", vendor.userId);
      await deleteDoc(vendorDocRef);

      setNotification({
        type: "success",
        message: "Vendor deleted successfully!",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Delete error:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to delete vendor.",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(vendor.userId);
        return next;
      });
    }
  };

  const handleRefresh = () => {
    // The data will refresh automatically via real-time listeners
    // But we can show a notification to confirm
    setNotification({
      type: "success",
      message: "Data refreshed!",
    });
    setTimeout(() => setNotification(null), 2000);
  };

  const columns = useMemo<ColumnDef<VendorData>[]>(
    () => [
      {
        accessorKey: "businessName",
        header: "Business Name",
        cell: ({ row }) => (
          <div className="font-medium text-gray-900 dark:text-white">
            {row.getValue("businessName")}
          </div>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <div className="text-gray-600 dark:text-gray-400">
            {row.getValue("email") || "N/A"}
          </div>
        ),
      },
      {
        accessorKey: "vendorType",
        header: "Type",
        cell: ({ row }) => (
          <div className="text-gray-600 dark:text-gray-400">
            {row.getValue("vendorType")}
          </div>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => (
          <div className="text-gray-600 dark:text-gray-400">
            {row.getValue("phone")}
          </div>
        ),
      },
      {
        accessorKey: "isApproved",
        header: "Status",
        cell: ({ row }) => {
          const isApproved = row.getValue("isApproved") as boolean;
          return (
            <Badge variant={isApproved ? "success" : "warning"}>
              {isApproved ? "Approved" : "Pending"}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const vendor = row.original;
          const isProcessing = processingIds.has(vendor.userId);
          return (
            <div className="flex justify-center">
              <ActionMenu
                onView={() => handleView(vendor)}
                onEdit={() => handleEdit(vendor)}
                onApprove={() => handleApprove(vendor)}
                onReject={() => handleReject(vendor)}
                onDelete={() => handleDelete(vendor)}
                isApproved={vendor.isApproved}
                isProcessing={isProcessing}
              />
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [processingIds]
  );

  // Show loading state while loading data (but user is authorized)
  if (dataLoading) {
    return (
      <AdminLayout pageTitle="Vendor Management">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading vendors...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout pageTitle="Vendor Management">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Vendor Management">
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
          <DataTable
            columns={columns}
            data={vendors}
            searchableFields={["businessName", "email", "vendorType", "phone"]}
            searchPlaceholder="Search vendors..."
            onRefresh={handleRefresh}
            isLoading={loading}
          />
        </div>
      </div>

      {/* Vendor Details Modal */}
      <VendorDetailsModal
        vendor={selectedVendor}
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedVendor(null);
        }}
        onEdit={() => handleEdit(selectedVendor!)}
      />
    </AdminLayout>
  );
}
