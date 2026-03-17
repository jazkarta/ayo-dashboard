import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
import { recentParticipants } from "@/lib/data";
import { cn } from "@/lib/utils";

const statusConfig = {
  active: { label: "Active", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  completed: { label: "Completed", variant: "secondary" },
  inactive: { label: "Inactive", variant: "outline" },
};

export function RecentParticipants() {
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
        <div className="divide-y divide-border">
          {recentParticipants.map((participant) => {
            const status = statusConfig[participant.status] ?? {
              label: participant.status,
              variant: "outline",
            };
            return (
              <div
                key={participant.id}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/40 transition-colors"
              >
                {/* Avatar */}
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="text-xs font-semibold">
                    {participant.initials}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {participant.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {participant.study}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="hidden sm:flex flex-col items-end gap-1 w-20 shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {participant.progress}%
                  </span>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        participant.progress === 100
                          ? "bg-green-500"
                          : "bg-primary"
                      )}
                      style={{ width: `${participant.progress}%` }}
                    />
                  </div>
                </div>

                {/* Status */}
                <Badge variant={status.variant} className="shrink-0">
                  {status.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
