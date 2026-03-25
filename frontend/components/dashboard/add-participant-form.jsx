"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2Icon, Loader2 } from "lucide-react";

export default function AddParticipantForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    demographics: "",
    guardian: "",
    role: "participant",
  });

  const steps = ["Participant Info", "Participant Details", "Review & Submit"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSubmitted(true);

      setTimeout(() => {
        setSubmitted(false);
        setIsModalOpen(false);
        setCurrentStep(1);
        setFormData({
          firstName: "",
          lastName: "",
          username: "",
          email: "",
          dateOfBirth: "",
          gender: "",
          demographics: "",
          guardian: "",
          role: "participant",
        });
      }, 1500);
    } catch (err) {
      console.error("Error submitting participant:", err);
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
            <CheckCircle2Icon className="text-green-500!" />
            <AlertTitle>Participant added successfully.</AlertTitle>
          </Alert>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Add Participant</CardTitle>
              <div className="flex items-center gap-2 pt-2">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors
                        ${currentStep === idx + 1
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
                        currentStep === idx + 1
                          ? "text-foreground"
                          : "text-muted-foreground"
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
              {/* Step 1: Account Info */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="firstName">First name</Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Profile Details */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      id="gender"
                      value={formData.gender}
                      onValueChange={(val) =>
                        setFormData((prev) => ({ ...prev, gender: val }))
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                        <SelectItem value="O">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="demographics">Demographics</Label>
                    <Input
                      id="demographics"
                      name="demographics"
                      value={formData.demographics}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="guardian">Guardian (optional)</Label>
                    <Input
                      id="guardian"
                      name="guardian"
                      value={formData.guardian}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Review & Submit */}
              {currentStep === 3 && (
                <div className="space-y-3 text-sm">
                  <h3 className="font-semibold">Review Participant</h3>
                  <div className="grid gap-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">First Name</span>
                      <span>{formData.firstName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Name</span>
                      <span>{formData.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Username</span>
                      <span>{formData.username}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email</span>
                      <span>{formData.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date of Birth</span>
                      <span>{formData.dateOfBirth}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gender</span>
                      <span>
                        {formData.gender === "M"
                          ? "Male"
                          : formData.gender === "F"
                          ? "Female"
                          : "Other"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Demographics</span>
                      <span>{formData.demographics}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Guardian</span>
                      <span>{formData.guardian || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role</span>
                      <span>{formData.role}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1 || loading}
                >
                  Back
                </Button>

                {currentStep < steps.length ? (
                  <Button type="button" onClick={nextStep} disabled={loading}>
                    Next
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit
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