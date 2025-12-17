/**
 * Notification System - Main Export
 * Centralized notification microservice for LiWAS platform
 */

// Types
export * from "./types";

// Templates
export { getTemplate, NOTIFICATION_TEMPLATES } from "./templates";

// Firestore Schema
export * from "./firestore-schema";

// Notification Service
export { NotificationService, initializeNotificationService, getNotificationService } from "./notification-service";

// FCM Setup
export {
  getMessagingInstance,
  initializeFCM,
  retrieveFCMToken,
  storeFCMToken,
  registerDevice,
  setupFCMListener,
  setupServiceWorkerMessaging,
  deactivateDevice,
  getUserDevices,
  clearFCMToken,
  setupFCMComplete,
  handleFCMError,
} from "./fcm";
