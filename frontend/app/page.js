import { redirect } from "next/navigation";

/**
 * Root page - redirects to dashboard.
 * All main content lives under /dashboard.
 */
export default function HomePage() {
  redirect("/dashboard");
}