'use client'
import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getTokens } from "@/services/keycloakService";

/**
 * useAuth hook - Check if user is authenticated and redirect to login if not
 * Returns { isAuthenticated, isLoading }
 */
export const useAuth = () => {
  const router = useRouter();

  // useSyncExternalStore: no setState in effects, no hydration mismatch
  // Server snapshot returns false; client snapshot reads localStorage
  const isAuthenticated = useSyncExternalStore(
    () => () => {},                          
    () => !!getTokens().access_token,        // client snapshot
    () => false,                             // server snapshot
  );

  useEffect(() => {
    if (!isAuthenticated) {
      // Double-check localStorage directly — guards against the server snapshot
      // being false during hydration before useSyncExternalStore syncs to client value
      const { access_token } = getTokens();
      if (!access_token) {
        router.replace("/login?session=expired");
      }
    }
  }, [isAuthenticated, router]);

  return { isAuthenticated, isLoading: false };
};
