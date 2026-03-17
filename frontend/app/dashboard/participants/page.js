import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Participants",
};

export default function ParticipantsPage() {
  return (
    <>
      <Header title="Participants" />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-6">
          <p className="text-muted-foreground text-sm">
            This page is coming soon.
          </p>
        </div>
        <div className="m-5">
          <Button>Add Participant</Button>
        </div>
      </main>
    </>
  );
}
