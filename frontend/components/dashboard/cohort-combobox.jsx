"use client";

import { useState, useEffect, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Search, X, Loader2, Plus } from "lucide-react";
import cohortService from "@/services/cohortService";
import toast from "react-hot-toast";

export default function CohortCombobox({ value, onChange, initialCohort = null, disabled = false, allowCreate = false, triggerClassName = "" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState(initialCohort);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    fetchCohorts("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => fetchCohorts(search), 800);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchCohorts = async (searchTerm) => {
    setLoading(true);
    try {
      const res = await cohortService.getAllCohorts(undefined, searchTerm);
      setCohorts(res.data?.results || []);
    } catch {
      setCohorts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (cohort) => {
    setSelectedCohort(cohort);
    onChange(cohort.id, cohort);
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSelectedCohort(null);
    onChange("");
  };

  const handleCreate = async () => {
    const name = search.trim();
    if (!name) return;
    setCreating(true);
    try {
      const res = await cohortService.createCohort({ name });
      const newCohort = res.data;
      setSelectedCohort(newCohort);
      onChange(newCohort.id, newCohort);
      setOpen(false);
      toast.success(`Cohort "${name}" created.`);
    } catch {
      toast.error(`Failed to create cohort "${name}". Please try again.`);
    } finally {
      setCreating(false);
    }
  };

  const trimmedSearch = search.trim();
  const hasExactMatch = cohorts.some((c) => c.name.toLowerCase() === trimmedSearch.toLowerCase());
  const showCreate = allowCreate && trimmedSearch.length > 0 && !hasExactMatch && !loading;

  return (
    <Popover open={open} onOpenChange={(next) => { if (!creating) setOpen(next); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors hover:bg-accent/5 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${triggerClassName}`}
        >
          <span className={selectedCohort ? "text-foreground" : "text-muted-foreground"}>
            {selectedCohort ? selectedCohort.name : allowCreate ? "Select or create a cohort" : "Select a cohort"}
          </span>
          <div className="flex items-center gap-1.5">
            {selectedCohort && !disabled && (
              <span
                onClick={handleClear}
                className="flex h-4 w-4 items-center justify-center rounded-full bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/40 transition-all"
              >
                <X className="h-2.5 w-2.5" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
        align="start"
        sideOffset={4}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={allowCreate ? "Search or type a new name..." : "Type a cohort name..."}
            disabled={creating}
            className="flex h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          {(loading || creating) && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
        </div>

        {/* Results list */}
        <div className="max-h-56 overflow-y-auto p-1">
          {cohorts.length === 0 && !loading && !showCreate && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              {search ? "No cohorts match your search." : "No cohorts available."}
            </p>
          )}

          {cohorts.length > 0 && (
            <>
              <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">
                Please select:
              </p>
              {cohorts.map((cohort) => (
                <button
                  key={cohort.id}
                  type="button"
                  onClick={() => handleSelect(cohort)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                    value === cohort.id ? "bg-accent/60 font-medium" : ""
                  }`}
                >
                  {cohort.name}
                </button>
              ))}
            </>
          )}

          {showCreate && (
            <>
              {cohorts.length > 0 && <div className="h-px bg-border mx-1 my-1" />}
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-50"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10">
                  {creating ? (
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  ) : (
                    <Plus className="h-3 w-3 text-primary" />
                  )}
                </span>
                <span>
                  <span className="text-muted-foreground">{creating ? "Creating " : "Create "}</span>
                  <span className="font-semibold text-foreground">"{trimmedSearch}"</span>
                </span>
              </button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
