// app/test-notifications/page.tsx
"use client";

import { showToast } from "@/components/providers/ToastProvider";

export default function TestNotificationsPage() {
  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold">Notification Tests</h1>
      
      <button 
        onClick={() => showToast.success("Success message!")}
        className="px-4 py-2 bg-green-600 text-white rounded"
      >
        Test Success Toast
      </button>
      
      <button 
        onClick={() => showToast.error("Error message!")}
        className="px-4 py-2 bg-red-600 text-white rounded"
      >
        Test Error Toast
      </button>
      
      <button 
        onClick={() => showToast.info("Info message!")}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Test Info Toast
      </button>
      
      <button 
        onClick={() => showToast.warning("Warning message!")}
        className="px-4 py-2 bg-yellow-600 text-white rounded"
      >
        Test Warning Toast
      </button>
      
      <button 
        onClick={() => {
          const toastId = showToast.loading("Processing...");
          setTimeout(() => {
            showToast.dismiss(toastId);
            showToast.success("Done!");
          }, 2000);
        }}
        className="px-4 py-2 bg-purple-600 text-white rounded"
      >
        Test Loading Toast
      </button>
    </div>
  );
}