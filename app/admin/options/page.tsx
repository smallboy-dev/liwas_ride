"use client";

import { useState, useEffect, useMemo } from "react";
import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { ActionMenu } from "@/components/admin/ActionMenu";
import { Badge } from "@/components/ui/badge";
import {
  collection,
  doc,
  getDoc,
  deleteDoc,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/firebase/init";
import type { ColumnDef } from "@tanstack/react-table";

interface Option {
  id: string;
  name: string;
  price?: number;
  image?: string;
  images?: string[];
  optionGroupId?: string;
  vendorId?: string;
  businessName?: string;
  isActive?: boolean;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
}

interface OptionGroup {
  id: string;
  name: string;
}

/**
 * Admin Options Page - Protected Route
 * Manages product options
 */
export default function OptionsPage() {
  const { userData, loading: authLoading } = useRequireRoleAndApproval(
    ["admin"],
    false
  );

  const [options, setOptions] = useState<Option[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingOption, setViewingOption] = useState<Option | null>(null);

  // Fetch options and option groups
  useEffect(() => {
    if (authLoading) return;

    const unsubscribeOptions = onSnapshot(
      collection(firestore, "options"),
      async (snapshot) => {
        try {
          // Fetch business names for each option
          const optionsWithBusinessNames = await Promise.all(
            snapshot.docs.map(async (docSnapshot) => {
              const data = docSnapshot.data();
              const option: Option = {
                id: docSnapshot.id,
                ...data,
              } as Option;

              // If vendorId exists, fetch business name from vendor document
              if (data.vendorId) {
                try {
                  const vendorDocRef = doc(firestore, "vendors", data.vendorId);
                  const vendorDoc = await getDoc(vendorDocRef);
                  if (vendorDoc.exists()) {
                    const vendorData = vendorDoc.data() as any;
                    option.businessName = vendorData.businessName || "";
                  }
                } catch (err) {
                  console.error(`Error fetching vendor for option ${docSnapshot.id}:`, err);
                }
              }

              return option;
            })
          );

          setOptions(optionsWithBusinessNames);
          setLoading(false);
        } catch (err: any) {
          console.error("Error processing options:", err);
          setError(err.message);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error fetching options:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    const unsubscribeOptionGroups = onSnapshot(
      collection(firestore, "optionGroups"),
      (snapshot) => {
        const groups = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as OptionGroup[];
        setOptionGroups(groups);
      },
      (err) => {
        console.error("Error fetching option groups:", err);
      }
    );

    return () => {
      unsubscribeOptions();
      unsubscribeOptionGroups();
    };
  }, [authLoading]);

  const handleViewDetails = (option: Option) => {
    setViewingOption(option);
    setIsViewModalOpen(true);
  };

  const handleDelete = async (option: Option) => {
    if (!confirm(`Are you sure you want to delete "${option.name}"? This action cannot be undone.`)) {
      return;
    }

    setProcessingIds((prev) => new Set(prev).add(option.id));
    setNotification(null);

    try {
      await deleteDoc(doc(firestore, "options", option.id));
      setNotification({
        type: "success",
        message: "Option deleted successfully!",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Delete error:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to delete option.",
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(option.id);
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

  const formatCurrency = (amount?: number): string => {
    if (amount === undefined || amount === null) return "N/A";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getOptionImage = (option: Option): string | null => {
    return option.image || (option.images && option.images.length > 0 ? option.images[0] : null);
  };

  const getOptionGroupName = (optionGroupId?: string): string => {
    if (!optionGroupId) return "N/A";
    const group = optionGroups.find((g) => g.id === optionGroupId);
    return group?.name || "N/A";
  };

  const getStatus = (option: Option): { label: string; variant: "success" | "warning" } => {
    if (option.isActive !== false) {
      return { label: "Active", variant: "success" };
    } else {
      return { label: "Inactive", variant: "warning" };
    }
  };

  const columns = useMemo<ColumnDef<Option>[]>(
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
        accessorKey: "image",
        header: "Image",
        cell: ({ row }) => {
          const option = row.original;
          const imageUrl = getOptionImage(option);
          return (
            <div className="flex items-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={option.name}
                  className="w-12 h-12 rounded-lg object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect fill='%23e5e7eb' width='48' height='48'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='central' text-anchor='middle' font-size='12' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        },
        enableSorting: false,
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <div className="font-medium text-gray-900 dark:text-white">
            {row.getValue("name") || "Unnamed Option"}
          </div>
        ),
      },
      {
        accessorKey: "businessName",
        header: "Business Name",
        cell: ({ row }) => {
          const businessName = row.getValue("businessName") as string | undefined;
          return (
            <div className="text-gray-600 dark:text-gray-400">
              {businessName || "N/A"}
            </div>
          );
        },
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => {
          const price = row.getValue("price") as number | undefined;
          return (
            <div className="text-gray-600 dark:text-gray-400">
              {formatCurrency(price)}
            </div>
          );
        },
      },
      {
        accessorKey: "optionGroupId",
        header: "Option Group",
        cell: ({ row }) => {
          const optionGroupId = row.getValue("optionGroupId") as string | undefined;
          return (
            <div className="text-gray-600 dark:text-gray-400">
              {getOptionGroupName(optionGroupId)}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const option = row.original;
          const status = getStatus(option);
          return <Badge variant={status.variant}>{status.label}</Badge>;
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
          const option = row.original;
          const isProcessing = processingIds.has(option.id);
          return (
            <div className="flex justify-center">
              <ActionMenu
                onView={() => handleViewDetails(option)}
                onDelete={() => handleDelete(option)}
                isProcessing={isProcessing}
              />
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [processingIds, optionGroups]
  );

  if (authLoading || loading) {
    return (
      <AdminLayout pageTitle="Options Management">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading options...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout pageTitle="Options Management">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Options Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Options
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage product options
            </p>
          </div>
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
          data={options}
          columns={columns}
          searchableFields={["name"]}
          searchPlaceholder="Search options..."
        />

        {/* View Details Modal */}
        {isViewModalOpen && viewingOption && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Option Details
                  </h2>
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setViewingOption(null);
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
                  {/* Image */}
                  {getOptionImage(viewingOption) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Image
                      </label>
                      <div className="w-32 h-32 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                        <img
                          src={getOptionImage(viewingOption) || ""}
                          alt={viewingOption.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'%3E%3Crect fill='%23e5e7eb' width='128' height='128'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='central' text-anchor='middle' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      ID
                    </label>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">
                      {viewingOption.id}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Business Name
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {viewingOption.businessName || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {viewingOption.name || "N/A"}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Price
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {formatCurrency(viewingOption.price)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Option Group
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {getOptionGroupName(viewingOption.optionGroupId)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <div>
                      <Badge variant={getStatus(viewingOption).variant}>
                        {getStatus(viewingOption).label}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Created At
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {formatDate(viewingOption.createdAt)}
                    </p>
                  </div>

                  {viewingOption.updatedAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Updated At
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {formatDate(viewingOption.updatedAt)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => {
                      setIsViewModalOpen(false);
                      setViewingOption(null);
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
    </AdminLayout>
  );
}

