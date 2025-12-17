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
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { firestore } from "@/firebase/init";

export type NotificationType = "vendor_registration" | "driver_registration";
export type NotificationStatus = "unread" | "read" | "actioned";

export interface AdminNotification {
  id: string;
  type: NotificationType;
  userId: string;
  userName?: string;
  userEmail?: string;
  status: NotificationStatus;
  data?: {
    businessName?: string;
    vendorType?: string;
    driverType?: string;
    name?: string;
    phone?: string;
    documents?: any[];
    personalInfo?: any;
  };
  createdAt?: any;
  actionedAt?: any;
  actionedBy?: string;
  action?: "approved" | "rejected" | "deleted";
}

export interface AdminNotificationsHookResult {
  notifications: AdminNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  approveRegistration: (notificationId: string, userId: string, role: "vendor" | "driver") => Promise<void>;
  rejectRegistration: (notificationId: string, userId: string, role: "vendor" | "driver") => Promise<void>;
  deleteRegistration: (notificationId: string, userId: string, role: "vendor" | "driver") => Promise<void>;
}

/**
 * Custom hook to fetch and manage admin notifications
 * Listens for pending vendor and driver registrations (isApproved: false)
 */
export function useAdminNotifications(): AdminNotificationsHookResult {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vendorUnsubscribe: (() => void) | null = null;
    let driverUnsubscribe: (() => void) | null = null;

    const setupListeners = async () => {
      try {
        console.log("Setting up notification listeners for pending registrations...");

        let vendorNotificationsList: AdminNotification[] = [];
        let driverNotificationsList: AdminNotification[] = [];

        const updateNotifications = () => {
          const allNotifications = [...vendorNotificationsList, ...driverNotificationsList];
          console.log(`Total pending notifications: ${allNotifications.length}`);
          setNotifications(allNotifications);
          setLoading(false);
          setError(null);
        };

        // Query for all vendors, then filter by user approval status
        const vendorsRef = collection(firestore, "vendors");

        vendorUnsubscribe = onSnapshot(
          vendorsRef,
          async (vendorSnapshot: QuerySnapshot<DocumentData>) => {
            try {
              const vendorNotifications = await Promise.all(
                vendorSnapshot.docs.map(async (vendorDoc) => {
                  const vendorData = vendorDoc.data();

                  // Fetch user info from users collection to check approval status
                  let userInfo: any = null;
                  try {
                    const userDocRef = doc(firestore, "users", vendorDoc.id);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                      userInfo = userDocSnap.data();
                    }
                  } catch (err) {
                    console.error("Error fetching vendor user info:", err);
                  }

                  // Only include unapproved vendors
                  if (userInfo?.isApproved === true) {
                    return null;
                  }

                  return {
                    id: vendorDoc.id,
                    type: "vendor_registration" as NotificationType,
                    userId: vendorDoc.id,
                    userName: userInfo?.displayName || vendorData.businessName || "N/A",
                    userEmail: userInfo?.email || "N/A",
                    status: "unread" as NotificationStatus,
                    data: {
                      businessName: vendorData.businessName,
                      vendorType: vendorData.vendorType,
                      phone: vendorData.phone,
                      documents: vendorData.documents,
                      personalInfo: vendorData.personalInfo,
                    },
                    createdAt: vendorData.createdAt,
                  } as AdminNotification;
                })
              );

              // Filter out null values (approved vendors)
              vendorNotificationsList = vendorNotifications.filter((n) => n !== null) as AdminNotification[];
              console.log(`Found ${vendorNotificationsList.length} pending vendors`);
              updateNotifications();
            } catch (err: any) {
              console.error("Error processing vendor notifications:", err);
              setError(err.message || "Failed to process vendor notifications");
              setLoading(false);
            }
          },
          (err: any) => {
            console.error("Vendor notifications snapshot error:", err);
            setError(err.message || "Failed to fetch vendor notifications");
            setLoading(false);
          }
        );

        // Query for all drivers, then filter by user approval status
        const driversRef = collection(firestore, "drivers");

        driverUnsubscribe = onSnapshot(
          driversRef,
          async (driverSnapshot: QuerySnapshot<DocumentData>) => {
            try {
              const driverNotifications = await Promise.all(
                driverSnapshot.docs.map(async (driverDoc) => {
                  const driverData = driverDoc.data();

                  // Fetch user info from users collection to check approval status
                  let userInfo: any = null;
                  try {
                    const userDocRef = doc(firestore, "users", driverDoc.id);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                      userInfo = userDocSnap.data();
                    }
                  } catch (err) {
                    console.error("Error fetching driver user info:", err);
                  }

                  // Only include unapproved drivers
                  if (userInfo?.isApproved === true) {
                    return null;
                  }

                  return {
                    id: driverDoc.id,
                    type: "driver_registration" as NotificationType,
                    userId: driverDoc.id,
                    userName: userInfo?.displayName || driverData.name || "N/A",
                    userEmail: userInfo?.email || "N/A",
                    status: "unread" as NotificationStatus,
                    data: {
                      name: driverData.name,
                      driverType: driverData.driverType,
                      phone: driverData.phone,
                      documents: driverData.documents,
                      personalInfo: driverData.personalInfo,
                    },
                    createdAt: driverData.createdAt,
                  } as AdminNotification;
                })
              );

              // Filter out null values (approved drivers)
              driverNotificationsList = driverNotifications.filter((n) => n !== null) as AdminNotification[];
              console.log(`Found ${driverNotificationsList.length} pending drivers`);
              updateNotifications();
            } catch (err: any) {
              console.error("Error processing driver notifications:", err);
              setError(err.message || "Failed to process driver notifications");
              setLoading(false);
            }
          },
          (err: any) => {
            console.error("Driver notifications snapshot error:", err);
            setError(err.message || "Failed to fetch driver notifications");
            setLoading(false);
          }
        );
      } catch (err: any) {
        console.error("Error setting up notifications listeners:", err);
        setError(err.message || "Failed to initialize notifications");
        setLoading(false);
      }
    };

    setupListeners();

    return () => {
      if (vendorUnsubscribe) vendorUnsubscribe();
      if (driverUnsubscribe) driverUnsubscribe();
    };
  }, []);

  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  const markAsRead = async (notificationId: string) => {
    // No-op for now since we're reading directly from vendors/drivers collections
    console.log(`Marked notification ${notificationId} as read`);
  };

  const approveRegistration = async (
    notificationId: string,
    userId: string,
    role: "vendor" | "driver"
  ) => {
    try {
      console.log(`Approving ${role} registration: ${userId}`);

      // Update vendor or driver approval status
      const collectionName = role === "vendor" ? "vendors" : "drivers";
      const docRef = doc(firestore, collectionName, userId);
      await updateDoc(docRef, {
        isApproved: true,
        approvedAt: new Date(),
      });

      // Also update user document
      const userDocRef = doc(firestore, "users", userId);
      await updateDoc(userDocRef, {
        isApproved: true,
        approvedAt: new Date(),
      });

      console.log(`${role} ${userId} approved successfully`);
    } catch (err: any) {
      console.error("Error approving registration:", err);
      setError(err.message || "Failed to approve registration");
      throw err;
    }
  };

  const rejectRegistration = async (
    notificationId: string,
    userId: string,
    role: "vendor" | "driver"
  ) => {
    try {
      console.log(`Rejecting ${role} registration: ${userId}`);

      // Update vendor or driver to mark as rejected (isApproved remains false)
      const collectionName = role === "vendor" ? "vendors" : "drivers";
      const docRef = doc(firestore, collectionName, userId);
      await updateDoc(docRef, {
        rejectedAt: new Date(),
        isApproved: false, // Explicitly set to false
      });

      // Also update user document
      const userDocRef = doc(firestore, "users", userId);
      await updateDoc(userDocRef, {
        rejectedAt: new Date(),
        isApproved: false,
      });

      console.log(`${role} ${userId} rejected (kept in system)`);
    } catch (err: any) {
      console.error("Error rejecting registration:", err);
      setError(err.message || "Failed to reject registration");
      throw err;
    }
  };

  const deleteRegistration = async (
    notificationId: string,
    userId: string,
    role: "vendor" | "driver"
  ) => {
    try {
      console.log(`Deleting ${role} registration: ${userId}`);

      // Delete from vendors or drivers collection
      const collectionName = role === "vendor" ? "vendors" : "drivers";
      const docRef = doc(firestore, collectionName, userId);
      await deleteDoc(docRef);

      // Also delete from users collection
      const userDocRef = doc(firestore, "users", userId);
      await deleteDoc(userDocRef);

      console.log(`${role} ${userId} deleted from system`);
    } catch (err: any) {
      console.error("Error deleting registration:", err);
      setError(err.message || "Failed to delete registration");
      throw err;
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    approveRegistration,
    rejectRegistration,
    deleteRegistration,
  };
}
