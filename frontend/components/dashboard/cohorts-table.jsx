"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil, Trash2, XIcon, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import cohortService from "@/services/cohortService";
import { extractFieldErrors } from "@/utils/apiErrors";

const columnHelper = createColumnHelper();

function SortIcon({ field, ordering }) {
  if (ordering === field) return <ArrowUp className="h-3.5 w-3.5" />;
  if (ordering === `-${field}`) return <ArrowDown className="h-3.5 w-3.5" />;
  return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
}

function EditDialog({ cohort, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: cohort?.name || "",
    description: cohort?.description || "",
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Name is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await cohortService.updateCohort(cohort.id, formData);
      toast.success("Cohort updated successfully.");
      onSaved();
    } catch (err) {
      const fieldErrors = extractFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      } else {
        toast.error("Failed to update cohort. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Edit Cohort</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} disabled={saving}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="edit_name"
                className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]"
              >
                Name
              </Label>
              <Input
                id="edit_name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={saving}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={saving}
                rows={5}
                className={`field-sizing-fixed ${errors.description ? "border-destructive" : ""}`}
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
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

function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmText, confirmClassName, loading }) {
  return (
    <AlertDialog open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="font-semibold">{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading} className={confirmClassName}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function CohortsTable({ refreshKey = 0 }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ordering, setOrdering] = useState("");
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [currentUrl, setCurrentUrl] = useState("/cohorts/");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [internalRefresh, setInternalRefresh] = useState(0);

  const toggleOrdering = () => {
    setCurrentUrl("/cohorts/");
    setOrdering((prev) => {
      if (prev === "name") return "-name";
      if (prev === "-name") return "";
      return "name";
    });
  };

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentUrl("/cohorts/");
    }, 800);
    return () => clearTimeout(timer);
  }, [search]);

  const handleEdit = useCallback((cohort) => setEditTarget(cohort), []);
  const handleDelete = useCallback((cohort) => setDeleteTarget(cohort), []);

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await cohortService.deleteCohort(deleteTarget.id);
      toast.success(`"${deleteTarget.name}" has been deleted.`);
      setDeleteTarget(null);
      setInternalRefresh((k) => k + 1);
    } catch {
      toast.error("Failed to delete cohort. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const fetchCohorts = async (url = "/cohorts/", searchTerm = "", orderingTerm = "") => {
    setLoading(true);
    try {
      const response = await cohortService.getAllCohorts(url, searchTerm, orderingTerm);
      setData(response.data?.results || []);
      setPagination({
        count: response.data?.count || 0,
        next: response.data?.next || null,
        previous: response.data?.previous || null,
      });
    } catch {
      toast.error("Failed to load cohorts. Please try again.");
      setData([]);
      setPagination({ count: 0, next: null, previous: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCohorts(currentUrl, debouncedSearch, ordering);
  }, [currentUrl, debouncedSearch, ordering, refreshKey, internalRefresh]);

  const columns = useMemo(() => [
    columnHelper.accessor("id", {
      header: "ID",
      cell: (info) => (
        <Link
          href={`/dashboard/cohorts/${info.getValue()}`}
          className="hover:underline font-medium"
        >
          {info.getValue() || "-"}
        </Link>
      ),
    }),
    columnHelper.accessor("name", {
      header: () => (
        <button
          onClick={toggleOrdering}
          className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
        >
          Name <SortIcon field="name" ordering={ordering} />
        </button>
      ),
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.accessor("description", {
      header: "Description",
      cell: (info) => {
        const value = info.getValue();
        if (!value) return "-";
        return (
          <span className="block max-w-xs truncate" title={value}>
            {value}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const cohort = row.original;
        return (
          <div className="flex items-center gap-3.75">
            <button
              onClick={() => handleEdit(cohort)}
              className="flex h-8 w-8 items-center justify-center rounded-sm shadow-sm border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:shadow-md transition-all duration-150 cursor-pointer"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleDelete(cohort)}
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
            <CardTitle>Cohorts List</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {ordering && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setOrdering(""); setCurrentUrl("/cohorts/"); }}
              >
                Reset sort
              </Button>
            )}
            <Input
              placeholder="Search cohorts..."
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
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="animate-spin h-8 w-8 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No cohorts found.
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
              Showing {data.length} of {pagination.count} cohorts
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
          cohort={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { setEditTarget(null); setInternalRefresh((k) => k + 1); }}
        />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Cohort"
        description={
          <span>
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">"{deleteTarget?.name}"</span>? This action
            cannot be undone.
          </span>
        }
        confirmText="Delete"
        confirmClassName="bg-red-600 hover:bg-red-700"
        loading={deleteLoading}
      />
    </>
  );
}
