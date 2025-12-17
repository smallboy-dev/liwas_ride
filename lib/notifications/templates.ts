/**
 * Notification Message Templates
 * Predefined templates for all notification types with support for dynamic variables
 */

import {
  NotificationTemplate,
  CustomerEvent,
  VendorEvent,
  DriverEvent,
  AdminEvent,
  NotificationType,
  NotificationChannel,
} from "./types";

// ============================================================================
// CUSTOMER NOTIFICATION TEMPLATES
// ============================================================================

export const CUSTOMER_TEMPLATES: Partial<Record<CustomerEvent, NotificationTemplate>> = {
  [CustomerEvent.ORDER_PLACED]: {
    id: "customer_order_placed",
    name: "Order Placed",
    event: CustomerEvent.ORDER_PLACED,
    type: NotificationType.SYSTEM,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Order Confirmed",
        body: "Your order #{{order_id}} has been received. Vendor will confirm shortly.",
        deepLink: "/orders/{{order_id}}",
      },
      [NotificationChannel.IN_APP]: {
        title: "Order Confirmed",
        body: "Your order #{{order_id}} has been received. Vendor will confirm shortly.",
      },
      [NotificationChannel.EMAIL]: {
        title: "Order Confirmation",
        body: "Hi {{customer_name}},\n\nYour order #{{order_id}} has been placed successfully.\n\nOrder Total: {{order_total}}\n\nWe'll notify you once the vendor confirms.",
      },
    },
    variables: ["order_id", "customer_name", "order_total"],
    priority: "high",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [CustomerEvent.VENDOR_ACCEPTED]: {
    id: "customer_vendor_accepted",
    name: "Vendor Accepted Order",
    event: CustomerEvent.VENDOR_ACCEPTED,
    type: NotificationType.SYSTEM,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Order Confirmed",
        body: "{{vendor_name}} is preparing your order #{{order_id}}",
        deepLink: "/orders/{{order_id}}",
      },
      [NotificationChannel.IN_APP]: {
        title: "Order Confirmed",
        body: "{{vendor_name}} is preparing your order #{{order_id}}",
      },
      [NotificationChannel.SOCKET]: {
        title: "Order Status Update",
        body: "{{vendor_name}} is preparing your order",
      },
    },
    variables: ["order_id", "vendor_name"],
    priority: "high",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [CustomerEvent.VENDOR_REJECTED]: {
    id: "customer_vendor_rejected",
    name: "Order Rejected",
    event: CustomerEvent.VENDOR_REJECTED,
    type: NotificationType.CRITICAL,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Order Cancelled",
        body: "{{vendor_name}} cancelled order #{{order_id}}. Refund initiated.",
        deepLink: "/orders/{{order_id}}",
      },
      [NotificationChannel.IN_APP]: {
        title: "Order Cancelled",
        body: "{{vendor_name}} cancelled order #{{order_id}}. Refund initiated.",
      },
      [NotificationChannel.EMAIL]: {
        title: "Order Cancellation",
        body: "Hi {{customer_name}},\n\n{{vendor_name}} has cancelled your order #{{order_id}}.\n\nRefund of {{order_total}} will be processed within 24 hours.",
      },
    },
    variables: ["order_id", "vendor_name", "customer_name", "order_total"],
    priority: "critical",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [CustomerEvent.DRIVER_ASSIGNED]: {
    id: "customer_driver_assigned",
    name: "Driver Assigned",
    event: CustomerEvent.DRIVER_ASSIGNED,
    type: NotificationType.OPERATIONAL,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Driver on the Way",
        body: "{{driver_name}} is heading to {{vendor_name}} to pick up your order.",
        deepLink: "/orders/{{order_id}}/track",
      },
      [NotificationChannel.IN_APP]: {
        title: "Driver Assigned",
        body: "{{driver_name}} is heading to {{vendor_name}} to pick up your order.",
      },
      [NotificationChannel.SOCKET]: {
        title: "Driver Update",
        body: "{{driver_name}} assigned to your delivery",
      },
    },
    variables: ["order_id", "driver_name", "vendor_name", "driver_phone"],
    priority: "high",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [CustomerEvent.ORDER_PICKED_UP]: {
    id: "customer_order_picked_up",
    name: "Order Picked Up",
    event: CustomerEvent.ORDER_PICKED_UP,
    type: NotificationType.SYSTEM,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Order on the Way",
        body: "{{driver_name}} picked up your order and is heading to you.",
        deepLink: "/orders/{{order_id}}/track",
      },
      [NotificationChannel.IN_APP]: {
        title: "Order on the Way",
        body: "{{driver_name}} picked up your order and is heading to you.",
      },
      [NotificationChannel.SOCKET]: {
        title: "Delivery Update",
        body: "Order picked up and on the way",
      },
    },
    variables: ["order_id", "driver_name"],
    priority: "medium",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [CustomerEvent.ORDER_DELIVERED]: {
    id: "customer_order_delivered",
    name: "Order Delivered",
    event: CustomerEvent.ORDER_DELIVERED,
    type: NotificationType.SYSTEM,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Order Delivered",
        body: "Your order #{{order_id}} has been delivered. Enjoy!",
        deepLink: "/orders/{{order_id}}/review",
      },
      [NotificationChannel.IN_APP]: {
        title: "Order Delivered",
        body: "Your order #{{order_id}} has been delivered. Enjoy!",
      },
      [NotificationChannel.EMAIL]: {
        title: "Order Delivered",
        body: "Hi {{customer_name}},\n\nYour order #{{order_id}} has been delivered successfully.\n\nWe'd love your feedback! Please rate your experience.",
      },
    },
    variables: ["order_id", "customer_name"],
    priority: "medium",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [CustomerEvent.DISPUTE_OPENED]: {
    id: "customer_dispute_opened",
    name: "Dispute Opened",
    event: CustomerEvent.DISPUTE_OPENED,
    type: NotificationType.CRITICAL,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Dispute Opened",
        body: "A dispute has been opened for order #{{order_id}}. We're investigating.",
        deepLink: "/disputes/{{dispute_id}}",
      },
      [NotificationChannel.IN_APP]: {
        title: "Dispute Opened",
        body: "A dispute has been opened for order #{{order_id}}. We're investigating.",
      },
      [NotificationChannel.EMAIL]: {
        title: "Dispute Notification",
        body: "Hi {{customer_name}},\n\nWe've received your dispute for order #{{order_id}}.\n\nOur team will review and respond within 24 hours.",
      },
    },
    variables: ["order_id", "customer_name", "dispute_id"],
    priority: "critical",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [CustomerEvent.PAYMENT_RECEIVED]: {
    id: "customer_payment_received",
    name: "Payment Confirmation",
    event: CustomerEvent.PAYMENT_RECEIVED,
    type: NotificationType.TRANSACTIONAL,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Payment Confirmed",
        body: "Payment of {{amount}} received for order #{{order_id}}",
      },
      [NotificationChannel.IN_APP]: {
        title: "Payment Confirmed",
        body: "Payment of {{amount}} received for order #{{order_id}}",
      },
      [NotificationChannel.EMAIL]: {
        title: "Payment Receipt",
        body: "Hi {{customer_name}},\n\nPayment of {{amount}} has been received.\n\nTransaction ID: {{transaction_id}}\nOrder ID: {{order_id}}",
      },
    },
    variables: ["order_id", "customer_name", "amount", "transaction_id"],
    priority: "high",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [CustomerEvent.REFUND_INITIATED]: {
    id: "customer_refund_initiated",
    name: "Refund Initiated",
    event: CustomerEvent.REFUND_INITIATED,
    type: NotificationType.TRANSACTIONAL,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Refund Initiated",
        body: "Refund of {{amount}} has been initiated for order #{{order_id}}",
      },
      [NotificationChannel.IN_APP]: {
        title: "Refund Initiated",
        body: "Refund of {{amount}} has been initiated for order #{{order_id}}",
      },
      [NotificationChannel.EMAIL]: {
        title: "Refund Notification",
        body: "Hi {{customer_name}},\n\nRefund of {{amount}} has been initiated.\n\nIt will appear in your account within 24-48 hours.",
      },
    },
    variables: ["order_id", "customer_name", "amount"],
    priority: "high",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

