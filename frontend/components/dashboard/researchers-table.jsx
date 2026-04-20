"use client";

import { useState, useEffect, useMemo } from "react";
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
import { Loader2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import toast from "react-hot-toast";
import researcherService from "@/services/researcherService";

const columnHelper = createColumnHelper();

const SORTABLE = ["first_name", "last_name"];

function SortIcon({ field, ordering }) {
  if (ordering === field) return <ArrowUp className="h-3.5 w-3.5" />;
  if (ordering === `-${field}`) return <ArrowDown className="h-3.5 w-3.5" />;
  return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
}

export default function ResearchersTable({ refreshKey = 0 }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ordering, setOrdering] = useState("");
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [currentUrl, setCurrentUrl] = useState("/researchers/");
  const [loading, setLoading] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentUrl("/researchers/");
    }, 800);
    return () => clearTimeout(timer);
  }, [search]);

  const toggleOrdering = (field) => {
    setCurrentUrl("/researchers/");
    setOrdering((prev) => {
      if (prev === field) return `-${field}`;
      if (prev === `-${field}`) return "";
      return field;
    });
  };

  const fetchResearchers = async (url = "/researchers/", searchTerm = "", orderingTerm = "") => {
    setLoading(true);
    try {
      const response = await researcherService.getAllResearchers(url, searchTerm, orderingTerm);
      setData(response.data?.results || []);
      setPagination({
        count: response.data?.count || 0,
        next: response.data?.next || null,
        previous: response.data?.previous || null,
      });
    } catch {
      toast.error("Failed to load researchers. Please try again.");
      setData([]);
      setPagination({ count: 0, next: null, previous: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResearchers(currentUrl, debouncedSearch, ordering);
  }, [currentUrl, debouncedSearch, ordering, refreshKey]);

  const columns = useMemo(() => [
    columnHelper.accessor("id", {
      header: "ID",
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.accessor("first_name", {
      header: () => (
        <button
          onClick={() => toggleOrdering("first_name")}
          className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
        >
          First Name <SortIcon field="first_name" ordering={ordering} />
        </button>
      ),
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.accessor("last_name", {
      header: () => (
        <button
          onClick={() => toggleOrdering("last_name")}
          className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
        >
          Last Name <SortIcon field="last_name" ordering={ordering} />
        </button>
      ),
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.accessor("email", {
      header: "Email",
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.accessor("username", {
      header: "Username",
      cell: (info) => info.getValue() || "-",
    }),
  ], [ordering]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className="m-5">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <CardTitle>Researchers List</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {ordering && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setOrdering(""); setCurrentUrl("/researchers/"); }}
              className="text-muted-foreground text-xs"
            >
              Reset sort
            </Button>
          )}
          <Input
            placeholder="Search researchers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-9 w-52"
          />
          <Button variant="secondary" onClick={() => setSearch("")}>
            Clear
          </Button>
        </div>
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
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="animate-spin h-8 w-8 mx-auto" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No researchers found.
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
            Showing {data.length} of {pagination.count} researchers
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
