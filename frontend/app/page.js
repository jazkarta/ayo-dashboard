"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getTokens } from "@/services/keycloakService";

/**
 * Root page - redirects to login or dashboard based on auth status
 */
export default function HomePage() {
  const router = useRouter();
  const hasChecked = useRef(false);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;

    const { access_token } = getTokens();
    if (access_token) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  // Show nothing while checking auth and redirecting
  return null;
}