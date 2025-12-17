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
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { firestore } from "@/firebase/init";
import { uploadOptionImage } from "@/lib/storage";
import type { ColumnDef } from "@tanstack/react-table";

interface Option {
  id: string;
  name: string;
  description?: string;
  price?: number;
  image?: string;
  images?: string[];
  productId?: string;
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
  vendorId?: string;
}

interface Product {
  id: string;
  name: string;
  isActive?: boolean;
  availableQty?: number;
  stock?: number;
}

/**
 * Vendor Options Page - Protected Route
 * Manages product options for vendors
 */
export default function VendorOptionsPage() {
  const { userData, loading: authLoading } = useRequireRoleAndApproval(
    ["vendor"],
    true
  );

  const [options, setOptions] = useState<Option[]>([]);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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
  const [editingOption, setEditingOption] = useState<Option | null>(null);
  const [viewingOption, setViewingOption] = useState<Option | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    productId: "",
    optionGroupId: "",
    businessName: "",
    isActive: true,
  });
  const [productSearch, setProductSearch] = useState("");
  const [optionGroupSearch, setOptionGroupSearch] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch options, option groups, and products
  useEffect(() => {
    if (authLoading || !userData?.uid) return;

    const unsubscribeOptions = onSnapshot(
      query(
        collection(firestore, "options"),
        where("vendorId", "==", userData.uid)
      ),
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
      query(
        collection(firestore, "optionGroups"),
        where("vendorId", "==", userData.uid)
      ),
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

    const unsubscribeProducts = onSnapshot(
      query(
        collection(firestore, "products"),
        where("vendorId", "==", userData.uid),
        where("isActive", "==", true)
      ),
      (snapshot) => {
        const prods = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((p: any) => {
            // Filter for products in stock (availableQty > 0 or stock > 0)
            const availableQty = p.availableQty ?? p.stock ?? 0;
            return availableQty > 0;
          }) as Product[];
        setProducts(prods);
      },
      (err) => {
        console.error("Error fetching products:", err);
      }
    );

    return () => {
      unsubscribeOptions();
      unsubscribeOptionGroups();
      unsubscribeProducts();
    };
  }, [authLoading, userData?.uid]);

  // Fetch vendor business name
  useEffect(() => {
    if (authLoading || !userData?.uid) return;

    const fetchVendorBusinessName = async () => {
      try {
        const vendorDocRef = doc(firestore, "vendors", userData.uid);
        const vendorDoc = await getDoc(vendorDocRef);
        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data() as any;
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
    setEditingOption(null);
    setFormData({
      name: "",
      description: "",
      price: "",
      productId: "",
      optionGroupId: "",
      businessName: vendorBusinessName,
      isActive: true,
    });
    setProductSearch("");
    setOptionGroupSearch("");
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const handleEdit = (option: Option) => {
    setEditingOption(option);
    const product = products.find((p) => p.id === option.productId);
    const optionGroup = optionGroups.find((og) => og.id === option.optionGroupId);
    setFormData({
      name: option.name || "",
      description: option.description || "",
      price: option.price?.toString() || "",
      productId: option.productId || "",
      optionGroupId: option.optionGroupId || "",
      businessName: option.businessName || vendorBusinessName,
      isActive: option.isActive !== false,
    });
    setProductSearch(product?.name || "");
    setOptionGroupSearch(optionGroup?.name || "");
    setImagePreview(option.image || null);
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);

    if (!formData.name.trim()) {
      setNotification({
        type: "error",
        message: "Option name is required.",
      });
      return;
    }

    if (!userData?.uid) {
      setNotification({
        type: "error",
        message: "User not authenticated.",
      });
      return;
    }

    const processingKey = editingOption?.id || "new";
    setProcessingIds((prev) => new Set(prev).add(processingKey));

    try {
      let imageUrl = editingOption?.image || null;

      // Upload image if a new file was selected
      if (imageFile) {
        const optionId = editingOption?.id || doc(collection(firestore, "options")).id;
        imageUrl = await uploadOptionImage(imageFile, userData.uid, optionId);
      }

      if (editingOption) {
        // Update existing option
        const optionData = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          price: formData.price ? parseFloat(formData.price) : null,
          productId: formData.productId || null,
          optionGroupId: formData.optionGroupId || null,
          businessName: formData.businessName,
          vendorId: userData.uid,
          isActive: formData.isActive,
          image: imageUrl,
          updatedAt: serverTimestamp(),
        };

        await setDoc(doc(firestore, "options", editingOption.id), optionData, { merge: true });
        setNotification({
          type: "success",
          message: "Option updated successfully!",
        });
      } else {
        // Create new option
        const newDocRef = doc(collection(firestore, "options"));
        const optionData = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          price: formData.price ? parseFloat(formData.price) : null,
          productId: formData.productId || null,
          optionGroupId: formData.optionGroupId || null,
          businessName: formData.businessName,
          vendorId: userData.uid,
          isActive: formData.isActive,
          image: imageUrl,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(newDocRef, optionData);
        setNotification({
          type: "success",
          message: "Option created successfully!",
        });
      }

      setIsModalOpen(false);
      setFormData({
        name: "",
        description: "",
        price: "",
        productId: "",
        optionGroupId: "",
        businessName: vendorBusinessName,
        isActive: true,
      });
      setProductSearch("");
      setOptionGroupSearch("");
      setImageFile(null);
      setImagePreview(null);
      setEditingOption(null);
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Save error:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to save option.",
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
                onEdit={() => handleEdit(option)}
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
      <VendorLayout pageTitle="Options">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading options...
            </p>
          </div>
        </div>
      </VendorLayout>
    );
  }

  if (error) {
    return (
      <VendorLayout pageTitle="Options">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout pageTitle="Options">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Options
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your product options
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
            <span>Add Options</span>
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
          data={options}
          columns={columns}
          searchableFields={["name"]}
          searchPlaceholder="Search options..."
        />

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {editingOption ? "Edit Option" : "Create Option"}
                  </h2>
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setFormData({
                        name: "",
                        description: "",
                        price: "",
                        productId: "",
                        optionGroupId: "",
                        businessName: vendorBusinessName,
                        isActive: true,
                      });
                      setProductSearch("");
                      setOptionGroupSearch("");
                      setImageFile(null);
                      setImagePreview(null);
                      setEditingOption(null);
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
                      placeholder="Enter option name"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter option description"
                    />
                  </div>

                  {/* Price */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData({ ...formData, price: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Product Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Product
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => {
                          setProductSearch(e.target.value);
                          if (!e.target.value) {
                            setFormData({ ...formData, productId: "" });
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Search products..."
                      />
                      {productSearch && (
                        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-lg">
                          {products
                            .filter((p) =>
                              p.name.toLowerCase().includes(productSearch.toLowerCase())
                            )
                            .map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, productId: p.id });
                                  setProductSearch(p.name);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                              >
                                {p.name}
                              </button>
                            ))}
                          {products.filter((p) =>
                            p.name.toLowerCase().includes(productSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="px-4 py-2 text-gray-500 dark:text-gray-400 text-sm">
                              No products found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {!productSearch && formData.productId && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-brand-primary-100 dark:bg-brand-primary-900 text-brand-primary-800 dark:text-brand-primary-200">
                          {products.find((p) => p.id === formData.productId)?.name}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, productId: "" });
                            }}
                            className="ml-2 text-brand-primary-600 dark:text-brand-primary-400 hover:text-brand-primary-800 dark:hover:text-brand-primary-200"
                          >
                            ×
                          </button>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Option Group Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Option Group
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={optionGroupSearch}
                        onChange={(e) => {
                          setOptionGroupSearch(e.target.value);
                          if (!e.target.value) {
                            setFormData({ ...formData, optionGroupId: "" });
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Search option groups..."
                      />
                      {optionGroupSearch && (
                        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-lg">
                          {optionGroups
                            .filter((og) =>
                              og.name.toLowerCase().includes(optionGroupSearch.toLowerCase())
                            )
                            .map((og) => (
                              <button
                                key={og.id}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, optionGroupId: og.id });
                                  setOptionGroupSearch(og.name);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                              >
                                {og.name}
                              </button>
                            ))}
                          {optionGroups.filter((og) =>
                            og.name.toLowerCase().includes(optionGroupSearch.toLowerCase())
                          ).length === 0 && (
                            <div className="px-4 py-2 text-gray-500 dark:text-gray-400 text-sm">
                              No option groups found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {!optionGroupSearch && formData.optionGroupId && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-brand-primary-100 dark:bg-brand-primary-900 text-brand-primary-800 dark:text-brand-primary-200">
                          {optionGroups.find((og) => og.id === formData.optionGroupId)?.name}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, optionGroupId: "" });
                            }}
                            className="ml-2 text-brand-primary-600 dark:text-brand-primary-400 hover:text-brand-primary-800 dark:hover:text-brand-primary-200"
                          >
                            ×
                          </button>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Image
                    </label>
                    {imagePreview && (
                      <div className="mb-4">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                        />
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={handleImageChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-primary-50 file:text-brand-primary-700 hover:file:bg-brand-primary-100 dark:file:bg-brand-primary-900 dark:file:text-brand-primary-200"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Supported formats: JPEG, PNG, WebP (Max 5MB)
                    </p>
                  </div>

                  {/* Active Switch */}
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
                          description: "",
                          price: "",
                          productId: "",
                          optionGroupId: "",
                          businessName: vendorBusinessName,
                          isActive: true,
                        });
                        setProductSearch("");
                        setOptionGroupSearch("");
                        setImageFile(null);
                        setImagePreview(null);
                        setEditingOption(null);
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={processingIds.has(editingOption?.id || "new")}
                      className="px-4 py-2 bg-brand-primary-600 text-white rounded-lg hover:bg-brand-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processingIds.has(editingOption?.id || "new")
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
    </VendorLayout>
  );
}

