"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, User } from "lucide-react";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import participantService from "@/services/participantService";
import { StatsContext } from "@/components/dashboard/stats-cards";


const getName = (participant) =>
  participant.name || participant.full_name || `${participant.first_name || ""} ${participant.last_name || ""}`.trim() || "";

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
  const { setParticipantCount } = useContext(StatsContext);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const res = await participantService.getAllParticipants();
        setParticipantCount(res.data?.count ?? 0);
        const data = res.data?.results ?? res.data ?? [];
        setParticipants(data.slice(0, 5));
      } catch (err) {
        setParticipantCount(0);
        toast.error("Failed to load participants.");
      } finally {
        setLoading(false);
      }
    };
    fetchParticipants();
  }, [setParticipantCount]);

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
              const status = participant.is_active
                ? { label: "Active", className: "inline-flex items-center justify-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-600 w-20", dotClass: "h-1.5 w-1.5 rounded-full bg-green-500" }
                : { label: "Pending", className: "inline-flex items-center justify-center gap-1.5 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-600 w-20", dotClass: "h-1.5 w-1.5 rounded-full bg-yellow-500" };

              return (
                <div
                  key={participant.id ?? index}
                  className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/40 transition-colors"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs font-semibold">
                      {participant.username
                        ? participant.username.slice(0, 2).toUpperCase()
                        : getInitials(participant) || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {participant.username || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {participant.study || participant.study_name || participant.email || "—"}
                    </p>
                  </div>


                  <span className={status.className}>
                    <span className={status.dotClass} />
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
