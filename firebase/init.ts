// Import the functions you need from the SDKs you need
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getMessaging, Messaging, isSupported } from "firebase/messaging";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFunctions, Functions, connectFunctionsEmulator } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate Firebase configuration
if (typeof window !== "undefined") {
  const requiredEnvVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ];

}

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services
export const auth: Auth = getAuth(app);
export const firestore: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app, "us-central1");

// Connect to emulator in development (optional)
if (typeof window !== "undefined" && process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_USE_FUNCTIONS_EMULATOR === "true") {
  connectFunctionsEmulator(functions, "localhost", 5001);
}

// Initialize messaging only on client side (browser) and only if supported.
// Guard against SSR and browsers without Push/Notification support.
let messagingInstance: Messaging | null = null;
if (typeof window !== "undefined") {
  // isSupported is async; we can't await at top-level in this module,
  // so we wrap access in a function below.
  isSupported()
    .then((supported) => {
      if (supported) {
        messagingInstance = getMessaging(app);
      } else {
        console.warn("Firebase messaging is not supported in this browser.");
      }
    })
    .catch((err) => {
      console.warn("Firebase messaging support check failed:", err);
      messagingInstance = null;
    });
}

// Helper to safely get messaging; returns null if unsupported/SSR.
export function getMessagingSafe(): Messaging | null {
  return messagingInstance;
}

// Backward export for existing imports; remains null if unsupported.
export const messaging: Messaging | null = messagingInstance;

export default app;

