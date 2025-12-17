"use client";

import Link from "next/link";

/**
 * 403 Forbidden Page
 * Shown when user tries to access a route they don't have permission for
 */
export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse-slow dark:opacity-20 dark:mix-blend-screen"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse-slow dark:opacity-20 dark:mix-blend-screen"></div>
      </div>

      <div className="max-w-md w-full text-center relative z-10 animate-fade-in">
        <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl py-12 px-8 shadow-soft dark:shadow-soft-dark rounded-2xl border border-red-200 dark:border-red-800/50 animate-slide-up">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 dark:bg-red-900/30 shadow-lg mb-6">
            <svg
              className="h-10 w-10 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">
            403 Forbidden
          </h1>

          {/* Message */}
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Access Denied
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            You don't have permission to access this page. Please contact an administrator if you believe this is an error.
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/"
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white gradient-brand hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary-500 transition-all duration-200"
            >
              Go to Homepage
            </Link>
            <Link
              href="/login"
              className="w-full flex justify-center items-center py-3 px-4 border-2 border-gray-200 dark:border-gray-800 rounded-lg shadow-sm text-base font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-black/50 hover:bg-gray-50 dark:hover:bg-gray-900 hover:border-brand-primary-300 dark:hover:border-brand-primary-600 transition-all duration-200"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

