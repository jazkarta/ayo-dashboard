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

  try {
    const redirectUri = `${window.location.origin}/auth/callback`;

    const authenticated = await kc.init({
      onLoad: "check-sso",
      silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
      redirectUri,
      pkceMethod: "S256",
    });

    return { authenticated, keycloak: kc };
  } catch (err) {
    console.error("[Keycloak] init error:", err);
    return { authenticated: false, keycloak: kc };
  }
};

/**
 * Redirect the user to Keycloak's login page, hinting to use the Google IdP.
 * Make sure "google" matches exactly the identity provider alias in your Keycloak realm.
 */
export const loginWithGoogle = async () => {
  const kc = getKeycloak();
  if (!kc) return;

  const redirectUri = `${window.location.origin}/auth/callback`;

  try {
    // Some versions of keycloak-js require init() before login() works correctly
    if (!kc.didInitialize) {
      await kc.init({
        onLoad: "check-sso",
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
        pkceMethod: "S256",
      });
    }
    kc.login({ idpHint: "google", redirectUri });
  } catch (err) {
    console.error("[Keycloak] Login redirect failed:", err);
    // Fallback if init fails but we want to try login anyway
    kc.login({ idpHint: "google", redirectUri });
  }
};

/**
 * Log the user out and redirect to /login.
 */
export const logout = () => {
  const kc = getKeycloak();
  if (!kc) return; // SSR guard

  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  kc.logout({ redirectUri: `${window.location.origin}/login` });
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
 * Returns the fresh access_token string, or null on failure.
 */
export const refreshTokens = async (minValidity = 30) => {
  const kc = getKeycloak();
  if (!kc) return null; // SSR guard

  try {
    const refreshed = await kc.updateToken(minValidity);
    if (refreshed) {
      localStorage.setItem("access_token", kc.token);
      localStorage.setItem("refresh_token", kc.refreshToken);
    }
    return kc.token;
  } catch (err) {
    console.error("[Keycloak] Token refresh failed:", err);
    return null;
  }
};

/**
 * Check whether the current access token is expired.
 * Uses keycloak-js built-in method.
 */
export const isTokenExpired = (minValidity = 30) => {
  const kc = getKeycloak();
  if (!kc || !kc.token) return true; // SSR guard
  return kc.isTokenExpired(minValidity);
};

/**
 * Check whether the current user has the 'researchers' or 'admin' realm-level roles.
 */
export const hasResearcherOrAdminRole = () => {
  const kc = getKeycloak();
  if (!kc) return false;
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

