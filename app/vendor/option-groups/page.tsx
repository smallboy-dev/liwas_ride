"use client";

import { useState, useEffect, useMemo } from "react";
import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { DataTable } from "@/components/admin/DataTable";
import { ActionMenu } from "@/components/admin/ActionMenu";
import { Badge } from "@/components/ui/badge";
import {
  collection,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/firebase/init";
import type { ColumnDef } from "@tanstack/react-table";

interface OptionGroup {
  id: string;
  name: string;
  businessName?: string;
  vendorId?: string;
  multiple?: boolean;
  required?: boolean;
  isActive?: boolean;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
}

/**
 * Vendor Option Groups Page - Protected Route
 * Manages product option groups for vendors
 */
export default function VendorOptionGroupsPage() {
  const { userData, loading: authLoading } = useRequireRoleAndApproval(
    ["vendor"],
    true
  );

  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [vendorBusinessName, setVendorBusinessName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingOptionGroup, setEditingOptionGroup] = useState<OptionGroup | null>(null);
  const [viewingOptionGroup, setViewingOptionGroup] = useState<OptionGroup | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    businessName: "",
    multiple: true,
    required: false,
    isActive: true,
  });

  // Fetch option groups with business names
  useEffect(() => {
    if (authLoading) return;

    const unsubscribe = onSnapshot(
      collection(firestore, "optionGroups"),
      async (snapshot) => {
        try {
          // Fetch business names for each option group
          const groupsWithBusinessNames = await Promise.all(
            snapshot.docs.map(async (groupDoc) => {
              const data = groupDoc.data();
              const optionGroup: OptionGroup = {
                id: groupDoc.id,
                ...data,
              } as OptionGroup;

              // If vendorId exists, fetch business name from vendor document
              if (data.vendorId) {
                try {
                  const vendorDocRef = doc(firestore, "vendors", data.vendorId);
                  const vendorDoc = await getDoc(vendorDocRef);
                  if (vendorDoc.exists()) {
                    const vendorData = vendorDoc.data();
                    optionGroup.businessName = vendorData.businessName || "";
                  }
                } catch (err) {
                  console.error(`Error fetching vendor for option group ${groupDoc.id}:`, err);
                }
              }

              return optionGroup;
            })
          );

          setOptionGroups(groupsWithBusinessNames);
          setLoading(false);
        } catch (err: any) {
          console.error("Error processing option groups:", err);
          setError(err.message);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error fetching option groups:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authLoading]);

  // Fetch vendor business name
  useEffect(() => {
    if (authLoading || !userData?.uid) return;

    const fetchVendorBusinessName = async () => {
      try {
        const vendorDocRef = doc(firestore, "vendors", userData.uid);
        const vendorDoc = await getDoc(vendorDocRef);
        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
          const businessName = vendorData.businessName || "";
          setVendorBusinessName(businessName);
          setFormData((prev) => ({ ...prev, businessName }));
        }
      } catch (err) {
        console.error("Error fetching vendor business name:", err);
      }
    };

    fetchVendorBusinessName();
  }, [authLoading, userData?.uid]);

  const handleCreate = () => {
    setEditingOptionGroup(null);
    setFormData({
      name: "",
      businessName: vendorBusinessName,
      multiple: true,
      required: false,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (optionGroup: OptionGroup) => {
    setEditingOptionGroup(optionGroup);
    setFormData({
      name: optionGroup.name || "",
      businessName: optionGroup.businessName || vendorBusinessName,
      multiple: optionGroup.multiple ?? true,
      required: optionGroup.required ?? false,
      isActive: optionGroup.isActive ?? true,
    });
    setIsModalOpen(true);
  };

  const handleViewDetails = (optionGroup: OptionGroup) => {
    setViewingOptionGroup(optionGroup);
    setIsViewModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!formData.name.trim()) {
      setNotification({
        type: "error",
        message: "Option group name is required.",
      });
      return;
    }

    const processingKey = editingOptionGroup?.id || "new";
    setProcessingIds((prev) => new Set(prev).add(processingKey));

    try {
      if (editingOptionGroup) {
        // Update existing option group
        const optionGroupData = {
          name: formData.name.trim(),
          businessName: formData.businessName,
          vendorId: userData?.uid,
          multiple: formData.multiple,
          required: formData.required,
          isActive: formData.isActive,
          updatedAt: serverTimestamp(),
        };

        await setDoc(doc(firestore, "optionGroups", editingOptionGroup.id), optionGroupData, { merge: true });
        setNotification({
          type: "success",
          message: "Option group updated successfully!",
        });
      } else {
        // Create new option group
        const newDocRef = doc(collection(firestore, "optionGroups"));
        const optionGroupData = {
          name: formData.name.trim(),
          businessName: formData.businessName,
          vendorId: userData?.uid,
          multiple: formData.multiple,
          required: formData.required,
          isActive: formData.isActive,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(newDocRef, optionGroupData);
        setNotification({
          type: "success",
          message: "Option group created successfully!",
        });
      }

      setIsModalOpen(false);
      setFormData({
        name: "",
        businessName: vendorBusinessName,
        multiple: true,
        required: false,
        isActive: true,
      });
      setEditingOptionGroup(null);
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Save error:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to save option group.",
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(processingKey);
        return next;
      });
    }
  };

  const handleDelete = async (optionGroup: OptionGroup) => {
    if (!confirm(`Are you sure you want to delete "${optionGroup.name}"? This action cannot be undone.`)) {
      return;
    }

    setProcessingIds((prev) => new Set(prev).add(optionGroup.id));
    setNotification(null);

    try {
      await deleteDoc(doc(firestore, "optionGroups", optionGroup.id));
      setNotification({
        type: "success",
        message: "Option group deleted successfully!",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Delete error:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to delete option group.",
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(optionGroup.id);
        return next;
      });
    }
  };

  const formatDate = (timestamp: Timestamp | null): string => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "Invalid date";
    }
  };

  const columns = useMemo<ColumnDef<OptionGroup>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => {
          const id = row.getValue("id") as string;
          return (
            <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
              {id.slice(0, 8)}...
            </div>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="font-medium text-gray-900 dark:text-white">
            {row.getValue("name") || "Unnamed Option Group"}
          </div>
        ),
      },
      {
        accessorKey: "businessName",
        header: "Business Name",
        cell: ({ row }) => (
          <div className="text-gray-600 dark:text-gray-400">
            {row.getValue("businessName") || "N/A"}
          </div>
        ),
      },
      {
        accessorKey: "multiple",
        header: "Multiple",
        cell: ({ row }) => {
          const multiple = row.getValue("multiple") as boolean | undefined;
          return (
            <Badge variant={multiple ? "success" : "warning"}>
              {multiple ? "Yes" : "No"}
            </Badge>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: "Created At",
        cell: ({ row }) => {
          const createdAt = row.getValue("createdAt") as Timestamp | null;
          return (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {formatDate(createdAt)}
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const optionGroup = row.original;
          const isProcessing = processingIds.has(optionGroup.id);
          return (
            <div className="flex justify-center">
              <ActionMenu
                onView={() => handleViewDetails(optionGroup)}
                onEdit={() => handleEdit(optionGroup)}
                onDelete={() => handleDelete(optionGroup)}
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

  if (authLoading || loading) {
    return (
      <VendorLayout pageTitle="Option Groups">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading option groups...
            </p>
          </div>
        </div>
      </VendorLayout>
    );
  }

  if (error) {
    return (
      <VendorLayout pageTitle="Option Groups">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout pageTitle="Option Groups">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Option Groups
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your product option groups
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-brand-primary-600 text-white rounded-lg hover:bg-brand-primary-700 transition-colors flex items-center space-x-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Add Option Group</span>
          </button>
        </div>

        {/* Notification */}
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

        {/* Data Table */}
        <DataTable
          data={optionGroups}
          columns={columns}
          searchableFields={["name"]}
          searchPlaceholder="Search option groups..."
        />

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {editingOptionGroup ? "Edit Option Group" : "Create Option Group"}
                  </h2>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setFormData({
                        name: "",
                        businessName: vendorBusinessName,
                        multiple: true,
                        required: false,
                        isActive: true,
                      });
                      setEditingOptionGroup(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Business Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Business Name
                    </label>
                    <input
                      type="text"
                      value={formData.businessName}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                      placeholder="Business name"
                    />
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                      placeholder="Enter option group name"
                    />
                  </div>

                  {/* Multiple */}
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="multiple"
                      checked={formData.multiple}
                      onChange={(e) =>
                        setFormData({ ...formData, multiple: e.target.checked })
                      }
                      className="mt-1 w-5 h-5 text-brand-primary-600 border-gray-300 rounded focus:ring-brand-primary-500"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="multiple"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                      >
                        Multiple
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Allow customers to select multiple options under this option group
                      </p>
                    </div>
                  </div>

                  {/* Required */}
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="required"
                      checked={formData.required}
                      onChange={(e) =>
                        setFormData({ ...formData, required: e.target.checked })
                      }
                      className="mt-1 w-5 h-5 text-brand-primary-600 border-gray-300 rounded focus:ring-brand-primary-500"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="required"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                      >
                        Required
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Customer is required to select at least one option under this option group
                      </p>
                    </div>
                  </div>

                  {/* Active */}
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={formData.isActive}
                      onChange={(e) =>
                        setFormData({ ...formData, isActive: e.target.checked })
                      }
                      className="mt-1 w-5 h-5 text-brand-primary-600 border-gray-300 rounded focus:ring-brand-primary-500"
                    />
                    <div className="flex-1">
                      <label
                        htmlFor="isActive"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                      >
                        Active
                      </label>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setFormData({
                        name: "",
                        businessName: vendorBusinessName,
                        multiple: true,
                        required: false,
                        isActive: true,
                      });
                      setEditingOptionGroup(null);
                    }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={processingIds.has(editingOptionGroup?.id || "new")}
                      className="px-4 py-2 bg-brand-primary-600 text-white rounded-lg hover:bg-brand-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingIds.has(editingOptionGroup?.id || "new")
                        ? "Saving..."
                        : "Save"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* View Details Modal */}
        {isViewModalOpen && viewingOptionGroup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Option Group Details
                  </h2>
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setViewingOptionGroup(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ID
                    </label>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">
                      {viewingOptionGroup.id}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Business Name
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {viewingOptionGroup.businessName || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {viewingOptionGroup.name || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Multiple
                    </label>
                    <Badge variant={viewingOptionGroup.multiple ? "success" : "warning"}>
                      {viewingOptionGroup.multiple ? "Yes" : "No"}
                    </Badge>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Required
                    </label>
                    <Badge variant={viewingOptionGroup.required ? "success" : "warning"}>
                      {viewingOptionGroup.required ? "Yes" : "No"}
                    </Badge>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Active
                    </label>
                    <Badge variant={viewingOptionGroup.isActive !== false ? "success" : "warning"}>
                      {viewingOptionGroup.isActive !== false ? "Yes" : "No"}
                    </Badge>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Created At
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(viewingOptionGroup.createdAt)}
                    </p>
                  </div>

                  {viewingOptionGroup.updatedAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Updated At
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {formatDate(viewingOptionGroup.updatedAt)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setViewingOptionGroup(null);
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </VendorLayout>
  );
}

