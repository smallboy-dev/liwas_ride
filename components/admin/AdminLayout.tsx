"use client";

import { ReactNode, useState } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { NotificationIcon } from "./NotificationIcon";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";

interface AdminLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export function AdminLayout({ children, pageTitle = "Dashboard" }: AdminLayoutProps) {
  // Sidebar is always open on desktop, toggleable on mobile
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { unreadCount } = useAdminNotifications();

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 ml-0">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6 py-4 flex items-center justify-between">
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
          <div className="flex items-center space-x-4">
            {/* Notification Icon */}
            <NotificationIcon unreadCount={unreadCount} />
            {/* Theme Toggle */}
            <ThemeToggle />
            {/* Language Dropdown - Placeholder */}
            <select className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary-500">
              <option>English</option>
            </select>
            <span className="text-gray-700 dark:text-gray-300 font-semibold">LiWAS</span>
            <div className="w-8 h-8 bg-brand-primary-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-semibold">A</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

