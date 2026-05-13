"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowLeft,
  AlertTriangle,
  Users,
  Calendar,
  UserCircle,
  SearchX,
} from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import cohortService from "@/services/cohortService";

const DESCRIPTION_LIMIT = 600;

function Description({ text }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > DESCRIPTION_LIMIT;
  const displayed = isLong && !expanded ? text.slice(0, DESCRIPTION_LIMIT).trimEnd() + "…" : text;

  return (
    <div className="mt-2">
      <p className="text-sm leading-relaxed text-muted-foreground">{displayed}</p>
      {isLong && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon }) {
  return (
    <div className="rounded-xl border bg-white p-5 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />}
      </div>
      <p className="mt-3 text-lg font-bold text-foreground leading-tight">{value}</p>
    </div>
  );
}

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-purple-100 text-purple-700",
  "bg-blue-100 text-blue-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
  "bg-rose-100 text-rose-700",
];

function getAvatarColor(name) {
  const code = (name?.charCodeAt(0) ?? 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export default function CohortDetail({ id }) {
  const router = useRouter();
  const [cohort, setCohort] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCohort = async () => {
      setLoading(true);
      setErrorKind(null);
      try {
        const res = await cohortService.getCohort(id);
        if (cancelled) return;
        setCohort(res.data);
      } catch (err) {
        if (cancelled) return;
        const status = err?.response?.status;
        const data = err?.response?.data;
        const message =
          (typeof data === "string" && data) ||
          data?.detail ||
          data?.message ||
          data?.error ||
          err?.message ||
          "Failed to load cohort details. Please try again.";
        if (status !== 404) {
          console.error("Failed to load cohort details:", err);
          toast.error(message);
        }
        setErrorKind(status === 404 ? "not-found" : "generic");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCohort();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (errorKind === "not-found") {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100">
          <SearchX className="h-10 w-10 text-slate-400" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">Cohort not found</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            The cohort you're looking for doesn't exist or may have been deleted.
          </p>
        </div>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go back
        </Button>
      </div>
    );
  }

  if (errorKind === "generic" || !cohort) {
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
          
          <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white/5" />
          <div className="absolute right-16 top-12 h-28 w-28 rounded-full bg-white/5" />
          <div className="absolute left-1/3 bottom-6 h-20 w-20 rounded-full bg-white/5" />

         
          <button
            onClick={() => router.back()}
            className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>

        <div className="absolute left-6" style={{ bottom: -36 }}>
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border-4 border-background bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
            <Users className="h-7 w-7 text-white" />
          </div>
        </div>
      </div>

      <div className="pt-12">
        <h1 className="text-2xl font-bold text-foreground">{cohort.name}</h1>
        {cohort.description && (
          <Description text={cohort.description} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="Total Participants"
          value={cohort.participant_count ?? 0}
          icon={Users}
        />
        <StatCard
          title="Created"
          value={createdDate}
          icon={Calendar}
        />
        <StatCard
          title="Created By"
          value={cohort.created_by ? `${cohort.created_by.first_name} ${cohort.created_by.last_name}`.trim() : "-"}
          icon={UserCircle}
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">Participants</h2>
          <span className="text-xs text-muted-foreground">
            {cohort.participants?.length ?? 0} {cohort.participants?.length === 1 ? "member" : "members"}
          </span>
        </div>
        {!cohort.participants?.length ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No participants in this cohort.
          </p>
        ) : (
          <div className="max-h-96 divide-y overflow-y-auto">
            {cohort.participants.map((p) => {
              const fullName = `${p.first_name} ${p.last_name}`.trim();
              const initial = p.first_name?.charAt(0)?.toUpperCase() ?? "?";
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50/60"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${getAvatarColor(p.first_name)}`}>
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground leading-tight">{fullName || "-"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">{p.email}</p>
                  </div>
                  {p.family_id && (
                    <span className="hidden sm:inline text-xs font-medium text-muted-foreground">
                      {p.family_id}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
