"use client";

import { useState, useEffect, useMemo } from "react";
import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DataTable } from "@/components/admin/DataTable";
import { ActionMenu } from "@/components/admin/ActionMenu";
import { Badge } from "@/components/ui/badge";
import {
  collection,
  query,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { firestore } from "@/firebase/init";
import { uploadVendorTypeImage } from "@/lib/storage";
import type { ColumnDef } from "@tanstack/react-table";

interface VendorType {
  id: string; // Firebase document ID
  uniqueNumber?: number; // Custom unique number for display
  type?: string; // food, grocery, pharmacy, service, commerce
  name: string;
  description?: string;
  logo?: string;
  websiteHeaderImage?: string;
  isActive: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  vendorCount?: number;
}

const VENDOR_TYPE_OPTIONS = [
  { value: "food", label: "Food" },
  { value: "grocery", label: "Grocery" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "service", label: "Service" },
  { value: "commerce", label: "Commerce" },
];

/**
 * Admin Vendor Types Page - Protected Route
 * Manages vendor types (restaurant, retailer, service, etc.)
 */
export default function VendorTypesPage() {
  const { userData, loading: authLoading, isFullyAuthorized } = useRequireRoleAndApproval(
    ["admin"],
    false
  );

  const [vendorTypes, setVendorTypes] = useState<VendorType[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<VendorType | null>(null);
  const [formData, setFormData] = useState({
    uniqueNumber: "",
    type: "",
    name: "",
    description: "",
    logo: "",
    websiteHeaderImage: "",
    isActive: true,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);
  const [headerImagePreview, setHeaderImagePreview] = useState<string | null>(null);

  // Fetch vendor types and vendors
  useEffect(() => {
    if (authLoading) return;

    const unsubscribeTypes = onSnapshot(
      collection(firestore, "vendorTypes"),
      (snapshot) => {
        const types = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as VendorType[];
        setVendorTypes(types);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching vendor types:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    const unsubscribeVendors = onSnapshot(
      collection(firestore, "vendors"),
      (snapshot) => {
        const vendorsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVendors(vendorsData);
      },
      (err) => {
        console.error("Error fetching vendors:", err);
      }
    );

    return () => {
      unsubscribeTypes();
      unsubscribeVendors();
    };
  }, [authLoading]);

  // Calculate vendor count for each type
  const vendorTypesWithCounts = useMemo(() => {
    return vendorTypes.map((type) => {
      const count = vendors.filter(
        (vendor) => vendor.vendorType === type.name
      ).length;
      return { ...type, vendorCount: count };
    });
  }, [vendorTypes, vendors]);

  // Get the next available unique number
  const getNextUniqueNumber = useMemo(() => {
    const existingNumbers = vendorTypes
      .map((type) => type.uniqueNumber)
      .filter((num): num is number => num !== null && num !== undefined)
      .sort((a, b) => b - a);

    return existingNumbers.length > 0 ? existingNumbers[0] + 1 : 1;
  }, [vendorTypes]);

  const handleCreate = () => {
    setEditingType(null);
    // Auto-assign the next available unique number
    setFormData({
      uniqueNumber: getNextUniqueNumber.toString(),
      type: "",
      name: "",
      description: "",
      logo: "",
      websiteHeaderImage: "",
      isActive: true
    });
    setLogoFile(null);
    setLogoPreview(null);
    setHeaderImageFile(null);
    setHeaderImagePreview(null);
    setIsModalOpen(true);
  };

  const handleEdit = (type: VendorType) => {
    setEditingType(type);
    setFormData({
      uniqueNumber: type.uniqueNumber?.toString() || "",
      type: type.type || "",
      name: type.name,
      description: type.description || "",
      logo: type.logo || "",
      websiteHeaderImage: type.websiteHeaderImage || "",
      isActive: type.isActive,
    });
    setLogoFile(null);
    setLogoPreview(type.logo || null);
    setHeaderImageFile(null);
    setHeaderImagePreview(type.websiteHeaderImage || null);
    setIsModalOpen(true);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHeaderImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setHeaderImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setHeaderImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = async (type: VendorType) => {
    if (!window.confirm(`Are you sure you want to delete "${type.name}"? This action cannot be undone.`)) {
      return;
    }

    // Check if any vendors are using this type
    const vendorsUsingType = vendors.filter(
      (vendor) => vendor.vendorType === type.name
    );
    if (vendorsUsingType.length > 0) {
      setNotification({
        type: "error",
        message: `Cannot delete "${type.name}". ${vendorsUsingType.length} vendor(s) are currently using this type.`,
      });
      setTimeout(() => setNotification(null), 5000);
      return;
    }

    setProcessingIds((prev) => new Set(prev).add(type.id));
    setNotification(null);

    try {
      await deleteDoc(doc(firestore, "vendorTypes", type.id));
      setNotification({
        type: "success",
        message: "Vendor type deleted successfully!",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Delete error:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to delete vendor type.",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(type.id);
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!formData.name.trim()) {
      setNotification({
        type: "error",
        message: "Vendor type name is required.",
      });
      return;
    }

    // Validate and get unique number
    // For new entries, use the auto-assigned number; for edits, use the provided number
    let uniqueNumber: number;

    if (editingType) {
      // Editing: use provided number or keep existing
      const providedNumber = formData.uniqueNumber.trim()
        ? parseInt(formData.uniqueNumber.trim(), 10)
        : editingType.uniqueNumber || null;

      if (providedNumber === null || isNaN(providedNumber) || providedNumber < 1) {
        setNotification({
          type: "error",
          message: "Unique number must be a positive integer.",
        });
        return;
      }

      uniqueNumber = providedNumber;
    } else {
      // Creating: use auto-assigned number
      uniqueNumber = getNextUniqueNumber;
    }

    // Check for duplicate unique numbers (excluding current editing type)
    const existingTypeWithNumber = vendorTypes.find(
      (type) =>
        type.uniqueNumber === uniqueNumber &&
        type.id !== editingType?.id
    );
    if (existingTypeWithNumber) {
      setNotification({
        type: "error",
        message: `Unique number ${uniqueNumber} is already in use by "${existingTypeWithNumber.name}".`,
      });
      return;
    }

    // Check for duplicate names (excluding current editing type)
    const existingType = vendorTypes.find(
      (type) =>
        type.name.toLowerCase() === formData.name.toLowerCase().trim() &&
        type.id !== editingType?.id
    );
    if (existingType) {
      setNotification({
        type: "error",
        message: "A vendor type with this name already exists.",
      });
      return;
    }

    setProcessingIds((prev) => new Set(prev).add(editingType?.id || "new"));

    try {
      let logoUrl = formData.logo;
      let headerImageUrl = formData.websiteHeaderImage;

      if (editingType) {
        // Update existing type
        // Upload logo if a new file was selected
        if (logoFile) {
          logoUrl = await uploadVendorTypeImage(logoFile, editingType.id, 'logo');
        }
        // Upload header image if a new file was selected
        if (headerImageFile) {
          headerImageUrl = await uploadVendorTypeImage(headerImageFile, editingType.id, 'header');
        }

        const typeData = {
          uniqueNumber: uniqueNumber,
          type: formData.type || null,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          logo: logoUrl || null,
          websiteHeaderImage: headerImageUrl || null,
          isActive: formData.isActive,
          updatedAt: serverTimestamp(),
        };

        await setDoc(
          doc(firestore, "vendorTypes", editingType.id),
          typeData,
          { merge: true }
        );
        setNotification({
          type: "success",
          message: "Vendor type updated successfully!",
        });
      } else {
        // Create new type - generate ID first
        const newDocRef = doc(collection(firestore, "vendorTypes"));

        // Upload logo if a new file was selected
        if (logoFile) {
          logoUrl = await uploadVendorTypeImage(logoFile, newDocRef.id, 'logo');
        }
        // Upload header image if a new file was selected
        if (headerImageFile) {
          headerImageUrl = await uploadVendorTypeImage(headerImageFile, newDocRef.id, 'header');
        }

        const typeData = {
          uniqueNumber: uniqueNumber,
          type: formData.type || null,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          logo: logoUrl || null,
          websiteHeaderImage: headerImageUrl || null,
          isActive: formData.isActive,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(newDocRef, typeData);
        setNotification({
          type: "success",
          message: "Vendor type created successfully!",
        });
      }

      setIsModalOpen(false);
      setFormData({
        uniqueNumber: "",
        type: "",
        name: "",
        description: "",
        logo: "",
        websiteHeaderImage: "",
        isActive: true
      });
      setLogoFile(null);
      setLogoPreview(null);
      setHeaderImageFile(null);
      setHeaderImagePreview(null);
      setEditingType(null);
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Save error:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to save vendor type.",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(editingType?.id || "new");
        return next;
      });
    }
  };

  const handleRefresh = () => {
    setNotification({
      type: "success",
      message: "Data refreshed!",
    });
    setTimeout(() => setNotification(null), 2000);
  };

  const handleAssignNumbers = async () => {
    if (!window.confirm("This will assign unique numbers to all vendor types that don't have one. Continue?")) {
      return;
    }

    setProcessingIds((prev) => new Set(prev).add("assign-numbers"));
    setNotification(null);

    try {
      // Get all vendor types sorted by creation date (oldest first)
      const sortedTypes = [...vendorTypes].sort((a, b) => {
        const aCreated = a.createdAt?.toMillis?.() || (a.createdAt as any)?.seconds * 1000 || 0;
        const bCreated = b.createdAt?.toMillis?.() || (b.createdAt as any)?.seconds * 1000 || 0;
        if (aCreated !== bCreated) {
          return aCreated - bCreated;
        }
        return (a.name || "").localeCompare(b.name || "");
      });

      // Find existing numbers to avoid conflicts
      const existingNumbers = new Set(
        vendorTypes
          .map((type) => type.uniqueNumber)
          .filter((num): num is number => num !== null && num !== undefined)
      );

      // Assign numbers starting from 1, skipping existing numbers
      let nextNumber = 1;
      const updates: Array<{ id: string; number: number }> = [];

      for (const type of sortedTypes) {
        if (type.uniqueNumber === null || type.uniqueNumber === undefined) {
          // Find next available number
          while (existingNumbers.has(nextNumber)) {
            nextNumber++;
          }
          updates.push({ id: type.id, number: nextNumber });
          existingNumbers.add(nextNumber);
          nextNumber++;
        }
      }

      if (updates.length === 0) {
        setNotification({
          type: "success",
          message: "All vendor types already have unique numbers assigned!",
        });
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      // Update all vendor types in batch
      const batch = writeBatch(firestore);

      for (const update of updates) {
        const docRef = doc(firestore, "vendorTypes", update.id);
        batch.update(docRef, {
          uniqueNumber: update.number,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();

      setNotification({
        type: "success",
        message: `Successfully assigned unique numbers to ${updates.length} vendor type(s)!`,
      });
      setTimeout(() => setNotification(null), 5000);
    } catch (error: any) {
      console.error("Error assigning numbers:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to assign unique numbers.",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete("assign-numbers");
        return next;
      });
    }
  };

  const formatDate = (timestamp: Timestamp | null | undefined): string => {
    if (!timestamp) return "—";
    try {
      const date = timestamp.toDate();
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return "—";
    }
  };

  const columns = useMemo<ColumnDef<VendorType & { vendorCount?: number }>[]>(
    () => [
      {
        accessorKey: "uniqueNumber",
        header: "ID",
        cell: ({ row }) => {
          const uniqueNumber = row.original.uniqueNumber;
          return (
            <div className="text-sm font-semibold text-gray-900 dark:text-white">
              {uniqueNumber ? `${uniqueNumber}` : (
                <span className="text-gray-400 dark:text-gray-500 italic">Not set</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => {
          const type = row.getValue("type") as string | undefined;
          return (
            <div className="text-gray-600 dark:text-gray-400 capitalize">
              {type || "—"}
            </div>
          );
        },
      },
      {
        accessorKey: "logo",
        header: "Logo",
        cell: ({ row }) => {
          const logoUrl = row.getValue("logo") as string | undefined;
          return (
            <div className="flex items-center">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={row.original.name}
                  className="w-12 h-12 rounded-lg object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'%3E%3Crect fill='%23e5e7eb' width='48' height='48'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='central' text-anchor='middle' font-size='12' fill='%239ca3af'%3ENo Logo%3C/text%3E%3C/svg%3E";
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
            {row.getValue("name")}
          </div>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <div className="text-gray-600 dark:text-gray-400 max-w-md truncate">
            {row.getValue("description") || "—"}
          </div>
        ),
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => {
          const isActive = row.getValue("isActive") as boolean;
          return (
            <Badge variant={isActive ? "success" : "warning"}>
              {isActive ? "Active" : "Inactive"}
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
          const type = row.original;
          const isProcessing = processingIds.has(type.id);
          return (
            <div className="flex justify-center">
              <ActionMenu
                onEdit={() => handleEdit(type)}
                onDelete={() => handleDelete(type)}
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
  if (loading) {
    return (
      <AdminLayout pageTitle="Vendor Types">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading vendor types...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout pageTitle="Vendor Types">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Vendor Types">
      <div className="space-y-6">
        {notification && (
          <div
            className={`p-4 rounded-lg ${notification.type === "success"
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

        {/* Header with Create Button */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Vendor Types
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage vendor type categories (restaurant, retailer, service, etc.)
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Assign Numbers Button - Only show if there are vendor types without numbers */}
            {vendorTypes.some((type) => !type.uniqueNumber) && (
              <button
                onClick={handleAssignNumbers}
                disabled={processingIds.has("assign-numbers")}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Assign unique numbers to vendor types that don't have one"
              >
                {processingIds.has("assign-numbers") ? (
                  <>
                    <svg
                      className="animate-spin h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
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
                        d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                      />
                    </svg>
                    <span>Assign Numbers</span>
                  </>
                )}
              </button>
            )}
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
              <span>Add Vendor Type</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <DataTable
            columns={columns}
            data={vendorTypesWithCounts}
            searchableFields={["type", "name", "description"]}
            searchPlaceholder="Search vendor types..."
            onRefresh={handleRefresh}
            isLoading={loading}
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 my-8">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                {editingType ? "Edit Vendor Type" : "Create Vendor Type"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-6">



                {/* Type Dropdown */}
                <div>
                  <label
                    htmlFor="type"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-500"
                  >
                    <option value="">Select a type</option>
                    {VENDOR_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-500"
                    placeholder="e.g., Restaurant, Retailer, Service"
                  />
                </div>

                {/* Description */}
                <div>
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-500"
                    placeholder="Optional description of this vendor type"
                  />
                </div>

                {/* Logo Upload */}
                <div>
                  <label
                    htmlFor="logo"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Logo
                  </label>
                  <div className="space-y-2">
                    {logoPreview && (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    )}
                    <input
                      type="file"
                      id="logo"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleLogoChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-primary-50 file:text-brand-primary-700 hover:file:bg-brand-primary-100 dark:file:bg-brand-primary-900 dark:file:text-brand-primary-300"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      JPEG, PNG, or WebP (max 5MB)
                    </p>
                  </div>
                </div>

                {/* Website Header Image Upload */}
                <div>
                  <label
                    htmlFor="websiteHeaderImage"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                  >
                    Website Header Image
                  </label>
                  <div className="space-y-2">
                    {headerImagePreview && (
                      <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
                        <img
                          src={headerImagePreview}
                          alt="Header image preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <input
                      type="file"
                      id="websiteHeaderImage"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleHeaderImageChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-primary-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-primary-50 file:text-brand-primary-700 hover:file:bg-brand-primary-100 dark:file:bg-brand-primary-900 dark:file:text-brand-primary-300"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      JPEG, PNG, or WebP (max 5MB)
                    </p>
                  </div>
                </div>

                {/* Active Switch */}
                <div className="flex items-center justify-between">
                  <div>
                    <label
                      htmlFor="isActive"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Active
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Enable or disable this vendor type
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, isActive: !formData.isActive })
                    }
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary-500 focus:ring-offset-2 ${formData.isActive
                        ? "bg-brand-primary-600"
                        : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    role="switch"
                    aria-checked={formData.isActive}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isActive ? "translate-x-6" : "translate-x-1"
                        }`}
                    />
                  </button>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setFormData({
                        uniqueNumber: "",
                        type: "",
                        name: "",
                        description: "",
                        logo: "",
                        websiteHeaderImage: "",
                        isActive: true
                      });
                      setLogoFile(null);
                      setLogoPreview(null);
                      setHeaderImageFile(null);
                      setHeaderImagePreview(null);
                      setEditingType(null);
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingIds.has(editingType?.id || "new")}
                    className="px-4 py-2 bg-brand-primary-600 text-white rounded-lg hover:bg-brand-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingIds.has(editingType?.id || "new")
                      ? "Saving..."
                      : editingType
                        ? "Update"
                        : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

