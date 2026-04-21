"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowUp, ArrowDown, ArrowUpDown, CircleIcon, Pencil, Trash2, XIcon } from "lucide-react";
import toast from "react-hot-toast";
import researcherService from "@/services/researcherService";

const columnHelper = createColumnHelper();

const SORTABLE = ["first_name", "last_name"];

function SortIcon({ field, ordering }) {
  if (ordering === field) return <ArrowUp className="h-3.5 w-3.5" />;
  if (ordering === `-${field}`) return <ArrowDown className="h-3.5 w-3.5" />;
  return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
}

function EditDialog({ researcher, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ first_name: researcher?.first_name || "", last_name: researcher?.last_name || "" });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name.trim()) newErrors.first_name = "First name is required.";
    if (!formData.last_name.trim()) newErrors.last_name = "Last name is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await researcherService.editResearcher(researcher.id, formData);
      toast.success("Researcher updated successfully.");
      onSaved();
    } catch {
      toast.error("Failed to update researcher. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Edit Researcher</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} disabled={saving}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit_first_name" className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">
                First Name
              </Label>
              <Input
                id="edit_first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                disabled={saving}
                className={errors.first_name ? "border-destructive" : ""}
              />
              {errors.first_name && <p className="text-xs text-destructive">{errors.first_name}</p>}
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit_last_name" className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">
                Last Name
              </Label>
              <Input
                id="edit_last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                disabled={saving}
                className={errors.last_name ? "border-destructive" : ""}
              />
              {errors.last_name && <p className="text-xs text-destructive">{errors.last_name}</p>}
            </div>
          </div>
          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DeleteDialog({ researcher, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await researcherService.deleteResearcher(researcher.id);
      toast.success(`${researcher.first_name} ${researcher.last_name} has been deleted.`);
      onDeleted();
    } catch {
      toast.error("Failed to delete researcher. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={!!researcher} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Researcher</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {researcher?.first_name} {researcher?.last_name}
            </span>
            ? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function ResearchersTable({ refreshKey = 0 }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ordering, setOrdering] = useState("");
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [currentUrl, setCurrentUrl] = useState("/researchers/");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [internalRefresh, setInternalRefresh] = useState(0);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentUrl("/researchers/");
    }, 800);
    return () => clearTimeout(timer);
  }, [search]);

  const handleEdit = useCallback((researcher) => {
    setEditTarget(researcher);
  }, []);

  const handleDelete = useCallback((researcher) => {
    setDeleteTarget(researcher);
  }, []);

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
  }, [currentUrl, debouncedSearch, ordering, refreshKey, internalRefresh]);

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
    columnHelper.accessor("is_active", {
      header: "Status",
      cell: (info) => {
        const active = info.getValue();
        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            active
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}>
            <CircleIcon className={`h-1.5 w-1.5 fill-current`} />
            {active ? "Active" : "Inactive"}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const researcher = row.original;
        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEdit(researcher)}
              className="flex h-8 w-8 items-center justify-center rounded-sm shadow-sm border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:shadow-md transition-all duration-150 cursor-pointer"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleDelete(researcher)}
              className="flex h-8 w-8 items-center justify-center rounded-sm shadow-sm border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 hover:shadow-md transition-all duration-150 cursor-pointer"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    }),
  ], [ordering, handleEdit, handleDelete]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
    <Card className="m-5">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <CardTitle>Researchers List</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {ordering && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setOrdering(""); setCurrentUrl("/researchers/"); }}
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
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="animate-spin h-8 w-8 mx-auto" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
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

    {editTarget && (
      <EditDialog
        researcher={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); setInternalRefresh((k) => k + 1); }}
      />
    )}
    <DeleteDialog
      researcher={deleteTarget}
      onClose={() => setDeleteTarget(null)}
      onDeleted={() => { setDeleteTarget(null); setInternalRefresh((k) => k + 1); }}
    />
    </>
  );
}
