"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc,
  type DocumentData,
} from "firebase/firestore";
import { firestore } from "@/firebase/init";

export interface AvailableOrder {
  id: string;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  vendorId?: string;
  vendorName?: string;
  orderStatus?: string;
  totalAmount?: number;
  deliveryFee?: number;
  deliveryAddress?: any;
  pickupLocation?: any;
  pickupOrder?: boolean;
  paymentMethod?: string;
  createdAt?: any;
  availableAt?: any;
  readyAt?: any;
  driverStatus?: string;
  products?: Array<{
    productId: string;
    productName: string;
    quantity: number;
  }>;
}

export interface UseAvailableOrdersResult {
  orders: AvailableOrder[];
  loading: boolean;
  error: string | null;
  acceptOrder: (orderId: string, driverId: string) => Promise<void>;
  acceptingOrderId: string | null;
}

/**
 * Hook to fetch and manage available orders for drivers
 * Orders with status "available" (no assigned driver)
 */
export function useAvailableOrders(): UseAvailableOrdersResult {
  const [orders, setOrders] = useState<AvailableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptingOrderId, setAcceptingOrderId] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const setupOrdersListener = async () => {
      try {
        console.log("Setting up ready-for-pickup orders listener...");

        // Query for orders with status "ready" (vendor has marked ready for pickup)
        const ordersRef = collection(firestore, "orders");
        const availableOrdersQuery = query(ordersRef, where("orderStatus", "==", "ready"));

        unsubscribe = onSnapshot(
          availableOrdersQuery,
          async (snapshot) => {
            try {
              console.log(`Found ${snapshot.docs.length} ready-for-pickup orders`);

              const availableOrders = await Promise.all(
                snapshot.docs.map(async (orderDoc) => {
                  const orderData = orderDoc.data();

                  // Get vendor information
                  let vendorName = "Unknown Vendor";
                  if (orderData.vendorId) {
                    try {
                      const vendorDoc = await getDoc(doc(firestore, "vendors", orderData.vendorId));
                      if (vendorDoc.exists()) {
                        vendorName = vendorDoc.data()?.businessName || "Unknown Vendor";
                      }
                    } catch (err) {
                      console.error("Error fetching vendor info:", err);
                    }
                  }

                  return {
                    id: orderDoc.id,
                    customerId: orderData.customerId,
                    customerName: orderData.customerName,
                    customerEmail: orderData.customerEmail,
                    vendorId: orderData.vendorId,
                    vendorName,
                    orderStatus: orderData.orderStatus ?? orderData.status ?? "pending",
                    totalAmount: orderData.totalAmount,
                    deliveryFee: orderData.deliveryFee,
                    deliveryAddress: orderData.deliveryAddress,
                    pickupLocation: orderData.pickupLocation,
                    pickupOrder: orderData.pickupOrder,
                    paymentMethod: orderData.paymentMethod,
                    createdAt: orderData.createdAt,
                    availableAt: orderData.availableAt,
                    readyAt: orderData.readyAt,
                    driverStatus: orderData.driverStatus,
                    products: orderData.products,
                  } as AvailableOrder;
                })
              );

              // Sort by creation time (newest first)
              availableOrders.sort((a, b) => {
                const safeTime = (value: any) =>
                  value?.toMillis?.() ||
                  (typeof value === "string" || typeof value === "number"
                    ? new Date(value).getTime()
                    : undefined);

                const aTime = safeTime(a.availableAt) ?? safeTime(a.readyAt) ?? safeTime(a.createdAt) ?? 0;
                const bTime = safeTime(b.availableAt) ?? safeTime(b.readyAt) ?? safeTime(b.createdAt) ?? 0;
                return bTime - aTime;
              });

              setOrders(availableOrders);
              setLoading(false);
              setError(null);
            } catch (err: any) {
              console.error("Error processing available orders:", err);
              setError(err.message || "Failed to process available orders");
              setLoading(false);
            }
          },
          (err: any) => {
            console.error("Available orders snapshot error:", err);
            setError(err.message || "Failed to fetch available orders");
            setLoading(false);
          }
        );
      } catch (err: any) {
        console.error("Error setting up available orders listener:", err);
        setError(err.message || "Failed to initialize available orders");
        setLoading(false);
      }
    };

    setupOrdersListener();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const acceptOrder = async (orderId: string, driverId: string) => {
    try {
      setAcceptingOrderId(orderId);
      console.log(`Driver ${driverId} accepting order ${orderId}`);

      // Update order with driver assignment
      const orderRef = doc(firestore, "orders", orderId);

      // Get driver name for the order
      let driverName = "Unknown Driver";
      try {
        const driverDoc = await getDoc(doc(firestore, "drivers", driverId));
        if (driverDoc.exists()) {
          const driverData = driverDoc.data();
          driverName = driverData?.name || "Unknown Driver";
        }

        // Set driver status to busy immediately
        await updateDoc(doc(firestore, "drivers", driverId), {
          status: "busy",
          updatedAt: new Date(),
        });
      } catch (err) {
        console.error("Error fetching driver info:", err);
      }

      await updateDoc(orderRef, {
        driverId,
        driverName,
        orderStatus: "assigned",
        status: "assigned",
        driverStatus: "awaiting-pickup",
        assignedAt: serverTimestamp(),
        driverAcceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log(`Order ${orderId} successfully assigned to driver ${driverId}`);

      // The order will automatically be removed from available orders list
      // due to the status change from "available" to "assigned"

    } catch (err: any) {
      console.error("Error accepting order:", err);
      setError(err.message || "Failed to accept order");
      throw err;
    } finally {
      setAcceptingOrderId(null);
    }
  };

  return {
    orders,
    loading,
    error,
    acceptOrder,
    acceptingOrderId,
  };
}
