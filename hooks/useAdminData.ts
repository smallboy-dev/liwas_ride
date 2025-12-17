"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, doc, getDoc, onSnapshot, QuerySnapshot, DocumentData } from "firebase/firestore";
import { firestore } from "@/firebase/init";

// Types based on Firestore schema
export interface VendorData {
  id: string; // Document ID
  userId: string;
  businessName: string;
  vendorType: string;
  phone: string;
  documents?: any[];
  personalInfo?: any;
  createdAt?: any;
  // Merged from users collection
  email?: string;
  isApproved?: boolean;
  role?: string;
  // Stripe Connect
  stripeAccountId?: string;
}

export interface DriverData {
  id: string; // Document ID
  userId: string;
  name: string;
  driverType: string;
  phone: string;
  documents?: any[];
  personalInfo?: any;
  createdAt?: any;
  // Merged from users collection
  email?: string;
  isApproved?: boolean;
  role?: string;
}

export interface UserData {
  id: string; // Document ID (userId)
  email?: string;
  uid: string;
  role?: string;
  isApproved?: boolean;
  createdAt?: any;
}

export interface AdminDataHookResult {
  vendors: VendorData[];
  drivers: DriverData[];
  users: UserData[];
  totalUsers: number;
  loading: boolean;
  error: string | null;
}

/**
 * Custom hook to fetch and merge vendor/driver data with user information
 * Uses real-time listeners for live updates
 */
export function useAdminData(): AdminDataHookResult {
  const [vendors, setVendors] = useState<VendorData[]>([]);
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vendorsUnsubscribe: (() => void) | null = null;
    let driversUnsubscribe: (() => void) | null = null;
    let usersUnsubscribe: (() => void) | null = null;

    const fetchVendors = async () => {
      try {
        const vendorsRef = collection(firestore, "vendors");
        
        // Set up real-time listener for vendors
        vendorsUnsubscribe = onSnapshot(
          vendorsRef,
          async (snapshot: QuerySnapshot<DocumentData>) => {
            try {
              const vendorPromises = snapshot.docs.map(async (vendorDoc) => {
                const vendorData = vendorDoc.data();
                const vendorId = vendorDoc.id;

                // Fetch corresponding user document
                let userData: any = null;
                try {
                  const userDocRef = doc(firestore, "users", vendorData.userId);
                  const userDocSnap = await getDoc(userDocRef);
                  if (userDocSnap.exists()) {
                    userData = userDocSnap.data();
                  }
                } catch (userError) {
                  console.error(`Error fetching user data for vendor ${vendorId}:`, userError);
                }

                // Merge vendor data with user data
                return {
                  id: vendorId,
                  ...vendorData,
                  email: userData?.email || "N/A",
                  isApproved: userData?.isApproved ?? false,
                  role: userData?.role || "vendor",
                } as VendorData;
              });

              const vendorsWithUserData = await Promise.all(vendorPromises);
              setVendors(vendorsWithUserData);
              setLoading(false);
              setError(null);
            } catch (err: any) {
              console.error("Error processing vendor data:", err);
              setError(err.message || "Failed to process vendor data");
              setLoading(false);
            }
          },
          (err) => {
            console.error("Vendor snapshot error:", err);
            setError(err.message || "Failed to fetch vendors");
            setLoading(false);
          }
        );
      } catch (err: any) {
        console.error("Error setting up vendor listener:", err);
        setError(err.message || "Failed to initialize vendor data fetching");
        setLoading(false);
      }
    };

    const fetchDrivers = async () => {
      try {
        const driversRef = collection(firestore, "drivers");
        
        // Set up real-time listener for drivers
        driversUnsubscribe = onSnapshot(
          driversRef,
          async (snapshot: QuerySnapshot<DocumentData>) => {
            try {
              const driverPromises = snapshot.docs.map(async (driverDoc) => {
                const driverData = driverDoc.data();
                const driverId = driverDoc.id;

                // Fetch corresponding user document
                let userData: any = null;
                try {
                  const userDocRef = doc(firestore, "users", driverData.userId);
                  const userDocSnap = await getDoc(userDocRef);
                  if (userDocSnap.exists()) {
                    userData = userDocSnap.data();
                  }
                } catch (userError) {
                  console.error(`Error fetching user data for driver ${driverId}:`, userError);
                }

                // Merge driver data with user data
                return {
                  id: driverId,
                  ...driverData,
                  email: userData?.email || "N/A",
                  isApproved: userData?.isApproved ?? false,
                  role: userData?.role || "driver",
                } as DriverData;
              });

              const driversWithUserData = await Promise.all(driverPromises);
              setDrivers(driversWithUserData);
              setLoading(false);
              setError(null);
            } catch (err: any) {
              console.error("Error processing driver data:", err);
              setError(err.message || "Failed to process driver data");
              setLoading(false);
            }
          },
          (err) => {
            console.error("Driver snapshot error:", err);
            setError(err.message || "Failed to fetch drivers");
            setLoading(false);
          }
        );
      } catch (err: any) {
        console.error("Error setting up driver listener:", err);
        setError(err.message || "Failed to initialize driver data fetching");
        setLoading(false);
      }
    };

    const fetchUsers = async () => {
      try {
        const usersRef = collection(firestore, "users");

        // Set up real-time listener for users
        usersUnsubscribe = onSnapshot(
          usersRef,
          (snapshot: QuerySnapshot<DocumentData>) => {
            try {
              // Get all users with their data
              const usersData = snapshot.docs.map((userDoc) => {
                const userData = userDoc.data();
                return {
                  id: userDoc.id,
                  ...userData,
                } as UserData;
              });

              setUsers(usersData);
              setTotalUsers(snapshot.size);
              setLoading(false);
              setError(null);
            } catch (err: any) {
              console.error("Error processing users data:", err);
              setError(err.message || "Failed to process users data");
              setLoading(false);
            }
          },
          (err) => {
            console.error("Users snapshot error:", err);
            setError(err.message || "Failed to fetch users");
            setLoading(false);
          }
        );
      } catch (err: any) {
        console.error("Error setting up users listener:", err);
        setError(err.message || "Failed to initialize users fetching");   
        setLoading(false);
      }
    };

    // Initialize all listeners
    fetchVendors();
    fetchDrivers();
    fetchUsers();

    // Cleanup function to unsubscribe from listeners
    return () => {
      if (vendorsUnsubscribe) vendorsUnsubscribe();
      if (driversUnsubscribe) driversUnsubscribe();
      if (usersUnsubscribe) usersUnsubscribe();
    };
  }, []);

  return { vendors, drivers, users, totalUsers, loading, error };
}

