"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/firebase/init";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, userData, loading: authLoading, login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const isLoggingInRef = useRef(false);

  // Redirect authenticated users away from login page immediately
  // This prevents logged-in users from accessing the login page
  useEffect(() => {
    // Skip redirect if we're actively logging in (handleSubmit will handle redirect)
    if (isLoggingInRef.current) {
      return;
    }

    // If user is authenticated, redirect immediately
    if (!authLoading && currentUser && userData) {
      if (userData.role === "admin") {
        router.replace("/admin");
      } else if (userData.role === "vendor" && userData.isApproved) {
        router.replace("/vendor");
      } else if (userData.role === "driver" && userData.isApproved) {
        router.replace("/driver");
      } else if ((userData.role === "vendor" || userData.role === "driver") && !userData.isApproved) {
        router.replace("/application-status");
      } else {
        router.replace("/");
      }
    }
  }, [currentUser, userData, authLoading, router]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    let isValid = true;
    setEmailError(null);
    setPasswordError(null);

    if (!email.trim()) {
      setEmailError("Email is required");
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    }

    if (!password) {
      setPasswordError("Password is required");
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    isLoggingInRef.current = true; // Mark that we're logging in

    try {
      // Step 1: Authenticate with Firebase Auth using AuthContext
      await login(email, password);

      // Step 2: Get current user from auth (available immediately after login)
      const { auth } = await import("@/firebase/init");
      const userAfterLogin = auth.currentUser;
      
      if (!userAfterLogin) {
        setError("Login succeeded but user not found. Please try again.");
        isLoggingInRef.current = false;
        return;
      }

      // Step 3: Fetch user document from Firestore to check approval status
      const userDocRef = doc(firestore, "users", userAfterLogin.uid);
      const userDoc = await getDoc(userDocRef);
      
      const userEmail = userAfterLogin.email;
      const isAdminEmail = userEmail === "admin@liwasride.com";

      if (!userDoc.exists()) {
        // User document doesn't exist, sign out and show error
        await logout();
        setError("User account not found. Please contact support.");
        isLoggingInRef.current = false;
        return;
      }

      const userData = userDoc.data();
      const role = userData.role;
      const isApproved = userData.isApproved ?? false;

      // Step 4: Check if user is admin - admins always bypass approval check
      const isAdmin = role === "admin" || isAdminEmail;

      // Step 5: Check approval status for vendors and drivers only (admins bypass)
      if (!isAdmin && (role === "vendor" || role === "driver") && !isApproved) {
        // User is a vendor or driver but not approved, sign them out
        await logout();
        // Show toast error message
        toast.error(
          "Your application is under review. Please wait for admin approval before logging in.",
          {
            duration: 5000,
            style: {
              background: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fca5a5',
            },
          }
        );
        setError("Your account has not been approved yet. Please wait for admin approval before logging in.");
        isLoggingInRef.current = false;
        return;
      }

      // Step 6: Redirect based on user role and approval status
      // Use replace instead of push to prevent back button from going to login page
      if (isAdmin) {
        router.replace("/admin");
      } else if (role === "vendor" && isApproved) {
        router.replace("/vendor");
      } else if (role === "driver" && isApproved) {
        router.replace("/driver");
      } else if (role === "vendor" || role === "driver") {
        // Unapproved vendor/driver (shouldn't reach here, but just in case)
        router.replace("/application-status");
      } else {
        // Regular user or fallback - go to home page
        router.replace("/");
      }
      
      // Reset the login flag after redirect
      setTimeout(() => {
        isLoggingInRef.current = false;
      }, 1000);
    } catch (err: any) {
      console.error("Login error:", err);
      
      // AuthContext's login function already handles error messages
      // but we might want to show custom messages for approval issues
      // Let's use the error from AuthContext or show a custom message
      let errorMessage = err.message || "An error occurred during login. Please try again.";
      
      // Override with more user-friendly messages if needed
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found") {
        errorMessage = "Invalid email or password";
      } else if (err.code === "auth/wrong-password") {
        errorMessage = "Incorrect password";
      }
      
      setError(errorMessage);
      isLoggingInRef.current = false; // Reset on error
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking authentication state
  // Also show loading if user is authenticated (while redirecting)
  if (authLoading || (currentUser && userData && !isLoggingInRef.current)) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-white dark:bg-black px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            {currentUser && userData ? "Redirecting..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  // Don't render login form if user is already authenticated
  // (This is a safety check - the redirect should handle this, but this prevents any flash)
  if (currentUser && userData) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-white dark:bg-black px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-primary-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse-slow dark:opacity-20 dark:mix-blend-screen"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-secondary-300 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse-slow dark:opacity-20 dark:mix-blend-screen"></div>
      </div>

      {/* Two-column layout on large screens */}
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">
        {/* Banner Image - Hidden on small screens, visible on large screens */}
        <div className="hidden lg:flex items-center justify-center animate-fade-in">
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/liwas-793a1.firebasestorage.app/o/liwas%20login%20banner.jpg?alt=media&token=c950163d-b3a6-4f86-b10e-322672eb59ad"
            alt="LiWAS Ride Login Banner"
            className="w-full h-auto max-h-[600px] object-contain rounded-2xl shadow-lg"
          />
        </div>

        {/* Login Form Section */}
        <div className="max-w-md w-full mx-auto space-y-8 animate-fade-in">
          {/* Logo - Centered at the top */}
          <div className="flex justify-center">
            <img 
              src="https://firebasestorage.googleapis.com/v0/b/liwas-793a1.firebasestorage.app/o/liwas%20logo.png?alt=media&token=e3ee77ab-d2d3-45bb-b1bb-587e8e4296fa"
              alt="LiWAS Ride Logo"
              className="h-20 w-auto object-contain"
            />
          </div>

          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
              Welcome Back
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Sign in to continue to your dashboard
            </p>
          </div>

        {/* Login Form Card */}
        <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl py-8 px-6 sm:px-8 rounded-2xl shadow-soft dark:shadow-soft-dark border border-brand-primary-200 dark:border-brand-primary-800/50 animate-slide-up">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-400 text-red-800 dark:text-red-200 px-4 py-3 rounded-r-lg animate-fade-in">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(null);
                    setError(null);
                  }}
                  className={`block w-full pl-10 pr-3 py-3 border ${
                    emailError
                      ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10"
                      : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900/50"
                  } rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    emailError
                      ? "focus:ring-red-500 focus:border-red-500"
                      : "focus:ring-brand-primary-500 focus:border-brand-primary-500"
                  } transition-all duration-200`}
                  placeholder="you@example.com"
                />
              </div>
              {emailError && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {emailError}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError(null);
                    setError(null);
                  }}
                  className={`block w-full pl-10 pr-3 py-3 border ${
                    passwordError
                      ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/10"
                      : "border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900/50"
                  } rounded-lg placeholder-gray-400 dark:placeholder-gray-500 text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${
                    passwordError
                      ? "focus:ring-red-500 focus:border-red-500"
                      : "focus:ring-brand-primary-500 focus:border-brand-primary-500"
                  } transition-all duration-200`}
                  placeholder="Enter your password"
                />
              </div>
              {passwordError && (
                <p className="text-sm text-red-600 dark:text-red-400 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {passwordError}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg text-base font-semibold text-white ${
                  loading
                    ? "bg-brand-primary-400 cursor-not-allowed"
                    : "gradient-brand hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary-500"
                } transition-all duration-200`}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  <>
                    Sign in
                    <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-black text-gray-500 dark:text-gray-400">
                  New to LiWAS Ride?
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <Link
                href="/register/vendor"
                className="w-full flex justify-center items-center px-4 py-3 border-2 border-gray-200 dark:border-gray-800 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-black/50 hover:bg-gray-50 dark:hover:bg-gray-900 hover:border-brand-primary-300 dark:hover:border-brand-primary-600 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Sign up as a Vendor
              </Link>
              <Link
                href="/register/driver"
                className="w-full flex justify-center items-center px-4 py-3 border-2 border-gray-200 dark:border-gray-800 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-black/50 hover:bg-gray-50 dark:hover:bg-gray-900 hover:border-brand-primary-300 dark:hover:border-brand-primary-600 transition-all duration-200"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Sign up as a Driver
              </Link>
            </div>
          </div>
        </div>

          {/* Footer */}
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
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
  );
}
