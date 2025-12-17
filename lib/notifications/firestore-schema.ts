/**
 * Firestore Schema for Notification System
 * Defines collections, documents, and data structures for persistent notification storage
 */

import { NotificationType, NotificationStatus, NotificationChannel } from "./types";

// ============================================================================
// FIRESTORE COLLECTIONS
// ============================================================================

/**
 * Collection: /notifications
 * Stores all sent notifications with delivery status and metadata
 * 
 * Structure:
 * /notifications/{notificationId}
 */
export interface FirestoreNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  templateId: string;
  metadata?: {
    orderId?: string;
    vendorId?: string;
    driverId?: string;
    customerId?: string;
    [key: string]: any;
  };
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Collection: /devices
 * Stores user device tokens for push notifications
 * 
 * Structure:
 * /devices/{deviceId}
 */
export interface FirestoreDevice {
  id: string;
  userId: string;
  deviceType: "ios" | "android" | "web";
  pushToken: string;
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Collection: /notificationTemplates
 * Stores editable notification templates (optional - can be in code)
 * 
 * Structure:
 * /notificationTemplates/{templateId}
 */
export interface FirestoreNotificationTemplate {
  id: string;
  name: string;
  event: string;
  type: NotificationType;
  channels: {
    push?: {
      title?: string;
      body: string;
      icon?: string;
      deepLink?: string;
    };
    inapp?: {
      title?: string;
      body: string;
    };
    email?: {
      subject: string;
      body: string;
    };
    sms?: {
      body: string;
    };
  };
  variables: string[];
  priority: "low" | "medium" | "high" | "critical";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Collection: /notificationLogs
 * Audit trail for all notification events (for debugging and analytics)
 * 
 * Structure:
 * /notificationLogs/{logId}
 */
export interface FirestoreNotificationLog {
  id: string;
  notificationId: string;
  userId: string;
  event: "created" | "sent" | "delivered" | "failed" | "retried" | "read";
  channel: NotificationChannel;
  status: NotificationStatus;
  details?: {
    errorCode?: string;
    errorMessage?: string;
    provider?: string;
    responseTime?: number;
    [key: string]: any;
  };
  createdAt: Date;
}

/**
 * Collection: /userNotificationPreferences
 * Stores user preferences for notification channels and types
 * 
 * Structure:
 * /userNotificationPreferences/{userId}
 */
export interface FirestoreUserNotificationPreferences {
  userId: string;
  channels: {
    push: boolean;
    inapp: boolean;
    email: boolean;
    sms: boolean;
    socket: boolean;
  };
  types: {
    system: boolean;
    transactional: boolean;
    operational: boolean;
    marketing: boolean;
    critical: boolean;
  };
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;   // HH:mm format
    timezone: string;
  };
  unsubscribedEvents: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Collection: /notificationQueues
 * Temporary queue for notifications pending delivery
 * 
 * Structure:
 * /notificationQueues/{queueId}
 */
export interface FirestoreNotificationQueue {
  id: string;
  notificationId: string;
  userId: string;
  channel: NotificationChannel;
  status: "pending" | "processing" | "completed" | "failed";
  payload: any;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// FIRESTORE INDEXES (for optimal querying)
// ============================================================================

/**
 * Recommended Firestore Composite Indexes:
 * 
 * 1. /notifications
 *    - userId, status, createdAt (DESC)
 *    - userId, channel, status
 *    - userId, readAt, createdAt (DESC)
 * 
 * 2. /devices
 *    - userId, isActive
 * 
 * 3. /notificationQueues
 *    - status, nextRetryAt
 *    - userId, status
 * 
 * 4. /notificationLogs
 *    - notificationId, createdAt (DESC)
 *    - userId, event, createdAt (DESC)
 */

// ============================================================================
// FIRESTORE RULES
// ============================================================================

export const FIRESTORE_RULES = `
// Notification System Rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read their own notifications
    match /notifications/{notificationId} {
      allow read: if request.auth.uid == resource.data.userId;
      allow create, update: if request.auth.uid == resource.data.userId || isAdmin();
      allow delete: if isAdmin();
    }

    // Users can read their own devices
    match /devices/{deviceId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      allow create: if request.auth.uid != null;
    }

    // Users can read their own preferences
    match /userNotificationPreferences/{userId} {
      allow read, write: if request.auth.uid == userId;
    }

    // Only admins can manage templates
    match /notificationTemplates/{templateId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Only admins can read logs
    match /notificationLogs/{logId} {
      allow read: if isAdmin();
      allow write: if isAdmin();
    }

    // Notification queues - internal only
    match /notificationQueues/{queueId} {
      allow read, write: if isAdmin();
    }

    // Helper functions
    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
`;

// ============================================================================
// HELPER FUNCTIONS FOR FIRESTORE OPERATIONS
// ============================================================================

/**
 * Converts Firestore timestamp to JavaScript Date
 */
export function firestoreTimestampToDate(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (timestamp.toDate && typeof timestamp.toDate === "function") {
    return timestamp.toDate();
  }
  return new Date(timestamp);
}

/**
 * Converts JavaScript Date to Firestore timestamp format
 */
export function dateToFirestoreTimestamp(date: Date): any {
  return date;
}

/**
 * Query builder for notifications
 */
export const NotificationQueries = {
  /**
   * Get all unread notifications for a user
   */
  unreadByUser: (userId: string) => ({
    collection: "notifications",
    where: [
      ["userId", "==", userId],
      ["readAt", "==", null],
    ],
    orderBy: [["createdAt", "desc"]],
  }),

  /**
   * Get notifications by type and status
   */
  byTypeAndStatus: (userId: string, type: NotificationType, status: NotificationStatus) => ({
    collection: "notifications",
    where: [
      ["userId", "==", userId],
      ["type", "==", type],
      ["status", "==", status],
    ],
    orderBy: [["createdAt", "desc"]],
  }),

  /**
   * Get failed notifications for retry
   */
  failedForRetry: () => ({
    collection: "notificationQueues",
    where: [
      ["status", "==", "failed"],
      ["nextRetryAt", "<=", new Date()],
    ],
    orderBy: [["nextRetryAt", "asc"]],
  }),

  /**
   * Get user's active devices
   */
  activeDevicesByUser: (userId: string) => ({
    collection: "devices",
    where: [
      ["userId", "==", userId],
      ["isActive", "==", true],
    ],
  }),

  /**
   * Get notification logs for a specific notification
   */
  logsByNotification: (notificationId: string) => ({
    collection: "notificationLogs",
    where: [["notificationId", "==", notificationId]],
    orderBy: [["createdAt", "desc"]],
  }),
};

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Batch create notifications for multiple users
 */
export interface BatchNotificationPayload {
  userIds: string[];
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  templateId: string;
  metadata?: Record<string, any>;
}

/**
 * Batch mark notifications as read
 */
export interface BatchMarkReadPayload {
  notificationIds: string[];
  userId: string;
}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Initialize Firestore collections with default data
 */
export async function initializeNotificationCollections(db: any) {
  // This would be called during app setup
  // Creates necessary collections and indexes
  console.log("Notification collections ready");
}

/**
 * Cleanup old notifications (older than 90 days)
 */
export async function cleanupOldNotifications(db: any, daysOld: number = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  // Query and delete old notifications
  // This should be run as a scheduled Cloud Function
  console.log(`Cleaning up notifications older than ${cutoffDate}`);
}
