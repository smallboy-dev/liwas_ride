"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  orderBy,
} from "firebase/firestore";
import { firestore } from "@/firebase/init";

export interface AdminTransaction {
  id: string;
  type: "vendor" | "driver";
  transactionType: string; // e.g., "cash-on-delivery", "online-payment"
  vendorId?: string;
  vendorName?: string;
  driverId?: string;
  driverName?: string;
  orderId: string;
  orderCode?: string;
  grossAmount: number;
  commissionAmount?: number;
  netAmount: number;
  status: string;
  paymentMethod?: string;
  createdAt: any;
  updatedAt?: any;
  remittedAt?: any;
  remittedBy?: string;
}

export interface AdminTransactionsHookResult {
  transactions: AdminTransaction[];
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to fetch all transactions (vendor + driver) for admin
 * Combines vendorTransactions and driverTransactions collections
 */
export function useAdminTransactions(): AdminTransactionsHookResult {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vendorTransactionsUnsubscribe: (() => void) | null = null;
    let driverTransactionsUnsubscribe: (() => void) | null = null;

    const fetchVendorTransactions = () => {
      try {
        const vendorTransactionsRef = collection(firestore, "vendorTransactions");
        const vendorTransactionsQuery = query(
          vendorTransactionsRef,
          orderBy("createdAt", "desc")
        );

        vendorTransactionsUnsubscribe = onSnapshot(
          vendorTransactionsQuery,
          (snapshot: QuerySnapshot<DocumentData>) => {
            try {
              const vendorTransactions = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                  id: doc.id,
                  type: "vendor" as const,
                  transactionType: data.type || "",
                  vendorId: data.vendorId,
                  vendorName: data.vendorName,
                  driverId: data.driverId,
                  driverName: data.driverName,
                  orderId: data.orderId || "",
                  orderCode: data.orderCode,
                  grossAmount: data.grossAmount || 0,
                  commissionAmount: data.commissionAmount,
                  netAmount: data.netAmount || 0,
                  status: data.status || "",
                  paymentMethod: data.paymentMethod,
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                  remittedAt: data.remittedAt,
                  remittedBy: data.remittedBy,
                } as AdminTransaction;
              });

              // Merge with existing driver transactions
              setTransactions((prev) => {
                const driverTxns = prev.filter((t) => t.type === "driver");
                const allTransactions = [...vendorTransactions, ...driverTxns];
                // Sort by createdAt descending
                return allTransactions.sort((a, b) => {
                  const aTime = a.createdAt?.toMillis?.() || a.createdAt?._seconds * 1000 || 0;
                  const bTime = b.createdAt?.toMillis?.() || b.createdAt?._seconds * 1000 || 0;
                  return bTime - aTime;
                });
              });
              setLoading(false);
              setError(null);
            } catch (err: any) {
              console.error("Error processing vendor transactions:", err);
              setError(err.message || "Failed to process vendor transactions");
              setLoading(false);
            }
          },
          (err) => {
            console.error("Vendor transactions snapshot error:", err);
            setError(err.message || "Failed to fetch vendor transactions");
            setLoading(false);
          }
        );
      } catch (err: any) {
        console.error("Error setting up vendor transactions listener:", err);
        setError(err.message || "Failed to initialize vendor transactions fetching");
        setLoading(false);
      }
    };

    const fetchDriverTransactions = () => {
      try {
        const driverTransactionsRef = collection(firestore, "driverTransactions");
        const driverTransactionsQuery = query(
          driverTransactionsRef,
          orderBy("createdAt", "desc")
        );

        driverTransactionsUnsubscribe = onSnapshot(
          driverTransactionsQuery,
          (snapshot: QuerySnapshot<DocumentData>) => {
            try {
              const driverTransactions = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                  id: doc.id,
                  type: "driver" as const,
                  transactionType: data.type || "",
                  vendorId: data.vendorId,
                  vendorName: data.vendorName,
                  driverId: data.driverId,
                  driverName: data.driverName,
                  orderId: data.orderId || "",
                  orderCode: data.orderCode,
                  grossAmount: data.grossAmount || 0,
                  commissionAmount: data.commissionAmount,
                  netAmount: data.netAmount || 0,
                  status: data.status || "",
                  paymentMethod: data.paymentMethod,
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                  remittedAt: data.remittedAt,
                  remittedBy: data.remittedBy,
                } as AdminTransaction;
              });

              // Merge with existing vendor transactions
              setTransactions((prev) => {
                const vendorTxns = prev.filter((t) => t.type === "vendor");
                const allTransactions = [...vendorTxns, ...driverTransactions];
                // Sort by createdAt descending
                return allTransactions.sort((a, b) => {
                  const aTime = a.createdAt?.toMillis?.() || a.createdAt?._seconds * 1000 || 0;
                  const bTime = b.createdAt?.toMillis?.() || b.createdAt?._seconds * 1000 || 0;
                  return bTime - aTime;
                });
              });
              setLoading(false);
              setError(null);
            } catch (err: any) {
              console.error("Error processing driver transactions:", err);
              setError(err.message || "Failed to process driver transactions");
              setLoading(false);
            }
          },
          (err) => {
            console.error("Driver transactions snapshot error:", err);
            setError(err.message || "Failed to fetch driver transactions");
            setLoading(false);
          }
        );
      } catch (err: any) {
        console.error("Error setting up driver transactions listener:", err);
        setError(err.message || "Failed to initialize driver transactions fetching");
        setLoading(false);
      }
    };

    // Initialize both listeners
    fetchVendorTransactions();
    fetchDriverTransactions();

    // Cleanup function
    return () => {
      if (vendorTransactionsUnsubscribe) vendorTransactionsUnsubscribe();
      if (driverTransactionsUnsubscribe) driverTransactionsUnsubscribe();
    };
  }, []);

  return { transactions, loading, error };
}

