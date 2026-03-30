"use client";

import { useAuth } from "@/hooks/useAuth";

/**
 * AuthWrapper - Client component that protects dashboard routes with authentication
 * Shows loading state while verifying auth, redirects if not authenticated
 */
export function AuthWrapper({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 inline-block">
            <svg
              className="h-8 w-8 animate-spin text-slate-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <p className="text-slate-600">Verifying Authentication...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, useAuth hook will redirect to /login
  // Return null while redirect is happening
  if (!isAuthenticated) {
    return null;
  }

  return children;
}
