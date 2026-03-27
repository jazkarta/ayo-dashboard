"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initKeycloak, hasResearcherOrAdminRole, logout } from "@/services/keycloakService";

/**
 * /auth/callback
 * ...
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Completing sign-in…");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { authenticated, keycloak } = await initKeycloak();

        if (authenticated && keycloak.token) {
          // Check role: Must be researchers or admin
          if (!hasResearcherOrAdminRole()) {
            setStatus("Unauthorized access! You do not have the required role.");
            // Log out from Keycloak session too, otherwise they'll just loop back
            setTimeout(() => {
              logout();
            }, 2000);
            return;
          }

          // Persist tokens only for authorized users
          localStorage.setItem("access_token", keycloak.token);
          localStorage.setItem("refresh_token", keycloak.refreshToken ?? "");

          setStatus("Signed in! Redirecting to dashboard…");
          router.replace("/dashboard");
        } else {
          setStatus("Authentication failed. Redirecting to login…");
          router.replace("/login");
        }
      } catch (err) {
        console.error("[AuthCallback] Error:", err);
        setStatus("Something went wrong. Redirecting to login…");
        router.replace("/login");
      }
    };

    handleCallback();
  }, [router]);


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
