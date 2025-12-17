"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ActionMenuProps {
  children?: React.ReactNode;
  onView?: () => void;
  onEdit?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onOutOfStock?: () => void;
  onDelete?: () => void;
  isApproved?: boolean;
  isProcessing?: boolean;
  customActions?: Array<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: "default" | "danger" | "success";
  }>;
}

export function ActionMenu({
  children,
  onView,
  onEdit,
  onApprove,
  onReject,
  onOutOfStock,
  onDelete,
  isApproved,
  isProcessing = false,
  customActions = [],
}: ActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setMenuPosition(null);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Calculate menu position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const calculatePosition = () => {
        if (!buttonRef.current) return;
        
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        
        // Estimate menu height (approximately 40px per item + padding)
        let itemCount = 0;
        if (onView) itemCount++;
        if (onEdit) itemCount++;
        if (onApprove && !isApproved) itemCount++;
        if (onReject && isApproved !== false) itemCount++;
        if (onOutOfStock) itemCount += 2; // item + divider
        if (onDelete) itemCount += 2; // item + divider
        if (customActions.length) itemCount += customActions.length;

        const estimatedMenuHeight = Math.max(itemCount * 40 + 16, 200); // min 200px
        
        // Default: position downward
        let top = buttonRect.bottom + 8;
        let right = window.innerWidth - buttonRect.right;
        
        // If not enough space below but enough space above, position upward
        if (spaceBelow < estimatedMenuHeight && spaceAbove > estimatedMenuHeight) {
          top = buttonRect.top - estimatedMenuHeight - 8;
        }
        
        setMenuPosition({ top, right });
      };
      
      // Calculate initial position
      calculatePosition();
      
      // Recalculate after a short delay to get actual menu height
      const timeoutId = setTimeout(() => {
        if (menuDropdownRef.current && buttonRef.current) {
          const buttonRect = buttonRef.current.getBoundingClientRect();
          const menuHeight = menuDropdownRef.current.offsetHeight;
          const viewportHeight = window.innerHeight;
          const spaceBelow = viewportHeight - buttonRect.bottom;
          const spaceAbove = buttonRect.top;
          
          // If menu would be cut off at bottom, adjust position upward
          if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
            setMenuPosition({
              top: buttonRect.top - menuHeight - 8,
              right: window.innerWidth - buttonRect.right,
            });
          }
        }
      }, 0);
      
      return () => clearTimeout(timeoutId);
    } else if (!isOpen) {
      setMenuPosition(null);
    }
  }, [isOpen, onView, onEdit, onApprove, onReject, onDelete, isApproved]);

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary-500"
        disabled={isProcessing}
        type="button"
        aria-label="Actions menu"
      >
        {children || (
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        )}
      </button>

      {isOpen && menuPosition && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setMenuPosition(null);
            }}
          />
          
          {/* Menu */}
          <div
            ref={menuDropdownRef}
            className="fixed w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-[calc(100vh-20px)] overflow-y-auto"
            style={{
              top: `${menuPosition.top}px`,
              right: `${menuPosition.right}px`,
            }}
          >
            <div className="py-1">
              {onView && (
                <button
                  onClick={() => {
                    onView();
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>View Details</span>
                </button>
              )}

              {onEdit && (
                <button
                  onClick={() => {
                    onEdit();
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit</span>
                </button>
              )}

              {onApprove && !isApproved && (
                <button
                  onClick={() => {
                    onApprove();
                    setIsOpen(false);
                  }}
                  disabled={isProcessing}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm transition-colors flex items-center space-x-2",
                    isProcessing
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                  )}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{isProcessing ? "Processing..." : "Approve"}</span>
                </button>
              )}

              {onReject && isApproved !== false && (
                <button
                  onClick={() => {
                    onReject();
                    setIsOpen(false);
                  }}
                  disabled={isProcessing}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm transition-colors flex items-center space-x-2",
                    isProcessing
                      ? "text-gray-400 cursor-not-allowed"
                      : "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  )}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>{isProcessing ? "Processing..." : "Reject"}</span>
                </button>
              )}

              {onOutOfStock && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                  <button
                    onClick={() => {
                      onOutOfStock();
                      setIsOpen(false);
                    }}
                    disabled={isProcessing}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm transition-colors flex items-center space-x-2",
                      isProcessing
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                    )}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <span>Out of Stock</span>
                  </button>
                </>
              )}

              {onDelete && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                  <button
                    onClick={() => {
                      onDelete();
                      setIsOpen(false);
                    }}
                    disabled={isProcessing}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm transition-colors flex items-center space-x-2",
                      isProcessing
                        ? "text-gray-400 cursor-not-allowed"
                        : "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    )}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete</span>
                  </button>
                </>
              )}

              {customActions.length > 0 && (!onDelete ? <div className="border-t border-gray-200 dark:border-gray-700 my-1" /> : null)}

              {customActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    action.onClick();
                    setIsOpen(false);
                  }}
                  disabled={action.disabled}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm transition-colors flex items-center space-x-2",
                    action.disabled
                      ? "text-gray-400 cursor-not-allowed"
                      : action.variant === "danger"
                        ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        : action.variant === "success"
                          ? "text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

