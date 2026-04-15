"use client";

import { useState } from "react";
import AddParticipantForm from "./add-participant-form";
import ParticipantsTable from "./participants-table";

export default function ParticipantsClient() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="p-6 pb-0">
          <p className="text-muted-foreground text-[16px]">
            Add or manage participants in your dashboard using search,
            paging, and status.
          </p>
        </div>
        <AddParticipantForm onSuccess={() => setRefreshKey((k) => k + 1)} />
      </div>

      <ParticipantsTable refreshKey={refreshKey} />
    </>
  );
}
