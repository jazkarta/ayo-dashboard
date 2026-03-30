import { Sidebar } from "@/components/layout/sidebar";
import { AuthWrapper } from "./auth-wrapper";

export const metadata = {
  title: "Dashboard",
};

/**
 * Dashboard layout — wraps all /dashboard/* pages with the sidebar.
 * Authentication is protected by AuthWrapper component.
 */
export default function DashboardLayout({ children }) {
  return (
    <AuthWrapper>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {children}
        </div>
      </div>
    </AuthWrapper>
  );
}
