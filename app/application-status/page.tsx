"use client";

import Link from "next/link";

export default function ApplicationStatusPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse-slow dark:opacity-20 dark:mix-blend-screen"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-secondary-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse-slow dark:opacity-20 dark:mix-blend-screen"></div>
      </div>

      <div className="max-w-md w-full text-center relative z-10 animate-fade-in">
        <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl py-12 px-8 shadow-soft dark:shadow-soft-dark rounded-2xl border border-brand-primary-200 dark:border-brand-primary-800/50 animate-slide-up">
          {/* Icon */}
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full gradient-brand shadow-lg mb-6 animate-pulse-slow">
            <svg
              className="h-10 w-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-brand-primary-600 dark:text-brand-primary-400 mb-4">
            Application Submitted
          </h1>

          {/* Message */}
          <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
            Your application is under review.
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-8">
            We'll notify you once your account has been approved. This usually takes 1-3 business days.
          </p>

          {/* Info Box */}
          <div className="bg-brand-primary-50/50 dark:bg-brand-primary-900/20 border-l-4 border-brand-primary-500 dark:border-brand-primary-400 rounded-r-lg p-4 mb-8">
            <p className="text-sm text-gray-800 dark:text-gray-200 text-left">
              <strong className="text-brand-primary-700 dark:text-brand-primary-300">What happens next?</strong>
              <br />
              <span className="text-gray-600 dark:text-gray-400">
                Our team will review your registration details and documents. You'll receive an email notification once your account is approved.
              </span>
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/login"
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-semibold text-white gradient-brand hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary-500 transition-all duration-200"
            >
              Back to Login
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/vendor"
              className="w-full flex justify-center items-center py-3 px-4 border-2 border-gray-200 dark:border-gray-800 rounded-lg shadow-sm text-base font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-black/50 hover:bg-gray-50 dark:hover:bg-gray-900 hover:border-brand-primary-300 dark:hover:border-brand-primary-600 transition-all duration-200"
            >
              Go to Homepage
            </Link>
          </div>

          {/* Support Link */}
          <div className="mt-8">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Need help?{" "}
              <Link
                href="/support"
                className="font-semibold text-brand-primary-600 dark:text-brand-primary-400 hover:text-brand-primary-700 dark:hover:text-brand-primary-300 transition-colors"
              >
                Contact Support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
