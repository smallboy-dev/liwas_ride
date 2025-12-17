"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  TruckIcon,
  MapPinIcon,
  DollarSignIcon,
  LogOutIcon,
  ShoppingBagIcon,
  CheckCircleIcon,
} from "@/components/ui/icons";

interface DriverSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DriverSidebar({ isOpen, onClose }: DriverSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/");
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 lg:z-0 transform transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Close Button - Mobile Only */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Logo Section */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-brand-primary-600 rounded-lg flex items-center justify-center">
              <TruckIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">LiWAS</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Driver Portal</p>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {/* Dashboard */}
          <Link
            href="/driver"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/driver") && !isActive("/driver/")
                ? "bg-brand-primary-100 dark:bg-brand-primary-900/30 text-brand-primary-700 dark:text-brand-primary-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            onClick={onClose}
          >
            <TruckIcon className="w-5 h-5" />
            <span className="font-medium">Dashboard</span>
          </Link>

          {/* Available Orders */}
          <Link
            href="/driver/available-orders"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/driver/available-orders")
                ? "bg-brand-primary-100 dark:bg-brand-primary-900/30 text-brand-primary-700 dark:text-brand-primary-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            onClick={onClose}
          >
            <ShoppingBagIcon className="w-5 h-5" />
            <span className="font-medium">Available Orders</span>
          </Link>

          {/* Active Deliveries */}
          <Link
            href="/driver/deliveries"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/driver/deliveries")
                ? "bg-brand-primary-100 dark:bg-brand-primary-900/30 text-brand-primary-700 dark:text-brand-primary-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            onClick={onClose}
          >
            <MapPinIcon className="w-5 h-5" />
            <span className="font-medium">Active Deliveries</span>
          </Link>

          {/* Delivered Orders */}
          <Link
            href="/driver/delivered"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/driver/delivered")
                ? "bg-brand-primary-100 dark:bg-brand-primary-900/30 text-brand-primary-700 dark:text-brand-primary-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            onClick={onClose}
          >
            <CheckCircleIcon className="w-5 h-5" />
            <span className="font-medium">Delivered Orders</span>
          </Link>

          {/* Transactions */}
          <Link
            href="/driver/transactions"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/driver/transactions")
                ? "bg-brand-primary-100 dark:bg-brand-primary-900/30 text-brand-primary-700 dark:text-brand-primary-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            onClick={onClose}
          >
            <DollarSignIcon className="w-5 h-5" />
            <span className="font-medium">Transactions</span>
          </Link>

          {/* Earnings */}
          <Link
            href="/driver/earnings"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/driver/earnings")
                ? "bg-brand-primary-100 dark:bg-brand-primary-900/30 text-brand-primary-700 dark:text-brand-primary-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            onClick={onClose}
          >
            <DollarSignIcon className="w-5 h-5" />
            <span className="font-medium">Earnings</span>
          </Link>

          {/* Payments */}
          <Link
            href="/driver/payments"
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              isActive("/driver/payments")
                ? "bg-brand-primary-100 dark:bg-brand-primary-900/30 text-brand-primary-700 dark:text-brand-primary-300"
                : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            onClick={onClose}
          >
            <DollarSignIcon className="w-5 h-5" />
            <span className="font-medium">Payouts</span>
          </Link>
        </nav>

        {/* Logout Button */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOutIcon className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
