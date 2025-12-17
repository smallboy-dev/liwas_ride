/**
 * Notification Service
 * Core service for managing notification lifecycle, routing, and delivery
 */

import {
  NotificationPayload,
  NotificationRecord,
  NotificationType,
  NotificationStatus,
  NotificationChannel,
  CHANNEL_PRIORITY,
  DEFAULT_RETRY_POLICIES,
} from "./types";
import { getTemplate } from "./templates";
import { FirestoreNotification } from "./firestore-schema";

// ============================================================================
// NOTIFICATION SERVICE CLASS
// ============================================================================

export class NotificationService {
  private db: any;
  private fcmService: any;
  private emailService: any;
  private smsService: any;
  private socketService: any;

  constructor(config: {
    db: any;
    fcmService?: any;
    emailService?: any;
    smsService?: any;
    socketService?: any;
  }) {
    this.db = config.db;
    this.fcmService = config.fcmService;
    this.emailService = config.emailService;
    this.smsService = config.smsService;
    this.socketService = config.socketService;
  }

  /**
   * Main entry point: Process a notification event
   */
  async processNotification(payload: NotificationPayload): Promise<NotificationRecord> {
    try {
      // 1. Get the template
      const template = getTemplate(payload.event);
      if (!template) {
        throw new Error(`No template found for event: ${payload.event}`);
      }

      // 2. Render message content
      const renderedContent = this.renderTemplate(template, payload.templateData);

      // 3. Create notification record
      const notification = await this.createNotificationRecord({
        userId: payload.userId,
        title: renderedContent.title,
        message: renderedContent.body,
        type: payload.type,
        templateId: payload.templateId,
        metadata: payload.metadata,
      });

      // 4. Determine channels to use
      const channels = payload.channels || CHANNEL_PRIORITY[payload.type];

      // 5. Queue for delivery
      await this.queueForDelivery(notification, channels, renderedContent, payload);

      return notification;
    } catch (error) {
      console.error("Error processing notification:", error);
      throw error;
    }
  }

  /**
   * Render template with dynamic variables
   */
  private renderTemplate(template: any, data: Record<string, any>) {
    const render = (text: string) => {
      let result = text;
      Object.entries(data).forEach(([key, value]) => {
        result = result.replace(new RegExp(`{{${key}}}`, "g"), String(value || ""));
      });
      return result;
    };

    return {
      title: template.channels.push?.title ? render(template.channels.push.title) : "",
      body: render(template.channels.push?.body || ""),
      deepLink: template.channels.push?.deepLink ? render(template.channels.push.deepLink) : undefined,
    };
  }

