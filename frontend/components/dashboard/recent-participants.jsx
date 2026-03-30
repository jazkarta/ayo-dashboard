"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/utils";
import participantService from "@/services/participantService";

const STATUS = {
  active: { label: "Active", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  completed: { label: "Completed", variant: "secondary" },
  inactive: { label: "Inactive", variant: "outline" },
};

const getName = (participant) =>
  participant.name || participant.full_name || `${participant.first_name || ""} ${participant.last_name || ""}`.trim() || "Unknown";

const getInitials = (participant) => {
  const name = getName(participant);
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function RecentParticipants() {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const res = await participantService.getAllParticipants();
        const data = res.data?.results ?? res.data ?? [];
        setParticipants(data.slice(0, 5));
      } catch (err) {
        console.error("Failed to fetch participants:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchParticipants();
  }, []);

  return (
    <Card className="animate-fade-in flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base font-semibold">
            Recent Participants
          </CardTitle>
          <CardDescription className="mt-1">
            Latest enrollments across all studies
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="text-xs gap-1" asChild>
          <Link href="/dashboard/participants">
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
        ) : participants.length === 0 ? (
          <p className="text-center py-10 text-sm text-muted-foreground">
            No participants found
          </p>
        ) : (
          <div className="divide-y divide-border">
            {participants.map((participant, index) => {
              const status = STATUS[participant.status] ?? { label: participant.status ?? "Unknown", variant: "outline" };
              const progress = participant.progress ?? 0;

              return (
                <div
                  key={participant.id ?? index}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/40 transition-colors"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs font-semibold">
                      {getInitials(participant)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {getName(participant)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {participant.study || participant.study_name || participant.email || "—"}
                    </p>
                  </div>

                  <div className="hidden sm:flex flex-col items-end gap-1 w-20 shrink-0">
                    <span className="text-xs text-muted-foreground">{progress}%</span>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          progress === 100 ? "bg-green-500" : "bg-primary"
                        )}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <Badge variant={status.variant} className="shrink-0">
                    {status.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}