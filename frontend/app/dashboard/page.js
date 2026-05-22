import { Header } from "@/components/layout/header";
import { StatsCards, StatsProvider } from "@/components/dashboard/stats-cards";
import { RecentParticipants } from "@/components/dashboard/recent-participants";
import { RecentResearchers } from "@/components/dashboard/recent-researchers";
import { WelcomeMessage } from "@/components/dashboard/welcome-message";

export const metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <>
      <Header title="Dashboard" />

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">

          <WelcomeMessage />

          <StatsProvider>
            <section aria-labelledby="stats-heading">
              <h2 id="stats-heading" className="sr-only">Statistics Overview</h2>
              <StatsCards />
            </section>

            <section aria-labelledby="recent-heading" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <h2 id="recent-heading" className="sr-only">Recent Activity</h2>
              <RecentParticipants />
              <RecentResearchers />
            </section>
          </StatsProvider>

        </div>
      </main>
    </>
  );
}
