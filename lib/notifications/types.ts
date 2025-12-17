/**
 * Notification System Types
 * Defines all types, channels, events, and templates for the notification microservice
 */

// ============================================================================
// 1️⃣ NOTIFICATION TYPES
// ============================================================================

export enum NotificationType {
  SYSTEM = "system",           // Order/ride status updates
  TRANSACTIONAL = "transactional", // Payments, receipts, confirmations
  OPERATIONAL = "operational",   // Driver assignment, order acceptance
  MARKETING = "marketing",       // Promotions, coupons, engagement
  CRITICAL = "critical",         // Fraud, disputes, escalations
}

// ============================================================================
// 2️⃣ NOTIFICATION CHANNELS
// ============================================================================

export enum NotificationChannel {
  PUSH = "push",               // Firebase Cloud Messaging (FCM)
  IN_APP = "inapp",            // In-app notification center
  SOCKET = "socket",           // Real-time WebSocket updates
  EMAIL = "email",             // SendGrid / AWS SES
  SMS = "sms",                 // Termii / Twilio
}

// ============================================================================
// 3️⃣ NOTIFICATION STATUS
// ============================================================================

export enum NotificationStatus {
  PENDING = "pending",         // Queued for sending
  SENT = "sent",               // Successfully sent
  DELIVERED = "delivered",     // Confirmed delivery
  FAILED = "failed",           // Failed after retries
  BOUNCED = "bounced",         // Email/SMS bounced
  UNSUBSCRIBED = "unsubscribed", // User opted out
}

// ============================================================================
// 4️⃣ SYSTEM EVENTS & TRIGGERS
// ============================================================================

export enum CustomerEvent {
  ORDER_PLACED = "ORDER_PLACED",
  ORDER_CONFIRMED = "ORDER_CONFIRMED",
  VENDOR_ACCEPTED = "VENDOR_ACCEPTED",
  VENDOR_REJECTED = "VENDOR_REJECTED",
  DRIVER_ASSIGNED = "DRIVER_ASSIGNED",
  ORDER_PICKED_UP = "ORDER_PICKED_UP",
  ORDER_DELIVERED = "ORDER_DELIVERED",
  DISPUTE_OPENED = "DISPUTE_OPENED",
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",
  REFUND_INITIATED = "REFUND_INITIATED",
}

export enum VendorEvent {
  NEW_ORDER = "NEW_ORDER",
  ORDER_CANCELLED = "ORDER_CANCELLED",
  DRIVER_ASSIGNED = "DRIVER_ASSIGNED",
  DELIVERY_COMPLETED = "DELIVERY_COMPLETED",
  PAYOUT_PROCESSED = "PAYOUT_PROCESSED",
  ACCOUNT_APPROVED = "ACCOUNT_APPROVED",
  ACCOUNT_REJECTED = "ACCOUNT_REJECTED",
}

export enum DriverEvent {
  NEW_DELIVERY = "NEW_DELIVERY",
  DELIVERY_ASSIGNED = "DELIVERY_ASSIGNED",
  DELIVERY_CANCELLED = "DELIVERY_CANCELLED",
  DELIVERY_COMPLETED = "DELIVERY_COMPLETED",
  PAYOUT_COMPLETED = "PAYOUT_COMPLETED",
  ACCOUNT_APPROVED = "ACCOUNT_APPROVED",
  ACCOUNT_REJECTED = "ACCOUNT_REJECTED",
}

export enum AdminEvent {
  NEW_VENDOR_REGISTRATION = "NEW_VENDOR_REGISTRATION",
  NEW_DRIVER_REGISTRATION = "NEW_DRIVER_REGISTRATION",
  DISPUTE_ESCALATION = "DISPUTE_ESCALATION",
  FRAUD_ALERT = "FRAUD_ALERT",
}

export type SystemEvent = CustomerEvent | VendorEvent | DriverEvent | AdminEvent;

// ============================================================================
// 5️⃣ NOTIFICATION PAYLOAD STRUCTURES
// ============================================================================

