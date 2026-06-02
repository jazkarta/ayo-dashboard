"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowUp, ArrowDown, ArrowUpDown, Pencil, Trash2, XIcon, Users, Mail, Copy } from "lucide-react";
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

function parseDobString(dateStr) {
  if (!dateStr) return { mm: "", dd: "", yyyy: "" };
  const parts = dateStr.split("-");
  if (parts.length !== 3) return { mm: "", dd: "", yyyy: "" };
  return { mm: parts[1], dd: parts[2], yyyy: parts[0] };
}

function EditDialog({ participant, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [dob, setDob] = useState(() => parseDobString(participant?.profile_data?.date_of_birth || ""));
  const dobMmRef = useRef(null);
  const dobDdRef = useRef(null);
  const dobYyyyRef = useRef(null);
  const [formData, setFormData] = useState({
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

  const commitDob = (mm, dd, yyyy) => {
    if (mm.length === 2 && dd.length === 2 && yyyy.length === 4) {
      const month = parseInt(mm, 10);
      const day = parseInt(dd, 10);
      const year = parseInt(yyyy, 10);
      const parsed = new Date(year, month - 1, day);
      const isValid = !isNaN(parsed.getTime()) && parsed.getMonth() === month - 1 && year >= 1900;
      const isPast = parsed < new Date(new Date().setHours(0, 0, 0, 0));
      if (!isValid) {
        setErrors((prev) => ({ ...prev, dateOfBirth: "Please enter a valid date." }));
        setFormData((prev) => ({ ...prev, dateOfBirth: "" }));
      } else if (!isPast) {
        setErrors((prev) => ({ ...prev, dateOfBirth: "Date of birth must be in the past." }));
        setFormData((prev) => ({ ...prev, dateOfBirth: "" }));
      } else {
        setErrors((prev) => ({ ...prev, dateOfBirth: "" }));
        setFormData((prev) => ({ ...prev, dateOfBirth: format(parsed, "yyyy-MM-dd") }));
      }
    } else {
      setErrors((prev) => ({ ...prev, dateOfBirth: "" }));
      setFormData((prev) => ({ ...prev, dateOfBirth: "" }));
    }
  };

  const handleDobChange = (segment, maxLen) => (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, maxLen);
    const next = { ...dob, [segment]: digits };
    setDob(next);
    commitDob(next.mm, next.dd, next.yyyy);
    if (digits.length === maxLen) {
      if (segment === "mm") dobDdRef.current?.focus();
      if (segment === "dd") dobYyyyRef.current?.focus();
    }
  };

  const handleDobBlur = (segment, maxLen) => (e) => {
    const currentValue = e.target.value.replace(/\D/g, "");
    if (currentValue.length > 0 && currentValue.length < maxLen) {
      const padded = currentValue.padStart(maxLen, "0");
      const next = { ...dob, [segment]: padded };
      setDob(next);
      commitDob(next.mm, next.dd, next.yyyy);
    }
  };

  const handleDobKeyDown = (segment) => (e) => {
    if (e.key === "Backspace" && dob[segment] === "") {
      if (segment === "dd") dobMmRef.current?.focus();
      if (segment === "yyyy") dobDdRef.current?.focus();
    }
    if (e.key === "ArrowLeft" && e.target.selectionStart === 0) {
      if (segment === "dd") dobMmRef.current?.focus();
      if (segment === "yyyy") dobDdRef.current?.focus();
    }
    if (e.key === "ArrowRight" && e.target.selectionStart === e.target.value.length) {
      if (segment === "mm") dobDdRef.current?.focus();
      if (segment === "dd") dobYyyyRef.current?.focus();
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = dob.mm || dob.dd || dob.yyyy
        ? "Please complete the date of birth."
        : "Date of birth is required.";
    } else {
      const dobDate = new Date(formData.dateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dobDate >= today) newErrors.dateOfBirth = "Date of birth must be in the past.";
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
            <div className="flex flex-col gap-2">
              <Label htmlFor="dob-mm" className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">
                Date of Birth
              </Label>
              <div
                role="group"
                aria-label="Date of birth"
                className={`flex items-center gap-1 h-9 w-full rounded-md border bg-background px-3 text-sm cursor-text ${errors.dateOfBirth ? "border-destructive" : "border-input"} ${saving ? "opacity-50 pointer-events-none" : ""}`}
                onClick={(e) => {
                  if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
                  const x = e.clientX;
                  const mmRect = dobMmRef.current?.getBoundingClientRect();
                  const ddRect = dobDdRef.current?.getBoundingClientRect();
                  const yyyyRect = dobYyyyRef.current?.getBoundingClientRect();
                  const distMm = mmRect ? Math.abs(x - (mmRect.left + mmRect.right) / 2) : Infinity;
                  const distDd = ddRect ? Math.abs(x - (ddRect.left + ddRect.right) / 2) : Infinity;
                  const distYyyy = yyyyRect ? Math.abs(x - (yyyyRect.left + yyyyRect.right) / 2) : Infinity;
                  if (distMm <= distDd && distMm <= distYyyy) dobMmRef.current?.focus();
                  else if (distDd <= distYyyy) dobDdRef.current?.focus();
                  else dobYyyyRef.current?.focus();
                }}
              >
                <input
                  ref={dobMmRef}
                  aria-label="Month"
                  type="text"
                  inputMode="numeric"
                  placeholder="MM"
                  maxLength={2}
                  value={dob.mm}
                  onChange={handleDobChange("mm", 2)}
                  onKeyDown={handleDobKeyDown("mm")}
                  onBlur={handleDobBlur("mm", 2)}
                  className="w-7 bg-transparent outline-none text-center placeholder:text-muted-foreground"
                />
                <span aria-hidden="true" className="text-muted-foreground">/</span>
                <input
                  ref={dobDdRef}
                  aria-label="Day"
                  type="text"
                  inputMode="numeric"
                  placeholder="DD"
                  maxLength={2}
                  value={dob.dd}
                  onChange={handleDobChange("dd", 2)}
                  onKeyDown={handleDobKeyDown("dd")}
                  onBlur={handleDobBlur("dd", 2)}
                  className="w-7 bg-transparent outline-none text-center placeholder:text-muted-foreground"
                />
                <span aria-hidden="true" className="text-muted-foreground">/</span>
                <input
                  ref={dobYyyyRef}
                  aria-label="Year"
                  type="text"
                  inputMode="numeric"
                  placeholder="YYYY"
                  maxLength={4}
                  value={dob.yyyy}
                  onChange={handleDobChange("yyyy", 4)}
                  onKeyDown={handleDobKeyDown("yyyy")}
                  className="w-12 bg-transparent outline-none text-center placeholder:text-muted-foreground"
                />
                {(dob.mm || dob.dd || dob.yyyy) && (
                  <button
                    type="button"
                    onClick={() => {
                      setDob({ mm: "", dd: "", yyyy: "" });
                      setFormData((prev) => ({ ...prev, dateOfBirth: "" }));
                      setErrors((prev) => ({ ...prev, dateOfBirth: "" }));
                      dobMmRef.current?.focus();
                    }}
                    className="ml-auto text-muted-foreground hover:text-foreground"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
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
      toast.success(`${participant.email} removed successfully.`);
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
              {participant?.email}
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
  const [isActive, setIsActive] = useState("");
  const [cohortId, setCohortId] = useState("");
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ count: 0, next: null, previous: null });
  const [currentUrl, setCurrentUrl] = useState("/participants/");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [internalRefresh, setInternalRefresh] = useState(0);
  const [resendingId, setResendingId] = useState(null);

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

  const handleResendEmail = useCallback(async (participant) => {
    if (resendingId) return;
    setResendingId(participant?.id);
    try {
      await participantService.resendInvitation(participant?.id);
      toast.success(`Invitation email resent to ${participant?.email}`);
    } catch (e) {
      const status = e?.response?.status;
      const serverMessage = e?.response?.data?.detail || e?.response?.data?.message;

      if (serverMessage) {
        toast.error(serverMessage);
      } else if (status === 404) {
        toast.error("Participant not found. Please refresh and try again.");
      } else if (status >= 500) {
        toast.error("Server error. Please try again later.");
      } else {
        toast.error("Failed to resend invitation email. Please try again.");
      }
    } finally {
      setResendingId(null);
    }
  }, [resendingId]);

  const toggleOrdering = (field) => {
    setCurrentUrl("/participants/");
    setOrdering((prev) => {
      if (prev === field) return `-${field}`;
      if (prev === `-${field}`) return "";
      return field;
    });
  };

  const fetchParticipants = async (url = "/participants/", searchTerm = "", orderingTerm = "", isActiveTerm = "", cohortIdTerm = "") => {
    setLoading(true);
    try {
      const response = await participantService.getAllParticipants(url, searchTerm, orderingTerm, isActiveTerm, cohortIdTerm);
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
    fetchParticipants(currentUrl, debouncedSearch, ordering, isActive, cohortId);
  }, [currentUrl, debouncedSearch, ordering, isActive, cohortId, refreshKey, internalRefresh]);

  const columns = useMemo(() => [
    columnHelper.accessor("id", {
      header: "ID",
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.accessor("email", {
      header: "Email",
      cell: (info) => info.getValue() || "-",
    }),
    columnHelper.accessor("username", {
      header: () => (
        <button
          onClick={() => toggleOrdering("username")}
          className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
        >
          Username <SortIcon field="username" ordering={ordering} />
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
          <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-600 w-20">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Active
          </span>
        ) : (
          <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-600 w-20">
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
              title="Edit Participant"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleDelete(participant)}
              className="flex h-8 w-8 items-center justify-center rounded-sm shadow-sm border border-slate-200 bg-white text-slate-500 hover:text-red-600 hover:border-red-200 hover:shadow-md transition-all duration-150 cursor-pointer"
              title="Delete Participant"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleResendEmail(participant)}
              disabled={participant.is_active || !!resendingId}
              className="flex cursor-pointer h-8 w-8 items-center justify-center rounded-sm shadow-sm border border-slate-200 bg-white text-slate-500 hover:text-green-600 hover:border-green-200 hover:shadow-md transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-500 disabled:hover:border-slate-200 disabled:hover:shadow-sm"
              title={participant.is_active ? "Email already confirmed" : resendingId === participant?.id ? "Sending..." : "Resend Email"}
            >
              {resendingId === participant?.id
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Mail className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(participant.invitation_link);
                toast.success("Link copied to clipboard");
              }}
              disabled={!participant.invitation_link}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm shadow-sm border border-slate-200 bg-white text-slate-500 hover:text-violet-600 hover:border-violet-200 hover:shadow-md transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-slate-500 disabled:hover:border-slate-200 disabled:hover:shadow-sm"
              title={participant.invitation_link ? "Copy Invite Link" : "No invite link available"}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      },
    }),
  ], [ordering, handleEdit, handleDelete, handleResendEmail, resendingId]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
    <Card className="m-5">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <CardTitle>Participants List</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {ordering && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setOrdering(""); setCurrentUrl("/participants/"); }}
            >
              Reset sort
            </Button>
          )}
          <Select
            value={isActive || "all"}
            onValueChange={(val) => { setIsActive(val === "all" ? "" : val); setCurrentUrl("/participants/"); }}
          >
            <SelectTrigger className="h-9 w-44 rounded-sm">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" sideOffset={4} className="p-1">
              <SelectItem value="all" className="py-2 px-3">All</SelectItem>
              <SelectItem value="true" className="py-2 px-3">Active</SelectItem>
              <SelectItem value="false" className="py-2 px-3">Pending</SelectItem>
            </SelectContent>
          </Select>
          <div className="w-56">
            <CohortCombobox
              value={cohortId}
              onChange={(val) => { setCohortId(val); setCurrentUrl("/participants/"); }}
              triggerClassName="rounded-sm"
            />
          </div>
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
