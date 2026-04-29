import { Header } from "@/components/layout/header";
import ConversationsTable from "@/components/dashboard/conversations-table";

export const metadata = {
  title: "Ayo Dashboard | Conversations",
};

export default function ConversationsPage() {
  return (
    <>
      <Header title="Conversations" />

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="m-5 flex flex-col gap-4">
          <ConversationsTable />
        </div>
      </main>
    </>
  );
}
