"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRequireAuth } from "@/hooks/useAuthGuard";

export default function Home() {
  const router = useRouter();
  const { currentUser, userData, loading, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  // Require authentication
  useRequireAuth();

  // Auto-redirect authenticated users to their respective dashboards
  useEffect(() => {
    if (!loading && currentUser && userData) {
      // Redirect based on role and approval status
      if (userData.role === "admin") {
        router.push("/admin");
      } else if (userData.role === "vendor" && userData.isApproved) {
        router.push("/vendor");
      } else if (userData.role === "driver" && userData.isApproved) {
        router.push("/driver");
      } else if ((userData.role === "vendor" || userData.role === "driver") && !userData.isApproved) {
        router.push("/application-status");
      }
      // Regular users (role === "user") can stay on home page
    }
  }, [loading, currentUser, userData, router]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      setLoggingOut(false);
    }
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  // Show nothing if not authenticated (redirect will happen)
  if (!currentUser) {
    return null;
  }

  // This will only render if user is authenticated
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-center font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to LiWAS Ride
        </h1>
        <p className="text-center text-lg opacity-80 mb-4">
          You are successfully logged in.
        </p>
        
        {/* Display user role and status */}
        {userData && (
          <div className="text-center mb-8">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Role: <span className="font-semibold">{userData.role}</span> | 
              Status: <span className={`font-semibold ${userData.isApproved ? 'text-green-600' : 'text-yellow-600'}`}>
                {userData.isApproved ? 'Approved' : 'Pending Approval'}
              </span>
            </p>
          </div>
        )}

        {/* Role-based navigation links */}
        {userData && (
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            {userData.role === 'admin' && (
              <Link
                href="/admin"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Admin Dashboard
              </Link>
            )}
            {userData.role === 'vendor' && userData.isApproved && (
              <Link
                href="/vendor"
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Vendor Dashboard
              </Link>
            )}
            {userData.role === 'driver' && userData.isApproved && (
              <Link
                href="/driver"
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Driver Dashboard
              </Link>
            )}
            {((userData.role === 'vendor' || userData.role === 'driver') && !userData.isApproved) && (
              <Link
                href="/application-status"
                className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                Check Application Status
              </Link>
            )}
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className={`flex items-center justify-center px-6 py-3 border border-transparent rounded-lg text-base font-semibold text-white ${
              loggingOut
                ? "bg-brand-primary-400 cursor-not-allowed"
                : "gradient-brand hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary-500"
            } transition-all duration-200`}
          >
            {loggingOut ? (
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
                Logging out...
              </span>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}



