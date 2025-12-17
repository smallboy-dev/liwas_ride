"use client";

import { useFirebase } from "@/context/FirebaseContext";
import { useEffect } from "react";

export default function TestFirebasePage() {
  const { auth, firestore, messaging } = useFirebase();

  useEffect(() => {
    console.log("Firebase initialized:", {
      auth: auth !== null,
      firestore: firestore !== null,
      messaging: messaging !== null,
    });
  }, [auth, firestore, messaging]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Firebase Test Page</h1>
      <div className="space-y-2">
        <p>Auth initialized: {auth ? "✅" : "❌"}</p>
        <p>Firestore initialized: {firestore ? "✅" : "❌"}</p>
        <p>Messaging initialized: {messaging ? "✅" : "❌"}</p>
      </div>
      <p className="mt-4 text-sm text-gray-600">
        Check the browser console for detailed Firebase instance logs.
      </p>
    </div>
  );
}

