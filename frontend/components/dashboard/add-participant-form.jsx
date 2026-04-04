"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2Icon, Loader2, XIcon } from "lucide-react";
import participantService from "@/services/participantService";

const createUser = async (data) => {
  try {
    const response = await participantService.createParticipant(data);
    return response;
  } catch (error) {
    console.error("Error creating participant:", error.response?.data || error.message);
    throw error;
  }
};

const sendInvite = async (id, email) => {
  try {
    const payload = { email };
    console.log("Send invite API called for participant id:", id, "payload:", payload);
    const response = await participantService.sendInvitationToParticipant(id, payload);
    console.log("Invite sent response:", response.data);
    return response;
  } catch (error) {
    console.error("Error sending invitation:", error.response?.data || error.message);
    throw error;
  }
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function AddParticipantForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [userCreated, setUserCreated] = useState(false);
  const [createdParticipantId, setCreatedParticipantId] = useState(null);
  const [invitationId, setInvitationId] = useState(null);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    demographics: "",
  });

  const steps = ["Participant Info", "Participant Details", "Send Invite"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name !== "dateOfBirth") {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
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
      const dob = new Date(formData.dateOfBirth);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dob >= today) {
        newErrors.dateOfBirth = "Date of birth must be in the past.";
      }
    }

    if (!formData.gender) newErrors.gender = "Gender is required.";
    if (!formData.demographics.trim()) newErrors.demographics = "Demographics is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep1()) return;

    setLoading(true);
    try {
      await createUser({
        email: formData.email,
        first_name: formData.firstName,
        last_name: formData.lastName,
      });
      // If somehow 201 (no profile_data required), proceed
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    } catch (err) {
      const apiErrors = err.response?.data;
      if (apiErrors?.email) {
        // Email already exists — show error, stay on step 1
        setErrors({ email: apiErrors.email[0] });
      } else {
        // Any other error (e.g. profile_data required) means email is available
        setCurrentStep((prev) => Math.min(prev + 1, steps.length));
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
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      dateOfBirth: "",
      gender: "",
      demographics: "",
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
        gender: formData.gender,
        demographics: formData.demographics,
      },
    };

    setLoading(true);
    try {
      const res = await createUser(formattedData);
      if (res.status === 201 || res.status === 200) {
        const id = res.data?.id || res?.id;
        setCreatedParticipantId(id || null);
        setUserCreated(true);
        setCurrentStep((prev) => Math.min(prev + 1, steps.length));
      }
    } catch (err) {
      const apiErrors = err.response?.data;
      if (apiErrors?.email) {
        setErrors({ email: apiErrors.email[0] });
        setCurrentStep(1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async () => {
    if (!createdParticipantId) {
      console.error("No participant ID available to send invite");
      return;
    }

    setLoading(true);
    try {
      const res = await sendInvite(createdParticipantId, formData.email);
      
      if (res.status === 201 || res.status === 200) {
        const newInvitationId = res.data?.id;
        setInvitationId(newInvitationId);

        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          handleClose();
        }, 1000);

        // @TODO: For now checking the invitation id and redirectling to accept page, after email setup it will be from email link.
        // Verify the invitation
        // if (newInvitationId) {
        //   const verifyRes = await participantService.getParticipantInvitation(newInvitationId);
        //   if (verifyRes.status === 200) {
        //     window.location.href = `/invitation/${newInvitationId}/accept`;
        //     return;
        //   }
        // }
      }
    } catch (err) {
      console.error("Error sending invite:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)} className="mr-5 font-medium mt-6">
        Add Participant
      </Button>

      {submitted && (
        <div className="fixed right-4 top-4 z-50 w-[320px]">
          <Alert>
            <CheckCircle2Icon className="text-green-500" />
            <AlertTitle>Participant invited successfully!</AlertTitle>
          </Alert>
        </div>
      )}

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
                {steps.map((step, idx) => (
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
                    {idx < steps.length - 1 && (
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
                    <Input
                      id="dateOfBirth"
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      onBlur={() => {
                        if (!formData.dateOfBirth) {
                          setErrors((prev) => ({
                            ...prev,
                            dateOfBirth: "Date of birth is required.",
                          }));
                        } else {
                          const dob = new Date(formData.dateOfBirth);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          if (dob >= today) {
                            setErrors((prev) => ({
                              ...prev,
                              dateOfBirth: "Date of birth must be in the past.",
                            }));
                          } else {
                            setErrors((prev) => ({ ...prev, dateOfBirth: "" }));
                          }
                        }
                      }}
                      className={errors.dateOfBirth ? "border-destructive" : ""}
                    />
                    {errors.dateOfBirth && (
                      <p className="text-xs text-destructive">{errors.dateOfBirth}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="gender" className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">
                      Gender
                    </Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(val) => {
                        setFormData((prev) => ({ ...prev, gender: val }));
                        setErrors((prev) => ({ ...prev, gender: "" }));
                      }}
                    >
                      <SelectTrigger className={errors.gender ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                        <SelectItem value="O">Other</SelectItem>
                        <SelectItem value="N">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && (
                      <p className="text-xs text-destructive">{errors.gender}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="demographics" className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">
                      Demographics
                    </Label>
                    <Input
                      id="demographics"
                      name="demographics"
                      placeholder="e.g. Bangladesh, India"
                      value={formData.demographics}
                      onChange={handleChange}
                      className={errors.demographics ? "border-destructive" : ""}
                    />
                    {errors.demographics && (
                      <p className="text-xs text-destructive">{errors.demographics}</p>
                    )}
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