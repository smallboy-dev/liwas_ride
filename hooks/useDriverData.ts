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
  serverTimestamp,
  addDoc,
  increment,
  getDoc,
  orderBy,
} from "firebase/firestore";
import { firestore, storage } from "@/firebase/init";
import { remitCodPayment } from "@/lib/remittance";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export type DriverStatus = "available" | "busy" | "inactive";

export interface DriverOrder {
  id: string;
  customerId: string;
  customerName?: string | null;
  customerEmail?: string | null;
  vendorId: string;
  vendorName?: string | null;
  driverId: string;
  driverName?: string | null;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
  driverStatus?: string | null;
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
}

export interface DriverPayout {
  id: string; // Document ID
  driverId: string;
  amount: number;
  status?: string;
  paymentMethod?: string;
  transactionId?: string;
  createdAt?: any;
}

export interface DriverTransaction {
  id: string;
  driverId: string;
  vendorId?: string | null;
  vendorName?: string | null;
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
}

export interface DriverDataHookResult {
  activeDeliveries: DriverOrder[];
  deliveryHistory: DriverOrder[];
  payouts: DriverPayout[];
  transactions: DriverTransaction[];
  totalActiveDeliveries: number;
  totalEarnings: number;
  totalDeliveryHistory: number;
  cashOnHand: number;
  totalCodCollected: number;
  pendingCodRemittance: number;
  loading: boolean;
  error: string | null;
  driverStatus: DriverStatus;
  setDriverStatus: (status: DriverStatus) => Promise<void>;
  updatingStatus: boolean;
  markDeliveryPickedUp: (orderId: string) => Promise<void>;
  remitCash: (transaction: DriverTransaction, signature: Blob) => Promise<void>;
  completeDelivery: (orderId: string, signature: Blob) => Promise<void>;
}

/**
 * Custom hook to fetch driver-specific data (active deliveries, history, payouts)
 * Uses real-time listeners for live updates
 * @param driverId - The driver's user ID (from auth.uid)
 */
