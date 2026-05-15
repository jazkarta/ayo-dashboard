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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, ArrowUp, ArrowDown, ArrowUpDown, Pencil, Trash2, CalendarIcon, XIcon, Users } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import participantService from "../../services/participantService.js";
import { extractFieldErrors } from "@/utils/apiErrors";
import CohortCombobox from "@/components/dashboard/cohort-combobox";
import EmptyState from "@/components/dashboard/empty-state";

const columnHelper = createColumnHelper();

function SortIcon({ field, ordering }) {
  if (ordering === field) return <ArrowUp className="h-3.5 w-3.5" />;
  if (ordering === `-${field}`) return <ArrowDown className="h-3.5 w-3.5" />;
  return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
}

function EditDialog({ participant, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [formData, setFormData] = useState({
    first_name: participant?.first_name || "",
    last_name: participant?.last_name || "",
    dateOfBirth: participant?.profile_data?.date_of_birth || "",
    family_id: participant?.profile_data?.family_id || "",
    cohort_id: participant?.profile_data?.cohort?.id || "",
  });
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
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required.";
    } else {
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dob >= today) newErrors.dateOfBirth = "Date of birth must be in the past.";
    }
    if (!formData.family_id.trim()) newErrors.family_id = "Family ID is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await participantService.editParticipant(participant.id, {
        first_name: formData.first_name,
        last_name: formData.last_name,
        profile_data: {
          date_of_birth: formData.dateOfBirth,
          family_id: formData.family_id,
          ...(formData.cohort_id ? { cohort_id: formData.cohort_id } : { cohort_id: null }),
        },
      });
      toast.success("Participant updated successfully.");
      onSaved();
    } catch (err) {
      const fieldErrors = extractFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      } else {
        toast.error("Failed to update participant. Please try again.");
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
            <CardTitle>Edit Participant</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} disabled={saving}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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

            <div className="flex flex-col gap-2">
              <Label className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">
                Date of Birth
              </Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={saving}
                    className={`w-full justify-start text-left font-normal ${!formData.dateOfBirth ? "text-muted-foreground" : ""} ${errors.dateOfBirth ? "border-destructive" : ""}`}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dateOfBirth ? format(new Date(formData.dateOfBirth), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    fromYear={1900}
                    toYear={new Date().getFullYear()}
                    selected={formData.dateOfBirth ? new Date(formData.dateOfBirth) : undefined}
                    onSelect={(date) => {
                      const value = date ? format(date, "yyyy-MM-dd") : "";
                      setFormData((prev) => ({ ...prev, dateOfBirth: value }));
                      setErrors((prev) => ({ ...prev, dateOfBirth: "" }));
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date >= new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {errors.dateOfBirth && <p className="text-xs text-destructive">{errors.dateOfBirth}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="edit_family_id" className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">
                Family ID
              </Label>
              <Input
                id="edit_family_id"
                name="family_id"
                placeholder="Enter family ID"
                value={formData.family_id}
                onChange={handleChange}
                disabled={saving}
                className={errors.family_id ? "border-destructive" : ""}
              />
              {errors.family_id && <p className="text-xs text-destructive">{errors.family_id}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Cohort</Label>
              <CohortCombobox
                value={formData.cohort_id}
                onChange={(val) => setFormData((prev) => ({ ...prev, cohort_id: val }))}
                initialCohort={participant?.profile_data?.cohort ?? null}
                disabled={saving}
              />
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

function DeleteDialog({ participant, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await participantService.deleteParticipant(participant.id);
      toast.success(`${participant.first_name} ${participant.last_name} has been deleted.`);
      onDeleted();
    } catch {
      toast.error("Failed to delete participant. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={!!participant} onOpenChange={(open) => { if (!open) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Participant</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              {participant?.first_name} {participant?.last_name}
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

export default function ParticipantsTable({ refreshKey = 0 }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ordering, setOrdering] = useState("");
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [currentUrl, setCurrentUrl] = useState("/participants/");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [internalRefresh, setInternalRefresh] = useState(0);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentUrl("/participants/");
    }, 800);
    return () => clearTimeout(timer);
  }, [search]);

  const handleEdit = useCallback((participant) => {
    setEditTarget(participant);
  }, []);

  const handleDelete = useCallback((participant) => {
    setDeleteTarget(participant);
  }, []);

  const toggleOrdering = (field) => {
    setCurrentUrl("/participants/");
    setOrdering((prev) => {
      if (prev === field) return `-${field}`;
      if (prev === `-${field}`) return "";
      return field;
    });
  };

  const fetchParticipants = async (url = "/participants/", searchTerm = "", orderingTerm = "") => {
    setLoading(true);
    try {
      const response = await participantService.getAllParticipants(url, searchTerm, orderingTerm);
      setData(response.data?.results || []);
      setPagination({
        count: response.data?.count || 0,
        next: response.data?.next || null,
        previous: response.data?.previous || null,
      });
    } catch {
      toast.error("Failed to load participants. Please try again.");
      setData([]);
      setPagination({ count: 0, next: null, previous: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants(currentUrl, debouncedSearch, ordering);
  }, [currentUrl, debouncedSearch, ordering, refreshKey, internalRefresh]);

  const columns = useMemo(() => [
    columnHelper.accessor("id", {
      header: "ID",
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.accessor("email", {
      header: "Email",
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
      cell: (info) => {
        const val = info.getValue();
        if (!val) return "-";
        const chars = [...val];
        return (
          <span title={chars.length > 20 ? val : undefined}>
            {chars.length > 20 ? `${chars.slice(0, 20).join("")}...` : val}
          </span>
        );
      },
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
      cell: (info) => {
        const val = info.getValue();
        if (!val) return "-";
        const chars = [...val];
        return (
          <span title={chars.length > 20 ? val : undefined}>
            {chars.length > 20 ? `${chars.slice(0, 20).join("")}...` : val}
          </span>
        );
      },
    }),
    columnHelper.accessor((row) => row.profile_data?.date_of_birth, {
      id: "date_of_birth",
      header: "Date of Birth",
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.accessor((row) => row.profile_data?.family_id, {
      id: "family_id",
      header: "Family ID",
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.accessor((row) => row.profile_data?.cohort?.name, {
      id: "cohort",
      header: "Cohort",
      cell: (info) => {
        const val = info.getValue();
        if (!val) return "-";
        const chars = [...val];
        return (
          <span title={chars.length > 20 ? val : undefined}>
            {chars.length > 20 ? `${chars.slice(0, 20).join("")}...` : val}
          </span>
        );
      },
    }),
    columnHelper.accessor("is_active", {
      header: "Status",
      cell: (info) => {
        const active = info.getValue();
        return active ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-600">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-600">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
            Pending
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const participant = row.original;
        return (
          <div className="flex items-center gap-3.75">
            <button
              onClick={() => handleEdit(participant)}
              className="flex h-8 w-8 items-center justify-center rounded-sm shadow-sm border border-slate-200 bg-white text-slate-500 hover:text-blue-600 hover:border-blue-200 hover:shadow-md transition-all duration-150 cursor-pointer"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleDelete(participant)}
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
          <CardTitle>Participants List</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {ordering && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setOrdering(""); setCurrentUrl("/participants/"); }}
            >
              Reset sort
            </Button>
          )}
          <Input
            placeholder="Search participants..."
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
                <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                  <Loader2 className="animate-spin h-8 w-8 mx-auto" />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={table.getAllColumns().length}>
                  <EmptyState
                    icon={Users}
                    title="No participants found"
                    description="Try adjusting your search to find what you're looking for."
                    actionLabel="Go back"
                    onAction={() => setSearch("")}

                  />
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

    {editTarget && (
      <EditDialog
        participant={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={() => { setEditTarget(null); setInternalRefresh((k) => k + 1); }}
      />
    )}
    <DeleteDialog
      participant={deleteTarget}
      onClose={() => setDeleteTarget(null)}
      onDeleted={() => { setDeleteTarget(null); setInternalRefresh((k) => k + 1); }}
    />
    </>
  );
}
