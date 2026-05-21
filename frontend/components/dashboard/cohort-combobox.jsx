"use client";

import { useState, useEffect, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Search, X, Loader2 } from "lucide-react";
import cohortService from "@/services/cohortService";

export default function CohortCombobox({ value, onChange, initialCohort = null, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(false);
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors hover:bg-accent/5 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className={selectedCohort ? "text-foreground" : "text-muted-foreground"}>
            {selectedCohort ? selectedCohort.name : "Select a cohort"}
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
            placeholder="Type a cohort name..."
            className="flex h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
        </div>

        {/* Results list */}
        <div className="max-h-56 overflow-y-auto p-1">
          {!loading && cohorts.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              {search ? "No cohorts match your search." : "No cohorts available."}
            </p>
          ) : (
            <>
              {cohorts.length > 0 && (
                <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">
                  Please select:
                </p>
              )}
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
