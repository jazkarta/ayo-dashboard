import { Header } from "@/components/layout/header";
import AddParticipantForm from "@/components/dashboard/add-participant-form";
import ParticipantsTable from "@/components/dashboard/participants-table";

export const metadata = {
  title: "Ayo Dashboard | Participants",
};

export default function ParticipantsPage() {
  return (
    <>
      <Header title="Participants" />

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="m-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="p-6 pb-0">
              <p className="text-muted-foreground text-[16px]">
                Add or manage participants in your dashboard using search,
                paging, and status.
              </p>
            </div>
            <AddParticipantForm />
          </div>

          <ParticipantsTable />
        </div>
      </main>
    </>
  );
}