// ============================================================================
// VENDOR NOTIFICATION TEMPLATES
// ============================================================================

export const VENDOR_TEMPLATES: Partial<Record<VendorEvent, NotificationTemplate>> = {
  [VendorEvent.NEW_ORDER]: {
    id: "vendor_new_order",
    name: "New Order",
    event: VendorEvent.NEW_ORDER,
    type: NotificationType.OPERATIONAL,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "New Order",
        body: "New order #{{order_id}} from {{customer_name}} - {{order_total}}",
        deepLink: "/vendor/orders/{{order_id}}",
      },
      [NotificationChannel.IN_APP]: {
        title: "New Order",
        body: "New order #{{order_id}} from {{customer_name}} - {{order_total}}",
      },
      [NotificationChannel.SOCKET]: {
        title: "New Order Alert",
        body: "Order received",
      },
    },
    variables: ["order_id", "customer_name", "order_total", "order_items"],
    priority: "critical",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [VendorEvent.ORDER_CANCELLED]: {
    id: "vendor_order_cancelled",
    name: "Order Cancelled",
    event: VendorEvent.ORDER_CANCELLED,
    type: NotificationType.SYSTEM,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Order Cancelled",
        body: "Order #{{order_id}} from {{customer_name}} has been cancelled.",
      },
      [NotificationChannel.IN_APP]: {
        title: "Order Cancelled",
        body: "Order #{{order_id}} from {{customer_name}} has been cancelled.",
      },
    },
    variables: ["order_id", "customer_name"],
    priority: "medium",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [VendorEvent.DRIVER_ASSIGNED]: {
    id: "vendor_driver_assigned",
    name: "Driver Assigned",
    event: VendorEvent.DRIVER_ASSIGNED,
    type: NotificationType.OPERATIONAL,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Driver Assigned",
        body: "{{driver_name}} is coming to pick up order #{{order_id}}",
      },
      [NotificationChannel.IN_APP]: {
        title: "Driver Assigned",
        body: "{{driver_name}} is coming to pick up order #{{order_id}}",
      },
    },
    variables: ["order_id", "driver_name", "driver_phone"],
    priority: "high",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [VendorEvent.DELIVERY_COMPLETED]: {
    id: "vendor_delivery_completed",
    name: "Delivery Completed",
    event: VendorEvent.DELIVERY_COMPLETED,
    type: NotificationType.SYSTEM,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Delivery Completed",
        body: "Order #{{order_id}} has been delivered successfully.",
      },
      [NotificationChannel.IN_APP]: {
        title: "Delivery Completed",
        body: "Order #{{order_id}} has been delivered successfully.",
      },
    },
    variables: ["order_id"],
    priority: "medium",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [VendorEvent.PAYOUT_PROCESSED]: {
    id: "vendor_payout_processed",
    name: "Payout Processed",
    event: VendorEvent.PAYOUT_PROCESSED,
    type: NotificationType.TRANSACTIONAL,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Payout Received",
        body: "{{amount}} has been credited to your account.",
      },
      [NotificationChannel.IN_APP]: {
        title: "Payout Received",
        body: "{{amount}} has been credited to your account.",
      },
      [NotificationChannel.EMAIL]: {
        title: "Payout Confirmation",
        body: "Hi {{vendor_name}},\n\n{{amount}} has been credited to your account.\n\nTransaction ID: {{transaction_id}}",
      },
    },
    variables: ["amount", "vendor_name", "transaction_id"],
    priority: "high",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [VendorEvent.ACCOUNT_APPROVED]: {
    id: "vendor_account_approved",
    name: "Account Approved",
    event: VendorEvent.ACCOUNT_APPROVED,
    type: NotificationType.SYSTEM,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Account Approved",
        body: "Your vendor account has been approved! Start receiving orders.",
        deepLink: "/vendor/dashboard",
      },
      [NotificationChannel.IN_APP]: {
        title: "Account Approved",
        body: "Your vendor account has been approved! Start receiving orders.",
      },
      [NotificationChannel.EMAIL]: {
        title: "Account Approval",
        body: "Hi {{vendor_name}},\n\nCongratulations! Your vendor account has been approved.\n\nYou can now start receiving orders.",
      },
    },
    variables: ["vendor_name"],
    priority: "high",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [VendorEvent.ACCOUNT_REJECTED]: {
    id: "vendor_account_rejected",
    name: "Account Rejected",
    event: VendorEvent.ACCOUNT_REJECTED,
    type: NotificationType.CRITICAL,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Account Rejected",
        body: "Your vendor account application was rejected. Reason: {{rejection_reason}}",
      },
      [NotificationChannel.IN_APP]: {
        title: "Account Rejected",
        body: "Your vendor account application was rejected. Reason: {{rejection_reason}}",
      },
      [NotificationChannel.EMAIL]: {
        title: "Account Rejection",
        body: "Hi {{vendor_name}},\n\nUnfortunately, your vendor account application was rejected.\n\nReason: {{rejection_reason}}\n\nPlease contact support for more information.",
      },
    },
    variables: ["vendor_name", "rejection_reason"],
    priority: "critical",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

