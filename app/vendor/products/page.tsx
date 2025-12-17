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
import { uploadProductImage } from "@/lib/storage";
import type { ColumnDef } from "@tanstack/react-table";

interface Product {
  id: string;
  name: string;
  inOrderNumber?: string;
  sku?: string;
  description?: string;
  price?: number;
  discountPrice?: number;
  capacity?: number;
  unit?: string;
  packageCount?: number;
  stock?: number;
  availableQty?: number;
  images?: string[];
  image?: string;
  vendorId?: string;
  vendorName?: string;
  categoryId?: string;
  moreOption?: boolean;
  canBeDelivered?: boolean;
  digital?: boolean;
  isActive?: boolean;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
}

/**
 * Vendor Products Page - Protected Route
 * Manages products for the current vendor
 */
export default function VendorProductsPage() {
  const { userData, loading: authLoading, isFullyAuthorized } = useRequireRoleAndApproval(
    ["vendor"],
    true
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [vendorBusinessName, setVendorBusinessName] = useState<string>("");
  const [categorySearch, setCategorySearch] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    inOrderNumber: "",
    sku: "",
    description: "",
    price: "",
    discountPrice: "",
    capacity: "",
    unit: "",
    packageCount: "",
    stock: "",
    categoryId: "",
    vendorName: "",
    moreOption: false,
    canBeDelivered: true,
    digital: false,
    isActive: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch products for this vendor
  useEffect(() => {
    if (authLoading || !userData?.uid) return;

    const productsQuery = query(
      collection(firestore, "products"),
      where("vendorId", "==", userData.uid)
    );

    const unsubscribe = onSnapshot(
      productsQuery,
      (snapshot) => {
        const prods = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[];
        setProducts(prods);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching products:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [authLoading, userData?.uid]);

  // Fetch categories for dropdown
  useEffect(() => {
    if (authLoading) return;

    const unsubscribeCategories = onSnapshot(
      collection(firestore, "categories"),
      (snapshot) => {
        const cats = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCategories(cats);
      },
      (err) => {
        console.error("Error fetching categories:", err);
      }
    );

    return () => unsubscribeCategories();
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
          setVendorBusinessName(vendorData.businessName || "");
        }
      } catch (err) {
        console.error("Error fetching vendor business name:", err);
      }
    };

    fetchVendorBusinessName();
  }, [authLoading, userData?.uid]);

  const handleCreate = () => {
    setEditingProduct(null);
    setCategorySearch("");
    setFormData({
      name: "",
      inOrderNumber: "",
      sku: "",
      description: "",
      price: "",
      discountPrice: "",
      capacity: "",
      unit: "",
      packageCount: "",
      stock: "",
      categoryId: "",
      vendorName: vendorBusinessName,
      moreOption: false,
      canBeDelivered: true,
      digital: false,
      isActive: true,
    });
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const handleViewDetails = (product: Product) => {
    setViewingProduct(product);
    setIsDetailsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    const selectedCategory = categories.find(c => c.id === product.categoryId);
    setCategorySearch(selectedCategory?.name || "");
    setFormData({
      name: product.name || "",
      inOrderNumber: product.inOrderNumber || "",
      sku: product.sku || "",
      description: product.description || "",
      price: product.price?.toString() || "",
      discountPrice: product.discountPrice?.toString() || "",
      capacity: product.capacity?.toString() || "",
      unit: product.unit || "",
      packageCount: product.packageCount?.toString() || "",
      stock: (product.availableQty ?? product.stock ?? 0).toString(),
      categoryId: product.categoryId || "",
      vendorName: product.vendorName || vendorBusinessName,
      moreOption: product.moreOption || false,
      canBeDelivered: product.canBeDelivered !== false,
      digital: product.digital || false,
      isActive: product.isActive !== false,
    });
    setImageFile(null);
    setImagePreview(product.image || (product.images && product.images.length > 0 ? product.images[0] : null));
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
        message: "Product name is required.",
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

    const processingKey = editingProduct?.id || "new";
    setProcessingIds((prev) => new Set(prev).add(processingKey));

    try {
      let imageUrl: string | null = null;

      if (editingProduct) {
        // Update existing product
        imageUrl = editingProduct.image || (editingProduct.images && editingProduct.images.length > 0 ? editingProduct.images[0] : null);

        if (imageFile) {
          imageUrl = await uploadProductImage(imageFile, userData.uid, editingProduct.id);
        }

        const productData = {
          name: formData.name.trim(),
          inOrderNumber: formData.inOrderNumber.trim() || null,
          sku: formData.sku.trim() || null,
          description: formData.description.trim() || null,
          price: formData.price ? parseFloat(formData.price) : null,
          discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : null,
          capacity: formData.capacity ? parseFloat(formData.capacity) : null,
          unit: formData.unit.trim() || null,
          packageCount: formData.packageCount ? parseInt(formData.packageCount) : null,
          stock: formData.stock ? parseInt(formData.stock) : 0,
          availableQty: formData.stock ? parseInt(formData.stock) : 0,
          image: imageUrl,
          vendorName: formData.vendorName.trim() || vendorBusinessName,
          categoryId: formData.categoryId || null,
          moreOption: formData.moreOption,
          canBeDelivered: formData.canBeDelivered,
          digital: formData.digital,
          isActive: formData.isActive,
          updatedAt: serverTimestamp(),
        };

        await setDoc(doc(firestore, "products", editingProduct.id), productData, { merge: true });
        setNotification({
          type: "success",
          message: "Product updated successfully!",
        });
      } else {
        // Create new product
        const newDocRef = doc(collection(firestore, "products"));

        if (imageFile) {
          imageUrl = await uploadProductImage(imageFile, userData.uid, newDocRef.id);
        }

        const productData = {
          name: formData.name.trim(),
          inOrderNumber: formData.inOrderNumber.trim() || null,
          sku: formData.sku.trim() || null,
          description: formData.description.trim() || null,
          price: formData.price ? parseFloat(formData.price) : null,
          discountPrice: formData.discountPrice ? parseFloat(formData.discountPrice) : null,
          capacity: formData.capacity ? parseFloat(formData.capacity) : null,
          unit: formData.unit.trim() || null,
          packageCount: formData.packageCount ? parseInt(formData.packageCount) : null,
          stock: formData.stock ? parseInt(formData.stock) : 0,
          availableQty: formData.stock ? parseInt(formData.stock) : 0,
          image: imageUrl,
          vendorId: userData.uid,
          vendorName: formData.vendorName.trim() || vendorBusinessName,
          categoryId: formData.categoryId || null,
          moreOption: formData.moreOption,
          canBeDelivered: formData.canBeDelivered,
          digital: formData.digital,
          isActive: formData.isActive,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        await setDoc(newDocRef, productData);
        setNotification({
          type: "success",
          message: "Product created successfully!",
        });
      }

      setIsModalOpen(false);
      setFormData({
        name: "",
        inOrderNumber: "",
        sku: "",
        description: "",
        price: "",
        discountPrice: "",
        capacity: "",
        unit: "",
        packageCount: "",
        stock: "",
        categoryId: "",
        vendorName: vendorBusinessName,
        moreOption: false,
        canBeDelivered: true,
        digital: false,
        isActive: true,
      });
      setImageFile(null);
      setImagePreview(null);
      setEditingProduct(null);
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Save error:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to save product.",
      });
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(editingProduct?.id || "new");
        return next;
      });
    }
  };

  const handleOutOfStock = async (product: Product) => {
    if (
      !window.confirm(
        `Mark "${product.name}" as out of stock? This will set the available quantity to 0.`
      )
    ) {
      return;
    }

    setProcessingIds((prev) => new Set(prev).add(product.id));
    setNotification(null);

    try {
      const productData = {
        stock: 0,
        availableQty: 0,
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(firestore, "products", product.id), productData, {
        merge: true,
      });
      setNotification({
        type: "success",
        message: "Product marked as out of stock!",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Error updating product:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to update product.",
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  };

  const handleDelete = async (product: Product) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${product.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setProcessingIds((prev) => new Set(prev).add(product.id));
    setNotification(null);

    try {
      await deleteDoc(doc(firestore, "products", product.id));
      setNotification({
        type: "success",
        message: "Product deleted successfully!",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error("Delete error:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to delete product.",
      });
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
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

  const formatCurrency = (amount?: number): string => {
    if (amount === undefined || amount === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getProductImage = (product: Product): string | null => {
    if (product.image) return product.image;
    if (product.images && product.images.length > 0) return product.images[0];
    return null;
  };

  const getStatus = (product: Product): { label: string; variant: "success" | "warning" | "destructive" } => {
    const qty = product.availableQty ?? product.stock ?? 0;
    if (qty > 0 && product.isActive !== false) {
      return { label: "In Stock", variant: "success" };
    } else if (qty === 0) {
      return { label: "Out of Stock", variant: "destructive" };
    } else {
      return { label: "Inactive", variant: "warning" };
    }
  };

  const columns = useMemo<ColumnDef<Product>[]>(
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
          const product = row.original;
          const imageUrl = getProductImage(product);
          return (
            <div className="flex items-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product.name}
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
            {row.getValue("name") || "Unnamed Product"}
          </div>
        ),
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
        accessorKey: "discountPrice",
        header: "Discount Price",
        cell: ({ row }) => {
          const discountPrice = row.getValue("discountPrice") as number | undefined;
          return (
            <div className="text-green-600 dark:text-green-400 font-medium">
              {formatCurrency(discountPrice)}
            </div>
          );
        },
      },
      {
        accessorKey: "availableQty",
        header: "Available Qty",
        cell: ({ row }) => {
          const product = row.original;
          const qty = product.availableQty ?? product.stock ?? 0;
          return (
            <div className="text-gray-600 dark:text-gray-400">
              {qty}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const product = row.original;
          const status = getStatus(product);
          return <Badge variant={status.variant}>{status.label}</Badge>;
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const product = row.original;
          const isProcessing = processingIds.has(product.id);
          return (
            <div className="flex justify-center">
              <ActionMenu
                onView={() => handleViewDetails(product)}
                onEdit={() => handleEdit(product)}
                onOutOfStock={() => handleOutOfStock(product)}
                onDelete={() => handleDelete(product)}
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

  if (authLoading || loading || !isFullyAuthorized) {
    return (
      <VendorLayout pageTitle="Product Management">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading products...
            </p>
          </div>
        </div>
      </VendorLayout>
    );
  }

  if (error) {
    return (
      <VendorLayout pageTitle="Product Management">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout pageTitle="Product Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Products
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your products
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="w-full md:w-auto px-4 py-2 bg-brand-primary-600 text-white rounded-lg hover:bg-brand-primary-700 transition-colors flex items-center justify-center space-x-2"
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
            <span>Add Product</span>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
          <DataTable
            columns={columns}
            data={products}
            searchableFields={["name"]}
            searchPlaceholder="Search products..."
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
                {editingProduct ? "Edit Product" : "Create Product"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                    placeholder="Enter product name"
                  />
                </div>

                {/* In Order Number and SKU */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      In Order Number
                    </label>
                    <input
                      type="text"
                      value={formData.inOrderNumber}
                      onChange={(e) =>
                        setFormData({ ...formData, inOrderNumber: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter order number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) =>
                        setFormData({ ...formData, sku: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter SKU"
                    />
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Product Image
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
                    placeholder="Enter product description"
                  />
                </div>

                {/* Price and Discount Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Discount Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.discountPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, discountPrice: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Capacity, Unit, Package Count, and Available Quantity */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Capacity
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.capacity}
                      onChange={(e) =>
                        setFormData({ ...formData, capacity: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) =>
                        setFormData({ ...formData, unit: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="e.g., kg, liters, pieces"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Package Count
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.packageCount}
                      onChange={(e) =>
                        setFormData({ ...formData, packageCount: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Available Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) =>
                        setFormData({ ...formData, stock: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Vendor Name and Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Vendor Name
                    </label>
                    <input
                      type="text"
                      value={formData.vendorName || vendorBusinessName}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 cursor-not-allowed"
                      placeholder="Auto-filled from vendor profile"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={categorySearch}
                        onChange={(e) => {
                          setCategorySearch(e.target.value);
                          if (e.target.value === "") {
                            setFormData({ ...formData, categoryId: "" });
                          }
                        }}
                        onFocus={() => {
                          if (formData.categoryId) {
                            setCategorySearch("");
                          }
                        }}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder={formData.categoryId ? categories.find(c => c.id === formData.categoryId)?.name || "Search categories..." : "Search categories..."}
                      />
                      {categorySearch && (
                        <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-lg">
                          {categories
                            .filter((cat) => 
                              cat.isActive !== false && 
                              cat.name.toLowerCase().includes(categorySearch.toLowerCase())
                            )
                            .map((cat) => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, categoryId: cat.id });
                                  setCategorySearch("");
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
                              >
                                {cat.name}
                              </button>
                            ))}
                          {categories.filter((cat) => 
                            cat.isActive !== false && 
                            cat.name.toLowerCase().includes(categorySearch.toLowerCase())
                          ).length === 0 && (
                            <div className="px-4 py-2 text-gray-500 dark:text-gray-400 text-sm">
                              No categories found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {!categorySearch && formData.categoryId && (
                      <div className="mt-2">
                        <span className="inline-flex items-center px-3 py-1 bg-brand-primary-100 dark:bg-brand-primary-900 text-brand-primary-800 dark:text-brand-primary-200 rounded-lg text-sm">
                          {categories.find(c => c.id === formData.categoryId)?.name || "Selected"}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, categoryId: "" });
                              setCategorySearch("");
                            }}
                            className="ml-2 text-brand-primary-600 dark:text-brand-primary-400 hover:text-brand-primary-800 dark:hover:text-brand-primary-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* More Option, Can Be Delivered, Digital, and Active Switches */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        More Option
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Option price should be added to product price
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, moreOption: !formData.moreOption })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary-500 focus:ring-offset-2 ${
                        formData.moreOption
                          ? "bg-brand-primary-600"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.moreOption ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Can Be Delivered
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        If product can be delivered to customers
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, canBeDelivered: !formData.canBeDelivered })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary-500 focus:ring-offset-2 ${
                        formData.canBeDelivered
                          ? "bg-brand-primary-600"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.canBeDelivered ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Digital
                      </label>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        If product is digital and can be downloaded
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, digital: !formData.digital })
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary-500 focus:ring-offset-2 ${
                        formData.digital
                          ? "bg-brand-primary-600"
                          : "bg-gray-200 dark:bg-gray-700"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          formData.digital ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label
                    htmlFor="isActive"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Active
                  </label>
                  <button
                    type="button"
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
                <div className="flex flex-col sm:flex-row sm:justify-end sm:space-x-3 space-y-3 sm:space-y-0 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setFormData({
                        name: "",
                        inOrderNumber: "",
                        sku: "",
                        description: "",
                        price: "",
                        discountPrice: "",
                        capacity: "",
                        unit: "",
                        packageCount: "",
                        stock: "",
                        categoryId: "",
                        vendorName: vendorBusinessName,
                        moreOption: false,
                        canBeDelivered: true,
                        digital: false,
                        isActive: true,
                      });
                      setImageFile(null);
                      setImagePreview(null);
                      setEditingProduct(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={processingIds.has(editingProduct?.id || "new")}
                    className="w-full sm:w-auto px-4 py-2 bg-brand-primary-600 text-white rounded-lg hover:bg-brand-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processingIds.has(editingProduct?.id || "new")
                      ? "Saving..."
                      : editingProduct
                      ? "Update"
                      : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {isDetailsModalOpen && viewingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Product Details
                </h2>
                <button
                  onClick={() => {
                    setIsDetailsModalOpen(false);
                    setViewingProduct(null);
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
                {getProductImage(viewingProduct) && (
                  <div>
                    <img
                      src={getProductImage(viewingProduct) || ""}
                      alt={viewingProduct.name}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Product Name
                    </label>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {viewingProduct.name || "—"}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </label>
                    <div className="mt-1">
                      <Badge variant={getStatus(viewingProduct).variant}>
                        {getStatus(viewingProduct).label}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Price
                    </label>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {formatCurrency(viewingProduct.price)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Discount Price
                    </label>
                    <p className="mt-1 text-green-600 dark:text-green-400 font-medium">
                      {formatCurrency(viewingProduct.discountPrice)}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Available Quantity
                    </label>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {viewingProduct.availableQty ?? viewingProduct.stock ?? 0}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Product ID
                    </label>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {viewingProduct.id}
                    </p>
                  </div>
                </div>

                {viewingProduct.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <p className="mt-1 text-gray-900 dark:text-white">
                      {viewingProduct.description}
                    </p>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setIsDetailsModalOpen(false);
                      setViewingProduct(null);
                    }}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </VendorLayout>
  );
}

