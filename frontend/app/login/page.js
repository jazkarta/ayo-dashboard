"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { loginWithGoogle, getTokens } from "@/services/keycloakService";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionExpired = searchParams.get("session") === "expired";
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync check against localStorage — no hydration mismatch, no setState in effect
  const isLoggedIn = useSyncExternalStore(
    () => () => {},
    () => !!getTokens().access_token,
    () => false,
  );

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isLoggedIn) {
      router.replace("/dashboard");
    }
  }, [isLoggedIn, router]);

  // Return null while redirecting — prevents the login form from flashing
  if (isLoggedIn) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await loginWithGoogle();
    } catch (err) {
      console.error("Google login failed:", err);
      setError("Login failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      {sessionExpired && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 shadow-md">
          Your session has expired. Please sign in again.
        </div>
      )}
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg">
        <h1 className="text-3xl font-bold text-slate-900">Welcome to Ayo Dashboard</h1>
        <p className="mt-3 text-sm text-slate-500">
          Sign in with your Google account to access your dashboard.
        </p>

        <div className="mt-8">
          <Button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full justify-center cursor-pointer px-4 py-3 disabled:opacity-70 disabled:cursor-not-allowed"
            variant="default"
          >
            <span className="inline-flex items-center gap-2">
              {isLoading ? (
                <>
                  <svg
                    className="h-5 w-5 animate-spin"
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
                  Redirecting to Google...
                </>
              ) : (
                <>
                  <svg
                    viewBox="0 0 533.5 544.3"
                    className="h-5 w-5"
                    aria-hidden="true"
                  >
                    <path
                      d="M533.5 278.4c0-17.4-1.5-34.1-4.3-50.3H272v95.3h146.9c-6.4 34.6-25.6 63.9-54.6 83.5v69.4h88.2c51.5-47.5 81-117.2 81-197.9z"
                      fill="#4285F4"
                    />
                    <path
                      d="M272 544.3c73.7 0 135.6-24.6 180.8-66.8l-88.2-69.4c-24.5 16.4-56 26.1-92.7 26.1-71.4 0-132-48.2-153.4-113.1H27.4v70.9c45.2 89 138.8 152.3 244.6 152.3z"
                      fill="#34A853"
                    />
                    <path
                      d="M118.6 323.6c-10.8-32.3-10.8-67.7 0-100l-71.2-70.0C16.3 196.9 0 236.1 0 277.9c0 41.9 16.3 81.1 47.4 109.3l71.2-63.6z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M272 108.3c39.8-.6 78.0 14.0 107.1 40.5l80.3-80.3C406.8 24.3 344.9 0 272 0 166.2 0 72.6 63.3 27.4 152.3l71.2 70.0C140 156.5 200.6 108.3 272 108.3z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </span>
          </Button>
          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
        </div>

        <p className="mt-5 text-xs text-slate-400">
          By signing in you agree to our terms and privacy policy.
        </p>
      </div>
    </div>
  );
}

