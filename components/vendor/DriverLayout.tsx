"use client";

import { ReactNode, useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/firebase/init";
import { DriverSidebar } from "@/components/vendor/DriverSidebar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface DriverLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export function DriverLayout({ children, pageTitle = "Dashboard" }: DriverLayoutProps) {
  // Sidebar is open on desktop, closed by default on mobile/tablet
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser } = useAuth();
  const [driverName, setDriverName] = useState<string>("");

  // Fetch driver name
  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchDriverName = async () => {
      try {
        const driverDocRef = doc(firestore, "drivers", currentUser.uid);
        const driverDoc = await getDoc(driverDocRef);
        if (driverDoc.exists()) {
          const driverData = driverDoc.data();
          setDriverName(driverData.name || "");
        }
      } catch (err) {
        console.error("Error fetching driver name:", err);
      }
    };

    fetchDriverName();
  }, [currentUser?.uid]);

  // Open the sidebar automatically on desktop and close on mobile/tablet
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <DriverSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 ml-0">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{pageTitle}</h1>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Theme Toggle */}
            <ThemeToggle />
            {/* Language Dropdown - Placeholder */}
            <select className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary-500">
              <option>English</option>
            </select>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">LiWAS</span>
            <div className="w-8 h-8 bg-brand-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-semibold">
                {(driverName || currentUser?.email || "D").charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-7xl mx-auto w-full">
          {children}
          </div>
        </main>
      </div>
    </div>
  );
}
