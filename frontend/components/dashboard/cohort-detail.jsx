"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowLeft,
  AlertTriangle,
  Users,
  Calendar,
  UserCircle,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import cohortService from "@/services/cohortService";

function StatCard({ icon: Icon, label, value, iconBg, iconColor }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-white p-5 shadow-sm min-w-[180px]">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${iconBg}`}
      >
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value ?? "-"}</p>
      </div>
    </div>
  );
}

export default function CohortDetail({ id }) {
  const router = useRouter();
  const [cohort, setCohort] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    cohortService
      .getCohort(id)
      .then((res) => setCohort(res.data))
      .catch(() => {
        setError(true);
        toast.error("Failed to load cohort details.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !cohort) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertTriangle className="h-8 w-8" />
        <p>Could not load cohort details.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          Go back
        </Button>
      </div>
    );
  }

  const createdDate = cohort.created_at
    ? format(new Date(cohort.created_at), "MMM dd, yyyy")
    : "-";

  return (
    <div className="flex flex-col gap-6" style={{ overflowX: "hidden" }}>
      <div className="relative">
        {/* Banner */}
        <div
          className="overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600"
          style={{ height: 180 }}
        >
          {/* Decorative circles — safely clipped */}
          <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white/5" />
          <div className="absolute right-16 top-12 h-28 w-28 rounded-full bg-white/5" />
          <div className="absolute left-1/3 bottom-6 h-20 w-20 rounded-full bg-white/5" />

          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        {/* Avatar — outside banner, straddling its bottom */}
        <div className="absolute left-6" style={{ bottom: -36 }}>
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-4 border-background bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
            <Users className="h-7 w-7 text-white" />
          </div>
        </div>
      </div>

      <div className="pt-12">
        <h1 className="text-2xl font-bold text-foreground">{cohort.name}</h1>
        {cohort.description && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {cohort.description}
          </p>
        )}
      </div>

      <div className="flex items-stretch gap-4">
        <StatCard
          icon={Users}
          label="Total Participants"
          value={cohort.participant_count ?? 0}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={Calendar}
          label="Created"
          value={createdDate}
          iconBg="bg-violet-50"
          iconColor="text-violet-600"
        />

        <Card className="flex-1">
          <CardContent className="pt-6">
            <h2 className="mb-4 text-sm font-semibold text-foreground">
              Details
            </h2>
            <div className="flex flex-wrap gap-8">
              <InfoItem
                icon={UserCircle}
                label="Created by"
                value={`Researcher #${cohort.created_by}`}
              />
              <InfoItem
                icon={Calendar}
                label="Created at"
                value={createdDate}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Participants list ───────────────────────────────────────────── */}
      <Card className="w-full">
        <CardContent className="pt-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Participants</h2>
          <div className="divide-y">
            {[
              { name: "Alice Johnson", email: "alice@example.com", username: "AliceJ" },
              { name: "Bob Smith", email: "bob@example.com", username: "BobS" },
              { name: "Carol White", email: "carol@example.com", username: "CarolW" },
            ].map((p) => (
              <div key={p.email} className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                  {p.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.email}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
