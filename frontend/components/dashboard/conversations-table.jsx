"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Search, SlidersHorizontal, CalendarIcon, X } from "lucide-react";
import toast from "react-hot-toast";
import conversationService from "@/services/conversationService";

const columnHelper = createColumnHelper();

const INITIAL_FILTERS = {
  model_name: "",
  participant_email: "",
  date_from: "",
  date_to: "",
};

export default function ConversationsTable() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [draftFilters, setDraftFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [currentUrl, setCurrentUrl] = useState("/chats/conversations/");
  const [loading, setLoading] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentUrl("/chats/conversations/");
    }, 800);
    return () => clearTimeout(timer);
  }, [search]);

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
    fetchConversations(currentUrl, debouncedSearch, appliedFilters);
  }, [currentUrl, debouncedSearch, appliedFilters]);

  const activeFilterEntries = useMemo(() => {
    const labels = {
      model_name: "Model",
      participant_email: "Email",
      date_from: "From",
      date_to: "To",
    };
    return Object.entries(appliedFilters)
      .filter(([, v]) => Boolean(v))
      .map(([key, value]) => ({ key, label: labels[key], value }));
  }, [appliedFilters]);

  const hasDraftChanges = useMemo(
    () => JSON.stringify(draftFilters) !== JSON.stringify(appliedFilters),
    [draftFilters, appliedFilters],
  );

  const handleApplyFilters = () => {
    setAppliedFilters(draftFilters);
    setCurrentUrl("/chats/conversations/");
    setFiltersOpen(false);
  };

  const handleResetFilters = () => {
    setDraftFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setCurrentUrl("/chats/conversations/");
  };

  const handleRemoveFilter = (key) => {
    const next = { ...appliedFilters, [key]: "" };
    setAppliedFilters(next);
    setDraftFilters(next);
    setCurrentUrl("/chats/conversations/");
  };

  const columns = useMemo(() => [
    columnHelper.accessor("title", {
      header: "Title",
      cell: (info) => {
        const title = info.getValue();
        const id = info.row.original.id;
        return (
          <Link
            href={`/dashboard/conversations/${id}`}
            className="text-primary hover:underline font-medium"
          >
            {title || "-"}
          </Link>
        );
      },
    }),
    columnHelper.accessor((row) => row.participant?.email, {
      id: "participant_email",
      header: "Participant Email",
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.accessor("model_name", {
      header: "Model Name",
      cell: (info) => info.getValue() || "-",
    }),
  ], []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const activeFilterCount = activeFilterEntries.length;

  return (
    <Card className="m-5">
      <CardHeader className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle>Conversations List</CardTitle>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-9 w-full pl-8 sm:w-64"
              />
            </div>

            <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="relative gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <Badge
                      variant="default"
                      className="ml-1 h-5 min-w-5 justify-center rounded-full px-1.5"
                    >
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-85 p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="text-sm font-semibold">Filters</div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setDraftFilters(INITIAL_FILTERS)}
                  >
                    Reset
                  </Button>
                </div>

                <div className="flex flex-col gap-4 p-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="filter_model_name" className="text-xs font-medium text-muted-foreground">
                      Model name
                    </Label>
                    <Input
                      id="filter_model_name"
                      placeholder="e.g. gpt-4o"
                      value={draftFilters.model_name}
                      onChange={(e) =>
                        setDraftFilters((prev) => ({ ...prev, model_name: e.target.value }))
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="filter_participant_email" className="text-xs font-medium text-muted-foreground">
                      Participant email
                    </Label>
                    <Input
                      id="filter_participant_email"
                      placeholder="name@example.com"
                      value={draftFilters.participant_email}
                      onChange={(e) =>
                        setDraftFilters((prev) => ({ ...prev, participant_email: e.target.value }))
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Date range
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Popover open={fromOpen} onOpenChange={setFromOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`justify-start text-left font-normal ${!draftFilters.date_from ? "text-muted-foreground" : ""}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {draftFilters.date_from
                                ? format(new Date(draftFilters.date_from), "PP")
                                : "From"}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            captionLayout="dropdown"
                            fromYear={2020}
                            toYear={new Date().getFullYear()}
                            selected={draftFilters.date_from ? new Date(draftFilters.date_from) : undefined}
                            onSelect={(date) => {
                              const value = date ? format(date, "yyyy-MM-dd") : "";
                              setDraftFilters((prev) => ({ ...prev, date_from: value }));
                              setFromOpen(false);
                            }}
                            disabled={(date) =>
                              draftFilters.date_to
                                ? date > new Date(draftFilters.date_to)
                                : false
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>

                      <Popover open={toOpen} onOpenChange={setToOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={`justify-start text-left font-normal ${!draftFilters.date_to ? "text-muted-foreground" : ""}`}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                            <span className="truncate">
                              {draftFilters.date_to
                                ? format(new Date(draftFilters.date_to), "PP")
                                : "To"}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            captionLayout="dropdown"
                            fromYear={2020}
                            toYear={new Date().getFullYear()}
                            selected={draftFilters.date_to ? new Date(draftFilters.date_to) : undefined}
                            onSelect={(date) => {
                              const value = date ? format(date, "yyyy-MM-dd") : "";
                              setDraftFilters((prev) => ({ ...prev, date_to: value }));
                              setToOpen(false);
                            }}
                            disabled={(date) =>
                              draftFilters.date_from
                                ? date < new Date(draftFilters.date_from)
                                : false
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t bg-muted/30 px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDraftFilters(appliedFilters);
                      setFiltersOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleApplyFilters} disabled={!hasDraftChanges}>
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {(search || activeFilterCount > 0) && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  handleResetFilters();
                }}
              >
                Clear all
              </Button>
            )}
          </div>
        </div>

        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Active filters:</span>
            {activeFilterEntries.map(({ key, label, value }) => (
              <Badge
                key={key}
                variant="secondary"
                className="gap-1 pr-1 font-normal"
              >
                <span className="text-muted-foreground">{label}:</span>
                <span className="font-medium">{value}</span>
                <button
                  type="button"
                  aria-label={`Remove ${label} filter`}
                  onClick={() => handleRemoveFilter(key)}
                  className="ml-1 rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {table.getHeaderGroups()[0].headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  <Loader2 className="animate-spin h-8 w-8 mx-auto" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">
                  No conversations found.
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
              onClick={() => {
                if (pagination.previous) {
                  const path = pagination.previous.replace(baseUrl, "");
                  setCurrentUrl(path);
                }
              }}
              disabled={!pagination.previous}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (pagination.next) {
                  const path = pagination.next.replace(baseUrl, "");
                  setCurrentUrl(path);
                }
              }}
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
