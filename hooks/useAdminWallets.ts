"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  setDoc,
  serverTimestamp,
  increment,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { firestore } from "@/firebase/init";

export interface AdminWallet {
  id: string; // userId
  userId: string;
  userEmail?: string;
  balance: number;
  currency: string;
  updatedAt?: any;
  updatedBy?: string;
}

export interface WalletsHookResult {
  wallets: AdminWallet[];
  loading: boolean;
  error: string | null;
  adjustBalance: (
    walletId: string,
    amount: number,
    reason: string,
    updatedBy?: string
  ) => Promise<void>;
}

/**
 * Admin wallets hook
 * - Listens to wallets collection
 * - Provides adjustBalance to credit/debit a wallet
 */
export function useAdminWallets(): WalletsHookResult {
  const [wallets, setWallets] = useState<AdminWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const walletsRef = collection(firestore, "wallets");
    const walletsQuery = query(walletsRef, orderBy("updatedAt", "desc"));

    const unsubscribe = onSnapshot(
      walletsQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        try {
          const data = snapshot.docs.map((doc) => {
            const w = doc.data();
            return {
              id: doc.id,
              userId: doc.id,
              userEmail: w.userEmail || w.email || "",
              balance: w.balance ?? 0,
              currency: w.currency || "USD",
              updatedAt: w.updatedAt,
              updatedBy: w.updatedBy,
            } as AdminWallet;
          });
          setWallets(data);
          setLoading(false);
          setError(null);
        } catch (err: any) {
          console.error("Error processing wallets:", err);
          setError(err.message || "Failed to process wallets");
          setLoading(false);
        }
      },
      (err) => {
        console.error("Wallets snapshot error:", err);
        setError(err.message || "Failed to fetch wallets");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const adjustBalance = async (
    walletId: string,
    amount: number,
    reason: string,
    updatedBy?: string
  ) => {
    if (!walletId) throw new Error("walletId is required");
    if (!reason.trim()) throw new Error("Reason is required");
    if (!amount || Number.isNaN(amount)) throw new Error("Amount is required");

    const walletRef = doc(firestore, "wallets", walletId);
    await setDoc(
      walletRef,
      {
        balance: increment(amount),
        updatedAt: serverTimestamp(),
        updatedBy: updatedBy || "admin",
        lastAdjustment: {
          amount,
          reason,
          updatedAt: serverTimestamp(),
          updatedBy: updatedBy || "admin",
        },
      },
      { merge: true }
    );

    // Log wallet transaction
    const txRef = doc(collection(firestore, "walletTransactions"));
    await setDoc(txRef, {
      id: txRef.id,
      walletId,
      amount,
      reason,
      type: amount >= 0 ? "credit" : "debit",
      createdAt: serverTimestamp(),
      createdBy: updatedBy || "admin",
    });
  };

  return { wallets, loading, error, adjustBalance };
}

