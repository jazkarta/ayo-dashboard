"use client";

import { useState, useEffect, useCallback } from "react";
import guardrailService from "@/services/guardrailService";
import toast from "react-hot-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Loader2, Pencil, Trash2, ShieldOff } from "lucide-react";
import { format } from "date-fns";

function RulesTableBody({ rules, loading, onEdit, onDelete }) {
  if (loading) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="h-32 text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading rules…
          </div>
        </TableCell>
      </TableRow>
    );
  }

  if (rules.length === 0) {
    return (
      <TableRow>
        <TableCell colSpan={5} className="h-40 text-center">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ShieldOff className="h-8 w-8 opacity-40" />
            <p className="text-sm font-medium">No guardrail rules yet</p>
            <p className="text-xs">
              Apply a guardrail to an age group to see it here.
            </p>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return rules.map((rule) => (
    <TableRow key={rule.id} className="group">
      <TableCell className="font-mono text-sm">
        {rule.min_age} – {rule.max_age}
        <span className="ml-1.5 text-xs text-muted-foreground">yrs</span>
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {rule.guardrails.length} guardrail
          {rule.guardrails.length !== 1 ? "s" : ""}
        </span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {format(new Date(rule.created_at), "MMM d, yyyy")}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {format(new Date(rule.updated_at), "MMM d, yyyy")}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(rule)}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm border border-slate-200 bg-white shadow-sm transition-all duration-150 hover:border-blue-200 hover:text-blue-600 hover:shadow-md"
            title="Edit rule"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(rule)}
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-sm border border-slate-200 bg-white shadow-sm transition-all duration-150 hover:border-red-200 hover:text-red-600 hover:shadow-md"
            title="Delete rule"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </TableCell>
    </TableRow>
  ));
}

export default function GuardrailRulesTable({ refreshKey = 0 }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await guardrailService.getGuardrailRules();
      setRules(res.data.results ?? []);
    } catch (err) {
      toast.error("Failed to fetch guardrail rules");
      console.error("[GuardrailRulesTable] Failed to fetch rules:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules, refreshKey]);

  const handleEdit = (rule) => {
    // TODO: open edit modal with rule data
    toast("Edit coming soon");
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await guardrailService.deleteGuardrailRule(deleteTarget.id);
      toast.success("Guardrail rule deleted.");
      setDeleteTarget(null);
      fetchRules();
    } catch (err) {
      toast.error("Failed to delete rule.");
      console.error("[GuardrailRulesTable] Failed to delete rule:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pl-4 pb-3">
          <CardTitle className="text-base font-semibold">
            Active Guardrails Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/5">Age Range</TableHead>
                <TableHead className="w-1/5">Guardrails</TableHead>
                <TableHead className="w-1/5">Created</TableHead>
                <TableHead className="w-1/5">Last Updated</TableHead>
                <TableHead className="w-1/5">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <RulesTableBody
                rules={rules}
                loading={loading}
                onEdit={handleEdit}
                onDelete={setDeleteTarget}
              />
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-semibold">
              Delete guardrail rule?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the rule for ages{" "}
              <span className="font-medium text-foreground">
                {deleteTarget?.min_age} – {deleteTarget?.max_age}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
