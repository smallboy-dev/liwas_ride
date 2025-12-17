"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { useVendorData, type VendorOrder } from "@/hooks/useVendorData";
import { VendorLayout } from "@/components/vendor/VendorLayout";
import { DataTable } from "@/components/admin/DataTable";
import { ActionMenu } from "@/components/admin/ActionMenu";
import { Badge } from "@/components/ui/badge";
import { ShoppingBagIcon } from "@/components/ui/icons";
import type { ColumnDef } from "@tanstack/react-table";
import { firestore } from "@/firebase/init";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
  updateDoc,
  type DocumentData,
} from "firebase/firestore";
import { Switch } from "@/components/ui/switch";
import { toast } from "react-hot-toast";
import { generateOrderCode, formatOrderId } from "@/lib/utils";

interface CustomerOption {
  id: string;
  name: string;
  email?: string;
  deliveryAddress?: any;
}

interface DriverOption {
  id: string;
  name: string;
  phone?: string;
}

interface OptionGroupWithOptions {
  id: string;
  name: string;
  options: Array<{
    id: string;
    name: string;
  }>;
}

interface OrderLine {
  id: string;
  productId: string;
  productName: string;
  optionIds: string[];
  quantity: number;
}

type OrderRow = VendorOrder & {
  code?: string;
  orderCode?: string;
  legacyType?: string;
};

const statusVariantMap: Record<string, string> = {
  delivered: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  available: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  assigned: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  preparing: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  ready: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  enroute: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  "out-for-delivery": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

const ORDER_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "available", label: "Available" },
  { value: "assigned", label: "Assigned" },
  { value: "pending", label: "Pending" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "enroute", label: "Enroute" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "failed", label: "Failed" },
];

function getStatusVariant(status?: string) {
  if (!status) return "bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-200";
  const key = status.toLowerCase();
  return statusVariantMap[key] ?? "bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-200";
}

function formatCurrency(amount?: number) {
  if (amount === undefined || amount === null || Number.isNaN(amount)) return "N/A";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
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

function formatAddressLines(address: any): string[] {
  if (address === null || address === undefined) return [];

  if (typeof address === "string" || typeof address === "number") {
    return String(address)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  if (Array.isArray(address)) {
    return address
      .flatMap((item) => formatAddressLines(item))
      .map((line) => line.trim())
      .filter(Boolean);
  }

  if (typeof address === "object") {
    const preferredKeys = [
      "label",
      "line1",
      "line2",
      "street",
      "streetAddress",
      "city",
      "state",
      "province",
      "postalCode",
      "zip",
      "country",
    ];
    const lines: string[] = [];
    const seen = new Set<string>();

    preferredKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(address, key)) {
        seen.add(key);
        lines.push(...formatAddressLines(address[key]));
      }
    });

    Object.keys(address).forEach((key) => {
      if (seen.has(key)) return;
      const value = address[key];
      if (value === null || value === undefined || value === "") return;
      lines.push(...formatAddressLines(value));
    });

    return Array.from(
      new Set(
        lines
          .map((line) => line.trim())
          .filter(Boolean)
      )
    );
  }

  return [];
}

