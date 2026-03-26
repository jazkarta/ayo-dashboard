"use client";
import axios from "axios";
import { getTokens, refreshTokens, isTokenExpired } from "@/services/keycloakService";

const baseURL = process.env.NEXT_PUBLIC_API_URL;

const redirectToLogin = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.location.href = "/login";
  }
};

const ApiClient = () => {
  const instance = axios.create({
    baseURL,
    headers: { Accept: "application/json" },
  });

  instance.interceptors.request.use(async (request) => {
    // Allow callers to opt out of auth with { public: true }
    const requireToken = request.public !== undefined ? !request.public : true;
    // Allow callers to force-send the token on public routes with { sendToken: true }
    const sendToken = request.sendToken !== undefined ? request.sendToken : false;

    // Set Content-Type unless FormData (browser handles it automatically)
    const contentType = request.contentType;
    if (contentType) {
      request.headers["Content-Type"] = contentType;
    } else if (!(request.data instanceof FormData)) {
      request.headers["Content-Type"] = "application/json";
    }

    if (requireToken || sendToken) {
      let { access_token } = getTokens();

      // Try to refresh if the token is about to expire or missing
      if (!access_token || isTokenExpired(30)) {
        access_token = await refreshTokens(30);
      }

      if (access_token) {
        request.headers.Authorization = `Bearer ${access_token}`;
      } else if (requireToken) {
        // No valid token and the route requires auth — redirect to login
        redirectToLogin();
        return Promise.reject(new Error("No valid access token. Redirecting to login."));
      }
    }

    return request;
  });

  // Optional: handle 401 responses globally (e.g. token accepted by axios but rejected by API)
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retried) {
        originalRequest._retried = true;

        const freshToken = await refreshTokens(0); // force refresh
        if (freshToken) {
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          return instance(originalRequest);
        }

        // Still no token — log the user out
        redirectToLogin();
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

export default ApiClient();