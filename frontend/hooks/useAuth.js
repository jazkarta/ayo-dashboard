import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTokens, initKeycloak, isTokenExpired } from "@/services/keycloakService";

/**
 * useAuth hook - Check if user is authenticated and redirect to login if not
 * Returns { isAuthenticated, isLoading }
 */
export const useAuth = () => {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if tokens exist in localStorage
        const { access_token } = getTokens();

        if (!access_token) {
          // No token, user is not authenticated
          setIsAuthenticated(false);
          setIsLoading(false);
          router.push("/login");
          return;
        }

        // Initialize Keycloak to properly validate token
        const { authenticated } = await initKeycloak();

        if (!authenticated) {
          // Not authenticated, redirect to login
          setIsAuthenticated(false);
          setIsLoading(false);
          router.push("/login");
          return;
        }

        // Token is valid and Keycloak is authenticated
        setIsAuthenticated(true);
        setIsLoading(false);
      } catch (err) {
        setIsAuthenticated(false);
        setIsLoading(false);
        router.push("/login");
      }
    };

    checkAuth();
  }, [router]);

  return { isAuthenticated, isLoading };
};
