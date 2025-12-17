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
import type { ColumnDef } from "@tanstack/react-table";

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  discountPrice?: number;
  stock?: number;
  availableQty?: number;
  images?: string[];
  image?: string;
  vendorId?: string;
  vendorName?: string;
  categoryId?: string;
  isActive?: boolean;
  createdAt: Timestamp | null;
  updatedAt?: Timestamp | null;
}

/**
 * Admin Products Page - Protected Route
 * Manages all products across vendors
 */
export default function ProductsPage() {
  const { userData, loading: authLoading } = useRequireRoleAndApproval(
    ["admin"],
    false
  );

  const [products, setProducts] = useState<Product[]>([]);
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

  // Fetch products
  useEffect(() => {
    if (authLoading) return;

    const unsubscribe = onSnapshot(
      collection(firestore, "products"),
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
  }, [authLoading]);

  const handleViewDetails = (product: Product) => {
    setViewingProduct(product);
    setIsDetailsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
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
        accessorKey: "vendorName",
        header: "Business Name",
        cell: ({ row }) => {
          const vendorName = row.getValue("vendorName") as string | undefined;
          return (
            <div className="text-gray-600 dark:text-gray-400">
              {vendorName || "N/A"}
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

  if (authLoading || loading) {
    return (
      <AdminLayout pageTitle="Product Management">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              Loading products...
            </p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout pageTitle="Product Management">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Error: {error}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout pageTitle="Product Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Products
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage all products across vendors
            </p>
          </div>
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
            data={products}
            searchableFields={["name"]}
            searchPlaceholder="Search products..."
            onRefresh={handleRefresh}
            isLoading={loading}
          />
        </div>
      </div>

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
    </AdminLayout>
  );
}
