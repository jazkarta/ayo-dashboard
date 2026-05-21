"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2Icon, Loader2, XIcon } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import participantService from "@/services/participantService";
import CohortComboboxWithCreate from "@/components/dashboard/cohort-combobox-with-create";

const createUser = async (data) => {
  const response = await participantService.createParticipant(data);
  return response;
};

const sendInvite = async (id, email) => {
  const response = await participantService.sendInvitationToParticipant(id, { email });
  return response;
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const STEPS = ["Participant Info", "Send Invite"];

export default function AddParticipantForm({ onSuccess = null }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userCreated, setUserCreated] = useState(false);
  const [createdParticipantId, setCreatedParticipantId] = useState(null);
  const [errors, setErrors] = useState({});
  const [dob, setDob] = useState({ mm: "", dd: "", yyyy: "" });
  const dobMmRef = useRef(null);
  const dobDdRef = useRef(null);
  const dobYyyyRef = useRef(null);
  const [formData, setFormData] = useState({
    email: "",
    dateOfBirth: "",
    familyId: "",
    cohort_id: "",
  });

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required.";
    } else {
      const dobDate = new Date(formData.dateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dobDate >= today) newErrors.dateOfBirth = "Date of birth must be in the past.";
    }
    if (!formData.familyId.trim()) newErrors.familyId = "Family ID is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setCurrentStep(1);
    setUserCreated(false);
    setErrors({});
    setDob({ mm: "", dd: "", yyyy: "" });
    setFormData({ email: "", dateOfBirth: "", familyId: "", cohort_id: "" });
  };

  const handleSaveUser = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await participantService.checkIsEmailAvailable(formData.email);
    } catch (err) {
      const apiErrors = err.response?.data;
      if (apiErrors?.email) {
        setErrors({ email: apiErrors.email[0] });
        setLoading(false);
        return;
      }
    }

    try {
      const res = await createUser({
        email: formData.email,
        profile_data: {
          date_of_birth: formData.dateOfBirth,
          family_id: formData.familyId,
          ...(formData.cohort_id && { cohort_id: formData.cohort_id }),
        },
      });
      if (res.status === 201 || res.status === 200) {
        setCreatedParticipantId(res.data?.id || null);
        setUserCreated(true);
        setCurrentStep(2);
      }
    } catch (err) {
      const apiErrors = err.response?.data;
      if (apiErrors?.email) {
        setErrors({ email: apiErrors.email[0] });
      } else if (apiErrors?.profile_data?.date_of_birth || apiErrors?.date_of_birth) {
        setErrors({ dateOfBirth: apiErrors?.profile_data?.date_of_birth?.[0] || apiErrors?.date_of_birth?.[0] });
      } else if (apiErrors?.profile_data?.family_id) {
        setErrors({ familyId: apiErrors.profile_data.family_id[0] });
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!createdParticipantId) {
      toast.error("No participant ID available to send invite.");
      return;
    }
    setLoading(true);
    try {
      const res = await sendInvite(createdParticipantId, formData.email);
      if (res.status === 201 || res.status === 200) {
        toast.success("Participant invited successfully!");
        setTimeout(() => {
          handleClose();
          onSuccess?.();
        }, 1000);
      }
    } catch {
      toast.error("Failed to send invite. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)} className="mr-5 font-medium mt-6">
        Add Participant
      </Button>

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add Participant</CardTitle>
                <Button variant="ghost" size="icon" onClick={handleClose} disabled={loading}>
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>

              {/* Step Indicator */}
              <div className="flex items-center gap-2 pt-2">
                {STEPS.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors
                        ${
                          currentStep === idx + 1
                            ? "bg-primary text-primary-foreground"
                            : currentStep > idx + 1
                            ? "bg-green-500 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                    >
                      {currentStep > idx + 1 ? "✓" : idx + 1}
                    </div>
                    <span
                      className={`text-xs font-medium hidden sm:block ${
                        currentStep === idx + 1 ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step}
                    </span>
                    {idx < STEPS.length - 1 && (
                      <div
                        className={`h-px w-8 transition-colors ${
                          currentStep > idx + 1 ? "bg-green-500" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </CardHeader>

            <CardContent>
              {/* Step 1: Participant Info */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email" className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={loading}
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="dateOfBirth" className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">
                      Date of Birth
                    </Label>
                    <div className={`flex items-center gap-1 h-9 w-full rounded-md border bg-background px-3 text-sm ${errors.dateOfBirth ? "border-destructive" : "border-input"} ${loading ? "opacity-50 pointer-events-none" : ""}`}>
                      <input
                        ref={dobMmRef}
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
                      <span className="text-muted-foreground">/</span>
                      <input
                        ref={dobDdRef}
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
                      <span className="text-muted-foreground">/</span>
                      <input
                        ref={dobYyyyRef}
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
                    <Label htmlFor="familyId" className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">
                      Family ID
                    </Label>
                    <Input
                      id="familyId"
                      name="familyId"
                      placeholder="Enter family ID"
                      value={formData.familyId}
                      onChange={handleChange}
                      disabled={loading}
                      className={errors.familyId ? "border-destructive" : ""}
                    />
                    {errors.familyId && <p className="text-xs text-destructive">{errors.familyId}</p>}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Cohort</Label>
                    <CohortComboboxWithCreate
                      value={formData.cohort_id}
                      onChange={(val) => setFormData((prev) => ({ ...prev, cohort_id: val }))}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Send Invite */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <Alert>
                    <CheckCircle2Icon className="h-4 w-4 text-green-500" />
                    <AlertTitle>Participant saved!</AlertTitle>
                    <AlertDescription>
                      Send an invitation to <strong>{formData.email}</strong> to get them started.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-end pt-4">
                {currentStep === 1 && (
                  <Button type="button" onClick={handleSaveUser} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                )}

                {currentStep === 2 && (
                  <Button type="button" onClick={handleSendInvite} disabled={loading || !userCreated}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send Invite
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}