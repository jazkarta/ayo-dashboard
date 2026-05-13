"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import cohortService from "@/services/cohortService";

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 py-3 border-b last:border-0">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm text-foreground wrap-break-word">{value ?? "-"}</span>
    </div>
  );
}

export default function CohortDetail({ id }) {
  const router = useRouter();
  const [cohort, setCohort] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchCohort = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await cohortService.getCohort(id);
        setCohort(res.data);
      } catch {
        setError(true);
        toast.error("Failed to load cohort details.");
      } finally {
        setLoading(false);
      }
    };
    fetchCohort();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="animate-spin h-8 w-8 text-muted-foreground" />
      </div>
    );
  }

  if (error || !cohort) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
        <AlertTriangle className="h-8 w-8" />
        <p>Could not load cohort details.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 pt-8">
      <div className="w-full max-w-xl">
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>{cohort.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <DetailRow label="Name" value={cohort.name} />
          <DetailRow label="Description" value={cohort.description} />
        </CardContent>
      </Card>
    </div>
  );
}