// ============================================================================
// DRIVER NOTIFICATION TEMPLATES
// ============================================================================

export const DRIVER_TEMPLATES: Partial<Record<DriverEvent, NotificationTemplate>> = {
  [DriverEvent.NEW_DELIVERY]: {
    id: "driver_new_delivery",
    name: "New Delivery Available",
    event: DriverEvent.NEW_DELIVERY,
    type: NotificationType.OPERATIONAL,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "New Delivery",
        body: "New delivery available near you - {{order_total}} earnings",
        deepLink: "/driver/deliveries/available",
      },
      [NotificationChannel.IN_APP]: {
        title: "New Delivery Available",
        body: "New delivery from {{vendor_name}} - {{order_total}} earnings",
      },
      [NotificationChannel.SOCKET]: {
        title: "Delivery Alert",
        body: "New delivery available",
      },
    },
    variables: ["order_id", "vendor_name", "order_total", "pickup_location"],
    priority: "critical",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [DriverEvent.DELIVERY_ASSIGNED]: {
    id: "driver_delivery_assigned",
    name: "Delivery Assigned",
    event: DriverEvent.DELIVERY_ASSIGNED,
    type: NotificationType.OPERATIONAL,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Delivery Assigned",
        body: "Order #{{order_id}} assigned to you - {{delivery_fee}} earnings",
        deepLink: "/driver/deliveries/{{order_id}}",
      },
      [NotificationChannel.IN_APP]: {
        title: "Delivery Assigned",
        body: "Order #{{order_id}} assigned to you - {{delivery_fee}} earnings",
      },
    },
    variables: ["order_id", "delivery_fee", "pickup_location", "dropoff_location"],
    priority: "critical",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [DriverEvent.DELIVERY_CANCELLED]: {
    id: "driver_delivery_cancelled",
    name: "Delivery Cancelled",
    event: DriverEvent.DELIVERY_CANCELLED,
    type: NotificationType.SYSTEM,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Delivery Cancelled",
        body: "Order #{{order_id}} has been cancelled.",
      },
      [NotificationChannel.IN_APP]: {
        title: "Delivery Cancelled",
        body: "Order #{{order_id}} has been cancelled.",
      },
    },
    variables: ["order_id"],
    priority: "medium",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [DriverEvent.DELIVERY_COMPLETED]: {
    id: "driver_delivery_completed",
    name: "Delivery Completed",
    event: DriverEvent.DELIVERY_COMPLETED,
    type: NotificationType.SYSTEM,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Delivery Completed",
        body: "Order #{{order_id}} delivered. {{delivery_fee}} added to your wallet.",
      },
      [NotificationChannel.IN_APP]: {
        title: "Delivery Completed",
        body: "Order #{{order_id}} delivered. {{delivery_fee}} added to your wallet.",
      },
    },
    variables: ["order_id", "delivery_fee"],
    priority: "high",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [DriverEvent.PAYOUT_COMPLETED]: {
    id: "driver_payout_completed",
    name: "Payout Completed",
    event: DriverEvent.PAYOUT_COMPLETED,
    type: NotificationType.TRANSACTIONAL,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Payout Received",
        body: "{{amount}} has been credited to your wallet.",
      },
      [NotificationChannel.IN_APP]: {
        title: "Payout Received",
        body: "{{amount}} has been credited to your wallet.",
      },
      [NotificationChannel.EMAIL]: {
        title: "Payout Confirmation",
        body: "Hi {{driver_name}},\n\n{{amount}} has been credited to your wallet.\n\nTransaction ID: {{transaction_id}}",
      },
    },
    variables: ["amount", "driver_name", "transaction_id"],
    priority: "high",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [DriverEvent.ACCOUNT_APPROVED]: {
    id: "driver_account_approved",
    name: "Account Approved",
    event: DriverEvent.ACCOUNT_APPROVED,
    type: NotificationType.SYSTEM,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Account Approved",
        body: "Your driver account has been approved! Start accepting deliveries.",
        deepLink: "/driver/dashboard",
      },
      [NotificationChannel.IN_APP]: {
        title: "Account Approved",
        body: "Your driver account has been approved! Start accepting deliveries.",
      },
      [NotificationChannel.EMAIL]: {
        title: "Account Approval",
        body: "Hi {{driver_name}},\n\nCongratulations! Your driver account has been approved.\n\nYou can now start accepting deliveries.",
      },
    },
    variables: ["driver_name"],
    priority: "high",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [DriverEvent.ACCOUNT_REJECTED]: {
    id: "driver_account_rejected",
    name: "Account Rejected",
    event: DriverEvent.ACCOUNT_REJECTED,
    type: NotificationType.CRITICAL,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Account Rejected",
        body: "Your driver account application was rejected. Reason: {{rejection_reason}}",
      },
      [NotificationChannel.IN_APP]: {
        title: "Account Rejected",
        body: "Your driver account application was rejected. Reason: {{rejection_reason}}",
      },
      [NotificationChannel.EMAIL]: {
        title: "Account Rejection",
        body: "Hi {{driver_name}},\n\nUnfortunately, your driver account application was rejected.\n\nReason: {{rejection_reason}}\n\nPlease contact support for more information.",
      },
    },
    variables: ["driver_name", "rejection_reason"],
    priority: "critical",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

