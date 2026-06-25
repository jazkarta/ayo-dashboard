"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import litellmService from "@/services/litellmService";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2 } from "lucide-react";
import ApplyGuardrailModal from "@/components/dashboard/apply-guardrail-modal";

export default function GuardrailsMonitorPage() {
  const [guardrails, setGuardrails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchGuardrails = async () => {
      try {
        const res = await litellmService.getGuardrails();
        setGuardrails(res.data.guardrails ?? []);
      } catch (err) {
        toast.error("Failed to fetch guardrails");
        console.error("[GuardrailsMonitor] Failed to fetch guardrails:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGuardrails();
  }, []);

  return (
    <>
      <Header title="Guardrails Monitor" />

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="m-5 flex flex-col gap-6">
          {/* Intro */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-muted-foreground">
                Guardrails let you control what content is allowed or blocked during AI conversations.
                Use this page to monitor active guardrails and apply them to specific participant age groups.
              </p>
              <p className="text-sm text-muted-foreground">
                Select an age range and one or more guardrails to enforce rules for participants within that group.
              </p>
            </div>
            {loading ? (
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
        </div>
      </main>

      {modalOpen && (
        <ApplyGuardrailModal
          guardrails={guardrails}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
