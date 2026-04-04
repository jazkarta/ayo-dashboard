"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useKeycloak } from "@/context/KeycloakContext";
import { hasResearcherOrAdminRole, logout } from "@/services/keycloakService";

/**
 * /auth/callback
 * Minimal page that handles the OIDC redirect.
 * The logic is mostly handled by KeycloakProvider; this page just checks roles
 * and decides where to redirect the user next.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const { authenticated, isLoading } = useKeycloak();
  const [status, setStatus] = useState("Completing sign-in…");

  useEffect(() => {
    // Wait for the initialization in KeycloakProvider to finish
    if (isLoading) return;

    if (authenticated) {
      // Check role: Must be researchers or admin
      if (!hasResearcherOrAdminRole()) {
        setStatus("Unauthorized access! You do not have the required role.");
        // Log out from Keycloak session too, otherwise they'll just loop back
        setTimeout(() => {
          logout();
        }, 2000);
        return;
      }

      setStatus("Signed in! Redirecting to dashboard…");
      router.replace("/dashboard");
    } else {
      // If we're not authenticated after the callback, something went wrong
      setStatus("Authentication failed. Redirecting to login…");
      setTimeout(() => {
        router.replace("/login");
      }, 1500);
    }
  }, [authenticated, isLoading, router]);


  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="flex flex-col items-center gap-4 text-center">
        {/* Spinner */}
        <div className="h-10 w-10 rounded-full border-4 border-slate-300 border-t-slate-800 animate-spin" />
        <p className="text-sm text-slate-500">{status}</p>
      </div>
    </div>
  );
}
