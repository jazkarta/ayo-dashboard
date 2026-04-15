import { Header } from "@/components/layout/header";
import ParticipantsClient from "@/components/dashboard/participants-client";

export const metadata = {
  title: "Ayo Dashboard | Participants",
};

export default function ParticipantsPage() {
  return (
    <>
      <Header title="Participants" />

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="m-5 flex flex-col gap-4">
          <ParticipantsClient />
        </div>
      </main>
    </>
  );
}
