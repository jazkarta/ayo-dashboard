"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { initKeycloak, hasResearcherOrAdminRole } from "@/services/keycloakService";

const KeycloakContext = createContext({
  keycloak: null,
  authenticated: false,
  hasRequiredRole: false,
  isLoading: true,
});

export const KeycloakProvider = ({ children }) => {
  const [authState, setAuthState] = useState({
    keycloak: null,
    authenticated: false,
    hasRequiredRole: false,
    isLoading: true,
  });

  useEffect(() => {
    const init = async () => {
      try {
        console.log("[KeycloakContext] Initializing...");
        const { authenticated, keycloak } = await initKeycloak();
        console.log("[KeycloakContext] Init complete. Authenticated:", authenticated);
        
        setAuthState({
          keycloak,
          authenticated,
          hasRequiredRole: authenticated ? hasResearcherOrAdminRole() : false,
          isLoading: false,
        });
      } catch (error) {
        console.error("[KeycloakContext] Initialization failed:", error);
        setAuthState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    init();
  }, []);

  const value = useMemo(() => authState, [authState]);

  return (
    <KeycloakContext.Provider value={value}>
      {children}
    </KeycloakContext.Provider>
  );
};

export const useKeycloak = () => {
  const context = useContext(KeycloakContext);
  if (context === undefined) {
    throw new Error("useKeycloak must be used within a KeycloakProvider");
  }
  return context;
};
