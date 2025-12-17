/**
 * Firebase Cloud Functions for LiWAS Notifications
 * Handles sending notifications on key events:
 * - New vendor/driver registration
 * - User approval status changes
 * - New orders created
 */

import * as admin from "firebase-admin";
import { onDocumentCreated, onDocumentUpdated, FirestoreEvent, Change } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { onCall, CallableRequest, onRequest, Request } from "firebase-functions/v2/https";
import cors from "cors";
import Stripe from "stripe";

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// CORS handler for HTTP functions
const corsHandler = cors({ origin: true });

// Stripe initialization (for wallet top-ups and Connect)
const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret
  ? new Stripe(stripeSecret, { apiVersion: "2022-11-15" })
  : null;

/**
 * Get Stripe instance from Firestore settings or environment
 */
async function getStripeInstance(): Promise<Stripe | null> {
  if (stripe) return stripe;
  
  try {
    // Try paymentSettings first (new location), then fallback to settings (old location)
    const paymentSettingsDoc = await db.collection("systemConfig").doc("paymentSettings").get();
    if (paymentSettingsDoc.exists) {
      const data = paymentSettingsDoc.data();
      const secretKey = data?.stripeSecretKey;
      if (secretKey && secretKey.startsWith("sk_")) {
        return new Stripe(secretKey, { apiVersion: "2022-11-15" });
      }
    }
    
    // Fallback to old settings location
    const settingsDoc = await db.collection("systemConfig").doc("settings").get();
    if (settingsDoc.exists) {
      const data = settingsDoc.data();
      const secretKey = data?.stripeSecretKey;
      if (secretKey && secretKey.startsWith("sk_")) {
        return new Stripe(secretKey, { apiVersion: "2022-11-15" });
      }
    }
  } catch (error) {
    logger.error("Error getting Stripe secret from Firestore:", error);
  }
  
  return null;
}

/**
 * Verify user is admin
 */
async function verifyAdmin(uid: string): Promise<boolean> {
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) return false;
    const userData = userDoc.data();
    return userData?.role === "admin" && userData?.isApproved === true;
  } catch (error) {
    logger.error("Error verifying admin:", error);
    return false;
  }
}

/**
 * Verify Firebase ID token from request
 */
