"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/layout/header";
import litellmService from "@/services/litellmService";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";
import ApplyGuardrailModal from "@/components/dashboard/apply-guardrail-modal";
import GuardrailRulesTable from "@/components/dashboard/guardrail-rules-table";

export default function GuardrailsMonitorPage() {
  const [guardrails, setGuardrails] = useState([]);
  const [loadingGuardrails, setLoadingGuardrails] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [rulesRefreshKey, setRulesRefreshKey] = useState(0);

  const fetchGuardrails = useCallback(async () => {
    try {
      const res = await litellmService.getGuardrails();
      setGuardrails(res.data.guardrails ?? []);
    } catch (err) {
      toast.error("Failed to fetch guardrails");
      console.error("[GuardrailsMonitor] Failed to fetch guardrails:", err);
    } finally {
      setLoadingGuardrails(false);
    }
  }, []);

  useEffect(() => {
    fetchGuardrails();
  }, [fetchGuardrails]);

  const handleModalClose = (saved) => {
    setModalOpen(false);
    setEditRule(null);
    if (saved) setRulesRefreshKey((k) => k + 1);
  };

  const handleEdit = (rule) => {
    setEditRule(rule);
    setModalOpen(true);
  };

  return (
    <>
      <Header title="Guardrails Monitor" />

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="m-5 flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Guardrails control what content is allowed or blocked during AI
              conversations. Apply rules to specific participant age groups to
              enforce them automatically.
            </p>
            {loadingGuardrails ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading guardrails…
              </div>
            ) : (
              <Button
                onClick={() => setModalOpen(true)}
                disabled={guardrails.length === 0}
                className="w-fit gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                Apply Guardrail
              </Button>
            )}
          </div>

          <GuardrailRulesTable refreshKey={rulesRefreshKey} onEdit={handleEdit} />
        </div>
      </main>

      {modalOpen && (
        <ApplyGuardrailModal
          guardrails={guardrails}
          onClose={handleModalClose}
          rule={editRule}
        />
      )}
    </>
  );
}
