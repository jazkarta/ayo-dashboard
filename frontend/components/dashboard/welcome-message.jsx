"use client";

import { useUser } from "@/context/UserContext";

export function WelcomeMessage() {
  const user = useUser();
  const fullName = user?.full_name || user?.username || "";

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">
        Welcome, {fullName ? ` ${fullName}` : ""}!
      </h2>
      <p className="text-sm text-muted-foreground mt-0.5">
        Here&apos;s what&apos;s happening today.
      </p>
    </div>
  );
}
