/**
 * Route protection hooks for role-based access control (RBAC)
 * Provides hooks to protect routes based on user roles and approval status
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type UserRole = 'user' | 'vendor' | 'driver' | 'admin';

/**
 * Hook to require authentication
 * Redirects to login if user is not authenticated
 */
export function useRequireAuth() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !currentUser) {
      router.replace("/login");
    }
  }, [currentUser, loading, router]);

  return { currentUser, loading };
}

/**
 * Hook to require a specific role
 * Redirects unauthorized users to forbidden page or custom redirect
 * @param allowedRoles - Array of roles that are allowed to access
 * @param redirectTo - Where to redirect if unauthorized (default: "/forbidden")
 */
export function useRequireRole(
  allowedRoles: UserRole[],
  redirectTo: string = "/forbidden"
) {
  const { currentUser, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // If not authenticated, redirect to login
    if (!currentUser) {
      router.replace("/login");
      return;
    }

    // If user data is not loaded yet, wait
    if (!userData) {
      return;
    }

    // Check if user's role is in the allowed roles list
    if (!allowedRoles.includes(userData.role)) {
      router.replace(redirectTo);
    }
  }, [currentUser, userData, loading, allowedRoles, redirectTo, router]);

  return { currentUser, userData, loading, isAuthorized: userData ? allowedRoles.includes(userData.role) : false };
}

/**
 * Hook to require approval status
 * Redirects unapproved users to application-status page
 * @param allowedIfUnapproved - Roles that can still access even if unapproved (e.g., 'admin')
 */
export function useRequireApproval(
  allowedIfUnapproved: UserRole[] = ['admin']
) {
  const { currentUser, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // If not authenticated, redirect to login
    if (!currentUser) {
      router.replace("/login");
      return;
    }

    // If user data is not loaded yet, wait
    if (!userData) {
      return;
    }

    // Admin and other specified roles bypass approval check
    if (allowedIfUnapproved.includes(userData.role)) {
      return;
    }

    // For other roles, check approval status
    // Vendors and drivers must be approved to access their dashboards
    if ((userData.role === 'vendor' || userData.role === 'driver') && !userData.isApproved) {
      router.replace("/application-status");
    }
  }, [currentUser, userData, loading, allowedIfUnapproved, router]);

  return { currentUser, userData, loading, isApproved: userData?.isApproved ?? false };
}

/**
 * Combined hook: Requires authentication, specific role, and approval
 * Most commonly used for protected dashboards
 * @param allowedRoles - Array of roles that are allowed to access
 * @param requireApproval - Whether approval is required (default: true)
 * @param redirectTo - Where to redirect if unauthorized (default: "/forbidden")
 */
export function useRequireRoleAndApproval(
  allowedRoles: UserRole[],
  requireApproval: boolean = true,
  redirectTo: string = "/forbidden"
) {
  const { currentUser, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Step 1: Require authentication
    if (!currentUser) {
      router.replace("/login");
      return;
    }

    // Step 2: Wait for user data to load
    if (!userData) {
      return;
    }

    // Step 3: Check role authorization
    if (!allowedRoles.includes(userData.role)) {
      router.replace(redirectTo);
      return;
    }

    // Step 4: Check approval status (if required)
    if (requireApproval && userData.role !== 'admin') {
      if (userData.role === 'vendor' || userData.role === 'driver') {
        if (!userData.isApproved) {
          router.replace("/application-status");
        }
      }
    }
  }, [currentUser, userData, loading, allowedRoles, requireApproval, redirectTo, router]);

  const isAuthorized = userData 
    ? allowedRoles.includes(userData.role) 
    : false;
  
  const isFullyAuthorized = userData 
    ? isAuthorized && (userData.role === 'admin' || !requireApproval || userData.isApproved)
    : false;

  return {
    currentUser,
    userData,
    loading,
    isAuthorized,
    isFullyAuthorized,
  };
}

