import Link from "next/link";
import { ArrowRight, BookOpen, Users } from "lucide-react";
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
import { recentResearchers } from "@/lib/data";

const statusConfig = {
  active: { label: "Active", variant: "success" },
  pending: { label: "Pending", variant: "warning" },
  inactive: { label: "Inactive", variant: "outline" },
};

export function RecentResearchers() {
  return (
    <Card className="animate-fade-in flex flex-col">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-base font-semibold">
            Researchers
          </CardTitle>
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
        <div className="divide-y divide-border">
          {recentResearchers.map((researcher) => {
            const status = statusConfig[researcher.status] ?? {
              label: researcher.status,
              variant: "outline",
            };
            return (
              <div
                key={researcher.id}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-muted/40 transition-colors"
              >
                {/* Avatar */}
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="text-xs font-semibold bg-secondary text-secondary-foreground">
                    {researcher.initials}
                  </AvatarFallback>
                </Avatar>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {researcher.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {researcher.department} · {researcher.specialty}
                  </p>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-3 shrink-0">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <BookOpen className="h-3 w-3" />
                    <span>{researcher.activeStudies}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{researcher.totalParticipants}</span>
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
