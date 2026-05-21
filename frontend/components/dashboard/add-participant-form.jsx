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
import CohortCombobox from "@/components/dashboard/cohort-combobox";

const createUser = async (data) => {
  const response = await participantService.createParticipant(data);
  return response;
};

const sendInvite = async (id, email) => {
  const response = await participantService.sendInvitationToParticipant(id, { email });
  return response;
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const STEPS = ["Participant Info", "Participant Details", "Send Invite"];

export default function AddParticipantForm({ onSuccess = null }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userCreated, setUserCreated] = useState(false);
  const [createdParticipantId, setCreatedParticipantId] = useState(null);
  const [invitationId, setInvitationId] = useState(null);
  const [errors, setErrors] = useState({});
  const [dob, setDob] = useState({ mm: "", dd: "", yyyy: "" });
  const dobMmRef = useRef(null);
  const dobDdRef = useRef(null);
  const dobYyyyRef = useRef(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
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
      const isValid = !isNaN(parsed.getTime()) && parsed.getMonth() === month - 1;
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

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required.";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required.";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required.";
    } else {
      const dobDate = new Date(formData.dateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dobDate >= today) {
        newErrors.dateOfBirth = "Date of birth must be in the past.";
      }
    }

    if (!formData.familyId.trim()) newErrors.familyId = "Family ID is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep1()) return;

    setLoading(true);
    try {
      const res = await participantService.checkIsEmailAvailable(formData.email);
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    } catch (err) {
      const apiErrors = err.response?.data;
      if (apiErrors?.email) {
        setErrors({ email: apiErrors.email[0] });
      } else {
        setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
      }
    } finally {
      setLoading(false);
    }
  };

  const prevStep = () => {
    setErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setCurrentStep(1);
    setUserCreated(false);
    setErrors({});
    setDob({ mm: "", dd: "", yyyy: "" });
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      dateOfBirth: "",
      familyId: "",
      cohort_id: "",
    });
  };

  const handleSaveUser = async () => {
    if (!validateStep2()) return;

    const formattedData = {
      email: formData.email,
      first_name: formData.firstName,
      last_name: formData.lastName,
      profile_data: {
        date_of_birth: formData.dateOfBirth,
        family_id: formData.familyId,
        ...(formData.cohort_id && { cohort_id: formData.cohort_id }),
      },
    };

    setLoading(true);
    try {
      const res = await createUser(formattedData);
      if (res.status === 201 || res.status === 200) {
        const id = res.data?.id || res?.id;
        setCreatedParticipantId(id || null);
        setUserCreated(true);
        setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
      }
    } catch (err) {
      const apiErrors = err.response?.data;
      if (apiErrors?.first_name || apiErrors?.last_name) {
        setErrors({
          ...(apiErrors.first_name ? { firstName: apiErrors.first_name[0] } : {}),
          ...(apiErrors.last_name ? { lastName: apiErrors.last_name[0] } : {}),
        });
        setCurrentStep(1);
      } else if (apiErrors?.email) {
        setErrors({ email: apiErrors.email[0] });
        setCurrentStep(1);
      } else if (apiErrors?.profile_data?.date_of_birth || apiErrors?.date_of_birth) {
        const dobError = apiErrors?.profile_data?.date_of_birth?.[0] || apiErrors?.date_of_birth?.[0];
        setErrors({ dateOfBirth: dobError });
        setCurrentStep(2);
      } else if (apiErrors?.profile_data?.family_id) {
        setErrors({ familyId: apiErrors.profile_data.family_id[0] });
        setCurrentStep(2);
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
        const newInvitationId = res.data?.id;
        setInvitationId(newInvitationId);

        toast.success("Participant invited successfully!");
        setTimeout(() => {
          handleClose();
          onSuccess?.();
        }, 1000);
      }
    } catch (err) {
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
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="firstName" className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className={errors.firstName ? "border-destructive" : ""}
                      />
                      {errors.firstName && (
                        <p className="text-xs text-destructive">{errors.firstName}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="lastName" className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className={errors.lastName ? "border-destructive" : ""}
                      />
                      {errors.lastName && (
                        <p className="text-xs text-destructive">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

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
                      className={errors.email ? "border-destructive" : ""}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Participant Details */}
              {currentStep === 2 && (
                <div className="space-y-4">
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
                    </div>
                    {errors.dateOfBirth && (
                      <p className="text-xs text-destructive">{errors.dateOfBirth}</p>
                    )}
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
                      className={errors.familyId ? "border-destructive" : ""}
                    />
                    {errors.familyId && (
                      <p className="text-xs text-destructive">{errors.familyId}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label>Cohort</Label>
                    <CohortCombobox
                      value={formData.cohort_id}
                      onChange={(val) => setFormData((prev) => ({ ...prev, cohort_id: val }))}
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Send Invite */}
              {currentStep === 3 && (
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
              <div className="flex justify-between pt-4">
                {currentStep !== 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1 || loading}
                  >
                    Back
                  </Button>
                )}

                {currentStep === 1 && (
                  <Button type="button" onClick={handleNext} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Next
                  </Button>
                )}

                {currentStep === 2 && (
                  <Button type="button" onClick={handleSaveUser} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save
                  </Button>
                )}

                {currentStep === 3 && (
                  <Button
                    type="button"
                    onClick={handleSendInvite}
                    disabled={loading || !userCreated}
                  >
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