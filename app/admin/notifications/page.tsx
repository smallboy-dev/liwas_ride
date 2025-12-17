"use client";

import { useState } from "react";
import { useRequireRoleAndApproval } from "@/hooks/useAuthGuard";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { NotificationDetailModal } from "@/components/admin/NotificationDetailModal";

/**
 * Admin Notifications Page - Protected Route
 * Requires: admin role
 * Displays all pending registrations and allows approval/rejection
 */
export default function AdminNotificationsPage() {
  // Protect route: requires admin role
  const { userData, loading: authLoading } = useRequireRoleAndApproval(["admin"], false);

  // Fetch notifications
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    error,
    markAsRead,
    approveRegistration,
    rejectRegistration,
    deleteRegistration,
  } = useAdminNotifications();

  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loading = authLoading || notificationsLoading;

  if (loading) {
    return (
      <AdminLayout pageTitle="Notifications">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const selectedNotif = selectedNotification
    ? notifications.find((n) => n.id === selectedNotification)
    : null;

  const handleApprove = async (notificationId: string, userId: string) => {
    try {
      setActionLoading(true);
      const role = notifications.find(n => n.id === notificationId)?.type === "vendor_registration" ? "vendor" : "driver";
      await approveRegistration(notificationId, userId, role);
      setSelectedNotification(null);
    } catch (err) {
      console.error("Error approving:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (notificationId: string, userId: string) => {
    try {
      setActionLoading(true);
      const role = notifications.find(n => n.id === notificationId)?.type === "vendor_registration" ? "vendor" : "driver";
      await rejectRegistration(notificationId, userId, role);
      setSelectedNotification(null);
    } catch (err) {
      console.error("Error rejecting:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (notificationId: string, userId: string) => {
    try {
      setActionLoading(true);
      const role = notifications.find(n => n.id === notificationId)?.type === "vendor_registration" ? "vendor" : "driver";
      await deleteRegistration(notificationId, userId, role);
      setSelectedNotification(null);
    } catch (err) {
      console.error("Error deleting:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  return (
    <AdminLayout pageTitle="Notifications">
      <div className="space-y-6">
        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">Error: {error}</p>
          </div>
        )}

        {/* Notifications Summary */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Notifications</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {notifications.length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {unreadCount} unread
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending Actions</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {notifications.filter((n) => n.status !== "actioned").length}
              </p>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-600 dark:text-gray-400">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                    notification.status === "unread"
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : ""
                  }`}
                  onClick={() => {
                    setSelectedNotification(notification.id);
                    if (notification.status === "unread") {
                      handleMarkAsRead(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {notification.type === "vendor_registration"
                            ? "New Vendor Registration"
                            : "New Driver Registration"}
                        </h3>
                        {notification.status === "unread" && (
                          <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.userEmail}
                      </p>
                      {notification.data?.businessName && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                          {notification.data.businessName}
                        </p>
                      )}
                      {notification.data?.name && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                          {notification.data.name}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {notification.createdAt
                          ? new Date(notification.createdAt.toDate?.() || notification.createdAt).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <div className="ml-4 flex items-center space-x-2">
                      {notification.status === "actioned" && (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            notification.action === "approved"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400"
                              : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400"
                          }`}
                        >
                          {notification.action === "approved" ? "Approved" : "Rejected"}
                        </span>
                      )}
                      {notification.status !== "actioned" && (
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notification Detail Modal */}
      {selectedNotif && (
        <NotificationDetailModal
          notification={selectedNotif}
          onClose={() => setSelectedNotification(null)}
          onApprove={handleApprove}
          onReject={handleReject}
          onDelete={handleDelete}
          isLoading={actionLoading}
        />
      )}
    </AdminLayout>
  );
}
