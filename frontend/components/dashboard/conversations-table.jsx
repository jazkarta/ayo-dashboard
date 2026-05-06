"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Loader2, SlidersHorizontal, X, Download, MessageSquareOff, User, Filter, CalendarIcon, ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import conversationService from "@/services/conversationService";

const columnHelper = createColumnHelper();

const INITIAL_FILTERS = { participant_username: "", turns_min: "", turns_max: "", participant_age: "", date_from: "", date_to: "" };

function downloadBlob(blob, filename) {
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(blobUrl);
}

function parseFilename(disposition, fallback) {
  if (!disposition) return fallback;
  const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8) return decodeURIComponent(utf8[1].trim());
  const quoted = disposition.match(/filename="((?:[^"\\]|\\.)+)"/i);
  if (quoted) return quoted[1].replace(/\\(.)/g, "$1");
  const plain = disposition.match(/filename=([^;]+)/i);
  if (plain) return plain[1].trim();
  return fallback;
}

async function readBlobMessage(blob) {
  if (!blob || typeof blob.text !== "function") return null;
  try {
    const text = await blob.text();
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      return parsed?.detail || parsed?.message || parsed?.error || null;
    } catch {
      return text.length < 300 ? text : null;
    }
  } catch {
    return null;
  }
}

export default function ConversationsTable() {
  // const [search, setSearch] = useState("");
  // const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedSearch] = useState("");

  const [draft, setDraft] = useState(INITIAL_FILTERS);
  const [applied, setApplied] = useState(INITIAL_FILTERS);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [currentUrl, setCurrentUrl] = useState("/chats/conversations/");
  const [loading, setLoading] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  // useEffect(() => {
  //   const t = setTimeout(() => {
  //     setDebouncedSearch(search);
  //     setCurrentUrl("/chats/conversations/");
  //   }, 500);
  //   return () => clearTimeout(t);
  // }, [search]);

  const fetchConversations = async (url, searchTerm, filters) => {
    setLoading(true);
    try {
      const response = await conversationService.getAllConversations(url, searchTerm, filters);
      setData(response.data?.results || []);
      setPagination({
        count: response.data?.count || 0,
        next: response.data?.next || null,
        previous: response.data?.previous || null,
      });
    } catch {
      toast.error("Failed to load conversations. Please try again.");
      setData([]);
      setPagination({ count: 0, next: null, previous: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations(currentUrl, debouncedSearch, applied);
  }, [currentUrl, debouncedSearch, applied]);

  const activeCount = useMemo(
    () => Object.values(applied).filter(Boolean).length,
    [applied],
  );

  const hasDraft = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(applied),
    [draft, applied],
  );

  const handleApply = () => {
    setApplied(draft);
    setCurrentUrl("/chats/conversations/");
    setPopoverOpen(false);
  };

  const handleCancel = () => {
    setDraft(applied);
    setPopoverOpen(false);
  };

  const handleRemoveFilter = (key) => {
    const next = { ...applied, [key]: "" };
    setApplied(next);
    setDraft(next);
    setCurrentUrl("/chats/conversations/");
  };

  const handleBulkExport = async () => {
    setExporting(true);
    try {
      const response = await conversationService.bulkExportConversations(debouncedSearch, applied);
      const blob = response.data;
      const contentType = (response.headers?.["content-type"] || "").toLowerCase();
      const isCsv = contentType.includes("csv") || contentType.includes("octet-stream");
      if (!blob || blob.size === 0 || !isCsv) {
        toast.error((await readBlobMessage(blob)) || "No data to export.");
        return;
      }
      downloadBlob(
        blob,
        parseFilename(response.headers?.["content-disposition"], `conversations-${new Date().toISOString().slice(0, 10)}.csv`),
      );
      toast.success("Export started.");
    } catch (err) {
      toast.error((await readBlobMessage(err?.response?.data)) || "Failed to export. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo(() => [
    columnHelper.accessor("conversation_id", {
      header: "Conversation ID",
      cell: (info) => {
        const conversationId = info.getValue();
        const id = info.row.original.id;
        return (
          <Link href={`/dashboard/conversations/${id}`} className="text-primary hover:underline font-medium font-mono">
            {conversationId || "-"}
          </Link>
        );
      },
    }),
    columnHelper.accessor((row) => row.participant?.age, {
      id: "participant_age",
      header: "Age (year)",
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.accessor((row) => row.participant?.username, {
      id: "participant_username",
      header: "Participant Username",
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.accessor("model_name", {
      header: "Model Name",
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.accessor("number_of_turns", {
      header: "Conversation Turns",
      cell: (info) => {
        const val = info.getValue();
        if (val == null) return "-";
        return (
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold">
            {val}
          </span>
        );
      },
    }),
    columnHelper.accessor("created_at", {
      header: "Conversation Created",
      cell: (info) => {
        const value = info.getValue();
        if (!value) return "-";
        const parts = value.match(/^(.+,\s\d{4}),\s(.+)$/);
        const date = parts?.[1] ?? value;
        const time = parts?.[2] ?? "";
        return (
          <div className="flex items-center gap-1.5 text-sm">
            <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="font-medium text-foreground">{date}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{time}</span>
          </div>
        );
      },
    }),
  ], []);

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  const activeEntries = useMemo(() => {
    const labels = { participant_username: "Username", turns_min: "Min turns", turns_max: "Max turns", participant_age: "Age", date_from: "From", date_to: "To" };
    return Object.entries(applied)
      .filter(([, v]) => Boolean(v))
      .map(([key, value]) => ({ key, label: labels[key], value }));
  }, [applied]);

  return (
    <Card className="m-5">
      <CardHeader className="flex flex-col gap-0 p-0">

        {/* ── Toolbar ── */}
        <div className="flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <CardTitle>Conversations List</CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            {/* <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-56 pl-9 pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div> */}

            {/* Filter popover */}
            <Popover open={popoverOpen} onOpenChange={(open) => { setPopoverOpen(open); if (!open) setDraft(applied); }}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 gap-2 relative"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </Button>
              </PopoverTrigger>

              <PopoverContent align="end" sideOffset={8} className="w-80 p-0 shadow-lg rounded-xl border">
                {/* Header */}
                <div className="flex items-center justify-between px-4 pt-4 pb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    Filter conversations
                  </div>
                  {(draft.participant_username || draft.turns_min || draft.turns_max || draft.participant_age || draft.date_from || draft.date_to) && (
                    <button
                      type="button"
                      onClick={() => setDraft(INITIAL_FILTERS)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Reset
                    </button>
                  )}
                </div>

                <Separator />

                {/* Fields */}
                <div className="flex flex-col gap-4 p-4">
                  {/* Participant username */}
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      Participant username
                    </label>
                    <div className="relative">
                      <Input
                        placeholder="e.g. CurlyAvocet"
                        value={draft.participant_username}
                        onKeyDown={(e) => e.key === " " && e.preventDefault()}
                        onChange={(e) => setDraft((p) => ({ ...p, participant_username: e.target.value.replace(/\s/g, "") }))}
                        className="h-9 pr-8 text-sm"
                      />
                      {draft.participant_username && (
                        <button
                          type="button"
                          onClick={() => setDraft((p) => ({ ...p, participant_username: "" }))}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Turns */}
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Filter className="h-3.5 w-3.5" />
                      Number of turns
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                          min="1"
                          max={draft.turns_max || undefined}
                          step="1"
                          placeholder="Min"
                          value={draft.turns_min}
                          onChange={(e) => {
                            const val = e.target.value === "" ? "" : String(Math.floor(Number(e.target.value)));
                            setDraft((p) => ({ ...p, turns_min: val }));
                          }}
                          className="h-9 pr-7 text-sm"
                        />
                        {draft.turns_min && (
                          <button type="button" onClick={() => setDraft((p) => ({ ...p, turns_min: "" }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                          min={draft.turns_min || "1"}
                          step="1"
                          placeholder="Max"
                          value={draft.turns_max}
                          onChange={(e) => {
                            if (e.target.value === "") { setDraft((p) => ({ ...p, turns_max: "" })); return; }
                            const val = Math.floor(Number(e.target.value));
                            const min = draft.turns_min ? Number(draft.turns_min) : 1;
                            setDraft((p) => ({ ...p, turns_max: String(Math.max(val, min)) }));
                          }}
                          className="h-9 pr-7 text-sm"
                        />
                        {draft.turns_max && (
                          <button type="button" onClick={() => setDraft((p) => ({ ...p, turns_max: "" }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Participant age */}
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      Participant age (year)
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        onKeyDown={(e) => ["e", "E", "+", "-", "."].includes(e.key) && e.preventDefault()}
                        placeholder="e.g. 25"
                        value={draft.participant_age}
                        onChange={(e) => {
                          const val = e.target.value === "" ? "" : String(Math.floor(Number(e.target.value)));
                          setDraft((p) => ({ ...p, participant_age: val }));
                        }}
                        className="h-9 pr-8 text-sm"
                      />
                      {draft.participant_age && (
                        <button
                          type="button"
                          onClick={() => setDraft((p) => ({ ...p, participant_age: "" }))}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      Date
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Popover open={fromOpen} onOpenChange={setFromOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={`h-9 w-full justify-start text-left font-normal text-sm ${!draft.date_from ? "text-muted-foreground" : "border-primary/40 bg-primary/5 text-foreground font-medium"}`}>
                              <span className="truncate pr-4">{draft.date_from ? format(new Date(draft.date_from), "PP") : "From"}</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              captionLayout="dropdown"
                              fromYear={2020}
                              toYear={new Date().getFullYear()}
                              selected={draft.date_from ? new Date(draft.date_from) : undefined}
                              onSelect={(date) => {
                                setDraft((p) => ({ ...p, date_from: date ? format(date, "yyyy-MM-dd") : "" }));
                                setFromOpen(false);
                              }}
                              disabled={(date) => draft.date_to ? date > new Date(draft.date_to) : false}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {draft.date_from && (
                          <button type="button" onClick={() => setDraft((p) => ({ ...p, date_from: "" }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>

                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                      <div className="relative flex-1">
                        <Popover open={toOpen} onOpenChange={setToOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={`h-9 w-full justify-start text-left font-normal text-sm ${!draft.date_to ? "text-muted-foreground" : "border-primary/40 bg-primary/5 text-foreground font-medium"}`}>
                              <span className="truncate pr-4">{draft.date_to ? format(new Date(draft.date_to), "PP") : "To"}</span>
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              captionLayout="dropdown"
                              fromYear={2020}
                              toYear={new Date().getFullYear()}
                              selected={draft.date_to ? new Date(draft.date_to) : undefined}
                              defaultMonth={draft.date_from ? new Date(draft.date_from) : undefined}
                              onSelect={(date) => { setDraft((p) => ({ ...p, date_to: date ? format(date, "yyyy-MM-dd") : "" })); setToOpen(false); }}
                              disabled={(date) => {
                                if (!draft.date_from) return false;
                                const from = new Date(draft.date_from);
                                from.setHours(0, 0, 0, 0);
                                const d = new Date(date);
                                d.setHours(0, 0, 0, 0);
                                return d < from;
                              }}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        {draft.date_to && (
                          <button type="button" onClick={() => setDraft((p) => ({ ...p, date_to: "" }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-4 py-3">
                  <Button variant="ghost" size="sm" className="h-8" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button size="sm" className="h-8 px-4" onClick={handleApply} disabled={!hasDraft}>
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Export */}
            {pagination.count > 0 && (
              <Button
                variant="default"
                className="gap-2 h-9 bg-black text-white hover:bg-black/85"
                onClick={handleBulkExport}
                disabled={exporting || loading}
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export
              </Button>
            )}

            {/* Clear — last, only when filters are active */}
            {activeCount > 0 && (
              <Button
                className="h-9 gap-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:text-red-700 hover:border-red-300"
                variant="ghost"
                onClick={() => { setApplied(INITIAL_FILTERS); setDraft(INITIAL_FILTERS); setCurrentUrl("/chats/conversations/"); }}
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* ── Active filter chips ── */}
        {activeEntries.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-6 py-3">
            <span className="text-xs text-muted-foreground">Active:</span>
            {activeEntries.map(({ key, label, value }) => (
              <Badge key={key} variant="secondary" className="gap-1.5 pl-2.5 pr-1.5 py-1 font-normal text-xs rounded-full">
                <span className="text-muted-foreground">{label}:</span>
                <span className="font-medium max-w-32 truncate">{value}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFilter(key)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        <Separator />
      </CardHeader>

      <CardContent className="pt-4">
        <Table>
          <TableHeader>
            <TableRow>
              {table.getHeaderGroups()[0].headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="animate-spin h-8 w-8 mx-auto" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <div className="flex flex-col items-center justify-center gap-3 py-14">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <MessageSquareOff className="h-7 w-7" />
                    </div>
                    <div className="flex flex-col items-center gap-1 text-center">
                      <p className="text-sm font-semibold text-foreground">No conversations found</p>
                      <p className="text-xs text-muted-foreground">Try adjusting your search or filters to find what you&apos;re looking for.</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSearch(""); setApplied(INITIAL_FILTERS); setDraft(INITIAL_FILTERS); setCurrentUrl("/chats/conversations/"); }}
                    >
                      Go back
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="mt-4 ml-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm text-muted-foreground">
            Showing {data.length} of {pagination.count} conversations
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => { if (pagination.previous) setCurrentUrl(pagination.previous.replace(baseUrl, "")); }}
              disabled={!pagination.previous}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { if (pagination.next) setCurrentUrl(pagination.next.replace(baseUrl, "")); }}
              disabled={!pagination.next}
            >
              Next
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
