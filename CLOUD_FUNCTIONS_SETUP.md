# Cloud Functions Setup Guide

This guide explains how to set up and deploy Firebase Cloud Functions for the LiWAS notification system.

## 📋 What These Functions Do

### 1. **onNewVendorRegistration** (Subtask 5)
- **Trigger**: When a new vendor document is created
- **Action**: Sends notification to all admins
- **Message**: "🏪 New Vendor Registration - {email} registered as a vendor"

### 2. **onNewDriverRegistration** (Subtask 5)
- **Trigger**: When a new driver document is created
- **Action**: Sends notification to all admins
- **Message**: "🚗 New Driver Registration - {email} registered as a driver"

### 3. **onUserApprovalStatusChange** (Subtask 6)
- **Trigger**: When a user's `isApproved` field changes
- **Action**: Sends notification to the user
- **Message**: 
  - If approved: "✅ Account Approved! You can now start accepting orders/deliveries"
  - If rejected: "❌ Account Rejected. Please contact support"

### 4. **onNewOrderCreated** (Subtask 7)
- **Trigger**: When a new order is created
- **Action**: Sends notifications to:
  - **Vendor**: "🆕 New Order Received - Order #{orderId}"
  - **Driver**: "🚗 New Delivery Assigned - Pickup to Dropoff"
  - **Customer**: "✅ Order Confirmed - Order #{orderId}"

### 5. **onOrderStatusUpdate** (Bonus)
- **Trigger**: When order status changes
- **Action**: Sends notification to customer
- **Messages**:
  - "🎉 Order Accepted"
  - "❌ Order Rejected"
  - "🚗 On the Way"
  - "✅ Delivered"

---

## 🚀 Setup Instructions

### Step 1: Install Firebase CLI (if not already installed)
```bash
npm install -g firebase-tools
```

### Step 2: Initialize Firebase Functions
```bash
cd c:\Users\kinge\Documents\Github\web-app
firebase init functions
```

When prompted:
- **Language**: Choose TypeScript
- **ESLint**: Choose Yes
- **Overwrite existing files**: Choose No (we have our own setup)

### Step 3: Install Dependencies
```bash
cd functions
npm install
```

### Step 4: Build the Functions
```bash
npm run build
```

### Step 5: Deploy to Firebase
```bash
firebase deploy --only functions
```

---

## 🧪 Testing the Functions

### Test 1: New Vendor Registration
1. Create a new vendor account
2. Check Firebase Console → Firestore → `notificationLogs`
3. Verify a log entry was created
4. Check admin's device for notification

### Test 2: New Driver Registration
1. Create a new driver account
2. Check Firebase Console → Firestore → `notificationLogs`
3. Verify a log entry was created
4. Check admin's device for notification

### Test 3: User Approval
1. As admin, approve a vendor/driver
2. Check Firebase Console → Firestore → `notificationLogs`
3. Verify a log entry was created
4. Check the user's device for notification

### Test 4: New Order
1. Create a new order
2. Check Firebase Console → Firestore → `notificationLogs`
3. Verify 3 log entries (vendor, driver, customer)
4. Check devices for notifications

---

## 📊 Monitoring Functions

### View Function Logs
```bash
firebase functions:log
```

### View Specific Function Logs
```bash
firebase functions:log --function=onNewVendorRegistration
```

### View Real-time Logs
```bash
firebase functions:log --follow
```

---

## 🔧 Troubleshooting

### Issue: "Permission denied" when deploying
**Solution**: 
1. Make sure you're logged in: `firebase login`
2. Make sure you're in the right project: `firebase use liwas-793a1`

### Issue: Functions not triggering
**Solution**:
1. Check Firestore security rules - they might be blocking writes
2. Check function logs: `firebase functions:log`
3. Verify the trigger path matches your collection structure

### Issue: Notifications not being sent
**Solution**:
1. Check if users have FCM tokens stored
2. Check function logs for errors
3. Verify Firestore rules allow reading user documents

---

## 📝 Function Code Structure

Each function follows this pattern:

```typescript
export const functionName = functions.firestore
  .document("collection/{docId}")
  .onCreate/onUpdate/onDelete(async (snap/change, context) => {
    try {
      // 1. Get data
      const data = snap.data();
      
      // 2. Get tokens
      const tokens = await getTokens();
      
      // 3. Send notification
      await sendNotification(tokens, title, body, data);
      
      // 4. Log event
      await logNotification(userId, event, title, body);
    } catch (error) {
      console.error("Error:", error);
    }
  });
```

---

## 🔐 Security Considerations

1. **FCM Tokens**: Only stored in Firestore, never exposed to client
2. **Admin Access**: Only admins can access certain functions
3. **User Privacy**: Users only receive notifications for their own events
4. **Rate Limiting**: Consider adding rate limiting for production

---

## 📚 Additional Resources

- [Firebase Cloud Functions Documentation](https://firebase.google.com/docs/functions)
- [Firestore Triggers](https://firebase.google.com/docs/functions/firestore-events)
- [Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)

---

## ✅ Deployment Checklist

- [ ] Firebase CLI installed
- [ ] Functions code written and tested locally
- [ ] Firestore security rules updated
- [ ] FCM tokens being stored in Firestore
- [ ] Functions deployed to Firebase
- [ ] Function logs checked for errors
- [ ] Test notifications sent and received
- [ ] Notification logs created in Firestore

---

## 🎯 Next Steps

After deploying functions:
1. Test all notification triggers
2. Monitor function logs for errors
3. Adjust retry logic if needed
4. Consider adding more notification types
5. Build admin dashboard for notification management