export default function VendorOrdersPage() {
  // Protect route: requires vendor role and approval
  const { userData, loading: authLoading, isFullyAuthorized } = useRequireRoleAndApproval(
    ["vendor"],
    true
  );

  // Fetch vendor orders data
  const {
    orders,
    products,
    loading: dataLoading,
    error: dataError,
  } = useVendorData(userData?.uid || null);

  const [viewingOrder, setViewingOrder] = useState<OrderRow | null>(null);
  const [editingOrder, setEditingOrder] = useState<OrderRow | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSummaryStep, setIsSummaryStep] = useState(false);
  const [vendorBusinessName, setVendorBusinessName] = useState<string>("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerAddress, setSelectedCustomerAddress] = useState<any | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [pickupLocation, setPickupLocation] = useState<string>("");
  const [dropoffLocation, setDropoffLocation] = useState<string>("");
  const [customerLoading, setCustomerLoading] = useState(false);
  const [optionGroups, setOptionGroups] = useState<OptionGroupWithOptions[]>([]);
  const [optionLoading, setOptionLoading] = useState(false);
  const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [pickupOrder, setPickupOrder] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [driverLoading, setDriverLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>("cash-on-delivery");
  const [couponCode, setCouponCode] = useState("");
  const [driverTip, setDriverTip] = useState<string>("0");
  const [note, setNote] = useState("");
  const [taxRate] = useState<number>(0);
  const [discountAmount] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<string>("0");
  const [commissionFee, setCommissionFee] = useState<string>("0");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [editingStatus, setEditingStatus] = useState<string>("pending");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [updateStatusError, setUpdateStatusError] = useState<string | null>(null);
  const [markingReadyId, setMarkingReadyId] = useState<string | null>(null);

  const summaryDeliveryAddressLines = formatAddressLines(
    pickupOrder ? null : deliveryAddress || selectedCustomerAddress
  );
  const summaryDropoffAddressLines = formatAddressLines(
    pickupOrder ? null : dropoffLocation || deliveryAddress || selectedCustomerAddress
  );
  const activeOrder = viewingOrder || editingOrder;
  const activeDeliveryAddressLines = formatAddressLines(activeOrder?.deliveryAddress);
  const activePickupAddressLines = formatAddressLines(activeOrder?.pickupLocation);
  const activeDropoffAddressLines = formatAddressLines(activeOrder?.dropoffLocation);
  const viewingOrderStatus = viewingOrder
    ? (viewingOrder.orderStatus || viewingOrder.legacyType || "pending").toString().toLowerCase()
    : null;
  const canMarkReadyForPickup = viewingOrderStatus
    ? !["ready", "delivered", "completed", "cancelled", "failed", "rejected"].includes(viewingOrderStatus)
    : false;

  const handleCreateOrder = () => {
    setViewingOrder(null);
    setEditingOrder(null);
    resetCreateState();
    setIsCreateModalOpen(true);
  };

  const handleCloseOrderModal = useCallback(() => {
    setViewingOrder(null);
    setEditingOrder(null);
    setUpdateStatusError(null);
    setEditingStatus("pending");
  }, []);

  const handleViewOrder = useCallback((order: OrderRow) => {
    setEditingOrder(null);
    setEditingStatus("pending");
    setUpdateStatusError(null);
    setViewingOrder(order);
  }, []);

  const handleStartEdit = useCallback(
    (order: OrderRow) => {
      const normalizedStatus = (order.orderStatus || order.legacyType || "pending")
        .toString()
        .toLowerCase();
      const allowedStatus = ORDER_STATUS_OPTIONS.some((option) => option.value === normalizedStatus)
        ? normalizedStatus
        : "pending";

      setViewingOrder(null);
      setEditingStatus(allowedStatus);
      setUpdateStatusError(null);
      setEditingOrder(order);
    },
    []
  );

  const handleUpdateOrderStatus = useCallback(async () => {
    if (!editingOrder) return;

    const isAllowed = ORDER_STATUS_OPTIONS.some((option) => option.value === editingStatus);
    if (!isAllowed) {
      setUpdateStatusError("Select a valid status before saving.");
      return;
    }

    try {
      setIsUpdatingStatus(true);
      setUpdateStatusError(null);

      const orderRef = doc(firestore, "orders", editingOrder.id);
      await updateDoc(orderRef, {
        orderStatus: editingStatus,
        status: editingStatus,
        updatedAt: serverTimestamp(),
      });

      handleCloseOrderModal();
    } catch (error) {
      console.error("Failed to update order status", error);
      setUpdateStatusError((error as Error)?.message ?? "Failed to update order status. Please try again.");
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [editingOrder, editingStatus, handleCloseOrderModal]);

  const handleMarkReadyForPickup = useCallback(
    async (order: OrderRow) => {
      if (!order?.id) return;

      try {
        setMarkingReadyId(order.id);
        const orderRef = doc(firestore, "orders", order.id);
        const updatePayload: Record<string, unknown> = {
          orderStatus: "ready",
          status: "ready",
          readyAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (order.driverId) {
          updatePayload.driverStatus = "awaiting-pickup";
        }

        await updateDoc(orderRef, updatePayload);
        toast.success("Order marked ready for pickup");
      } catch (error: any) {
        console.error("Failed to mark order ready for pickup", error);
        toast.error(error?.message ?? "Failed to mark order ready for pickup");
      } finally {
        setMarkingReadyId(null);
      }
    },
    []
  );

  useEffect(() => {
    if (!isCreateModalOpen || !userData?.uid) return;

    const fetchVendorMeta = async () => {
      try {
        const vendorDoc = await getDoc(doc(firestore, "vendors", userData.uid));
        if (vendorDoc.exists()) {
          const data = vendorDoc.data() as DocumentData;
          setVendorBusinessName(data.businessName || "");
        }
      } catch (err) {
        console.error("Failed to load vendor details", err);
      }
    };

    const fetchCustomers = async () => {
      setCustomerLoading(true);
      try {
        const usersQuery = query(collection(firestore, "users"), where("role", "==", "customer"));
        const snapshot = await getDocs(usersQuery);
        const nextCustomers: CustomerOption[] = snapshot.docs.map((userDoc) => {
          const data = userDoc.data();
          return {
            id: userDoc.id,
            name: data.displayName || data.name || data.email || "Unnamed Customer",
            email: data.email,
            deliveryAddress: data.deliveryAddress || null,
          };
        });
        setCustomers(nextCustomers);
      } catch (err) {
        console.error("Failed to load customers", err);
      } finally {
        setCustomerLoading(false);
      }
    };

    const fetchOptionGroups = async () => {
      if (!userData?.uid) return;
      setOptionLoading(true);
      try {
        const groupsQuery = query(
          collection(firestore, "optionGroups"),
          where("vendorId", "==", userData.uid),
          where("isActive", "==", true)
        );
        const groupsSnapshot = await getDocs(groupsQuery);

        const groups: OptionGroupWithOptions[] = await Promise.all(
          groupsSnapshot.docs.map(async (groupDoc) => {
            const groupData = groupDoc.data();
            const optionsQuery = query(
              collection(firestore, "options"),
              where("vendorId", "==", userData.uid),
              where("optionGroupId", "==", groupDoc.id),
              where("isActive", "==", true)
            );
            const optionsSnapshot = await getDocs(optionsQuery);
            const options = optionsSnapshot.docs.map((optionDoc) => ({
              id: optionDoc.id,
              name: optionDoc.data().name || "Unnamed Option",
            }));

            return {
              id: groupDoc.id,
              name: groupData.name || "Unnamed Group",
              options,
            };
          })
        );

        setOptionGroups(groups);
      } catch (err) {
        console.error("Failed to load option groups", err);
      } finally {
        setOptionLoading(false);
      }
    };

    // Load vendor info, customers, and option groups when the create order modal opens
    fetchVendorMeta();
    fetchCustomers();
    fetchOptionGroups();
  }, [isCreateModalOpen, userData?.uid]);

  const resetCreateState = () => {
    setIsSummaryStep(false);
    setOrderLines([
      {
        id: crypto.randomUUID(),
        productId: "",
        productName: "",
        optionIds: [],
        quantity: 1,
      },
    ]);
    setSelectedCustomerId("");
    setSelectedCustomerAddress(null);
    setDeliveryAddress("");
    setPickupLocation("");
    setDropoffLocation("");
    setSelectedDriverId("");
    setPickupOrder(false);
    setPaymentMethod("cash-on-delivery");
    setCouponCode("");
    setDriverTip("0");
    setNote("");
    setErrorMessage("");
    setDeliveryFee("0");
    setCommissionFee("0");
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  const addOrderLine = () => {
    setOrderLines((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        productId: "",
        productName: "",
        optionIds: [],
        quantity: 1,
      },
    ]);
  };

  const removeOrderLine = (lineId: string) => {
    setOrderLines((prev) => prev.filter((line) => line.id !== lineId));
  };

  const updateOrderLine = (lineId: string, updates: Partial<OrderLine>) => {
    setOrderLines((prev) =>
      prev.map((line) => (line.id === lineId ? { ...line, ...updates } : line))
    );
  };

  const handleProductChange = (lineId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    updateOrderLine(lineId, {
      productId,
      productName: product?.name || "",
      optionIds: [],
    });
  };

  const toggleOptionForLine = (lineId: string, optionId: string) => {
    setOrderLines((prev) =>
      prev.map((line) => {
        if (line.id !== lineId) return line;
        const exists = line.optionIds.includes(optionId);
        return {
          ...line,
          optionIds: exists
            ? line.optionIds.filter((id) => id !== optionId)
            : [...line.optionIds, optionId],
        };
      })
    );
  };

  const subtotal = useMemo(() => {
    return orderLines.reduce((sum, line) => {
      const product = products.find((p) => p.id === line.productId);
      const price = product?.price || 0;
      return sum + price * (line.quantity || 0);
    }, 0);
  }, [orderLines, products]);

  const driverTipAmount = useMemo(() => Number.parseFloat(driverTip) || 0, [driverTip]);
  const taxAmount = useMemo(() => subtotal * taxRate, [subtotal, taxRate]);
  const total = useMemo(
    () => subtotal - discountAmount + taxAmount + driverTipAmount,
    [subtotal, discountAmount, taxAmount, driverTipAmount]
  );

  const handleNextStep = () => {
    if (!selectedCustomerId) {
      setErrorMessage("Please select a customer.");
      return;
    }
    const hasProducts = orderLines.some((line) => line.productId);
    if (!hasProducts) {
      setErrorMessage("Please add at least one product to the order.");
      return;
    }
    setErrorMessage("");
    const selected = customers.find((customer) => customer.id === selectedCustomerId);
    setSelectedCustomerAddress(selected?.deliveryAddress || null);
    setIsSummaryStep(true);
  };

  const handleBackToForm = () => {
    setIsSummaryStep(false);
  };

  const buildOrderPayload = (orderId: string) => {
    const customer = customers.find((entry) => entry.id === selectedCustomerId);
    const timestamp = serverTimestamp();
    const driver = selectedDriverId ? drivers.find((entry) => entry.id === selectedDriverId) : null;

    return {
      id: orderId,
      customerId: selectedCustomerId,
      customerName: customer?.name ?? null,
      vendorId: userData?.uid,
      vendorName: vendorBusinessName || null,
      driverId: null, // No driver assigned initially
      driverName: null, // No driver assigned initially
      totalAmount: total,
      paymentStatus: paymentMethod === "cash-on-delivery" ? "pending" : "awaiting-confirmation",
      orderStatus: "available", // Orders start as available for drivers
      deliveryAddress: pickupOrder ? null : deliveryAddress || selectedCustomerAddress,
      pickupLocation: pickupLocation || null,
      dropoffLocation: pickupOrder ? null : dropoffLocation || deliveryAddress || selectedCustomerAddress,
      deliveryFee: Number.parseFloat(deliveryFee) || 0,
      commissionFee: Number.parseFloat(commissionFee) || 0,
      products: orderLines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        optionIds: line.optionIds,
        quantity: line.quantity,
      })),
      createdAt: timestamp,
      updatedAt: timestamp,
      availableAt: timestamp, // When order became available for drivers
      // Legacy compatibility fields
      userId: selectedCustomerId,
      status: "available", // Legacy status field
      paymentMethod,
      payment: {
        method: paymentMethod,
        status: paymentMethod === "cash-on-delivery" ? "pending" : "awaiting-confirmation",
        type: pickupOrder ? "pickup" : "delivery",
      },
      type: pickupOrder ? "pickup" : "delivery",
      customer: customer ? { name: customer.name, email: customer.email ?? null } : null,
      customerEmail: customer?.email ?? null,
      driverTip: driverTipAmount,
      subtotal,
      discountAmount,
      taxAmount,
      couponCode: couponCode || null,
      note: note || null,
      pickupOrder,
    };
  };

  const handleSubmitOrder = async () => {
    if (!userData?.uid) {
      setSubmitError("You must be signed in to create orders.");
      return;
    }

    if (!selectedCustomerId) {
      setSubmitError("Customer selection is required.");
      setIsSummaryStep(false);
      return;
    }

    const hasProduct = orderLines.some((line) => line.productId);
    if (!hasProduct) {
      setSubmitError("Add at least one product before submitting.");
      setIsSummaryStep(false);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const batch = writeBatch(firestore);

      const orderRef = doc(collection(firestore, "orders"));
      
      // Generate a unique order code (check for duplicates)
      let orderCode = generateOrderCode();
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        // Check if this order code already exists
        const existingOrdersQuery = query(
          collection(firestore, "orders"),
          where("orderCode", "==", orderCode)
        );
        const existingOrders = await getDocs(existingOrdersQuery);
        
        if (existingOrders.empty) {
          // Code is unique, break out of loop
          break;
        }
        
        // Code exists, generate a new one
        orderCode = generateOrderCode();
        attempts++;
      }
      
      // If we still have a potential duplicate after max attempts, append timestamp
      if (attempts >= maxAttempts) {
        const timestamp = Date.now().toString().slice(-4); // Last 4 digits of timestamp
        const baseCode = orderCode.substring(1); // Remove #
        orderCode = `#${baseCode.substring(0, 4)}${timestamp}`;
      }
      
      const payload = buildOrderPayload(orderRef.id);
      // Add the formatted order code to the payload
      (payload as any).orderCode = orderCode;
      (payload as any).code = orderCode;
      batch.set(orderRef, payload);

      orderLines.forEach((line) => {
        const product = products.find((item) => item.id === line.productId);
        if (!product) return;
        const productRef = doc(firestore, "products", product.id);
        const updatedQty = Math.max((product.availableQty ?? product.capacity ?? 0) - line.quantity, 0);
        batch.update(productRef, {
          availableQty: updatedQty,
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();

      setSubmitSuccess("Order submitted successfully.");
      setIsCreateModalOpen(false);
      resetCreateState();
    } catch (error) {
      console.error("Failed to submit order", error);
      setSubmitError((error as Error)?.message ?? "Failed to submit order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const mappedOrders = useMemo<OrderRow[]>(
    () =>
      orders.map((order) => ({
        ...order,
        code: (order as any)?.code || (order as any)?.orderCode || (order as any)?.reference || order.id,
        legacyType: (order as any)?.type || (order as any)?.orderType || (order as any)?.payment?.type,
        paymentMethod: order.paymentMethod || null,
        customerName: order.customerName || (order as any)?.userName || "Unknown",
        customerEmail: order.customerEmail || (order as any)?.userEmail || "—",
      })),
    [orders]
  );

  const columns = useMemo<ColumnDef<OrderRow>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        cell: ({ row }) => {
          const orderCode = row.original.code || row.original.orderCode || row.original.id;
          return <span className="font-medium text-gray-900 dark:text-gray-100">{formatOrderId(orderCode)}</span>;
        },
      },
      {
        accessorKey: "orderStatus",
        header: "Status",
        cell: ({ row }) => {
          const value = row.original.orderStatus || row.original.legacyType || "pending";
          return (
            <Badge className={getStatusVariant(value)}>
              {(value || "pending").toString().replace(/-/g, " ")}
            </Badge>
          );
        },
      },
      {
        accessorKey: "paymentStatus",
        header: "Payment Status",
        cell: ({ row }) => (
          <Badge className={getStatusVariant(row.original.paymentStatus)}>
            {(row.original.paymentStatus || "Unknown").replace(/-/g, " ")}
          </Badge>
        ),
      },
      {
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {row.original.customerName || "Unknown"}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {row.original.customerEmail || "—"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "driverName",
        header: "Driver",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {row.original.driverName || "Assigning driver"}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {(row.original.driverStatus || (row.original.driverName ? row.original.orderStatus : "assigning driver")).replace(/-/g, " ")}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "totalAmount",
        header: "Total",
        cell: ({ row }) => (
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(row.original.totalAmount)}
          </span>
        ),
      },
      {
        accessorKey: "paymentMethod",
        header: "Method",
        cell: ({ row }) => (
          <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
            {row.original.paymentMethod || "—"}
          </span>
        ),
      },
      {
        accessorKey: "deliveryFee",
        header: "Delivery Fee",
        cell: ({ row }) => (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {formatCurrency(row.original.deliveryFee ?? 0)}
          </span>
        ),
      },
      {
        accessorKey: "commissionFee",
        header: "Commission",
        cell: ({ row }) => (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {formatCurrency(row.original.commissionFee ?? 0)}
          </span>
        ),
      },
      {
        accessorKey: "createdAt",
        header: "Created At",
        cell: ({ row }) => (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <ActionMenu
            onView={() => handleViewOrder(row.original)}
            onEdit={() => handleStartEdit(row.original)}
            customActions={(() => {
              const status = (row.original.orderStatus || row.original.legacyType || "pending")
                .toString()
                .toLowerCase();
              const eligible = !["ready", "delivered", "completed", "cancelled", "failed", "rejected"].includes(
                status
              );

              if (!eligible) return [] as const;

              return [
                {
                  label: markingReadyId === row.original.id ? "Marking..." : "Mark ready for pickup",
                  onClick: () => handleMarkReadyForPickup(row.original),
                  disabled: Boolean(markingReadyId) || !row.original.id,
                  variant: "success" as const,
                },
              ];
            })()}
          />
        ),
      },
    ],
    [handleStartEdit, handleViewOrder, markingReadyId, handleMarkReadyForPickup]
  );
  const isLoading = authLoading || dataLoading || !isFullyAuthorized;

  if (isLoading) {
    return (
      <VendorLayout pageTitle="Orders">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout pageTitle="Orders">
      <div className="space-y-6">
        {dataError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Error: {dataError}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Manage and track your orders
              </p>
            </div>
            <button
              onClick={handleCreateOrder}
              className="px-4 py-2 bg-brand-primary-600 text-white rounded-lg hover:bg-brand-primary-700 transition-colors flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Order</span>
            </button>
          </div>
          <div className="p-6">
            <DataTable
              columns={columns}
              data={mappedOrders}
              searchableFields={[
                "id",
                "code",
                "customerName",
                "customerEmail",
                "status",
                "paymentStatus",
                "paymentMethod",
                "type",
              ]}
              searchPlaceholder="Search orders..."
              isLoading={dataLoading}
            />
            {mappedOrders.length === 0 && (
              <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400">
                <ShoppingBagIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p>No orders yet. Orders will appear here once customers place them.</p>
              </div>
            )}
          </div>
        </div>

        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsCreateModalOpen(false)}
            />

            <div className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {isSummaryStep ? "Order Summary" : "Create Order"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isSummaryStep
                    ? "Review the order details before submitting."
                    : "Configure the order details below."}
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>

            {!isSummaryStep ? (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Vendor
                    </label>
                    <input
                      type="text"
                      value={vendorBusinessName || "—"}
                      disabled
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Customer
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(event) => setSelectedCustomerId(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    >
                      <option value="">{customerLoading ? "Loading customers..." : "Select customer"}</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                          {customer.email ? ` (${customer.email})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Pickup order</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Enable if customer will pick up</p>
                    </div>
                    <Switch checked={pickupOrder} onCheckedChange={setPickupOrder} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Payment method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 capitalize"
                    >
                      <option value="cash-on-delivery">Cash on delivery</option>
                      <option value="paypal">PayPal</option>
                      <option value="stripe">Stripe</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Commission fee
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={commissionFee}
                      onChange={(event) => setCommissionFee(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Pickup location
                    </label>
                    <input
                      type="text"
                      value={pickupLocation}
                      onChange={(event) => setPickupLocation(event.target.value)}
                      placeholder="e.g. 123 Vendor St"
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Delivery address override
                    </label>
                    <textarea
                      rows={3}
                      value={deliveryAddress}
                      onChange={(event) => setDeliveryAddress(event.target.value)}
                      placeholder="Leave blank to use customer's saved address"
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Dropoff location
                    </label>
                    <textarea
                      rows={3}
                      value={dropoffLocation}
                      onChange={(event) => setDropoffLocation(event.target.value)}
                      placeholder="Optional if different from delivery address"
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Order items</h4>
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-900/40">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            S/N
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Product
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Options
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Qty
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                        {orderLines.map((line, index) => (
                          <tr key={line.id}>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{index + 1}</td>
                            <td className="px-4 py-3">
                              <select
                                value={line.productId}
                                onChange={(event) => handleProductChange(line.id, event.target.value)}
                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                              >
                                <option value="">Select product</option>
                                {products.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name || "Unnamed product"}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-2">
                                {optionLoading ? (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Loading options...</p>
                                ) : optionGroups.length === 0 ? (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">No option groups found.</p>
                                ) : (
                                  optionGroups.map((group) => (
                                    <div key={group.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-2">
                                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                                        {group.name}
                                      </p>
                                      <div className="space-y-1">
                                        {group.options.map((option) => {
                                          const checked = line.optionIds.includes(option.id);
                                          return (
                                            <label
                                              key={option.id}
                                              className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-900/40 px-2 py-1"
                                            >
                                              <span className="text-xs text-gray-600 dark:text-gray-300">{option.name}</span>
                                              <Switch
                                                checked={checked}
                                                onCheckedChange={() => toggleOptionForLine(line.id, option.id)}
                                              />
                                            </label>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={1}
                                value={line.quantity}
                                onChange={(event) =>
                                  updateOrderLine(line.id, {
                                    quantity: Number.parseInt(event.target.value, 10) || 1,
                                  })
                                }
                                className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => removeOrderLine(line.id)}
                                className="text-sm text-red-500 hover:text-red-600"
                                disabled={orderLines.length === 1}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3">
                    <button
                      onClick={addOrderLine}
                      className="text-sm font-medium text-brand-primary-600 hover:text-brand-primary-700"
                    >
                      + Add another product
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Coupon code
                    </label>
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(event) => setCouponCode(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Driver tip
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={driverTip}
                      onChange={(event) => setDriverTip(event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Note
                  </label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  />
                </div>

                {errorMessage && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                  </div>
                )}
                {submitError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {submitError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="px-4 py-2 text-sm font-medium text-white bg-brand-primary-600 rounded-lg hover:bg-brand-primary-700 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Vendor</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {vendorBusinessName || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Customer</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {customers.find((customer) => customer.id === selectedCustomerId)?.name || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Pickup Location</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {pickupOrder ? "Customer pickup" : pickupLocation || "—"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Delivery Address</p>
                    {pickupOrder ? (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        Pickup order — no delivery address required.
                      </p>
                    ) : summaryDeliveryAddressLines.length ? (
                      <div className="mt-1 space-y-1">
                        {summaryDeliveryAddressLines.map((line, index) => (
                          <p key={index} className="text-sm text-gray-900 dark:text-gray-100">
                            {line}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No delivery address on file.
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Dropoff Location</p>
                    {pickupOrder ? (
                      <p className="text-sm text-gray-600 dark:text-gray-300">Customer pickup</p>
                    ) : summaryDropoffAddressLines.length ? (
                      <div className="mt-1 space-y-1">
                        {summaryDropoffAddressLines.map((line, index) => (
                          <p key={index} className="text-sm text-gray-900 dark:text-gray-100">
                            {line}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No dropoff location on file.</p>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900/40">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          S/N
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Name
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Options
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Qty
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                      {orderLines.map((line, index) => {
                        const productName =
                          products.find((product) => product.id === line.productId)?.name || "—";
                        const selectedOptions = optionGroups
                          .flatMap((group) => group.options)
                          .filter((option) => line.optionIds.includes(option.id))
                          .map((option) => option.name)
                          .join(", ");

                        return (
                          <tr key={line.id}>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                              {productName}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {selectedOptions || "—"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                              {line.quantity}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid gap-3 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Subtotal</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Discount</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(discountAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Tax</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(taxAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Driver tip</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(driverTipAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Delivery fee</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(Number.parseFloat(deliveryFee) || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Commission fee</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatCurrency(Number.parseFloat(commissionFee) || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Total</span>
                    <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    onClick={handleBackToForm}
                    className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Back
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsCreateModalOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitOrder}
                      className="px-4 py-2 text-sm font-medium text-white bg-brand-primary-600 rounded-lg hover:bg-brand-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Submitting..." : "Submit order"}
                    </button>
                  </div>
                </div>
                {submitError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {submitError}
                  </div>
                )}
                {submitSuccess && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {submitSuccess}
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        )}

        {(viewingOrder || editingOrder) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => {
                setViewingOrder(null);
                setEditingOrder(null);
              }}
            />

            <div className="relative z-10 w-full max-h-[90vh] overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {viewingOrder ? "Order Details" : "Edit Order"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Order ID: {formatOrderId((viewingOrder || editingOrder)?.code || (viewingOrder || editingOrder)?.orderCode || (viewingOrder || editingOrder)?.id)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {viewingOrder && canMarkReadyForPickup && (
                  <button
                    onClick={() => handleMarkReadyForPickup(viewingOrder)}
                    disabled={markingReadyId === viewingOrder.id}
                    className="px-3 py-1.5 text-sm font-medium text-white bg-brand-primary-600 rounded-lg hover:bg-brand-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {markingReadyId === viewingOrder.id ? "Marking..." : "Mark ready"}
                  </button>
                )}
                <button
                  onClick={() => {
                    setViewingOrder(null);
                    setEditingOrder(null);
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="grid gap-4 mt-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Customer</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {(viewingOrder || editingOrder)?.customerName || "Unknown"}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {(viewingOrder || editingOrder)?.customerEmail || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatCurrency((viewingOrder || editingOrder)?.totalAmount)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Order Status</p>
                {editingOrder ? (
                  <div className="mt-1 flex flex-col gap-2">
                    <select
                      value={editingStatus}
                      onChange={(event) => {
                        setEditingStatus(event.target.value);
                        setUpdateStatusError(null);
                      }}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 capitalize"
                    >
                      {ORDER_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="capitalize">
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Only order status can be updated when editing.
                    </span>
                  </div>
                ) : (
                  <Badge className={getStatusVariant((viewingOrder || editingOrder)?.orderStatus)}>
                    {((viewingOrder || editingOrder)?.orderStatus || "Pending").replace(/-/g, " ")}
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Payment</p>
                <div className="flex flex-col gap-1">
                  <Badge className={getStatusVariant((viewingOrder || editingOrder)?.paymentStatus)}>
                    {((viewingOrder || editingOrder)?.paymentStatus || "Unknown").replace(/-/g, " ")}
                  </Badge>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Method: {(viewingOrder || editingOrder)?.paymentMethod || "—"}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Driver</p>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {(viewingOrder || editingOrder)?.driverName || "Assigning driver"}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {((viewingOrder || editingOrder)?.driverStatus || ((viewingOrder || editingOrder)?.driverName ? (viewingOrder || editingOrder)?.orderStatus : "assigning driver"))
                      ?.toString()
                      .replace(/-/g, " ")}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Pickup Location</p>
                {activeOrder?.pickupOrder ? (
                  <p className="text-sm text-gray-600 dark:text-gray-300">Customer pickup</p>
                ) : activePickupAddressLines.length ? (
                  <div className="mt-1 space-y-1">
                    {activePickupAddressLines.map((line, index) => (
                      <p key={index} className="text-sm text-gray-900 dark:text-gray-100">
                        {line}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No pickup location on file.</p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Created At</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatDate((viewingOrder || editingOrder)?.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Code</p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {formatOrderId((viewingOrder || editingOrder)?.code || (viewingOrder || editingOrder)?.orderCode || (viewingOrder || editingOrder)?.id)}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Delivery Address</p>
                {activeOrder?.pickupOrder ? (
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Pickup order — no delivery address required.
                  </p>
                ) : activeDeliveryAddressLines.length ? (
                  <div className="mt-1 space-y-1">
                    {activeDeliveryAddressLines.map((line, index) => (
                      <p key={index} className="text-sm text-gray-900 dark:text-gray-100">
                        {line}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No delivery address on file.
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Dropoff Location</p>
                {activeOrder?.pickupOrder ? (
                  <p className="text-sm text-gray-600 dark:text-gray-300">Customer pickup</p>
                ) : activeDropoffAddressLines.length ? (
                  <div className="mt-1 space-y-1">
                    {activeDropoffAddressLines.map((line, index) => (
                      <p key={index} className="text-sm text-gray-900 dark:text-gray-100">
                        {line}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No dropoff location on file.</p>
                )}
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400">Fees</p>
                <div className="text-sm text-gray-900 dark:text-gray-100 space-y-1">
                  <span>Delivery: {formatCurrency(activeOrder?.deliveryFee ?? 0)}</span>
                  <span>Commission: {formatCurrency(activeOrder?.commissionFee ?? 0)}</span>
                </div>
              </div>
            </div>
            {updateStatusError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {updateStatusError}
              </div>
            )}
            {editingOrder && (
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={handleCloseOrderModal}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateOrderStatus}
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-primary-600 rounded-lg hover:bg-brand-primary-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? "Saving..." : "Save status"}
                </button>
              </div>
            )}
            </div>
          </div>
        )}
      </div>
    </VendorLayout>
  );
}

