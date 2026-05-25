"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, Search, X, Loader2, Plus } from "lucide-react";
import cohortService from "@/services/cohortService";
import toast from "react-hot-toast";

export default function CohortCombobox({ value, onChange, initialCohort = null, disabled = false, allowCreate = false, triggerClassName = "" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [cohorts, setCohorts] = useState([]);
  const [resolvedSearch, setResolvedSearch] = useState(null);
  const [searchCreating, setSearchCreating] = useState(false);
  const [inlineCreating, setInlineCreating] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState(initialCohort);
  const [showInlineCreate, setShowInlineCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState("");
  const inputRef = useRef(null);

  const anyCreating = searchCreating || inlineCreating;
  // Derived: true from the moment search/open changes until the fetch settles.
  // Avoids a setState in the effect body (which triggers cascading renders).
  const loading = open && resolvedSearch !== search;

  // All state resets live in the event handler so React batches them in one render.
  // Effects are reserved for DOM interaction and async external calls only.
  const handleOpenChange = (next) => {
    if (anyCreating) return;
    // Always reset inline-create state regardless of direction so stale form
    // state doesn't survive a close triggered by submitCreate's direct setOpen(false).
    setShowInlineCreate(false);
    setCreateName("");
    setCreateError("");
    setResolvedSearch(null);
    if (next) setSearch("");
    setOpen(next);
  };

  // DOM-only effect: focus the search input when the popover opens.
  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Fetch effect with ignore flag to prevent stale responses from overwriting
  // newer results (race condition when a slow earlier fetch resolves after a
  // faster later one). Immediate for empty search, debounced for typed queries.
  // `open` in deps ensures the initial fetch fires even when search is already "".
  useEffect(() => {
    if (!open) return;
    let ignore = false;
    const delay = search ? 800 : 0;
    const timer = setTimeout(async () => {
      try {
        const res = await cohortService.getAllCohorts(undefined, search);
        if (!ignore) setCohorts(res.data?.results || []);
      } catch {
        if (!ignore) setCohorts([]);
      } finally {
        if (!ignore) setResolvedSearch(search);
      }
    }, delay);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [open, search]);

  // Shared create logic — callers supply their own loading setter and error handler.
  const submitCreate = useCallback(async (name, setCreating, onError) => {
    setCreating(true);
    try {
      const res = await cohortService.createCohort({ name });
      const newCohort = res.data;
      setSelectedCohort(newCohort);
      onChange(newCohort.id, newCohort);
      setOpen(false);
      toast.success(`Cohort "${name}" created.`);
    } catch (err) {
      onError(err);
    } finally {
      setCreating(false);
    }
  }, [onChange]);

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

  const handleSearchCreate = () => {
    const name = search.trim();
    if (!name) return;
    submitCreate(name, setSearchCreating, () =>
      toast.error(`Failed to create cohort "${name}". Please try again.`)
    );
  };

  const handleInlineCreate = () => {
    if (inlineCreating) return;
    const name = createName.trim();
    if (!name) return;
    setCreateError("");
    submitCreate(name, setInlineCreating, (err) => {
      const msg = err.response?.data?.name?.[0];
      if (msg) {
        setCreateError(msg);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    });
  };

  const trimmedSearch = search.trim();
  const hasExactMatch = cohorts.some((c) => c.name.toLowerCase() === trimmedSearch.toLowerCase());
  const showCreate = allowCreate && trimmedSearch.length > 0 && !hasExactMatch && !loading;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors hover:bg-accent/5 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${triggerClassName}`}
        >
          <span className={`min-w-0 truncate ${selectedCohort ? "text-foreground" : "text-muted-foreground"}`}>
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
        <div className="flex items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={allowCreate ? "Search or type a new name..." : "Type a cohort name..."}
            disabled={anyCreating}
            className="flex h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
          />
          {(loading || anyCreating) && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />}
        </div>

        <div className="max-h-56 overflow-y-auto p-1">
          {cohorts.length === 0 && !loading && !showCreate && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              {search ? "No cohorts match your search." : "No cohorts available."}
            </p>
          )}

          {cohorts.length > 0 && (
            <>
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">Please select:</p>
                {allowCreate && !showInlineCreate && (
                  <button
                    type="button"
                    onClick={() => { setShowInlineCreate(true); setCreateName(""); setCreateError(""); }}
                    disabled={anyCreating}
                    className="flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Plus className="h-3 w-3" />
                    Add Cohort
                  </button>
                )}
              </div>
              {showInlineCreate && (
                <div className="flex flex-col gap-1.5 px-3 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        autoFocus
                        value={createName}
                        onChange={(e) => { setCreateName(e.target.value); setCreateError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleInlineCreate()}
                        placeholder="Cohort name"
                        disabled={inlineCreating}
                        className={`flex h-8 w-full rounded-md border bg-transparent px-2 pr-6 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50 ${createError ? "border-destructive" : "border-input"}`}
                      />
                      {createName && !inlineCreating && (
                        <button
                          type="button"
                          onClick={() => { setCreateName(""); setCreateError(""); }}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleInlineCreate}
                      disabled={inlineCreating || !createName.trim()}
                      className="flex h-8 shrink-0 items-center rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {inlineCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowInlineCreate(false); setCreateName(""); setCreateError(""); }}
                      disabled={inlineCreating}
                      className="flex h-8 shrink-0 items-center rounded-md bg-destructive/10 px-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                  {createError && <p className="text-xs text-destructive px-0.5">{createError}</p>}
                </div>
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

          {showCreate && (
            <>
              {cohorts.length > 0 && <div className="h-px bg-border mx-1 my-1" />}
              <button
                type="button"
                onClick={handleSearchCreate}
                disabled={searchCreating}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent disabled:opacity-50"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-primary/10">
                  {searchCreating ? (
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  ) : (
                    <Plus className="h-3 w-3 text-primary" />
                  )}
                </span>
                <span>
                  <span className="text-muted-foreground">{searchCreating ? "Creating " : "Create "}</span>
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
