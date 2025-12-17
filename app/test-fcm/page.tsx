// app/test-fcm/page.tsx
"use client";

import { useFCM } from "@/hooks/useFCM";

export default function TestFCMPage() {
  const { token, isInitialized, error, isLoading } = useFCM();

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">FCM Status</h1>
      
      <div className="bg-gray-100 p-4 rounded">
        <p><strong>Loading:</strong> {isLoading ? "Yes" : "No"}</p>
        <p><strong>Initialized:</strong> {isInitialized ? "✓ Yes" : "✗ No"}</p>
        <p><strong>Error:</strong> {error || "None"}</p>
        <p><strong>Token:</strong> {token ? `${token.substring(0, 20)}...` : "Not available"}</p>
      </div>
      
      <div className="bg-blue-50 p-4 rounded border border-blue-200">
        <p className="text-sm">
          If initialized is "Yes", notifications are ready!
        </p>
      </div>
    </div>
  );
}