import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/utils/utils";
import { statsData } from "@/utils/data";

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {statsData.map((stat) => (
        <Card key={stat.title} className="animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">
                  {stat.title}
                </p>
                <p className="text-3xl font-bold tracking-tight text-foreground">
                  {stat.value}
                </p>
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full",
                  stat.trend === "up"
                    ? "bg-green-50 text-green-700"
                    : "bg-red-50 text-red-700"
                )}
              >
                {stat.trend === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {stat.change}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