export function useDriverData(driverId: string | null): DriverDataHookResult {
  const [activeDeliveries, setActiveDeliveries] = useState<DriverOrder[]>([]);
  const [deliveryHistory, setDeliveryHistory] = useState<DriverOrder[]>([]);
  const [payouts, setPayouts] = useState<DriverPayout[]>([]);
  const [transactions, setTransactions] = useState<DriverTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driverStatus, setDriverStatusState] = useState<DriverStatus>("available");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [cashOnHand, setCashOnHand] = useState<number>(0);

  useEffect(() => {
    if (!driverId) {
      setLoading(false);
      return;
    }

    let activeDeliveriesUnsubscribe: (() => void) | null = null;
    let deliveryHistoryUnsubscribe: (() => void) | null = null;
    let payoutsUnsubscribe: (() => void) | null = null;
    let transactionsUnsubscribe: (() => void) | null = null;
    let driverDocUnsubscribe: (() => void) | null = null;

    const setupListeners = () => {
      try {
        // Set up real-time listener for active deliveries (assigned or in-transit)
        const activeDeliveriesQuery = query(
          collection(firestore, "orders"),
          where("driverId", "==", driverId),
          where("orderStatus", "in", ["assigned", "enroute", "in-transit"])
        );

        // Set up real-time listener for driver transactions
        const transactionsQuery = query(
          collection(firestore, "driverTransactions"),
          where("driverId", "==", driverId),
          orderBy("createdAt", "desc")
        );

        transactionsUnsubscribe = onSnapshot(
          transactionsQuery,
          (snapshot: QuerySnapshot<DocumentData>) => {
            try {
              const transactionsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Record<string, unknown>),
              })) as DriverTransaction[];
              setTransactions(transactionsData);
            } catch (err: any) {
              console.error("Error processing driver transactions:", err);
              setError(err.message || "Failed to process driver transactions");
            }
          },
          (err) => {
            console.error("Driver transactions snapshot error:", err);
            setError(err.message || "Failed to fetch driver transactions");
          }
        );

        // Listen for driver document changes (status, cash on hand, etc.)
        const driverDocRef = doc(firestore, "drivers", driverId);
        driverDocUnsubscribe = onSnapshot(
          driverDocRef,
          (snapshot) => {
            if (!snapshot.exists()) return;
            const driverData = snapshot.data();
            if (driverData.status && driverData.status !== driverStatus) {
              setDriverStatusState(driverData.status as DriverStatus);
            }
            setCashOnHand(Number(driverData.cashOnHand ?? 0));
          },
          (err) => {
            console.error("Driver document snapshot error:", err);
          }
        );

        activeDeliveriesUnsubscribe = onSnapshot(
          activeDeliveriesQuery,
          (snapshot: QuerySnapshot<DocumentData>) => {
            try {
              const deliveriesData = snapshot.docs.map((doc) => {
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
                  driverId: (data.driverId ?? "") as string,
                  driverName:
                    (data.driverName ?? data.driver?.name ?? data.assignedDriverName ?? null) as
                      | string
                      | null,
                  totalAmount: Number(data.totalAmount ?? data.total ?? 0),
                  paymentStatus: (data.paymentStatus ?? data.payment?.status ?? "unknown") as string,
                  orderStatus: (data.orderStatus ?? data.status ?? "pending") as string,
                  driverStatus: (data.driverStatus ?? null) as string | null,
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
                } satisfies DriverOrder;
              });
              setActiveDeliveries(deliveriesData);
            } catch (err: any) {
              console.error("Error processing active deliveries data:", err);
              setError(err.message || "Failed to process active deliveries data");
            }
          },
          (err) => {
            console.error("Active deliveries snapshot error:", err);
            setError(err.message || "Failed to fetch active deliveries");
          }
        );

        // Set up real-time listener for delivery history (delivered)
        const deliveryHistoryQuery = query(
          collection(firestore, "orders"),
          where("driverId", "==", driverId),
          where("orderStatus", "==", "delivered")
        );

        deliveryHistoryUnsubscribe = onSnapshot(
          deliveryHistoryQuery,
          (snapshot: QuerySnapshot<DocumentData>) => {
            try {
              const historyData = snapshot.docs.map((doc) => {
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
                  driverId: (data.driverId ?? "") as string,
                  driverName:
                    (data.driverName ?? data.driver?.name ?? data.assignedDriverName ?? null) as
                      | string
                      | null,
                  totalAmount: Number(data.totalAmount ?? data.total ?? 0),
                  paymentStatus: (data.paymentStatus ?? data.payment?.status ?? "unknown") as string,
                  orderStatus: (data.orderStatus ?? data.status ?? "pending") as string,
                  driverStatus: (data.driverStatus ?? null) as string | null,
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
                  proofOfDeliverySignatureUrl: (data.proofOfDeliverySignatureUrl ?? null) as
                    | string
                    | null,
                  proofOfDeliverySignaturePath: (data.proofOfDeliverySignaturePath ?? null) as
                    | string
                    | null,
                } satisfies DriverOrder;
              });
              setDeliveryHistory(historyData);
            } catch (err: any) {
              console.error("Error processing delivery history data:", err);
              setError(err.message || "Failed to process delivery history data");
            }
          },
          (err) => {
            console.error("Delivery history snapshot error:", err);
            setError(err.message || "Failed to fetch delivery history");
          }
        );

        // Set up real-time listener for payouts
        const payoutsQuery = query(
          collection(firestore, "payouts"),
          where("driverId", "==", driverId)
        );

        payoutsUnsubscribe = onSnapshot(
          payoutsQuery,
          (snapshot: QuerySnapshot<DocumentData>) => {
            try {
              const payoutsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              })) as DriverPayout[];
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

        // Listen for order status changes to auto-update driver status
        const ordersRef = collection(firestore, "orders");
        const driverOrdersQuery = query(
          ordersRef,
          where("driverId", "==", driverId),
          where("orderStatus", "in", ["assigned", "preparing", "ready", "enroute", "in-transit", "delivered"])
        );

        const ordersUnsubscribe = onSnapshot(
          driverOrdersQuery,
          async (ordersSnapshot) => {
            try {
              console.log(`Driver ${driverId} has ${ordersSnapshot.docs.length} active orders`);

              // Check if driver has any active orders (not delivered)
              const hasActiveOrders = ordersSnapshot.docs.some((orderDoc) => {
                const orderData = orderDoc.data();
                return (
                  orderData.orderStatus !== "delivered" &&
                  orderData.orderStatus !== "cancelled" &&
                  orderData.orderStatus !== "failed"
                );
              });

              // Auto-update driver status based on active orders
              const newStatus = hasActiveOrders ? "busy" : "available";

              // Only update if status has changed
              if (newStatus !== driverStatus) {
                console.log(`Auto-updating driver ${driverId} status from ${driverStatus} to ${newStatus}`);
                setDriverStatusState(newStatus);

                // Update driver document
                const driverDocRef = doc(firestore, "drivers", driverId);
                await updateDoc(driverDocRef, {
                  status: newStatus,
                  updatedAt: new Date(),
                });
              }
            } catch (err: any) {
              console.error("Error processing driver orders:", err);
            }
          },
          (err) => {
            console.error("Driver orders snapshot error:", err);
          }
        );

        setLoading(false);
        setError(null);

        // Return cleanup function including all listeners
        return () => {
          if (activeDeliveriesUnsubscribe) activeDeliveriesUnsubscribe();
          if (deliveryHistoryUnsubscribe) deliveryHistoryUnsubscribe();
          if (payoutsUnsubscribe) payoutsUnsubscribe();
          if (transactionsUnsubscribe) transactionsUnsubscribe();
          if (driverDocUnsubscribe) driverDocUnsubscribe();
          if (ordersUnsubscribe) ordersUnsubscribe();
        };
      } catch (err: any) {
        console.error("Error setting up listeners:", err);
        setError(err.message || "Failed to set up data listeners");
        setLoading(false);
      }
    };

    setupListeners();
  }, [driverId]);

  // Function to update driver status
  const setDriverStatus = async (newStatus: DriverStatus) => {
    if (!driverId) return;

    try {
      setUpdatingStatus(true);
      const driverDocRef = doc(firestore, "drivers", driverId);
      await updateDoc(driverDocRef, {
        status: newStatus,
        updatedAt: new Date(),
      });
      setDriverStatusState(newStatus);
    } catch (err: any) {
      console.error("Error updating driver status:", err);
      setError(err.message || "Failed to update driver status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const markDeliveryPickedUp = async (orderId: string) => {
    if (!driverId) {
      throw new Error("Driver ID is required to update pickup status.");
    }

    try {
      setError(null);

      const orderRef = doc(firestore, "orders", orderId);

      await updateDoc(orderRef, {
        orderStatus: "enroute",
        status: "enroute",
        driverStatus: "enroute",
        pickedUpAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        driverId,
      });
    } catch (err: any) {
      console.error("Error marking order as picked up:", err);
      setError(err.message || "Failed to update pickup status");
      throw err;
    }
  };

  const remitCash = async (transaction: DriverTransaction, signature: Blob) => {
    if (!driverId) {
      throw new Error("Driver ID is required to remit cash.");
    }

    if (transaction.type !== "cash-on-delivery") {
      throw new Error("Only cash-on-delivery transactions can be remitted.");
    }

    if (!transaction.id) {
      throw new Error("Transaction ID is required to remit cash.");
    }

    try {
      setError(null);

      await remitCodPayment({
        driverId,
        driverTransactionId: transaction.id,
        vendorTransactionId: transaction.vendorTransactionId ?? null,
        netAmount: Number(transaction.netAmount ?? 0),
        signature,
        orderId: transaction.orderId,
      });
    } catch (err: any) {
      console.error("Error remitting cash:", err);
      setError(err.message || "Failed to remit cash");
      throw err;
    }
  };

  const completeDelivery = async (orderId: string, signature: Blob) => {
    if (!driverId) {
      throw new Error("Driver ID is required to complete a delivery.");
    }

    try {
      setError(null);

      const signaturePath = `drivers/${driverId}/orders/${orderId}/signature-${Date.now()}.png`;
      const signatureRef = ref(storage, signaturePath);
      await uploadBytes(signatureRef, signature, {
        contentType: "image/png",
      });

      const signatureUrl = await getDownloadURL(signatureRef);

      const orderRef = doc(firestore, "orders", orderId);
      const orderSnapshot = await getDoc(orderRef);

      if (!orderSnapshot.exists()) {
        throw new Error("Order not found.");
      }

      const orderData = orderSnapshot.data();
      const paymentMethodRaw =
        (orderData.paymentMethod ?? orderData.payment?.method ?? orderData.paymentStatus ?? "") as string;
      const paymentMethod = paymentMethodRaw.toString().toLowerCase();
      const vendorId = (orderData.vendorId ?? null) as string | null;
      const vendorName = (orderData.vendorName ?? null) as string | null;
      const driverName = (orderData.driverName ?? orderData.driver?.name ?? null) as string | null;
      const orderCode =
        (orderData.code ?? orderData.orderCode ?? orderData.reference ?? orderData.legacyCode ?? null) ?? null;
      const totalAmount = Number(orderData.totalAmount ?? orderData.total ?? 0);
      const commissionAmount = Number(orderData.commissionFee ?? orderData.platformFee ?? 0);
      const netAmount = Math.max(totalAmount - commissionAmount, 0);

      const updatePayload: Record<string, unknown> = {
        orderStatus: "delivered",
        driverStatus: "delivered",
        status: "delivered",
        deliveredAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        proofOfDeliverySignatureUrl: signatureUrl,
        proofOfDeliverySignaturePath: signaturePath,
        driverId,
        vendorId,
      };

      if (paymentMethod === "cash-on-delivery") {
        updatePayload.paymentStatus = "paid";
        updatePayload.codCollectedAmount = netAmount;
        updatePayload.codCommissionAmount = commissionAmount;
        updatePayload.codCollectedAt = serverTimestamp();
      }

      try {
        await updateDoc(orderRef, updatePayload);
      } catch (orderUpdateError) {
        console.error("Failed to update order document while completing delivery", orderUpdateError);
        throw orderUpdateError;
      }

      const driverDocRef = doc(firestore, "drivers", driverId);

      if (paymentMethod === "cash-on-delivery" && vendorId) {
        const timestamp = serverTimestamp();

        const driverTransaction = {
          driverId,
          vendorId,
          vendorName,
          orderId,
          orderCode,
          type: "cash-on-delivery",
          paymentMethod: paymentMethod,
          grossAmount: totalAmount,
          commissionAmount,
          netAmount,
          status: "pending-remittance",
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        const vendorTransaction = {
          vendorId,
          driverId,
          driverName,
          orderId,
          orderCode,
          type: "cash-on-delivery",
          paymentMethod: paymentMethod,
          grossAmount: totalAmount,
          commissionAmount,
          netAmount,
          status: "awaiting-remittance",
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        let driverTransactionRef;
        try {
          driverTransactionRef = await addDoc(collection(firestore, "driverTransactions"), driverTransaction);
        } catch (driverTxnError) {
          console.error("Failed to create driver COD transaction document", driverTxnError);
          throw driverTxnError;
        }

        let vendorTransactionRef;
        try {
          vendorTransactionRef = await addDoc(collection(firestore, "vendorTransactions"), vendorTransaction);
        } catch (vendorTxnError) {
          console.error("Failed to create vendor COD transaction document", vendorTxnError);
          throw vendorTxnError;
        }

        if (driverTransactionRef && vendorTransactionRef) {
          try {
            const crossLinkPayload = {
              vendorTransactionId: vendorTransactionRef.id,
              updatedAt: timestamp,
            } as Record<string, unknown>;
            await updateDoc(driverTransactionRef, crossLinkPayload);
          } catch (crossLinkError) {
            console.error("Failed to link driver transaction with vendor transaction", crossLinkError);
          }

          try {
            const vendorLinkPayload = {
              driverTransactionId: driverTransactionRef.id,
              updatedAt: timestamp,
            } as Record<string, unknown>;
            await updateDoc(vendorTransactionRef, vendorLinkPayload);
          } catch (vendorLinkError) {
            console.error("Failed to link vendor transaction with driver transaction", vendorLinkError);
          }
        }

        try {
          await updateDoc(driverDocRef, {
            status: "available",
            updatedAt: new Date(),
            cashOnHand: increment(netAmount),
          });
        } catch (driverUpdateError) {
          console.error("Failed to update driver document after COD delivery", driverUpdateError);
          throw driverUpdateError;
        }
      } else {
        try {
          await updateDoc(driverDocRef, {
            status: "available",
            updatedAt: new Date(),
          });
        } catch (driverUpdateError) {
          console.error("Failed to update driver document after delivery", driverUpdateError);
          throw driverUpdateError;
        }
      }
    } catch (err: any) {
      console.error("Error completing delivery:", err);
      setError(err.message || "Failed to complete delivery");
      throw err;
    }
  };

  // Calculate derived values
  const totalActiveDeliveries = activeDeliveries.length;
  const totalEarnings = payouts.reduce((sum, payout) => sum + (payout.amount || 0), 0);
  const totalDeliveryHistory = deliveryHistory.length;
  const totalCodCollected = transactions.reduce((sum, transaction) => {
    if (transaction.type !== "cash-on-delivery") return sum;
    return transaction.netAmount ? sum + Number(transaction.netAmount) : sum;
  }, 0);
  const pendingCodRemittance = transactions.reduce((sum, transaction) => {
    if (transaction.type !== "cash-on-delivery") return sum;
    if (transaction.status === "remitted" || transaction.status === "reconciled") return sum;
    return transaction.netAmount ? sum + Number(transaction.netAmount) : sum;
  }, 0);

  return {
    activeDeliveries,
    deliveryHistory,
    payouts,
    transactions,
    totalActiveDeliveries,
    totalEarnings,
    totalDeliveryHistory,
    cashOnHand,
    totalCodCollected,
    pendingCodRemittance,
    loading,
    error,
    driverStatus,
    setDriverStatus,
    updatingStatus,
    markDeliveryPickedUp,
    remitCash,
    completeDelivery,
  };
}
