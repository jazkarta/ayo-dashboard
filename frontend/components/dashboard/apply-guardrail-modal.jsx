"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { XIcon, Check, Loader2 } from "lucide-react";
import { cn } from "@/utils/utils";
import toast from "react-hot-toast";
import guardrailService from "@/services/guardrailService";

const AGE_MIN = 1;
const AGE_MAX = 120;

function sanitizeAge(value) {
  const stripped = value.replace(/[^0-9]/g, "");
  if (stripped === "") return "";
  const num = Math.min(Math.max(parseInt(stripped, 10), AGE_MIN), AGE_MAX);
  return String(num);
}

function validate({ minAge, maxAge, selected }) {
  const errors = {};
  const min = parseInt(minAge, 10);
  const max = parseInt(maxAge, 10);

  if (minAge === "" || isNaN(min)) errors.minAge = "Min age is required.";
  else if (min < AGE_MIN || min > AGE_MAX) errors.minAge = `Must be between ${AGE_MIN} and ${AGE_MAX}.`;

  if (maxAge === "" || isNaN(max)) errors.maxAge = "Max age is required.";
  else if (max < AGE_MIN || max > AGE_MAX) errors.maxAge = `Must be between ${AGE_MIN} and ${AGE_MAX}.`;

  if (!errors.minAge && !errors.maxAge && min >= max)
    errors.maxAge = "Max age must be greater than min age.";

  if (selected.length === 0) errors.selected = "Select at least one guardrail.";

  return errors;
}

export default function ApplyGuardrailModal({ guardrails, onClose }) {
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [selected, setSelected] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleGuardrail = (id) => {
    const next = selected.includes(id)
      ? selected.filter((g) => g !== id)
      : [...selected, id];
    setSelected(next);
    if (submitted)
      setErrors((prev) => ({
        ...prev,
        selected: next.length === 0 ? "Select at least one guardrail." : undefined,
      }));
  };

  const handleMinAge = (e) => {
    setMinAge(sanitizeAge(e.target.value));
    if (submitted) setErrors((prev) => ({ ...prev, minAge: undefined, maxAge: undefined }));
  };

  const handleMaxAge = (e) => {
    setMaxAge(sanitizeAge(e.target.value));
    if (submitted) setErrors((prev) => ({ ...prev, minAge: undefined, maxAge: undefined }));
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    const errs = validate({ minAge, maxAge, selected });
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const payload = {
      min_age: parseInt(minAge, 10),
      max_age: parseInt(maxAge, 10),
      guardrails: selected,
    };

    setLoading(true);
    try {
      await guardrailService.applyGuardrail(payload);
      toast.success("Guardrail applied successfully!");
      onClose();
    } catch (err) {
      console.error("[ApplyGuardrailModal] Failed to apply guardrail:", err);
      const message = err?.response?.data?.detail || err?.response?.data?.message || "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Apply Guardrail</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose} disabled={loading}>
              <XIcon className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Age Range */}
            <div className="flex flex-col gap-2">
              <Label className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">Age Range</Label>
              <div className="flex items-start gap-3">
                <div className="flex-1 flex flex-col gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Min age"
                    value={minAge}
                    onChange={handleMinAge}
                    maxLength={3}
                    className={errors.minAge ? "border-destructive" : ""}
                  />
                  {errors.minAge && (
                    <p className="text-xs text-destructive">{errors.minAge}</p>
                  )}
                </div>
                <span className="mt-2.5 text-muted-foreground">—</span>
                <div className="flex-1 flex flex-col gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Max age"
                    value={maxAge}
                    onChange={handleMaxAge}
                    maxLength={3}
                    className={errors.maxAge ? "border-destructive" : ""}
                  />
                  {errors.maxAge && (
                    <p className="text-xs text-destructive">{errors.maxAge}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Guardrail Multi-select */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">Guardrails</Label>
                {selected.length > 0 && (
                  <span className="text-xs text-muted-foreground">{selected.length} selected</span>
                )}
              </div>
              <ScrollArea className={cn("h-52 rounded-md border", errors.selected ? "border-destructive" : "")}>
                <div className="p-1 flex flex-col gap-0.5">
                  {guardrails.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-10">
                      No guardrails available
                    </p>
                  ) : (
                    guardrails.map((g) => {
                      const isSelected = selected.includes(g.guardrail_id);
                      return (
                        <button
                          key={g.guardrail_id}
                          type="button"
                          onClick={() => toggleGuardrail(g.guardrail_id)}
                          className={cn(
                            "flex items-center gap-3 w-full px-3 py-2 rounded-sm text-sm text-left transition-colors",
                            isSelected
                              ? "bg-accent font-medium"
                              : "hover:bg-accent/50 text-muted-foreground"
                          )}
                        >
                          <div className={cn(
                            "h-4 w-4 rounded-sm border shrink-0 flex items-center justify-center",
                            isSelected ? "bg-primary border-primary" : "border-input"
                          )}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" strokeWidth={2.5} />}
                          </div>
                          {g.guardrail_name}
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              {errors.selected && (
                <p className="text-xs text-destructive">{errors.selected}</p>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Apply Guardrail
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
