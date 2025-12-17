"use client";

import { AdminNotification } from "@/hooks/useAdminNotifications";

interface NotificationDetailModalProps {
  notification: AdminNotification;
  onClose: () => void;
  onApprove: (notificationId: string, userId: string, role: "vendor" | "driver") => Promise<void>;
  onReject: (notificationId: string, userId: string, role: "vendor" | "driver") => Promise<void>;
  onDelete: (notificationId: string, userId: string, role: "vendor" | "driver") => Promise<void>;
  isLoading: boolean;
}

export function NotificationDetailModal({
  notification,
  onClose,
  onApprove,
  onReject,
  onDelete,
  isLoading,
}: NotificationDetailModalProps) {
  const isVendor = notification.type === "vendor_registration";
  const role = isVendor ? "vendor" : "driver";

  const handleApprove = async () => {
    await onApprove(notification.id, notification.userId, role);
  };

  const handleReject = async () => {
    await onReject(notification.id, notification.userId, role);
  };

  const handleDelete = async () => {
    if (confirm(`Are you sure you want to permanently delete this ${role} registration? This action cannot be undone.`)) {
      await onDelete(notification.id, notification.userId, role);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isVendor ? "Vendor Registration" : "Driver Registration"} Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* User Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              User Information
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                <p className="text-gray-900 dark:text-white font-medium">{notification.userEmail}</p>
              </div>
              {notification.data?.phone && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                  <p className="text-gray-900 dark:text-white font-medium">{notification.data.phone}</p>
                </div>
              )}
              {isVendor && notification.data?.businessName && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Business Name</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {notification.data.businessName}
                  </p>
                </div>
              )}
              {isVendor && notification.data?.vendorType && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Vendor Type</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {notification.data.vendorType}
                  </p>
                </div>
              )}
              {!isVendor && notification.data?.name && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {notification.data.name}
                  </p>
                </div>
              )}
              {!isVendor && notification.data?.driverType && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Driver Type</p>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {notification.data.driverType}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          {notification.data?.documents && notification.data.documents.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Documents
              </h3>
              <div className="space-y-2">
                {notification.data.documents.map((doc: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
                  >
                    <div className="flex items-center space-x-2">
                      <svg
                        className="w-5 h-5 text-gray-600 dark:text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {doc.name || `Document ${index + 1}`}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {doc.type || "PDF"}
                        </p>
                      </div>
                    </div>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-primary-600 hover:text-brand-primary-700 dark:text-brand-primary-400 text-sm font-medium"
                      >
                        View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Personal Info */}
          {notification.data?.personalInfo && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Personal Information
              </h3>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                {Object.entries(notification.data.personalInfo).map(([key, value]: [string, any]) => (
                  <div key={key}>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {key.replace(/_/g, " ")}
                    </p>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer - Actions */}
        {notification.status !== "actioned" && (
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 px-6 py-4 flex items-center justify-end space-x-3">
            <button
              onClick={handleDelete}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Processing..." : "Delete"}
            </button>
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Processing..." : "Reject"}
            </button>
            <button
              onClick={handleApprove}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Processing..." : "Approve"}
            </button>
          </div>
        )}

        {/* Footer - Actioned */}
        {notification.status === "actioned" && (
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600 px-6 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
              <p
                className={`font-semibold ${
                  notification.action === "approved"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {notification.action === "approved" ? "Approved" : "Rejected"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white hover:bg-gray-400 dark:hover:bg-gray-500 font-medium transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
