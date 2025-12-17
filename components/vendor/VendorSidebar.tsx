"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { firestore } from "@/firebase/init";

interface MenuItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  children?: MenuItem[];
}

interface VendorSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function VendorSidebar({ isOpen = true, onClose }: VendorSidebarProps) {
  const pathname = usePathname();
  const { logout, currentUser } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [businessName, setBusinessName] = useState<string>("");

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/vendor") {
      return pathname === "/vendor" || pathname === "/vendor/";
    }
    return pathname.startsWith(href);
  };

  const menuItems: MenuItem[] = [
    {
      label: "Dashboard",
      href: "/vendor",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      label: "Products",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      children: [
        { label: "Products", href: "/vendor/products", icon: <></> },
        { label: "Option Groups", href: "/vendor/option-groups", icon: <></> },
        { label: "Options", href: "/vendor/options", icon: <></> },
      ],
    },
    {
      label: "Orders",
      href: "/vendor/orders",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      children: [
        { label: "All Orders", href: "/vendor/orders", icon: <></> },
        { label: "Delivered Orders", href: "/vendor/orders/delivered", icon: <></> },
      ],
    },
    {
      label: "Transactions",
      href: "/vendor/transactions",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v8m-4-4h8m7 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Payouts",
      href: "/vendor/payments",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
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

  // Fetch vendor business name
  useEffect(() => {
    if (!currentUser?.uid) return;

    const fetchBusinessName = async () => {
      try {
        const vendorDocRef = doc(firestore, "vendors", currentUser.uid);
        const vendorDoc = await getDoc(vendorDocRef);
        if (vendorDoc.exists()) {
          const vendorData = vendorDoc.data();
          setBusinessName(vendorData.businessName || "");
        }
      } catch (err) {
        console.error("Error fetching vendor business name:", err);
      }
    };

    fetchBusinessName();
  }, [currentUser?.uid]);

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
        className={`w-64 bg-brand-primary-600 dark:bg-brand-primary-800 flex flex-col h-screen fixed left-0 top-0 z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo/Branding */}
        <div className="p-4 border-b border-brand-primary-700 dark:border-brand-primary-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Logo Image */}
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
              <span className="text-brand-primary-100 text-xs">Vendor Portal</span>
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="lg:hidden text-brand-primary-100 hover:text-white"
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
                            ? "bg-brand-primary-700 dark:bg-brand-primary-900 text-white"
                            : "text-brand-primary-100 hover:bg-brand-primary-700 dark:hover:bg-brand-primary-900"
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
                                      ? "bg-brand-primary-700 dark:bg-brand-primary-900 text-white"
                                      : "text-brand-primary-100 hover:bg-brand-primary-700 dark:hover:bg-brand-primary-900"
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
                          ? "bg-brand-primary-700 dark:bg-brand-primary-900 text-white"
                          : "text-brand-primary-100 hover:bg-brand-primary-700 dark:hover:bg-brand-primary-900"
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
        <div className="p-4 border-t border-brand-primary-700 dark:border-brand-primary-900">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-brand-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-semibold">
                {(businessName || currentUser?.email || "V").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {businessName || currentUser?.email || "Vendor"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-brand-primary-100 hover:bg-brand-primary-700 dark:hover:bg-brand-primary-900 transition-colors"
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

