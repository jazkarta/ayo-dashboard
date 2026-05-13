"use client";

import { useState } from "react";
import AddCohortForm from "./add-cohort-form";
import CohortsTable from "./cohorts-table";

export default function CohortsClient() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="p-6 pb-0">
          <p className="text-muted-foreground text-[16px]">
            Add or manage cohorts in your dashboard using search.
          </p>
        </div>
        <AddCohortForm onSuccess={() => setRefreshKey((k) => k + 1)} />
      </div>

      <CohortsTable refreshKey={refreshKey} />
    </>
  );
}
