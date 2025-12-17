# Cloud Functions Local Testing Guide

Due to API connectivity issues with Firebase deployment, we'll test the functions locally using the Firebase Emulator Suite.

## 🚀 Setup Local Testing

### Step 1: Install Firebase Emulator Suite
```bash
npm install -g firebase-tools
```

### Step 2: Start Emulator
```bash
cd c:\Users\kinge\Documents\Github\web-app
npx firebase emulators:start --only functions,firestore
```

### Step 3: Test Functions Locally

The emulator will start and show you the functions running locally.

---

## 🧪 Manual Testing Without Emulator

Since we have the compiled functions, you can test them by:

### 1. Verify Functions Built Successfully
```bash
ls functions/lib/index.js
```

You should see the compiled JavaScript file.

### 2. Check Function Code
The functions are ready and will be deployed when the API issue is resolved.

---

## 📝 Troubleshooting Deployment Issues

### Issue: "Failed to make request to firebase.googleapis.com"

**Causes**:
1. Firebase APIs not enabled in Google Cloud Console
2. Network/connectivity issues
3. Project configuration issues

**Solutions**:

#### Option 1: Enable APIs in Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project `liwas-793a1`
3. Search for and enable:
   - Cloud Functions API
   - Cloud Build API
   - Cloud Logging API
   - Artifact Registry API
   - Firebase Rules API

#### Option 2: Use Firebase Console to Deploy
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select `liwas-793a1` project
3. Go to **Functions** tab
4. Click **Deploy** (if available)

#### Option 3: Retry Deployment
```bash
npx firebase deploy --only functions --debug
```

---

## ✅ Functions Ready for Deployment

Your Cloud Functions are compiled and ready:

### Functions Included:
1. ✅ `onNewVendorRegistration` - Notifies admins of new vendors
2. ✅ `onNewDriverRegistration` - Notifies admins of new drivers
3. ✅ `onUserApprovalStatusChange` - Notifies users of approval status
4. ✅ `onNewOrderCreated` - Notifies vendor/driver/customer of new orders
5. ✅ `onOrderStatusUpdate` - Notifies customer of order status changes

### Compiled Location:
```
functions/lib/index.js
functions/lib/index.d.ts
```

---

## 🔄 Next Steps

Once the API issue is resolved:

1. Run: `npx firebase deploy --only functions`
2. Check logs: `npx firebase functions:log`
3. Test by creating orders/vendors/drivers

---

## 📞 Support

If deployment continues to fail:
1. Check Google Cloud Console for API errors
2. Verify project permissions
3. Try deploying from Firebase Console directly
4. Contact Firebase Support with the error message

---

## ✨ Alternative: Deploy via Firebase Console

1. Go to Firebase Console → Functions
2. Look for upload/deploy option
3. Select the `functions/lib` folder
4. Deploy

This bypasses the CLI and may work if there's a CLI-specific issue.
