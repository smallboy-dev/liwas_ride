import {
  collection,
  addDoc,
  serverTimestamp,
  Firestore,
} from "firebase/firestore";

export interface CreateNotificationParams {
  firestore: Firestore;
  type: "vendor_registration" | "driver_registration";
  userId: string;
  userEmail?: string;
  userName?: string;
  data?: {
    businessName?: string;
    vendorType?: string;
    driverType?: string;
    name?: string;
    phone?: string;
    documents?: any[];
    personalInfo?: any;
  };
}

/**
 * Creates an admin notification for new vendor/driver registrations
 * This should be called from Cloud Functions when a new vendor/driver is created
 */
export async function createAdminNotification({
  firestore,
  type,
  userId,
  userEmail,
  userName,
  data,
}: CreateNotificationParams) {
  try {
    const notificationsRef = collection(firestore, "admin_notifications");
    
    const notificationDoc = await addDoc(notificationsRef, {
      type,
      userId,
      userEmail: userEmail || "N/A",
      userName: userName || "N/A",
      status: "unread",
      data: data || {},
      createdAt: serverTimestamp(),
      actionedAt: null,
      actionedBy: null,
      action: null,
    });

    console.log(`Created ${type} notification:`, notificationDoc.id);
    return notificationDoc.id;
  } catch (error) {
    console.error("Error creating admin notification:", error);
    throw error;
  }
}
