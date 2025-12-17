"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, firestore } from "@/firebase/init";

// User data from Firestore
interface UserData {
  role: 'user' | 'vendor' | 'driver' | 'admin';
  isApproved: boolean;
  email: string;
  uid: string;
  fcmToken?: string | null;
}

interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null; // User data from Firestore (role, isApproved, etc.)
  loading: boolean;
  error: string | null;
  register: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Register function - creates Firebase Auth user and Firestore document
  // Creates user document with all required schema fields:
  // - email: User's email address
  // - uid: User's unique identifier
  // - role: Default to 'user' (can be changed later by admin)
  // - isApproved: Normal users (role == 'user') are automatically approved (true)
  //   Vendors and drivers must be approved by admin (set to false in their registration pages)
  // - fcmToken: Optional, set to null initially
  // - createdAt: Server timestamp
  const register = async (email: string, password: string): Promise<void> => {
    try {
      setError(null);
      // Create Firebase Authentication user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Create user document in Firestore with all required schema fields
      // These fields must match the security rules requirements
      const userDocRef = doc(firestore, "users", user.uid);
      await setDoc(userDocRef, {
        email: user.email,
        uid: user.uid,
        role: 'user', // Default role - can be updated by admin if user registers as vendor/driver
        isApproved: true, // Normal users are automatically approved (vendors/drivers require admin approval)
        fcmToken: null, // Firebase Cloud Messaging token (optional, can be set later)
        createdAt: serverTimestamp(),
      });
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "An error occurred during registration");
      throw err;
    }
  };

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error("Login error:", err);
      
      let errorMessage = "An error occurred during login. Please try again.";
      
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found") {
        errorMessage = "Invalid email or password";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Incorrect password";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address";
      } else if (err.code === "auth/user-disabled") {
        errorMessage = "This account has been disabled";
      } else if (err.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later";
      }
      
      setError(errorMessage);
      throw err;
    }
  };

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      setError(null);
      await firebaseSignOut(auth);
    } catch (err: any) {
      console.error("Logout error:", err);
      setError(err.message || "An error occurred during logout");
      throw err;
    }
  };

  // Set up onAuthStateChanged listener
  // Fetches user document from Firestore when auth state changes
  // to get role and isApproved status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // User is authenticated - fetch their Firestore document
        try {
          const userDocRef = doc(firestore, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData({
              role: data.role || 'user',
              isApproved: data.isApproved ?? false,
              email: data.email || user.email || '',
              uid: data.uid || user.uid,
              fcmToken: data.fcmToken || null,
            });
          } else {
            // User document doesn't exist - set to null
            setUserData(null);
          }
        } catch (err: any) {
          console.error("Error fetching user data:", err);
          setUserData(null);
          setError("Failed to load user data");
        }
      } else {
        // User is not authenticated - clear user data
        setUserData(null);
      }
      
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    error,
    register,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

