"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2Icon, Loader2, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import participantService from "@/services/participantService";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPhone = (phone) => /^[\d\s\-\+\(\)]+$/.test(phone) && phone.length >= 10;
const hasSpaces = (value) => /\s/.test(value);

export default function GuardianInfoForm({ invitationId = null, onSuccess = null }) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [suggestedUsernames, setSuggestedUsernames] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  useEffect(() => {
    participantService.suggestUsername().then((res) => {
      setSuggestedUsernames(res.data.usernames || []);
    }).catch(() => {}).finally(() => setLoadingSuggestions(false));
  }, []);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phoneNumber: "",
    address: "",
    relationship: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "username") {
      if (/\s/.test(value)) {
        setErrors((prev) => ({ ...prev, username: "Spaces are not allowed in username." }));
        return;
      }
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = "First name is required.";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required.";
    if (!formData.username.trim()) {
      newErrors.username = "Username is required.";
    } else if (hasSpaces(formData.username)) {
      newErrors.username = "Username must not contain spaces.";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required.";
    } else if (!isValidPhone(formData.phoneNumber)) {
      newErrors.phoneNumber = "Please enter a valid phone number.";
    }
    if (!formData.address.trim()) newErrors.address = "Address is required.";
    if (!formData.relationship) newErrors.relationship = "Relationship is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const guardianData = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        username: formData.username,
        email: formData.email,
        phone_number: formData.phoneNumber,
        address: formData.address,
        relationship: formData.relationship,
      };

      if (invitationId) {
        guardianData.invitation_id = invitationId;
      }

      console.log("Guardian data to submit:", guardianData);

      const res = await participantService.acceptParticipantInvitation(invitationId, guardianData);
      console.log(res)
      setSubmitted(true);
      
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1500);
      }
    } catch (err) {
      console.error("Error submitting guardian info:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {submitted && (
        <div className="mb-6">
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle2Icon className="h-4 w-4 text-green-500" />
            <AlertTitle className="text-green-700">Success!</AlertTitle>
            <AlertDescription className="text-green-600">
              Guardian information has been saved successfully.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Guardian Information</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Row 1: First Name and Last Name */}
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
                  disabled={loading}
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
                  disabled={loading}
                  className={errors.lastName ? "border-destructive" : ""}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Username */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="username" className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">
                Username
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  disabled={loading}
                  className={`pr-8 ${errors.username ? "border-destructive" : ""}`}
                />
                {formData.username && (
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, username: "" }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username}</p>
              )}
              {(loadingSuggestions || suggestedUsernames.length > 0) && (
                <div className="rounded-md border border-input bg-muted/40 p-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">Suggested Usernames</p>
                    {loadingSuggestions && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  </div>
                  {loadingSuggestions ? (
                    <div className="flex flex-wrap gap-2">
                      {[80, 96, 72, 88].map((w) => (
                        <div
                          key={w}
                          className="h-6 rounded-full bg-muted animate-pulse"
                          style={{ width: w }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {suggestedUsernames.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setFormData((prev) => ({ ...prev, username: name }));
                            setErrors((prev) => ({ ...prev, username: "" }));
                          }}
                          className="rounded-full border border-input bg-background px-3 py-1 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Email */}
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
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="phoneNumber" className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                disabled={loading}
                className={errors.phoneNumber ? "border-destructive" : ""}
                placeholder="+1 (123) 456-7890"
              />
              {errors.phoneNumber && (
                <p className="text-xs text-destructive">{errors.phoneNumber}</p>
              )}
            </div>

            {/* Address */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="address" className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">
                Address
              </Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={loading}
                className={errors.address ? "border-destructive" : ""}
                placeholder="Enter your address."
                rows={4}
              />
              {errors.address && (
                <p className="text-xs text-destructive">{errors.address}</p>
              )}
            </div>

            {/* Relationship */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="relationship" className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">
                Relationship
              </Label>
              <Input
                id="relationship"
                name="relationship"
                value={formData.relationship}
                onChange={handleChange}
                disabled={loading}
                className={errors.relationship ? "border-destructive" : ""}
                placeholder="e.g., Mother, Father, Guardian"
              />
              {errors.relationship && (
                <p className="text-xs text-destructive">{errors.relationship}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex justify-end gap-3">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="cursor-pointer"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitted ? "Submitted" : "Submit"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}