/**
 * Firebase Cloud Functions for LiWAS Notifications
 * Handles sending notifications on key events:
 * - New vendor/driver registration
 * - User approval status changes
 * - New orders created
 */
import { FirestoreEvent, Change } from "firebase-functions/v2/firestore";
/**
 * Subtask 5: New Vendor Registration Notification
 * Triggered when a new vendor document is created
 */
export declare const onNewVendorRegistration: import("firebase-functions/core").CloudFunction<FirestoreEvent<import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined, {
    vendorId: string;
}>>;
/**
 * Subtask 5: New Driver Registration Notification
 * Triggered when a new driver document is created
 */
export declare const onNewDriverRegistration: import("firebase-functions/core").CloudFunction<FirestoreEvent<import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined, {
    driverId: string;
}>>;
/**
 * Subtask 6: User Approval Status Change Notification
 * Triggered when a user's isApproved field changes
 */
export declare const onUserApprovalStatusChange: import("firebase-functions/core").CloudFunction<FirestoreEvent<Change<import("firebase-functions/v2/firestore").QueryDocumentSnapshot> | undefined, {
    userId: string;
}>>;
/**
 * Subtask 7: New Order Notification
 * Triggered when a new order is created
 * Sends notifications to:
 * - Vendor (new order received)
 * - Driver (new delivery assignment)
 */
export declare const onNewOrderCreated: import("firebase-functions/core").CloudFunction<FirestoreEvent<import("firebase-functions/v2/firestore").QueryDocumentSnapshot | undefined, {
    orderId: string;
}>>;
/**
 * Bonus: Order Status Update Notification
 * Triggered when order status changes
 */
export declare const onOrderStatusUpdate: import("firebase-functions/core").CloudFunction<FirestoreEvent<Change<import("firebase-functions/v2/firestore").QueryDocumentSnapshot> | undefined, {
    orderId: string;
}>>;
/**
 * createWalletTopup
 * - Creates a Stripe PaymentIntent for wallet top-up
 * - Requires: auth.uid, amount (number, dollars), currency (default "usd")
 * - Returns: clientSecret, paymentIntentId
 */
export declare const createWalletTopup: import("firebase-functions/v2/https").HttpsFunction;
/**
 * applyWalletTopup
 * - Verifies a PaymentIntent and credits the user's wallet if succeeded
 * - Requires: auth.uid, paymentIntentId
 */
export declare const applyWalletTopup: import("firebase-functions/v2/https").HttpsFunction;
/**
 * setupVendorStripeConnect
 * POST /admin/vendors/{vendorId}/stripe/setup
 * Creates a Stripe Express account for the vendor and generates onboarding URL
 */
export declare const setupVendorStripeConnect: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    onboarding_url: string;
    stripe_account_id: any;
}>, unknown>;
/**
 * getVendorStripeAccountStatus
 * GET /admin/vendors/{vendorId}/stripe/account
 * Fetches the vendor's Stripe account status
 */
export declare const getVendorStripeAccountStatus: import("firebase-functions/v2/https").CallableFunction<any, Promise<{
    success: boolean;
    stripe_account_id: any;
    status: string;
    status_code: string;
    details_submitted: boolean;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    requirements: {
        currently_due: string[];
        eventually_due: string[];
        past_due: string[];
        pending_verification: string[];
    } | null;
}>, unknown>;
/**
 * setupDriverStripeConnectSelfService
 * POST /api/drivers/stripe/setup
 * Allows drivers to set up their own Stripe Connect account
 */
export declare const setupDriverStripeConnectSelfService: import("firebase-functions/v2/https").HttpsFunction;
/**
 * getDriverStripeAccountStatusSelfService
 * GET /api/drivers/stripe/account
 * Allows drivers to check their own Stripe account status
 */
export declare const getDriverStripeAccountStatusSelfService: import("firebase-functions/v2/https").HttpsFunction;
/**
 * setupVendorStripeConnectSelfService
 * POST /api/vendors/stripe/setup
 * Allows vendors to set up their own Stripe Connect account
 */
export declare const setupVendorStripeConnectSelfService: import("firebase-functions/v2/https").HttpsFunction;
/**
 * getVendorStripeAccountStatusSelfService
 * GET /api/vendors/stripe/account
 * Allows vendors to check their own Stripe account status
 */
export declare const getVendorStripeAccountStatusSelfService: import("firebase-functions/v2/https").HttpsFunction;
//# sourceMappingURL=index.d.ts.map