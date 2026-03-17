import { Sidebar } from "@/components/layout/sidebar";

export const metadata = {
  title: "Dashboard",
};

/**
 * Dashboard layout — wraps all /dashboard/* pages with the sidebar.
 * The sidebar is server-rendered; active link detection uses client hooks.
 */
export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
