"use client";

import { useState, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import participantService from "../../services/participantService.js";

const columnHelper = createColumnHelper();

const columns = [
  columnHelper.accessor("id", {
    header: "ID",
    cell: (info) => info.getValue() || "-",
  }),
  columnHelper.accessor("email", {
    header: "Email",
    cell: (info) => info.getValue() || "-",
  }),
  columnHelper.accessor("first_name", {
    header: "First Name",
    cell: (info) => info.getValue() || "-",
  }),
  columnHelper.accessor("last_name", {
    header: "Last Name",
    cell: (info) => info.getValue() || "-",
  }),
  columnHelper.accessor((row) => row.profile_data?.date_of_birth, {
    id: "date_of_birth",
    header: "Date of Birth",
    cell: (info) => info.getValue() || "-",
  }),
  columnHelper.accessor((row) => row.profile_data?.gender, {
    id: "gender",
    header: "Gender",
    cell: (info) => {
      const gender = info.getValue();
      if (!gender) return "-";
      return gender === "M" ? "Male" : gender === "F" ? "Female" : gender;
    },
  }),
  columnHelper.accessor((row) => row.profile_data?.demographics, {
    id: "demographics",
    header: "Demographics",
    cell: (info) => info.getValue() || "-",
  }),
  columnHelper.accessor((row) => row.profile_data?.guardian, {
    id: "guardian",
    header: "Guardian",
    cell: (info) => {
      const guardian = info.getValue();
      if (!guardian) return "-";
      const name = `${guardian.first_name || ""} ${guardian.last_name || ""}`.trim();
      return name || "-";
    },
  }),
];

export default function ParticipantsTable({ refreshKey = 0 }) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [currentUrl, setCurrentUrl] = useState("/participants/");
  const [loading, setLoading] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  const fetchParticipants = async (url = "/participants/") => {
    setLoading(true);
    try {
      const response = await participantService.getAllParticipants(url);
      setData(response.data?.results || []);
      setPagination({
        count: response.data?.count || 0,
        next: response.data?.next || null,
        previous: response.data?.previous || null,
      });
    } catch (error) {
      toast.error("Failed to load participants. Please try again.");
      setData([]);
      setPagination({ count: 0, next: null, previous: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants(currentUrl);
  }, [currentUrl, refreshKey]);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      return (
        ["first_name", "last_name", "email"].some((key) =>
          String(row.original[key] || "").toLowerCase().includes(search)
        ) ||
        ["date_of_birth", "demographics"].some((key) =>
          String(row.original.profile_data?.[key] || "").toLowerCase().includes(search)
        ) ||
        `${row.original.profile_data?.guardian?.first_name || ""} ${row.original.profile_data?.guardian?.last_name || ""}`
          .toLowerCase()
          .includes(search)
      );
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <Card className="m-5">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <CardTitle>Participants List</CardTitle>
        </div>
        <div className="flex w-full max-w-sm items-center gap-2">
          <Input
            placeholder="Search participants..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="min-h-9"
          />
          <Button variant="secondary" onClick={() => setGlobalFilter("")}>
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
                <TableCell colSpan={8} className="h-24 text-center">
                  <Loader2 className="animate-spin h-8 w-8 mx-auto" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No participants found.
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
            Showing {data.length} of {pagination.count} participants
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