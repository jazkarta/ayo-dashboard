"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users, FlaskConical } from "lucide-react";

export const StatsContext = createContext({
  participantCount: null,
  researcherCount: null,
  setParticipantCount: () => {},
  setResearcherCount: () => {},
});

export function StatsProvider({ children }) {
  const [participantCount, setParticipantCount] = useState(null);
  const [researcherCount, setResearcherCount] = useState(null);

  const value = useMemo(
    () => ({ participantCount, setParticipantCount, researcherCount, setResearcherCount }),
    [participantCount, researcherCount]
  );

  return (
    <StatsContext.Provider value={value}>
      {children}
    </StatsContext.Provider>
  );
}

export function StatsCards() {
  const { participantCount, researcherCount } = useContext(StatsContext);

  const statsData = [
    {
      title: "Total Participants",
      value: participantCount,
      description: "Registered participants",
      icon: Users,
    },
    {
      title: "Total Researchers",
      value: researcherCount,
      description: "Registered researchers",
      icon: FlaskConical,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-4">
      {statsData.map((stat) => (
        <Card key={stat.title} className="animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground font-medium">
                  {stat.title}
                </p>
                {stat.value === null ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-2" />
                ) : (
                  <p className="text-3xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </p>
                )}
              </div>
              <div className="rounded-full bg-muted p-2.5">
                <stat.icon className="h-5 w-5 text-muted-foreground" />
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
