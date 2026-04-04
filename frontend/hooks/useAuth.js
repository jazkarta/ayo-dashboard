import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useKeycloak } from "@/context/KeycloakContext";

/**
 * useAuth hook - Check if user is authenticated and redirect to login if not
 * Returns { isAuthenticated, isLoading }
 */
export const useAuth = () => {
  const router = useRouter();
  const { authenticated, hasRequiredRole, isLoading } = useKeycloak();

  useEffect(() => {
    // Only redirect if we've finished loading
    if (isLoading) return;

    if (!authenticated) {
      router.replace("/login?session=expired");
    } else if (!hasRequiredRole) {
      // If we are authenticated but don't have the role, we MUST log out to clear the session
      import("@/services/keycloakService").then(({ logout }) => {
        logout(`${window.location.origin}/login?session=unauthorized`);
      });
    }
  }, [authenticated, hasRequiredRole, isLoading, router]);

  return { isAuthenticated: authenticated, isAuthorized: hasRequiredRole, isLoading };
};
