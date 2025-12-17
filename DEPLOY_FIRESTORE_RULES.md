# Deploy Firestore Security Rules

## Quick Steps to Deploy Rules

Your vendor registration is failing because Firestore security rules haven't been deployed yet. Here's how to fix it:

### Option 1: Deploy via Firebase Console (Easiest)

1. **Go to Firebase Console**
   - Visit: https://console.firebase.google.com/
   - Select your project: `liwas-793a1`

2. **Navigate to Firestore Rules**
   - Click on **Firestore Database** in the left menu
   - Click on the **Rules** tab at the top

3. **Copy and Paste Rules**
   - Open the `firestore.rules` file in this project
   - Copy ALL the content
   - Paste it into the Firebase Console rules editor
   - Click **Publish**

4. **Verify Deployment**
   - You should see a success message
   - Try registering a vendor again

### Option 2: Deploy via Firebase CLI

If you have Firebase CLI installed:

```bash
# Install Firebase CLI (if not installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy the rules
firebase deploy --only firestore:rules
```

## What Happened to Your Previous Registration?

If you tried to register before deploying the rules:
- ✅ Your Firebase Auth account was created
- ❌ Firestore documents failed to save (due to missing security rules)

### Solution Options:

1. **Delete the Auth account and re-register** (after deploying rules)
   - Go to Firebase Console → Authentication → Users
   - Delete the incomplete account
   - Register again with the same email

2. **Complete the registration manually** (after deploying rules)
   - Log in with your existing email/password
   - We can add a "Complete Profile" flow later

## Testing After Deployment

1. Try registering a new vendor
2. Check Firebase Console → Firestore Database:
   - You should see a document in `users` collection
   - You should see a document in `vendors` collection
3. Both documents should have the correct data

