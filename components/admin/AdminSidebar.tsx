"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

interface MenuItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: MenuItem[];
}

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ isOpen = true, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { logout, currentUser } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/admin") {
      return pathname === "/admin" || pathname === "/admin/";
    }
    return pathname.startsWith(href);
  };

  const menuItems: MenuItem[] = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: "Notifications",
      href: "/admin/notifications",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      label: "Vendor Management",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      children: [
        { label: "Vendors", href: "/admin/vendors", icon: <></> },
        { label: "Types", href: "/admin/vendor-types", icon: <></> },
        { label: "Zones", href: "/admin/zones", icon: <></> },
        { label: "Fees", href: "/admin/fees", icon: <></> },
      ],
    },
    {
      label: "Categories",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      children: [
        { label: "Categories", href: "/admin/categories", icon: <></> },
        { label: "Subcategories", href: "/admin/subcategories", icon: <></> },
      ],
    },
    {
      label: "Products",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      children: [
        { label: "Products", href: "/admin/products", icon: <></> },
        { label: "Option Groups", href: "/admin/option-groups", icon: <></> },
        { label: "Options", href: "/admin/options", icon: <></> },
      ],
    },
    {
      label: "Package Delivery",
      href: "/admin/package-delivery",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      label: "Taxi Booking",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      children: [
        { label: "Drivers", href: "/admin/drivers", icon: <></> },
        { label: "Bookings", href: "/admin/taxi-booking", icon: <></> },
      ],
    },
    {
      label: "Orders",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      children: [
        { label: "All Orders", href: "/admin/orders", icon: <></> },
        { label: "Refunds", href: "/admin/refunds", icon: <></> },
      ],
    },
    {
      label: "Users",
      href: "/admin/users",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: "Payments",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      ),
      children: [
        { label: "Wallets", href: "/admin/wallets", icon: <></> },
        { label: "Transactions", href: "/admin/transactions", icon: <></> },
      ],
    },
    
    {
      label: "Subscriptions",
      href: "/admin/subscriptions",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      label: "Settings",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      children: [
        { label: "Payment method", href: "/admin/payment-method", icon: <></> },
      ],
    },




    {
      label: "Driver Tracking",
      href: "/admin/driver-tracking",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  // Auto-expand menu sections if current path matches a child
  useEffect(() => {
    const shouldExpand = (item: MenuItem): boolean => {
      if (!item.children) return false;
      return item.children.some((child) => isActive(child.href));
    };

    menuItems.forEach((item) => {
      if (shouldExpand(item)) {
        setExpandedMenus((prev) => new Set(prev).add(item.label));
      }
    });
  }, [pathname]);

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  const handleLinkClick = () => {
    // Close sidebar on mobile when link is clicked
    if (typeof window !== "undefined" && window.innerWidth < 1024 && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`w-64 bg-orange-600 dark:bg-orange-800 flex flex-col h-screen fixed left-0 top-0 z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo/Branding */}
        <div className="p-4 border-b border-orange-700 dark:border-orange-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Logo Image - Replace with your actual logo path */}
            <div className="w-10 h-10 flex items-center justify-center">
              <img
                src="https://firebasestorage.googleapis.com/v0/b/liwas-793a1.firebasestorage.app/o/liwas%20logo.png?alt=media&token=e3ee77ab-d2d3-45bb-b1bb-587e8e4296fa"
                alt="LiWAS Ride Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback to placeholder if logo not found
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              {/* Fallback placeholder if logo doesn't exist */}
              <div className="w-10 h-10 bg-green-600 rounded flex items-center justify-center hidden">
                <span className="text-white font-bold text-lg">LR</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-semibold text-sm">LiWAS Ride</span>
              <span className="text-orange-100 text-xs">version 2.0.1</span>
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden text-orange-100 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedMenus.has(item.label);
            const active = isActive(item.href);

            return (
              <li key={item.label}>
                {hasChildren ? (
                  <>
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-orange-700 dark:bg-orange-900 text-white"
                          : "text-orange-100 hover:bg-orange-700 dark:hover:bg-orange-900"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          isExpanded ? "transform rotate-90" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                    {isExpanded && item.children && (
                      <ul className="mt-1 ml-4 space-y-1">
                        {item.children.map((child) => {
                          const childActive = isActive(child.href);
                          return (
                            <li key={child.label}>
                              <Link
                                href={child.href || "#"}
                                onClick={handleLinkClick}
                                className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                  childActive
                                    ? "bg-orange-700 dark:bg-orange-900 text-white"
                                    : "text-orange-100 hover:bg-orange-700 dark:hover:bg-orange-900"
                                }`}
                              >
                                {child.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href || "#"}
                    onClick={handleLinkClick}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "bg-orange-700 dark:bg-orange-900 text-white"
                        : "text-orange-100 hover:bg-orange-700 dark:hover:bg-orange-900"
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section at Bottom */}
      <div className="p-4 border-t border-orange-700 dark:border-orange-900">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-semibold">
              {currentUser?.email?.charAt(0).toUpperCase() || "A"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {currentUser?.email || "Admin"}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-orange-100 hover:bg-orange-700 dark:hover:bg-orange-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
      </aside>
    </>
  );
}

