"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { Auth } from "firebase/auth";
import { Firestore } from "firebase/firestore";
import { Messaging } from "firebase/messaging";
import { FirebaseStorage } from "firebase/storage";
import { auth, firestore, messaging, storage } from "@/firebase/init";

interface FirebaseContextType {
  auth: Auth;
  firestore: Firestore;
  messaging: Messaging | null;
  storage: FirebaseStorage;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

interface FirebaseProviderProps {
  children: ReactNode;
}

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  const value: FirebaseContextType = {
    auth,
    firestore,
    messaging,
    storage,
  };

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase(): FirebaseContextType {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error("useFirebase must be used within a FirebaseProvider");
  }
  return context;
}

