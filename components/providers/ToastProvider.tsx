"use client";

import { Toaster, toast } from "react-hot-toast";

/**
 * Toast Provider Component
 * Wraps the application with react-hot-toast Toaster
 * Provides global toast notification functionality
 */

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: "#363636",
          color: "#fff",
          borderRadius: "8px",
          padding: "16px",
          fontSize: "14px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        },

        // Default options for specific types
        success: {
          duration: 3000,
          style: {
            background: "#10b981",
            color: "#fff",
          },
          icon: "✓",
        },
        error: {
          duration: 4000,
          style: {
            background: "#ef4444",
            color: "#fff",
          },
          icon: "✕",
        },
        loading: {
          duration: Infinity,
          style: {
            background: "#3b82f6",
            color: "#fff",
          },
        },
      }}
    />
  );
}

/**
 * Toast utility functions for easy access throughout the app
 */
export const showToast = {
  /**
   * Show success toast
   */
  success: (message: string, options?: any) => {
    toast.success(message, {
      duration: 3000,
      ...options,
    });
  },

  /**
   * Show error toast
   */
  error: (message: string, options?: any) => {
    toast.error(message, {
      duration: 4000,
      ...options,
    });
  },

  /**
   * Show loading toast
   */
  loading: (message: string, options?: any) => {
    return toast.loading(message, {
      duration: Infinity,
      ...options,
    });
  },

  /**
   * Show info/default toast
   */
  info: (message: string, options?: any) => {
    toast(message, {
      duration: 4000,
      ...options,
    });
  },

  /**
   * Show warning toast
   */
  warning: (message: string, options?: any) => {
    toast(message, {
      duration: 4000,
      style: {
        background: "#f59e0b",
        color: "#fff",
      },
      ...options,
    });
  },

  /**
   * Dismiss a specific toast
   */
  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },

  /**
   * Show promise-based toast (for async operations)
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    },
    options?: any
  ) => {
    return toast.promise(promise, messages, options);
  },

  /**
   * Show custom toast with JSX
   */
  custom: (component: any, options?: any) => {
    return toast.custom(component, options);
  },
};

export default ToastProvider;