export interface NotificationPayload {
  userId: string;
  event: SystemEvent;
  type: NotificationType;
  priority: "low" | "medium" | "high" | "critical";
  templateId: string;
  templateData: Record<string, any>;
  channels?: NotificationChannel[];
  metadata?: Record<string, any>;
  retryCount?: number;
  maxRetries?: number;
}

export interface NotificationRecord {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  templateId: string;
  metadata?: Record<string, any>;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failureReason?: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeviceToken {
  id: string;
  userId: string;
  deviceType: "ios" | "android" | "web";
  pushToken: string;
  isActive: boolean;
  lastUsedAt: Date;
  createdAt: Date;
}

// ============================================================================
// 6️⃣ MESSAGE TEMPLATE STRUCTURE
// ============================================================================

export interface NotificationTemplate {
  id: string;
  name: string;
  event: SystemEvent;
  type: NotificationType;
  channels: {
    [key in NotificationChannel]?: {
      title?: string;
      body: string;
      icon?: string;
      deepLink?: string;
    };
  };
  variables: string[]; // e.g., ["name", "order_id", "order_status"]
  priority: "low" | "medium" | "high" | "critical";
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// 7️⃣ CHANNEL-SPECIFIC CONFIGURATIONS
// ============================================================================

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  sound?: string;
  tag?: string;
  color?: string;
  clickAction?: string;
  data?: Record<string, string>;
}

export interface EmailNotificationPayload {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
  }>;
}

export interface SMSNotificationPayload {
  to: string;
  message: string;
  senderId?: string;
}

export interface InAppNotificationPayload {
  title: string;
  message: string;
  icon?: string;
  actionUrl?: string;
  actionLabel?: string;
}

// ============================================================================
// 8️⃣ RETRY & DELIVERY RULES
// ============================================================================

export interface RetryPolicy {
  channel: NotificationChannel;
  maxRetries: number;
  backoffMultiplier: number; // exponential backoff
  initialDelayMs: number;
}

export const DEFAULT_RETRY_POLICIES: Record<NotificationChannel, RetryPolicy> = {
  [NotificationChannel.PUSH]: {
    channel: NotificationChannel.PUSH,
    maxRetries: 2,
    backoffMultiplier: 2,
    initialDelayMs: 5000,
  },
  [NotificationChannel.EMAIL]: {
    channel: NotificationChannel.EMAIL,
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelayMs: 10000,
  },
  [NotificationChannel.SMS]: {
    channel: NotificationChannel.SMS,
    maxRetries: 1,
    backoffMultiplier: 2,
    initialDelayMs: 5000,
  },
  [NotificationChannel.IN_APP]: {
    channel: NotificationChannel.IN_APP,
    maxRetries: 0,
    backoffMultiplier: 1,
    initialDelayMs: 0,
  },
  [NotificationChannel.SOCKET]: {
    channel: NotificationChannel.SOCKET,
    maxRetries: 0,
    backoffMultiplier: 1,
    initialDelayMs: 0,
  },
};

// ============================================================================
// 9️⃣ CHANNEL PRIORITY & FALLBACK
// ============================================================================

export const CHANNEL_PRIORITY: Record<NotificationType, NotificationChannel[]> = {
  [NotificationType.SYSTEM]: [
    NotificationChannel.PUSH,
    NotificationChannel.IN_APP,
    NotificationChannel.SOCKET,
  ],
  [NotificationType.TRANSACTIONAL]: [
    NotificationChannel.PUSH,
    NotificationChannel.IN_APP,
    NotificationChannel.EMAIL,
  ],
  [NotificationType.OPERATIONAL]: [
    NotificationChannel.PUSH,
    NotificationChannel.SOCKET,
    NotificationChannel.IN_APP,
  ],
  [NotificationType.MARKETING]: [
    NotificationChannel.IN_APP,
    NotificationChannel.EMAIL,
  ],
  [NotificationType.CRITICAL]: [
    NotificationChannel.PUSH,
    NotificationChannel.SMS,
    NotificationChannel.EMAIL,
  ],
};