// ============================================================================
// ADMIN NOTIFICATION TEMPLATES
// ============================================================================

export const ADMIN_TEMPLATES: Partial<Record<AdminEvent, NotificationTemplate>> = {
  [AdminEvent.NEW_VENDOR_REGISTRATION]: {
    id: "admin_new_vendor_registration",
    name: "New Vendor Registration",
    event: AdminEvent.NEW_VENDOR_REGISTRATION,
    type: NotificationType.OPERATIONAL,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "New Vendor Registration",
        body: "{{vendor_name}} ({{vendor_type}}) registered and awaiting approval",
        deepLink: "/admin/vendors/pending",
      },
      [NotificationChannel.IN_APP]: {
        title: "New Vendor Registration",
        body: "{{vendor_name}} ({{vendor_type}}) registered and awaiting approval",
      },
    },
    variables: ["vendor_name", "vendor_type", "vendor_id"],
    priority: "high",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [AdminEvent.NEW_DRIVER_REGISTRATION]: {
    id: "admin_new_driver_registration",
    name: "New Driver Registration",
    event: AdminEvent.NEW_DRIVER_REGISTRATION,
    type: NotificationType.OPERATIONAL,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "New Driver Registration",
        body: "{{driver_name}} registered and awaiting approval",
        deepLink: "/admin/drivers/pending",
      },
      [NotificationChannel.IN_APP]: {
        title: "New Driver Registration",
        body: "{{driver_name}} registered and awaiting approval",
      },
    },
    variables: ["driver_name", "driver_id"],
    priority: "high",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [AdminEvent.DISPUTE_ESCALATION]: {
    id: "admin_dispute_escalation",
    name: "Dispute Escalation",
    event: AdminEvent.DISPUTE_ESCALATION,
    type: NotificationType.CRITICAL,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Dispute Escalated",
        body: "Dispute #{{dispute_id}} for order #{{order_id}} requires attention",
        deepLink: "/admin/disputes/{{dispute_id}}",
      },
      [NotificationChannel.IN_APP]: {
        title: "Dispute Escalated",
        body: "Dispute #{{dispute_id}} for order #{{order_id}} requires attention",
      },
    },
    variables: ["dispute_id", "order_id", "reason"],
    priority: "critical",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  [AdminEvent.FRAUD_ALERT]: {
    id: "admin_fraud_alert",
    name: "Fraud Alert",
    event: AdminEvent.FRAUD_ALERT,
    type: NotificationType.CRITICAL,
    channels: {
      [NotificationChannel.PUSH]: {
        title: "Fraud Alert",
        body: "Suspicious activity detected: {{fraud_type}}",
        deepLink: "/admin/security/alerts",
      },
      [NotificationChannel.IN_APP]: {
        title: "Fraud Alert",
        body: "Suspicious activity detected: {{fraud_type}}",
      },
      [NotificationChannel.SMS]: {
        body: "ALERT: Suspicious activity detected on LiWAS platform. {{fraud_type}}",
      },
    },
    variables: ["fraud_type", "user_id", "details"],
    priority: "critical",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

export const NOTIFICATION_TEMPLATES = {
  ...CUSTOMER_TEMPLATES,
  ...VENDOR_TEMPLATES,
  ...DRIVER_TEMPLATES,
  ...ADMIN_TEMPLATES,
};

export function getTemplate(event: CustomerEvent | VendorEvent | DriverEvent | AdminEvent): NotificationTemplate | undefined {
  return NOTIFICATION_TEMPLATES[event as keyof typeof NOTIFICATION_TEMPLATES];
}
