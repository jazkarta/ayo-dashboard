import { Header } from "@/components/layout/header";
import ResearchersClient from "@/components/dashboard/researchers-client";

export const metadata = {
  title: "Ayo Dashboard | Researchers",
};

export default function ResearchersPage() {
  return (
    <>
      <Header title="Researchers" />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="m-5 flex flex-col gap-4">
          <ResearchersClient />
        </div>
      </main>
    </>
  );
}
