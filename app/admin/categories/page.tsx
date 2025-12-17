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
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/firebase/init";
import { uploadCategoryImage } from "@/lib/storage";
import type { ColumnDef } from "@tanstack/react-table";

interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  vendorType?: string;
  isActive?: boolean;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
}

/**
 * Admin Categories Page - Protected Route
 * Manages product categories
 */
export default function CategoriesPage() {
  const { userData, loading: authLoading } = useRequireRoleAndApproval(
    ["admin"],
    false
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [vendorTypes, setVendorTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    vendorType: "",
    image: "",
    isActive: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch categories and vendor types
  useEffect(() => {
    if (authLoading) return;

    const unsubscribeCategories = onSnapshot(
      collection(firestore, "categories"),
      (snapshot) => {
        const cats = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Category[];
        setCategories(cats);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching categories:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    const unsubscribeVendorTypes = onSnapshot(
      collection(firestore, "vendorTypes"),
      (snapshot) => {
        const types = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVendorTypes(types);
      },
      (err) => {
        console.error("Error fetching vendor types:", err);
      }
    );

    return () => {
      unsubscribeCategories();
      unsubscribeVendorTypes();
    };
  }, [authLoading]);

  // Get vendor type name by ID or name
  const getVendorTypeName = (vendorTypeIdOrName?: string): string => {
    if (!vendorTypeIdOrName) return "—";
    const vendorType = vendorTypes.find(
      (vt) => vt.id === vendorTypeIdOrName || vt.name === vendorTypeIdOrName
    );
    return vendorType?.name || vendorTypeIdOrName;
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      vendorType: "",
      image: "",
      isActive: true,
    });
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      vendorType: category.vendorType || "",
      image: category.image || "",
      isActive: category.isActive !== false,
    });
    setImageFile(null);
    setImagePreview(category.image || null);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!formData.name.trim()) {
      setNotification({
        type: "error",
        message: "Category name is required.",
      });
      return;
    }

    const processingKey = editingCategory?.id || "new";
    setProcessingIds((prev) => new Set(prev).add(processingKey));

    try {
      let imageUrl: string | null = null;

      if (editingCategory) {
        // Update existing category
        imageUrl = editingCategory.image || null;
        
        // Upload new image if a file was selected
        if (imageFile) {
          imageUrl = await uploadCategoryImage(imageFile, editingCategory.id);
        }

        const categoryData = {
          name: formData.name.trim(),
          vendorType: formData.vendorType || null,
          image: imageUrl,
          isActive: formData.isActive,
          updatedAt: serverTimestamp(),
        };

        await setDoc(doc(firestore, "categories", editingCategory.id), categoryData, { merge: true });
        setNotification({
          type: "success",
          message: "Category updated successfully!",
        });
      } else {
        // Create new category - generate ID first
        const newDocRef = doc(collection(firestore, "categories"));
        
        // Upload image if a file was selected
        if (imageFile) {
          imageUrl = await uploadCategoryImage(imageFile, newDocRef.id);
        }

        const categoryData = {
          name: formData.name.trim(),
          vendorType: formData.vendorType || null,
          image: imageUrl,
          isActive: formData.isActive,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(newDocRef, categoryData);
        setNotification({
          type: "success",
          message: "Category created successfully!",
        });
      }

      setIsModalOpen(false);
      setFormData({
        name: "",
        vendorType: "",
        image: "",
        isActive: true,
      });
      setImageFile(null);
      setImagePreview(null);
      setEditingCategory(null);
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Save error:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to save category.",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(editingCategory?.id || "new");
        return next;
      });
    }
  };

  const handleDelete = async (category: Category) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${category.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setProcessingIds((prev) => new Set(prev).add(category.id));
    setNotification(null);

    try {
      await deleteDoc(doc(firestore, "categories", category.id));
      setNotification({
        type: "success",
        message: "Category deleted successfully!",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Delete error:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to delete category.",
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(category.id);
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

  const columns = useMemo<ColumnDef<Category>[]>(
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
          const imageUrl = row.getValue("image") as string | undefined;
          return (
            <div className="flex items-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={row.original.name}
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
            {row.getValue("name")}
          </div>
        ),
      },
      {
        accessorKey: "vendorType",
        header: "Vendor Type",
        cell: ({ row }) => {
          const vendorType = row.getValue("vendorType") as string | undefined;
          const vendorTypeName = getVendorTypeName(vendorType);
          return (
            <div className="text-gray-600 dark:text-gray-400 capitalize">
              {vendorTypeName}
            </div>
          );
        },
      },
      {
        accessorKey: "isActive",
        header: "Status",
        cell: ({ row }) => {
          const isActive = row.getValue("isActive") as boolean | undefined;
          // Default to true if not specified
          const status = isActive !== false;
          return (
            <Badge variant={status ? "success" : "warning"}>
              {status ? "Active" : "Inactive"}
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
          const category = row.original;
          const isProcessing = processingIds.has(category.id);
          return (
            <div className="flex justify-center">
              <ActionMenu
                onEdit={() => handleEdit(category)}
                onDelete={() => handleDelete(category)}
                isProcessing={isProcessing}
              />
            </div>
          );
        },
        enableSorting: false,
      },
    ],
    [processingIds, vendorTypes]
  );

  if (authLoading || loading) {
    return (
      <AdminLayout pageTitle="Category Management">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading categories...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout pageTitle="Category Management">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Category Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Categories
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage product categories
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
            <span>Add Category</span>
          </button>
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`p-4 rounded-lg ${
              notification.type === "success"
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200"
                : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
            }`}
          >
            {notification.message}
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <DataTable
            columns={columns}
            data={categories}
            searchableFields={["name", "vendorType"]}
            searchPlaceholder="Search categories..."
            onRefresh={handleRefresh}
            isLoading={loading}
          />
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {editingCategory ? "Edit Category" : "Create Category"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                    placeholder="Enter category name"
                  />
                </div>

                                 {/* Vendor Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Vendor Type
                  </label>
                                     <select
                     value={formData.vendorType}
                     onChange={(e) =>
                       setFormData({ ...formData, vendorType: e.target.value })
                     }
                     className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                   >
                     <option value="">Select vendor type</option>
                     {vendorTypes
                       .filter((vt) => vt.isActive !== false)
                       .map((vt) => (
                         <option key={vt.id} value={vt.name || vt.id}>
                           {vt.name}
                         </option>
                       ))}
                   </select>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category Image
                  </label>
                  <div className="space-y-4">
                    {imagePreview && (
                      <div className="relative w-32 h-32 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-primary-50 file:text-brand-primary-700 hover:file:bg-brand-primary-100 dark:file:bg-brand-primary-900 dark:file:text-brand-primary-300"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Supported formats: JPEG, PNG, WebP (Max 5MB)
                    </p>
                  </div>
                </div>

                 {/* Active Status */}
                 <div className="flex items-center justify-between">
                   <label
                     htmlFor="isActive"
                     className="text-sm font-medium text-gray-700 dark:text-gray-300"
                   >
                     Active
                   </label>
                   <button
                     type="button"
                     id="isActive"
                     onClick={() =>
                       setFormData({ ...formData, isActive: !formData.isActive })
                     }
                     className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary-500 focus:ring-offset-2 ${
                       formData.isActive
                         ? "bg-brand-primary-600"
                         : "bg-gray-200 dark:bg-gray-700"
                     }`}
                   >
                     <span
                       className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                         formData.isActive ? "translate-x-6" : "translate-x-1"
                       }`}
                     />
                   </button>
                 </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                                         onClick={() => {
                       setIsModalOpen(false);
                       setFormData({
                         name: "",
                         vendorType: "",
                         image: "",
                         isActive: true,
                       });
                       setImageFile(null);
                       setImagePreview(null);
                       setEditingCategory(null);
                     }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingIds.has(editingCategory?.id || "new")}
                    className="px-4 py-2 bg-brand-primary-600 text-white rounded-lg hover:bg-brand-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingIds.has(editingCategory?.id || "new")
                      ? "Saving..."
                      : editingCategory
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
