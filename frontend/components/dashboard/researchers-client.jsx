"use client";

import { useState, useEffect } from "react";
import AddResearcherForm from "./add-researcher-form";
import ResearchersTable from "./researchers-table";
import userService from "@/services/userService";
import toast from "react-hot-toast";

export default function ResearchersClient() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAdminResearcher, setIsAdminResearcher] = useState(false);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await userService.getUserDetails();
        setIsAdminResearcher(res.data?.is_admin_researcher === true);
      } catch {
        toast.error("Failed to fetch user details!!");
        setIsAdminResearcher(false);
      }
    };
    fetchCurrentUser();
  }, []);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="p-6 pb-0">
          <p className="text-muted-foreground text-[16px]">
            Add or manage researchers in your dashboard using search and status.
          </p>
        </div>
        {isAdminResearcher && (
          <AddResearcherForm onSuccess={() => setRefreshKey((k) => k + 1)} />
        )}
      </div>

      <ResearchersTable refreshKey={refreshKey} isAdminResearcher={isAdminResearcher} />
    </>
  );
}
