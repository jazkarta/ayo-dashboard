import * as KeycloakModule from "keycloak-js";

// Handle different import styles (ESM, CJS, Next.js weirdness)
const Keycloak = (KeycloakModule.default || KeycloakModule);


const keycloakConfig = {
  url: process.env.NEXT_PUBLIC_KEYCLOAK_URL,
  realm: process.env.NEXT_PUBLIC_KEYCLOAK_REALM,
  clientId: process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID,
};

// Singleton — one Keycloak instance for the whole app lifecycle
let _keycloak = null;

const getKeycloak = () => {
  if (typeof window === "undefined") return null;

  if (!_keycloak) {
    if (typeof Keycloak !== "function") {
      console.error("[Keycloak] Error: Keycloak constructor is not available.", Keycloak);
      return null;
    }
    _keycloak = new Keycloak(keycloakConfig);
    console.log("[Keycloak] Instance created.");
  }
  return _keycloak;
};

/**
 * Initialise Keycloak with a silent SSO check.
 * Call this once on app mount (e.g. in the callback page or a top-level provider).
 * Returns { authenticated, keycloak }.
 */
export const initKeycloak = async () => {
  const kc = getKeycloak();
  if (!kc) return { authenticated: false, keycloak: null };

  // If already initialized, just return it
  if (kc.didInitialize) {
    return { authenticated: kc.authenticated, keycloak: kc };
  }

  try {
    const redirectUri = `${window.location.origin}/auth/callback`;
    const { access_token, refresh_token } = getTokens();

    const authenticated = await kc.init({
      onLoad: "check-sso",
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      redirectUri,
      pkceMethod: "S256",
      token: access_token || undefined,
      refreshToken: refresh_token || undefined,
    });

    // Listen for events to keep localStorage in sync
    kc.onTokenExpired = () => {
      console.log("[Keycloak] Token expired. Attempting refresh...");
      refreshTokens(30).catch(console.error);
    };

    kc.onAuthRefreshSuccess = () => {
      console.log("[Keycloak] Token successfully refreshed.");
      localStorage.setItem("access_token", kc.token);
      localStorage.setItem("refresh_token", kc.refreshToken);
    };

    kc.onAuthRefreshError = () => {
      console.error("[Keycloak] Failed to refresh token.");
    };

    return { authenticated, keycloak: kc };
  } catch (err) {
    console.error("[Keycloak] init error:", err);
    return { authenticated: false, keycloak: kc };
  }
};

/**
 * Redirect the user to Keycloak's login page, hinting to use the Google IdP.
 */
export const loginWithGoogle = async () => {
  const kc = getKeycloak();
  if (!kc) return;

  const redirectUri = `${window.location.origin}/auth/callback`;

  try {
    if (!kc.didInitialize) {
      await initKeycloak();
    }
    kc.login({ idpHint: "google", redirectUri });
  } catch (err) {
    console.error("[Keycloak] Login redirect failed:", err);
    kc.login({ idpHint: "google", redirectUri });
  }
};

/**
 * Log the user out and redirect to /login.
 */
export const logout = () => {
  const kc = getKeycloak();
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }
  if (kc && kc.didInitialize) {
    kc.logout({ redirectUri: `${window.location.origin}/login` });
  } else {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }
};

/**
 * Returns stored tokens from localStorage.
 */
export const getTokens = () => {
  if (typeof window === "undefined") return { access_token: null, refresh_token: null };
  return {
    access_token: localStorage.getItem("access_token"),
    refresh_token: localStorage.getItem("refresh_token"),
  };
};

/**
 * Attempt to refresh the access token.
 * minValidity (seconds) — refresh only if the token expires within this window.
 */
export const refreshTokens = async (minValidity = 30) => {
  const kc = getKeycloak();
  if (!kc) return null;

  // Use initKeycloak to ensure we have an initialized instance with tokens
  if (!kc.didInitialize) {
    const { authenticated } = await initKeycloak();
    if (!authenticated) return null;
  }

  try {
    // Re-check validity in case initKeycloak already refreshed it
    if (!kc.isTokenExpired(minValidity)) {
       return kc.token;
    }

    const refreshed = await kc.updateToken(minValidity);
    if (refreshed) {
      localStorage.setItem("access_token", kc.token);
      localStorage.setItem("refresh_token", kc.refreshToken);
      console.log("[Keycloak] Manual token refresh successful.");
    }
    return kc.token;
  } catch (err) {
    console.error("[Keycloak] Token refresh failed:", err);
    return null;
  }
};

/**
 * Check whether the current access token is expired.
 */
export const isTokenExpired = (minValidity = 30) => {
  const kc = getKeycloak();
  if (!kc) return true;
  
  // If not initialized, we can check the token in localStorage if we want,
  // but it's safer to say "it might be expired" and let refreshTokens handle re-init.
  if (!kc.didInitialize || !kc.token) return true;
  
  return kc.isTokenExpired(minValidity);
};

/**
 * Check whether the current user has roles.
 */
export const hasResearcherOrAdminRole = () => {
  const kc = getKeycloak();
  if (!kc || !kc.didInitialize) return false;
  return kc.hasRealmRole("researchers") || kc.hasRealmRole("admin");
};

/**
 * Returns the parsed (decoded) JWT token, or null if not authenticated.
 */
export const getParsedToken = () => {
  const kc = getKeycloak();
  return kc?.tokenParsed || null;
};

export default getKeycloak;

