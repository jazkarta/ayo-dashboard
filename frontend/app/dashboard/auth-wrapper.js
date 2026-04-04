"use client";

import { useAuth } from "@/hooks/useAuth";

/**
 * AuthWrapper - Client component that protects dashboard routes with authentication
 * Shows loading state while verifying auth, redirects if not authenticated
 */
export function AuthWrapper({ children }) {
  const { isAuthenticated, isAuthorized, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  // If not authenticated or not authorized, useAuth hook will redirect to /login
  // Return null while redirect is happening
  if (!isAuthenticated || !isAuthorized) {
    return null;
  }

  return children;
}
