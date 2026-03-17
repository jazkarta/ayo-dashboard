import { redirect } from "next/navigation";

/**
 * Root page - redirects to login.
 * Users must sign in first before accessing /dashboard.
 */
export default function HomePage() {
  redirect("/login");
}