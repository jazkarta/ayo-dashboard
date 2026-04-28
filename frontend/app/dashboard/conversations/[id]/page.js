import { Header } from "@/components/layout/header";
import ConversationDetails from "@/components/dashboard/conversation-details";

export const metadata = {
  title: "Ayo Dashboard | Conversation Details",
};

export default async function ConversationDetailsPage({ params }) {
  const { id } = await params;
  return (
    <>
      <Header title="Conversation Details" />

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="m-5 flex flex-col gap-4">
          <ConversationDetails id={id} />
        </div>
      </main>
    </>
  );
}
