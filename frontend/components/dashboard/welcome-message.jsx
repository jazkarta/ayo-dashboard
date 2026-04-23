"use client";

import { useEffect, useState } from "react";
import userService from "@/services/userService";

export function WelcomeMessage() {
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    userService
      .getUserDetails()
      .then((res) => setFullName(res.data?.full_name || res.data?.username || ""))
      .catch(() => {});
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold text-foreground">
        Welcome{fullName ? ` ${fullName}` : ""}!
      </h2>
      <p className="text-sm text-muted-foreground mt-0.5">
        Here&apos;s what&apos;s happening today.
      </p>
    </div>
  );
}
