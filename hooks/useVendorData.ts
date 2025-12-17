"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  doc,
  updateDoc,
  orderBy,
} from "firebase/firestore";
import { firestore } from "@/firebase/init";
import { remitCodPayment } from "@/lib/remittance";

export interface VendorOrder {
  id: string;
  customerId: string;
  customerName?: string | null;
  customerEmail?: string | null;
  vendorId: string;
  vendorName?: string | null;
  driverId?: string | null;
  driverName?: string | null;
  driverStatus?: string | null;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  paymentMethod?: string | null;
  pickupOrder?: boolean;
  deliveryAddress?: any;
  pickupLocation?: any;
  dropoffLocation?: any;
  deliveryFee?: number | null;
  commissionFee?: number | null;
  createdAt?: any;
  updatedAt?: any;
  proofOfDeliverySignatureUrl?: string | null;
  proofOfDeliverySignaturePath?: string | null;
  // Legacy fields used for backward compatibility
  // TODO: remove once all orders follow the new schema
  legacyPaymentMethod?: string;
  legacyType?: string;
  legacyCode?: string;
}

export interface VendorProduct {
  id: string; // Document ID
  vendorId: string;
  name?: string;
  description?: string;
  price?: number;
  isActive?: boolean;
  categoryId?: string;
  stock?: number;
  availableQty?: number;
  capacity?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface VendorPayout {
  id: string; // Document ID
  vendorId: string;
  amount: number;
  status?: string;
  paymentMethod?: string;
  transactionId?: string;
  createdAt?: any;
}

export interface VendorTransaction {
  id: string;
  vendorId: string;
  driverId?: string | null;
  driverName?: string | null;
  orderId: string;
  orderCode?: string | null;
  type: string;
  paymentMethod?: string | null;
  grossAmount?: number | null;
  commissionAmount?: number | null;
  netAmount?: number | null;
  status?: string | null;
  notes?: string | null;
  vendorTransactionId?: string | null;
  remittanceSignatureUrl?: string | null;
  remittanceSignaturePath?: string | null;
  remittedAt?: any;
  remittedBy?: string | null;
  createdAt?: any;
  updatedAt?: any;
  driverTransactionId?: string | null;
}

export interface VendorDataHookResult {
  orders: VendorOrder[];
  products: VendorProduct[];
  payouts: VendorPayout[];
  transactions: VendorTransaction[];
  totalOrders: number;
  totalEarnings: number;
  activeProducts: number;
  loading: boolean;
  error: string | null;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => Promise<void>;
  updatingStatus: boolean;
  remitDriverCash: (transaction: VendorTransaction, signature: Blob) => Promise<void>;
  remittingTransactionId: string | null;
}

/**
 * Custom hook to fetch vendor-specific data (orders, products, payouts)
 * Uses real-time listeners for live updates
 * @param vendorId - The vendor's user ID (from auth.uid)
 */
export function useVendorData(vendorId: string | null): VendorDataHookResult {
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [payouts, setPayouts] = useState<VendorPayout[]>([]);
  const [transactions, setTransactions] = useState<VendorTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpenState] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [remittingTransactionId, setRemittingTransactionId] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) {
      setLoading(false);
      return;
    }

    let ordersUnsubscribe: (() => void) | null = null;
    let productsUnsubscribe: (() => void) | null = null;
    let payoutsUnsubscribe: (() => void) | null = null;
    let transactionsUnsubscribe: (() => void) | null = null;

    const setupListeners = () => {
      try {
        // Set up real-time listener for orders
        const ordersQuery = query(
          collection(firestore, "orders"),
          where("vendorId", "==", vendorId)
        );

        ordersUnsubscribe = onSnapshot(
          ordersQuery,
          (snapshot: QuerySnapshot<DocumentData>) => {
            try {
              const ordersData = snapshot.docs.map((doc) => {
                const data = doc.data();

                return {
                  id: doc.id,
                  customerId: (data.customerId ?? data.userId ?? "") as string,
                  customerName:
                    (data.customerName ?? data.customer?.name ?? data.customer?.displayName ?? null) ??
                    null,
                  customerEmail:
                    (data.customerEmail ?? data.customer?.email ?? (data as any)?.userEmail ?? null) as
                      | string
                      | null,
                  vendorId: (data.vendorId ?? "") as string,
                  vendorName: (data.vendorName ?? null) as string | null,
                  driverId: (data.driverId ?? null) as string | null,
                  driverName:
                    (data.driverName ?? data.driver?.name ?? data.assignedDriverName ?? null) as
                      | string
                      | null,
                  driverStatus: (data.driverStatus ?? null) as string | null,
                  totalAmount: Number(data.totalAmount ?? data.total ?? 0),
                  paymentStatus: (data.paymentStatus ?? data.payment?.status ?? "unknown") as string,
                  orderStatus: (data.orderStatus ?? data.status ?? "pending") as string,
                  paymentMethod:
                    (data.paymentMethod ?? data.payment?.method ?? (data as any)?.paymentMethod ?? null) as
                      | string
                      | null,
                  pickupOrder: Boolean(
                    (data.pickupOrder ?? null) ??
                      ((data.type ?? data.orderType ?? data.payment?.type) === "pickup")
                  ),
                  deliveryAddress: data.deliveryAddress ?? data.address ?? null,
                  pickupLocation: data.pickupLocation ?? data.pickupPoint ?? null,
                  dropoffLocation: data.dropoffLocation ?? data.dropoffPoint ?? null,
                  deliveryFee:
                    data.deliveryFee !== undefined && data.deliveryFee !== null
                      ? Number(data.deliveryFee)
                      : null,
                  commissionFee:
                    data.commissionFee !== undefined && data.commissionFee !== null
                      ? Number(data.commissionFee)
                      : data.platformFee !== undefined && data.platformFee !== null
                        ? Number(data.platformFee)
                        : null,
                  createdAt: data.createdAt ?? null,
                  updatedAt: data.updatedAt ?? null,
                  proofOfDeliverySignatureUrl: (data.proofOfDeliverySignatureUrl ?? null) as string | null,
                  proofOfDeliverySignaturePath: (data.proofOfDeliverySignaturePath ?? null) as string | null,
                  legacyPaymentMethod: data.paymentMethod ?? data.payment?.method ?? undefined,
                  legacyType: data.type ?? data.orderType ?? data.payment?.type ?? undefined,
                  legacyCode: data.code ?? data.orderCode ?? (data as any)?.reference ?? undefined,
                } satisfies VendorOrder;
              });
              setOrders(ordersData);
            } catch (err: any) {
              console.error("Error processing orders data:", err);
              setError(err.message || "Failed to process orders data");
            }
          },
          (err) => {
            console.error("Orders snapshot error:", err);
            setError(err.message || "Failed to fetch orders");
          }
        );

        // Set up real-time listener for vendor transactions
        const transactionsQuery = query(
          collection(firestore, "vendorTransactions"),
          where("vendorId", "==", vendorId),
          orderBy("createdAt", "desc")
        );

        transactionsUnsubscribe = onSnapshot(
          transactionsQuery,
          (snapshot: QuerySnapshot<DocumentData>) => {
            try {
              const transactionsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Record<string, unknown>),
              })) as VendorTransaction[];
              setTransactions(transactionsData);
            } catch (err: any) {
              console.error("Error processing vendor transactions:", err);
              setError(err.message || "Failed to process vendor transactions");
            }
          },
          (err) => {
            console.error("Vendor transactions snapshot error:", err);
            setError(err.message || "Failed to fetch vendor transactions");
          }
        );

        // Set up real-time listener for products
        const productsQuery = query(
          collection(firestore, "products"),
          where("vendorId", "==", vendorId),
          where("isActive", "==", true)
        );

        productsUnsubscribe = onSnapshot(
          productsQuery,
          (snapshot: QuerySnapshot<DocumentData>) => {
            try {
              const productsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as VendorProduct[];
              setProducts(productsData);
            } catch (err: any) {
              console.error("Error processing products data:", err);
              setError(err.message || "Failed to process products data");
            }
          },
          (err) => {
            console.error("Products snapshot error:", err);
            setError(err.message || "Failed to fetch products");
          }
        );

        // Set up real-time listener for payouts
        const payoutsQuery = query(
          collection(firestore, "payouts"),
          where("vendorId", "==", vendorId)
        );

        payoutsUnsubscribe = onSnapshot(
          payoutsQuery,
          (snapshot: QuerySnapshot<DocumentData>) => {
            try {
              const payoutsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as VendorPayout[];
              setPayouts(payoutsData);
            } catch (err: any) {
              console.error("Error processing payouts data:", err);
              setError(err.message || "Failed to process payouts data");
            }
          },
          (err) => {
            console.error("Payouts snapshot error:", err);
            setError(err.message || "Failed to fetch payouts");
          }
        );

        // Fetch vendor status (isOpen)
        const vendorDocRef = doc(firestore, "vendors", vendorId);
        const vendorUnsubscribe = onSnapshot(
          vendorDocRef,
          (snapshot) => {
            try {
              if (snapshot.exists()) {
                const vendorData = snapshot.data();
                setIsOpenState(vendorData.isOpen ?? true);
              }
            } catch (err: any) {
              console.error("Error processing vendor status:", err);
            }
          },
          (err) => {
            console.error("Vendor status snapshot error:", err);
          }
        );

        setLoading(false);
        setError(null);

        // Return cleanup function including vendor listener
        return () => {
          if (ordersUnsubscribe) ordersUnsubscribe();
          if (productsUnsubscribe) productsUnsubscribe();
          if (payoutsUnsubscribe) payoutsUnsubscribe();
          if (transactionsUnsubscribe) transactionsUnsubscribe();
          if (vendorUnsubscribe) vendorUnsubscribe();
        };
      } catch (err: any) {
        console.error("Error setting up listeners:", err);
        setError(err.message || "Failed to set up data listeners");
        setLoading(false);
      }
    };

    setupListeners();
  }, [vendorId]);

  // Function to update vendor open/closed status
  const setIsOpen = async (newStatus: boolean) => {
    if (!vendorId) return;
    
    try {
      setUpdatingStatus(true);
      const vendorDocRef = doc(firestore, "vendors", vendorId);
      await updateDoc(vendorDocRef, {
        isOpen: newStatus,
        updatedAt: new Date(),
      });
      setIsOpenState(newStatus);
    } catch (err: any) {
      console.error("Error updating vendor status:", err);
      setError(err.message || "Failed to update vendor status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const remitDriverCash = async (transaction: VendorTransaction, signature: Blob) => {
    if (!vendorId) {
      throw new Error("Vendor ID is required to submit remittance.");
    }

    if (!transaction.driverId) {
      throw new Error("Driver ID is required to submit remittance.");
    }

    if (!transaction.driverTransactionId) {
      throw new Error("Linked driver transaction is missing.");
    }

    try {
      setError(null);
      setRemittingTransactionId(transaction.id);

      await remitCodPayment({
        driverId: transaction.driverId,
        driverTransactionId: transaction.driverTransactionId,
        vendorTransactionId: transaction.id,
        netAmount: Number(transaction.netAmount ?? 0),
        signature,
        actor: "vendor",
        vendorId,
      });
    } catch (err: any) {
      console.error("Error submitting vendor remittance:", err);
      setError(err.message || "Failed to submit remittance");
      throw err;
    } finally {
      setRemittingTransactionId(null);
    }
  };

  // Calculate derived values
  const totalOrders = orders.length;
  const payoutTotal = payouts.reduce((sum, payout) => sum + (payout.amount || 0), 0);
  const transactionTotal = transactions.reduce(
    (sum, transaction) => sum + (transaction.netAmount ? Number(transaction.netAmount) : 0),
    0
  );
  const totalEarnings = payoutTotal + transactionTotal;
  const activeProducts = products.length;

  return {
    orders,
    products,
    payouts,
    transactions,
    totalOrders,
    totalEarnings,
    activeProducts,
    loading,
    error,
    isOpen,
    setIsOpen,
    updatingStatus,
    remitDriverCash,
    remittingTransactionId,
  };
}