async function verifyAuthToken(req: Request): Promise<string> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("UNAUTHENTICATED: No authorization token provided");
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    logger.error("Error verifying token:", error);
    throw new Error("UNAUTHENTICATED: Invalid token");
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Formats an order ID to display format (#12345678)
 * Uses orderCode if available, otherwise formats the orderId
 */
function formatOrderId(orderId: string, orderData?: any): string {
  // Check if orderCode exists in orderData
  if (orderData?.orderCode && /^#\d{8}$/.test(orderData.orderCode)) {
    return orderData.orderCode;
  }
  
  // If orderId is already in #12345678 format, return as is
  if (/^#\d{8}$/.test(orderId)) {
    return orderId;
  }
  
  // Extract digits from orderId
  const digitsOnly = orderId.replace(/\D/g, '');
  
  if (digitsOnly.length >= 8) {
    return `#${digitsOnly.substring(0, 8)}`;
  } else if (digitsOnly.length > 0) {
    return `#${digitsOnly.padStart(8, '0')}`;
  }
  
  // Fallback: generate a deterministic code from the ID
  let hash = 0;
  for (let i = 0; i < orderId.length; i++) {
    const char = orderId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const code = Math.abs(hash).toString().padStart(8, '0').substring(0, 8);
  return `#${code}`;
}

/**
 * Get all admin FCM tokens
 */
async function getAdminTokens(): Promise<string[]> {
  try {
    const adminsSnapshot = await db
      .collection("users")
      .where("role", "==", "admin")
      .where("fcmToken", "!=", null)
      .get();

    const tokens: string[] = [];
    adminsSnapshot.forEach((doc: admin.firestore.QueryDocumentSnapshot) => {
      const fcmToken = doc.data().fcmToken;
      if (fcmToken) {
        tokens.push(fcmToken);
      }
    });

    return tokens;
  } catch (error) {
    console.error("Error getting admin tokens:", error);
    return [];
  }
}

/**
 * Get user FCM token
 */
async function getUserToken(userId: string): Promise<string | null> {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    return userDoc.data()?.fcmToken || null;
  } catch (error) {
    console.error("Error getting user token:", error);
    return null;
  }
}

/**
 * Send FCM message to tokens
 */
async function sendNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: { [key: string]: string }
): Promise<void> {
  if (tokens.length === 0) {
    console.log("No tokens available for notification");
    return;
  }

  try {
    const message = {
      notification: {
        title,
        body,
      },
      data: data || {},
      webpush: {
        notification: {
          title,
          body,
          icon: "/logo.png",
          badge: "/badge.png",
        },
      },
    };

    // Send to multiple tokens
    const response = await messaging.sendMulticast({
      ...message,
      tokens,
    });

    console.log(`✓ Sent ${response.successCount} notifications`);
    if (response.failureCount > 0) {
      console.warn(`✗ Failed to send ${response.failureCount} notifications`);
    }
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

/**
 * Log notification event
 */
async function logNotification(
  userId: string,
  event: string,
  title: string,
  body: string,
  status: "sent" | "failed" = "sent"
): Promise<void> {
  try {
    await db.collection("notificationLogs").add({
      userId,
      event,
      title,
      body,
      status,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Error logging notification:", error);
  }
}

// ============================================================================
// CLOUD FUNCTIONS
// ============================================================================

/**
 * Subtask 5: New Vendor Registration Notification
 * Triggered when a new vendor document is created
 */
export const onNewVendorRegistration = onDocumentCreated(
  "vendors/{vendorId}",
  async (event: FirestoreEvent<admin.firestore.QueryDocumentSnapshot | undefined>) => {
    const snap = event.data;
    const context = event;
    const vendorId = event.params.vendorId;
    try {
      if (!snap) return;
      const vendorData = snap.data();
      logger.info(`📢 New vendor registration: ${vendorId}`);

      // Get vendor user info
      const userDoc = await db.collection("users").doc(vendorId).get();
      const userData = userDoc.data();

      if (!userData) {
        console.error("Vendor user document not found");
        return;
      }

      // Get all admin tokens
      const adminTokens = await getAdminTokens();

      if (adminTokens.length === 0) {
        console.log("No admin tokens available");
        return;
      }

      // Send notification to admins
      const title = "🏪 New Vendor Registration";
      const body = `${userData.email} registered as a vendor (${vendorData.vendorType})`;

      await sendNotification(adminTokens, title, body, {
        vendorId,
        event: "vendor_registration",
        email: userData.email,
      });

      // Log notification
      await logNotification(
        vendorId,
        "vendor_registration",
        title,
        body,
        "sent"
      );
    } catch (error) {
      logger.error("Error in onNewVendorRegistration:", error);
    }
  }
);

/**
 * Subtask 5: New Driver Registration Notification
 * Triggered when a new driver document is created
 */
export const onNewDriverRegistration = onDocumentCreated(
  "drivers/{driverId}",
  async (event: FirestoreEvent<admin.firestore.QueryDocumentSnapshot | undefined>) => {
    const snap = event.data;
    const context = event;
    const driverId = event.params.driverId;
    try {
      if (!snap) return;
      const driverData = snap.data();
      logger.info(`📢 New driver registration: ${driverId}`);

      // Get driver user info
      const userDoc = await db.collection("users").doc(driverId).get();
      const userData = userDoc.data();

      if (!userData) {
        console.error("Driver user document not found");
        return;
      }

      // Get all admin tokens
      const adminTokens = await getAdminTokens();

      if (adminTokens.length === 0) {
        console.log("No admin tokens available");
        return;
      }

      // Send notification to admins
      const title = "🚗 New Driver Registration";
      const body = `${userData.email} registered as a driver (${driverData.driverType})`;

      await sendNotification(adminTokens, title, body, {
        driverId,
        event: "driver_registration",
        email: userData.email,
      });

      // Log notification
      await logNotification(
        driverId,
        "driver_registration",
        title,
        body,
        "sent"
      );
    } catch (error) {
      logger.error("Error in onNewDriverRegistration:", error);
    }
  }
);

/**
 * Subtask 6: User Approval Status Change Notification
 * Triggered when a user's isApproved field changes
 */
export const onUserApprovalStatusChange = onDocumentUpdated(
  "users/{userId}",
  async (event: FirestoreEvent<Change<admin.firestore.QueryDocumentSnapshot> | undefined>) => {
    const change = { before: event.data?.before, after: event.data };
    const context = event;
    const userId = event.params.userId;
    try {
      if (!change.before || !change.after) return;
      const beforeData = (change.before as any).data();
      const afterData = (change.after as any).data();

      // Check if isApproved field changed
      if (beforeData?.isApproved === afterData?.isApproved) {
        return;
      }

      const isApproved = afterData.isApproved;
      const userRole = afterData.role;
      const userEmail = afterData.email;

      logger.info(`📢 User approval status changed: ${userId} - ${isApproved ? "approved" : "rejected"}`);

      // Get user FCM token
      const userToken = await getUserToken(userId);

      if (!userToken) {
        console.log("User has no FCM token");
        return;
      }

      let title: string;
      let body: string;
      let event: string;

      if (isApproved) {
        // Approval notification
        title = "✅ Account Approved!";
        body =
          userRole === "vendor"
            ? "Your restaurant has been approved. You can now start accepting orders!"
            : "Your driver account has been approved. You can now start accepting deliveries!";
        event = "account_approved";
      } else {
        // Rejection notification
        title = "❌ Account Rejected";
        body =
          userRole === "vendor"
            ? "Your restaurant registration was rejected. Please contact support for more information."
            : "Your driver registration was rejected. Please contact support for more information.";
        event = "account_rejected";
      }

      // Send notification to user
      await sendNotification([userToken], title, body, {
        userId,
        event,
        isApproved: isApproved.toString(),
      });

      // Log notification
      await logNotification(userId, event, title, body, "sent");
    } catch (error) {
      logger.error("Error in onUserApprovalStatusChange:", error);
    }
  }
);

/**
 * Subtask 7: New Order Notification
 * Triggered when a new order is created
 * Sends notifications to:
 * - Vendor (new order received)
 * - Driver (new delivery assignment)
 */
export const onNewOrderCreated = onDocumentCreated(
  "orders/{orderId}",
  async (event: FirestoreEvent<admin.firestore.QueryDocumentSnapshot | undefined>) => {
    const snap = event.data;
    const orderId = event.params.orderId;
    try {
      if (!snap) return;
      const orderData = snap.data();
      logger.info(`📢 New order created: ${orderId}`);

      // ===== VENDOR NOTIFICATION =====
      if (orderData.vendorId) {
        const vendorToken = await getUserToken(orderData.vendorId);

        if (vendorToken) {
          const formattedOrderId = formatOrderId(orderId, orderData);
          const vendorTitle = "🆕 New Order Received";
          const vendorBody = `Order ${formattedOrderId} - ${orderData.totalAmount ? `$${orderData.totalAmount}` : "Amount pending"}`;

          await sendNotification([vendorToken], vendorTitle, vendorBody, {
            orderId,
            event: "new_order",
            vendorId: orderData.vendorId,
          });

          await logNotification(
            orderData.vendorId,
            "new_order",
            vendorTitle,
            vendorBody,
            "sent"
          );
        }
      }

      // ===== DRIVER NOTIFICATION =====
      if (orderData.driverId) {
        const driverToken = await getUserToken(orderData.driverId);

        if (driverToken) {
          const driverTitle = "🚗 New Delivery Assigned";
          const driverBody = `Pickup from ${orderData.pickupLocation?.address || "Pickup location"} to ${orderData.dropoffLocation?.address || "Dropoff location"}`;

          await sendNotification([driverToken], driverTitle, driverBody, {
            orderId,
            event: "delivery_assigned",
            driverId: orderData.driverId,
          });

          await logNotification(
            orderData.driverId,
            "delivery_assigned",
            driverTitle,
            driverBody,
            "sent"
          );
        }
      }

      // ===== CUSTOMER NOTIFICATION =====
      if (orderData.userId) {
        const customerToken = await getUserToken(orderData.userId);

        if (customerToken) {
          const formattedOrderId = formatOrderId(orderId, orderData);
          const customerTitle = "✅ Order Confirmed";
          const customerBody = `Your order ${formattedOrderId} has been confirmed`;

          await sendNotification([customerToken], customerTitle, customerBody, {
            orderId,
            event: "order_confirmed",
            userId: orderData.userId,
          });

          await logNotification(
            orderData.userId,
            "order_confirmed",
            customerTitle,
            customerBody,
            "sent"
          );
        }
      }
    } catch (error) {
      logger.error("Error in onNewOrderCreated:", error);
    }
  }
);

/**
 * Bonus: Order Status Update Notification
 * Triggered when order status changes
 */
export const onOrderStatusUpdate = onDocumentUpdated(
  "orders/{orderId}",
  async (event: FirestoreEvent<Change<admin.firestore.QueryDocumentSnapshot> | undefined>) => {
    const orderId = event.params.orderId;
    try {
      if (!event.data?.before || !event.data?.after) return;
      const beforeData = event.data.before.data();
      const afterData = event.data.after.data();

      // Check if status changed
      if (beforeData?.orderStatus === afterData?.orderStatus) {
        return;
      }

      const newStatus = afterData?.orderStatus;
      if (!newStatus) return;
      logger.info(`📢 Order status updated: ${orderId} - ${newStatus}`);

      const customerToken = await getUserToken(afterData?.userId || "");

      if (!customerToken) {
        return;
      }

      const formattedOrderId = formatOrderId(orderId, afterData);
      let title: string;
      let body: string;

      switch (newStatus) {
        case "accepted":
          title = "🎉 Order Accepted";
          body = `Your order ${formattedOrderId} has been accepted by the vendor`;
          break;
        case "rejected":
          title = "❌ Order Rejected";
          body = `Your order ${formattedOrderId} was rejected. Please try again.`;
          break;
        case "in-transit":
          title = "🚗 On the Way";
          body = `Your order ${formattedOrderId} is on the way to you`;
          break;
        case "delivered":
          title = "✅ Delivered";
          body = `Your order ${formattedOrderId} has been delivered`;
          break;
        default:
          return;
      }

      await sendNotification([customerToken], title, body, {
        orderId,
        event: `order_${newStatus}`,
        status: newStatus,
      });

      await logNotification(afterData?.userId || "", `order_${newStatus}`, title, body, "sent");
    } catch (error) {
      logger.error("Error in onOrderStatusUpdate:", error);
    }
  }
);

// ============================================================================
// WALLET TOP-UP (Stripe)
// ============================================================================

/**
 * createWalletTopup
 * - Creates a Stripe PaymentIntent for wallet top-up
 * - Requires: auth.uid, amount (number, dollars), currency (default "usd")
 * - Returns: clientSecret, paymentIntentId
 */
export const createWalletTopup = onRequest(
  { region: "us-central1" },
  async (req: Request, res: any) => {
    corsHandler(req, res, async () => {
      try {
        // Verify authentication
        const userId = await verifyAuthToken(req);

        // Try to get Stripe instance from Firestore settings if not in env
        const stripeInstance = await getStripeInstance();
        if (!stripeInstance) {
          res.status(500).json({ error: "Stripe not configured. Please set Stripe keys in admin payment settings." });
          return;
        }

        const { amount, currency = "usd" } = req.body || {};
        const amountNumber = Number(amount);
        if (!amountNumber || Number.isNaN(amountNumber) || amountNumber <= 0) {
          res.status(400).json({ error: "Invalid amount" });
          return;
        }

        // Convert dollars to cents
        const amountInCents = Math.round(amountNumber * 100);

        const paymentIntent = await stripeInstance.paymentIntents.create({
          amount: amountInCents,
          currency,
          metadata: {
            userId: userId,
            type: "wallet-topup",
          },
          description: `Wallet top-up for user ${userId}`,
        });

        res.status(200).json({
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        });
      } catch (error: any) {
        logger.error(`Error creating wallet topup:`, error);
        if (error.message?.includes("UNAUTHENTICATED")) {
          res.status(401).json({ error: error.message });
          return;
        }
        res.status(500).json({ error: error.message || "Failed to create payment intent" });
      }
    });
  }
);

/**
 * applyWalletTopup
 * - Verifies a PaymentIntent and credits the user's wallet if succeeded
 * - Requires: auth.uid, paymentIntentId
 */
export const applyWalletTopup = onRequest(
  { region: "us-central1" },
  async (req: Request, res: any) => {
    corsHandler(req, res, async () => {
      try {
        // Verify authentication
        const userId = await verifyAuthToken(req);
        
        // Try to get Stripe instance from Firestore settings if not in env
        const stripeInstance = await getStripeInstance();
        if (!stripeInstance) {
          res.status(500).json({ error: "Stripe not configured. Please set Stripe keys in admin payment settings." });
          return;
        }

        const { paymentIntentId } = req.body || {};
        if (!paymentIntentId) {
          res.status(400).json({ error: "paymentIntentId is required" });
          return;
        }

        const pi = await stripeInstance.paymentIntents.retrieve(paymentIntentId);
        if (!pi || pi.status !== "succeeded") {
          res.status(400).json({ error: "PaymentIntent not succeeded" });
          return;
        }

        const paymentUserId = (pi.metadata && pi.metadata.userId) || userId;
        if (!paymentUserId) {
          res.status(400).json({ error: "userId missing from metadata" });
          return;
        }

        const amountInCents = pi.amount_received || pi.amount || 0;
        const amount = amountInCents / 100;
        const currency = pi.currency || "usd";

        // Credit wallet
        const walletRef = db.collection("wallets").doc(paymentUserId);
        await walletRef.set(
          {
            balance: admin.firestore.FieldValue.increment(amount),
            currency: currency.toUpperCase(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedBy: paymentUserId,
            lastTopup: {
              paymentIntentId,
              amount,
              currency: currency.toUpperCase(),
              processedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );

        // Log wallet transaction
        const txRef = db.collection("walletTransactions").doc();
        await txRef.set({
          id: txRef.id,
          walletId: paymentUserId,
          userId: paymentUserId,
          amount,
          currency: currency.toUpperCase(),
          type: "credit",
          reason: "wallet-topup",
          paymentIntentId,
          status: "succeeded",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({
          success: true,
          walletId: paymentUserId,
          amount,
          currency: currency.toUpperCase(),
        });
      } catch (error: any) {
        logger.error(`Error applying wallet topup:`, error);
        if (error.message?.includes("UNAUTHENTICATED")) {
          res.status(401).json({ error: error.message });
          return;
        }
        res.status(500).json({ error: error.message || "Failed to apply wallet topup" });
      }
    });
  }
);

// ============================================================================
// STRIPE CONNECT - VENDOR PAYOUTS
// ============================================================================

/**
 * setupVendorStripeConnect
 * POST /admin/vendors/{vendorId}/stripe/setup
 * Creates a Stripe Express account for the vendor and generates onboarding URL
 */
export const setupVendorStripeConnect = onCall(
  { region: "us-central1" },
  async (request: CallableRequest) => {
    // Verify authentication
    if (!request.auth || !request.auth.uid) {
      throw new Error("UNAUTHENTICATED");
    }

    // Verify admin role
    const isAdmin = await verifyAdmin(request.auth.uid);
    if (!isAdmin) {
      throw new Error("UNAUTHORIZED: Admin access required");
    }

    const { vendorId } = request.data || {};
    if (!vendorId) {
      throw new Error("vendorId is required");
    }

    // Get Stripe instance
    const stripeInstance = await getStripeInstance();
    if (!stripeInstance) {
      throw new Error("Stripe not configured. Please set up Stripe keys in admin settings.");
    }

    try {
      // Verify vendor exists
      const vendorDoc = await db.collection("vendors").doc(vendorId).get();
      if (!vendorDoc.exists) {
        throw new Error("Vendor not found");
      }

      const vendorData = vendorDoc.data();
      let stripeAccountId = vendorData?.stripeAccountId;

      // Create Stripe Express account if it doesn't exist
      if (!stripeAccountId) {
        logger.info(`Creating Stripe Express account for vendor: ${vendorId}`);
        
        const account = await stripeInstance.accounts.create({
          type: "express",
          country: vendorData?.country || "US", // Default to US, can be configured
          email: vendorData?.email || undefined,
          capabilities: {
            card_payments: { requested: true },
            transfers: { requested: true },
          },
          business_type: "company",
        });

        stripeAccountId = account.id;
        logger.info(`Created Stripe account: ${stripeAccountId} for vendor: ${vendorId}`);

        // Save stripe_account_id to vendor document
        await db.collection("vendors").doc(vendorId).update({
          stripeAccountId: stripeAccountId,
          stripeAccountCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        logger.info(`Using existing Stripe account: ${stripeAccountId} for vendor: ${vendorId}`);
      }

      // Generate onboarding link
      const accountLink = await stripeInstance.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${request.rawRequest?.headers?.origin || "https://your-app.com"}/admin/vendors?refresh=true`,
        return_url: `${request.rawRequest?.headers?.origin || "https://your-app.com"}/admin/vendors?return=true`,
        type: "account_onboarding",
      });

      logger.info(`Generated onboarding URL for vendor ${vendorId}: ${accountLink.url}`);

      return {
        success: true,
        onboarding_url: accountLink.url,
        stripe_account_id: stripeAccountId,
      };
    } catch (error: any) {
      logger.error(`Error setting up Stripe Connect for vendor ${vendorId}:`, error);
      
      // Return clean error messages
      if (error.type === "StripeInvalidRequestError") {
        throw new Error(`Stripe API error: ${error.message}`);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error("Failed to set up Stripe Connect account");
    }
  }
);

/**
 * getVendorStripeAccountStatus
 * GET /admin/vendors/{vendorId}/stripe/account
 * Fetches the vendor's Stripe account status
 */
export const getVendorStripeAccountStatus = onCall(
  { region: "us-central1" },
  async (request: CallableRequest) => {
    // Verify authentication
    if (!request.auth || !request.auth.uid) {
      throw new Error("UNAUTHENTICATED");
    }

    // Verify admin role
    const isAdmin = await verifyAdmin(request.auth.uid);
    if (!isAdmin) {
      throw new Error("UNAUTHORIZED: Admin access required");
    }

    const { vendorId } = request.data || {};
    if (!vendorId) {
      throw new Error("vendorId is required");
    }

    // Get Stripe instance
    const stripeInstance = await getStripeInstance();
    if (!stripeInstance) {
      throw new Error("Stripe not configured. Please set up Stripe keys in admin settings.");
    }

    try {
      // Get vendor document
      const vendorDoc = await db.collection("vendors").doc(vendorId).get();
      if (!vendorDoc.exists) {
        throw new Error("Vendor not found");
      }

      const vendorData = vendorDoc.data();
      const stripeAccountId = vendorData?.stripeAccountId;

      if (!stripeAccountId) {
        return {
          success: true,
          stripe_account_id: null,
          status: "Not Set Up",
          status_code: "not_setup",
          details_submitted: false,
          charges_enabled: false,
          payouts_enabled: false,
          requirements: null,
        };
      }

      // Fetch account from Stripe
      const account = await stripeInstance.accounts.retrieve(stripeAccountId);
      
      logger.info(`Retrieved Stripe account status for vendor ${vendorId}:`, {
        accountId: stripeAccountId,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      });

      // Determine human-readable status
      let status = "Pending Verification";
      let statusCode = "pending";

      if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
        status = "Verified";
        statusCode = "verified";
      } else if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
        status = "Rejected / Requirements Missing";
        statusCode = "requirements_missing";
      } else if (!account.details_submitted) {
        status = "Pending Verification";
        statusCode = "pending";
      }

      return {
        success: true,
        stripe_account_id: stripeAccountId,
        status: status,
        status_code: statusCode,
        details_submitted: account.details_submitted || false,
        charges_enabled: account.charges_enabled || false,
        payouts_enabled: account.payouts_enabled || false,
        requirements: account.requirements ? {
          currently_due: account.requirements.currently_due || [],
          eventually_due: account.requirements.eventually_due || [],
          past_due: account.requirements.past_due || [],
          pending_verification: account.requirements.pending_verification || [],
        } : null,
      };
    } catch (error: any) {
      logger.error(`Error getting Stripe account status for vendor ${vendorId}:`, error);
      
      // Return clean error messages
      if (error.type === "StripeInvalidRequestError") {
        throw new Error(`Stripe API error: ${error.message}`);
      }
      if (error.message) {
        throw new Error(error.message);
      }
      throw new Error("Failed to get Stripe account status");
    }
  }
);

// ============================================================================
// STRIPE CONNECT - DRIVER SELF-SERVICE
// ============================================================================

/**
 * setupDriverStripeConnectSelfService
 * POST /api/drivers/stripe/setup
 * Allows drivers to set up their own Stripe Connect account
 */
export const setupDriverStripeConnectSelfService = onRequest(
  { 
    region: "us-central1",
  },
  async (req: Request, res: any) => {
    corsHandler(req, res, async () => {
      try {
        // Verify authentication
        const driverId = await verifyAuthToken(req);

        // Get Stripe instance
        const stripeInstance = await getStripeInstance();
        if (!stripeInstance) {
          res.status(500).json({ error: "Stripe not configured. Please contact support." });
          return;
        }

        // Verify driver exists
        const driverDoc = await db.collection("drivers").doc(driverId).get();
        if (!driverDoc.exists) {
          res.status(404).json({ error: "Driver profile not found" });
          return;
        }

        const driverData = driverDoc.data();
        let stripeAccountId = driverData?.stripeAccountId;

        // Create Stripe Express account if it doesn't exist
        if (!stripeAccountId) {
          logger.info(`Creating Stripe Express account for driver: ${driverId}`);
          
          const account = await stripeInstance.accounts.create({
            type: "express",
            country: driverData?.country || "US",
            email: driverData?.email || undefined,
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            business_type: "individual",
          });

          stripeAccountId = account.id;
          logger.info(`Created Stripe account: ${stripeAccountId} for driver: ${driverId}`);

          // Save stripe_account_id to driver document
          await db.collection("drivers").doc(driverId).update({
            stripeAccountId: stripeAccountId,
            stripeAccountCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          logger.info(`Using existing Stripe account: ${stripeAccountId} for driver: ${driverId}`);
        }

        // Generate onboarding link
        const origin = req.headers.origin || req.headers.referer || "https://your-app.com";
        const accountLink = await stripeInstance.accountLinks.create({
          account: stripeAccountId,
          refresh_url: `${origin}/driver/payments?refresh=true`,
          return_url: `${origin}/driver/payments?return=true`,
          type: "account_onboarding",
        });

        logger.info(`Generated onboarding URL for driver ${driverId}: ${accountLink.url}`);

        res.status(200).json({
          success: true,
          onboarding_url: accountLink.url,
          stripe_account_id: stripeAccountId,
        });
      } catch (error: any) {
        logger.error(`Error setting up Stripe Connect:`, error);
        
        // Return clean error messages
        if (error.message?.includes("UNAUTHENTICATED")) {
          res.status(401).json({ error: error.message });
          return;
        }
        if (error.type === "StripeInvalidRequestError") {
          // Check for specific Stripe Connect errors
          if (error.message?.includes("signed up for Connect")) {
            res.status(500).json({ 
              error: "Stripe Connect is not enabled on your account. Please enable Stripe Connect in your Stripe Dashboard at https://dashboard.stripe.com/settings/connect",
              code: "STRIPE_CONNECT_NOT_ENABLED"
            });
            return;
          }
          res.status(500).json({ error: `Stripe API error: ${error.message}` });
          return;
        }
        res.status(500).json({ error: error.message || "Failed to set up Stripe Connect account" });
      }
    });
  }
);

/**
 * getDriverStripeAccountStatusSelfService
 * GET /api/drivers/stripe/account
 * Allows drivers to check their own Stripe account status
 */
export const getDriverStripeAccountStatusSelfService = onRequest(
  { 
    region: "us-central1",
  },
  async (req: Request, res: any) => {
    corsHandler(req, res, async () => {
      try {
        // Verify authentication
        const driverId = await verifyAuthToken(req);

        // Get Stripe instance
        const stripeInstance = await getStripeInstance();
        if (!stripeInstance) {
          res.status(500).json({ error: "Stripe not configured. Please contact support." });
          return;
        }

        // Get driver document
        const driverDoc = await db.collection("drivers").doc(driverId).get();
        if (!driverDoc.exists) {
          res.status(404).json({ error: "Driver profile not found" });
          return;
        }

        const driverData = driverDoc.data();
        const stripeAccountId = driverData?.stripeAccountId;

        if (!stripeAccountId) {
          res.status(200).json({
            success: true,
            stripe_account_id: null,
            status: "Not Set Up",
            status_code: "not_setup",
            details_submitted: false,
            charges_enabled: false,
            payouts_enabled: false,
            requirements: null,
          });
          return;
        }

        // Fetch account from Stripe
        const account = await stripeInstance.accounts.retrieve(stripeAccountId);
        
        logger.info(`Retrieved Stripe account status for driver ${driverId}:`, {
          accountId: stripeAccountId,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
        });

        // Determine human-readable status
        let status = "Pending Verification";
        let statusCode = "pending";

        if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
          status = "Verified";
          statusCode = "verified";
        } else if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
          status = "Rejected";
          statusCode = "requirements_missing";
        } else if (!account.details_submitted) {
          status = "Pending Verification";
          statusCode = "pending";
        }

        res.status(200).json({
          success: true,
          stripe_account_id: stripeAccountId,
          status: status,
          status_code: statusCode,
          details_submitted: account.details_submitted || false,
          charges_enabled: account.charges_enabled || false,
          payouts_enabled: account.payouts_enabled || false,
          requirements: account.requirements ? {
            currently_due: account.requirements.currently_due || [],
            eventually_due: account.requirements.eventually_due || [],
            past_due: account.requirements.past_due || [],
            pending_verification: account.requirements.pending_verification || [],
          } : null,
        });
      } catch (error: any) {
        logger.error(`Error getting Stripe account status:`, error);
        
        // Return clean error messages
        if (error.message?.includes("UNAUTHENTICATED")) {
          res.status(401).json({ error: error.message });
          return;
        }
        if (error.type === "StripeInvalidRequestError") {
          res.status(500).json({ error: `Stripe API error: ${error.message}` });
          return;
        }
        res.status(500).json({ error: error.message || "Failed to get Stripe account status" });
      }
    });
  }
);

// ============================================================================
// STRIPE CONNECT - VENDOR SELF-SERVICE
// ============================================================================

/**
 * setupVendorStripeConnectSelfService
 * POST /api/vendors/stripe/setup
 * Allows vendors to set up their own Stripe Connect account
 */
export const setupVendorStripeConnectSelfService = onRequest(
  { 
    region: "us-central1",
  },
  async (req: Request, res: any) => {
    corsHandler(req, res, async () => {
      try {
        // Verify authentication
        const vendorId = await verifyAuthToken(req);

        // Get Stripe instance
        const stripeInstance = await getStripeInstance();
        if (!stripeInstance) {
          res.status(500).json({ error: "Stripe not configured. Please contact support." });
          return;
        }

        // Verify vendor exists
        const vendorDoc = await db.collection("vendors").doc(vendorId).get();
        if (!vendorDoc.exists) {
          res.status(404).json({ error: "Vendor profile not found" });
          return;
        }

        const vendorData = vendorDoc.data();
        let stripeAccountId = vendorData?.stripeAccountId;

        // Create Stripe Express account if it doesn't exist
        if (!stripeAccountId) {
          logger.info(`Creating Stripe Express account for vendor: ${vendorId}`);
          
          const account = await stripeInstance.accounts.create({
            type: "express",
            country: vendorData?.country || "US",
            email: vendorData?.email || undefined,
            capabilities: {
              card_payments: { requested: true },
              transfers: { requested: true },
            },
            business_type: "company",
          });

          stripeAccountId = account.id;
          logger.info(`Created Stripe account: ${stripeAccountId} for vendor: ${vendorId}`);

          // Save stripe_account_id to vendor document
          await db.collection("vendors").doc(vendorId).update({
            stripeAccountId: stripeAccountId,
            stripeAccountCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          logger.info(`Using existing Stripe account: ${stripeAccountId} for vendor: ${vendorId}`);
        }

        // Generate onboarding link
        const origin = req.headers.origin || req.headers.referer || "https://your-app.com";
        const accountLink = await stripeInstance.accountLinks.create({
          account: stripeAccountId,
          refresh_url: `${origin}/vendor/payments?refresh=true`,
          return_url: `${origin}/vendor/payments?return=true`,
          type: "account_onboarding",
        });

        logger.info(`Generated onboarding URL for vendor ${vendorId}: ${accountLink.url}`);

        res.status(200).json({
          success: true,
          onboarding_url: accountLink.url,
          stripe_account_id: stripeAccountId,
        });
      } catch (error: any) {
        logger.error(`Error setting up Stripe Connect:`, error);
        
        // Return clean error messages
        if (error.message?.includes("UNAUTHENTICATED")) {
          res.status(401).json({ error: error.message });
          return;
        }
        if (error.type === "StripeInvalidRequestError") {
          // Check for specific Stripe Connect errors
          if (error.message?.includes("signed up for Connect")) {
            res.status(500).json({ 
              error: "Stripe Connect is not enabled on your account. Please enable Stripe Connect in your Stripe Dashboard at https://dashboard.stripe.com/settings/connect",
              code: "STRIPE_CONNECT_NOT_ENABLED"
            });
            return;
          }
          res.status(500).json({ error: `Stripe API error: ${error.message}` });
          return;
        }
        res.status(500).json({ error: error.message || "Failed to set up Stripe Connect account" });
      }
    });
  }
);

/**
 * getVendorStripeAccountStatusSelfService
 * GET /api/vendors/stripe/account
 * Allows vendors to check their own Stripe account status
 */
export const getVendorStripeAccountStatusSelfService = onRequest(
  { 
    region: "us-central1",
  },
  async (req: Request, res: any) => {
    corsHandler(req, res, async () => {
      try {
        // Verify authentication
        const vendorId = await verifyAuthToken(req);

        // Get Stripe instance
        const stripeInstance = await getStripeInstance();
        if (!stripeInstance) {
          res.status(500).json({ error: "Stripe not configured. Please contact support." });
          return;
        }

        // Get vendor document
        const vendorDoc = await db.collection("vendors").doc(vendorId).get();
        if (!vendorDoc.exists) {
          res.status(404).json({ error: "Vendor profile not found" });
          return;
        }

        const vendorData = vendorDoc.data();
        const stripeAccountId = vendorData?.stripeAccountId;

        if (!stripeAccountId) {
          res.status(200).json({
            success: true,
            stripe_account_id: null,
            status: "Not Set Up",
            status_code: "not_setup",
            details_submitted: false,
            charges_enabled: false,
            payouts_enabled: false,
            requirements: null,
          });
          return;
        }

        // Fetch account from Stripe
        const account = await stripeInstance.accounts.retrieve(stripeAccountId);
        
        logger.info(`Retrieved Stripe account status for vendor ${vendorId}:`, {
          accountId: stripeAccountId,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
          detailsSubmitted: account.details_submitted,
        });

        // Determine human-readable status
        let status = "Pending Verification";
        let statusCode = "pending";

        if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
          status = "Verified";
          statusCode = "verified";
        } else if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
          status = "Rejected";
          statusCode = "requirements_missing";
        } else if (!account.details_submitted) {
          status = "Pending Verification";
          statusCode = "pending";
        }

        res.status(200).json({
          success: true,
          stripe_account_id: stripeAccountId,
          status: status,
          status_code: statusCode,
          details_submitted: account.details_submitted || false,
          charges_enabled: account.charges_enabled || false,
          payouts_enabled: account.payouts_enabled || false,
          requirements: account.requirements ? {
            currently_due: account.requirements.currently_due || [],
            eventually_due: account.requirements.eventually_due || [],
            past_due: account.requirements.past_due || [],
            pending_verification: account.requirements.pending_verification || [],
          } : null,
        });
      } catch (error: any) {
        logger.error(`Error getting Stripe account status:`, error);
        
        // Return clean error messages
        if (error.message?.includes("UNAUTHENTICATED")) {
          res.status(401).json({ error: error.message });
          return;
        }
        if (error.type === "StripeInvalidRequestError") {
          res.status(500).json({ error: `Stripe API error: ${error.message}` });
          return;
        }
        res.status(500).json({ error: error.message || "Failed to get Stripe account status" });
      }
    });
  }
);
