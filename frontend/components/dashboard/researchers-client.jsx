"use client";

import { useState } from "react";
import AddResearcherForm from "./add-researcher-form";
import ResearchersTable from "./researchers-table";

export default function ResearchersClient() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="p-6 pb-0">
          <p className="text-muted-foreground text-[16px]">
            Add or manage researchers in your dashboard using search and status.
          </p>
        </div>
        <AddResearcherForm onSuccess={() => setRefreshKey((k) => k + 1)} />
      </div>

      <ResearchersTable refreshKey={refreshKey} />
    </>
  );
}
