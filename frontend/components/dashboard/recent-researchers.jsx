"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import researcherService from "@/services/researcherService";
import { StatsContext } from "@/components/dashboard/stats-cards";

const getName = (r) =>
  r.full_name || `${r.first_name || ""} ${r.last_name || ""}`.trim() || "Unknown";

const getInitials = (r) => {
  const name = getName(r);
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function RecentResearchers() {
  const { setResearcherCount } = useContext(StatsContext);
  const [researchers, setResearchers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResearchers = async () => {
      try {
        const res = await researcherService.getAllResearchers();
        setResearcherCount(res.data?.count ?? 0);
        const data = res.data?.results ?? res.data ?? [];
        setResearchers(data.slice(0, 5));
      } catch {
        setResearcherCount(0);
        toast.error("Failed to load researchers.");
      } finally {
        setLoading(false);
      }
    };
    fetchResearchers();
  }, [setResearcherCount]);

  return (
    <Card className="animate-fade-in flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base font-semibold">Researchers</CardTitle>
          <CardDescription className="mt-1">
            Active research staff and their studies
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="text-xs gap-1" asChild>
          <Link href="/dashboard/researchers">
            View all
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="p-0 flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : researchers.length === 0 ? (
          <p className="text-center py-10 text-sm text-muted-foreground">
            No researchers found
          </p>
        ) : (
          <div className="divide-y divide-border">
            {researchers.map((researcher, index) => (
              <div
                key={researcher.id ?? index}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/40 transition-colors"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="text-xs font-semibold bg-secondary text-secondary-foreground">
                    {getInitials(researcher)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {getName(researcher)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {researcher.email || researcher.username || "—"}
                  </p>
                </div>

                {/* <Badge
                  variant={researcher.is_active ? "success" : "outline"}
                  className="shrink-0"
                >
                  {researcher.is_active ? "Active" : "Inactive"}
                </Badge> */}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