  /**
   * Create notification record in Firestore
   */
  private async createNotificationRecord(data: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    templateId: string;
    metadata?: Record<string, any>;
  }): Promise<NotificationRecord> {
    const notification: FirestoreNotification = {
      id: this.generateId(),
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type,
      channel: NotificationChannel.IN_APP, // Default
      status: NotificationStatus.PENDING,
      templateId: data.templateId,
      metadata: data.metadata,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to Firestore
    if (this.db) {
      await this.db.collection("notifications").doc(notification.id).set(notification);
    }

    return notification as NotificationRecord;
  }

  /**
   * Queue notification for delivery across multiple channels
   */
  private async queueForDelivery(
    notification: NotificationRecord,
    channels: NotificationChannel[],
    content: any,
    payload: NotificationPayload
  ) {
    for (const channel of channels) {
      try {
        await this.sendViaChannel(notification, channel, content, payload);
      } catch (error) {
        console.error(`Failed to send via ${channel}:`, error);
        // Continue to next channel (fallback)
      }
    }
  }

  /**
   * Send notification via specific channel
   */
  private async sendViaChannel(
    notification: NotificationRecord,
    channel: NotificationChannel,
    content: any,
    payload: NotificationPayload
  ) {
    const retryPolicy = DEFAULT_RETRY_POLICIES[channel];

    try {
      switch (channel) {
        case NotificationChannel.PUSH:
          await this.sendPushNotification(notification, content, payload);
          break;

        case NotificationChannel.IN_APP:
          await this.sendInAppNotification(notification, content);
          break;

        case NotificationChannel.EMAIL:
          await this.sendEmailNotification(notification, content, payload);
          break;

        case NotificationChannel.SMS:
          await this.sendSMSNotification(notification, content, payload);
          break;

        case NotificationChannel.SOCKET:
          await this.sendSocketNotification(notification, content);
          break;

        default:
          throw new Error(`Unknown channel: ${channel}`);
      }

      // Mark as sent
      await this.updateNotificationStatus(notification.id, NotificationStatus.SENT, channel);
    } catch (error) {
      console.error(`Error sending via ${channel}:`, error);

      // Queue for retry if retries available
      if (notification.retryCount < retryPolicy.maxRetries) {
        await this.scheduleRetry(notification, channel, retryPolicy);
      } else {
        await this.updateNotificationStatus(
          notification.id,
          NotificationStatus.FAILED,
          channel,
          String(error)
        );
      }
    }
  }

  /**
   * Send push notification via FCM
   */
  private async sendPushNotification(
    notification: NotificationRecord,
    content: any,
    payload: NotificationPayload
  ) {
    if (!this.fcmService) {
      throw new Error("FCM service not configured");
    }

    // Get user's device tokens
    const devices = await this.getUserDevices(notification.userId);
    if (devices.length === 0) {
      throw new Error("No active devices for user");
    }

    // Send to all devices
    for (const device of devices) {
      await this.fcmService.sendToDevice(device.pushToken, {
        notification: {
          title: content.title,
          body: content.body,
          icon: "icon-url",
          badge: "badge-url",
        },
        data: {
          notificationId: notification.id,
          deepLink: content.deepLink || "",
          ...payload.metadata,
        },
      });
    }
  }

  /**
   * Send in-app notification (stored in Firestore)
   */
  private async sendInAppNotification(notification: NotificationRecord, content: any) {
    // In-app notifications are already stored in Firestore
    // This is just a confirmation that it's been marked as sent
    console.log("In-app notification created:", notification.id);
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    notification: NotificationRecord,
    content: any,
    payload: NotificationPayload
  ) {
    if (!this.emailService) {
      throw new Error("Email service not configured");
    }

    // Get user email
    const userEmail = await this.getUserEmail(notification.userId);
    if (!userEmail) {
      throw new Error("User email not found");
    }

    await this.emailService.send({
      to: userEmail,
      subject: content.title,
      html: this.formatEmailBody(content.body),
      text: content.body,
    });
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    notification: NotificationRecord,
    content: any,
    payload: NotificationPayload
  ) {
    if (!this.smsService) {
      throw new Error("SMS service not configured");
    }

    // Get user phone
    const userPhone = await this.getUserPhone(notification.userId);
    if (!userPhone) {
      throw new Error("User phone not found");
    }

    await this.smsService.send({
      to: userPhone,
      message: content.body,
    });
  }

  /**
   * Send real-time socket notification
   */
  private async sendSocketNotification(notification: NotificationRecord, content: any) {
    if (!this.socketService) {
      console.log("Socket service not configured, skipping");
      return;
    }

    this.socketService.emit(`user:${notification.userId}:notification`, {
      id: notification.id,
      title: content.title,
      body: content.body,
      type: notification.type,
      createdAt: notification.createdAt,
    });
  }

  /**
   * Update notification status
   */
  private async updateNotificationStatus(
    notificationId: string,
    status: NotificationStatus,
    channel: NotificationChannel,
    failureReason?: string
  ) {
    if (!this.db) return;

    const updateData: any = {
      status,
      channel,
      updatedAt: new Date(),
    };

    if (status === NotificationStatus.SENT) {
      updateData.sentAt = new Date();
    } else if (status === NotificationStatus.DELIVERED) {
      updateData.deliveredAt = new Date();
    } else if (status === NotificationStatus.FAILED) {
      updateData.failureReason = failureReason;
    }

    await this.db.collection("notifications").doc(notificationId).update(updateData);

    // Log the event
    await this.logNotificationEvent(notificationId, status, channel, failureReason);
  }

  /**
   * Schedule retry for failed notification
   */
  private async scheduleRetry(
    notification: NotificationRecord,
    channel: NotificationChannel,
    retryPolicy: any
  ) {
    const delayMs = retryPolicy.initialDelayMs * Math.pow(retryPolicy.backoffMultiplier, notification.retryCount);
    const nextRetryAt = new Date(Date.now() + delayMs);

    if (!this.db) return;

    await this.db.collection("notifications").doc(notification.id).update({
      retryCount: notification.retryCount + 1,
      nextRetryAt,
      status: NotificationStatus.PENDING,
      updatedAt: new Date(),
    });

    console.log(`Scheduled retry for notification ${notification.id} at ${nextRetryAt}`);
  }

  /**
   * Log notification event for audit trail
   */
  private async logNotificationEvent(
    notificationId: string,
    status: NotificationStatus,
    channel: NotificationChannel,
    details?: string
  ) {
    if (!this.db) return;

    await this.db.collection("notificationLogs").add({
      notificationId,
      event: status,
      channel,
      status,
      details: details ? { errorMessage: details } : undefined,
      createdAt: new Date(),
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string) {
    if (!this.db) return;

    await this.db.collection("notifications").doc(notificationId).update({
      readAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Get user's active devices
   */
  private async getUserDevices(userId: string) {
    if (!this.db) return [];

    const snapshot = await this.db
      .collection("devices")
      .where("userId", "==", userId)
      .where("isActive", "==", true)
      .get();

    return snapshot.docs.map((doc: any) => doc.data());
  }

  /**
   * Get user email
   */
  private async getUserEmail(userId: string): Promise<string | null> {
    if (!this.db) return null;

    const doc = await this.db.collection("users").doc(userId).get();
    return doc.data()?.email || null;
  }

  /**
   * Get user phone
   */
  private async getUserPhone(userId: string): Promise<string | null> {
    if (!this.db) return null;

    const doc = await this.db.collection("users").doc(userId).get();
    return doc.data()?.phone || null;
  }

  /**
   * Format email body with HTML
   */
  private formatEmailBody(text: string): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            ${text.split("\n").map((line) => `<p>${line}</p>`).join("")}
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
            <p style="font-size: 12px; color: #999;">
              This is an automated message from LiWAS. Please do not reply to this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get user's notification preferences
   */
  async getUserPreferences(userId: string) {
    if (!this.db) return null;

    const doc = await this.db.collection("userNotificationPreferences").doc(userId).get();
    return doc.exists ? doc.data() : null;
  }

  /**
   * Update user's notification preferences
   */
  async updateUserPreferences(userId: string, preferences: any) {
    if (!this.db) return;

    await this.db.collection("userNotificationPreferences").doc(userId).set(
      {
        ...preferences,
        updatedAt: new Date(),
      },
      { merge: true }
    );
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(userId: string, limit: number = 20) {
    if (!this.db) return [];

    const snapshot = await this.db
      .collection("notifications")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    return snapshot.docs.map((doc: any) => doc.data());
  }

  /**
   * Retry failed notifications (called by Cloud Function)
   */
  async retryFailedNotifications() {
    if (!this.db) return;

    const snapshot = await this.db
      .collection("notifications")
      .where("status", "==", NotificationStatus.FAILED)
      .where("retryCount", "<", 3)
      .where("nextRetryAt", "<=", new Date())
      .get();

    for (const doc of snapshot.docs) {
      const notification = doc.data();
      console.log(`Retrying notification: ${notification.id}`);
      // Re-process the notification
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let notificationServiceInstance: NotificationService | null = null;

export function initializeNotificationService(config: any): NotificationService {
  notificationServiceInstance = new NotificationService(config);
  return notificationServiceInstance;
}

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    throw new Error("Notification service not initialized");
  }
  return notificationServiceInstance;
}
