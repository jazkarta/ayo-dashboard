"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, XIcon } from "lucide-react";
import toast from "react-hot-toast";
import researcherService from "@/services/researcherService";
import { extractFieldErrors } from "@/utils/apiErrors";

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function AddResearcherForm({ onSuccess = null }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.first_name.trim())
      newErrors.first_name = "First name is required.";
    if (!formData.last_name.trim())
      newErrors.last_name = "Last name is required.";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required.";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleClose = () => {
    setIsModalOpen(false);
    setErrors({});
    setFormData({ first_name: "", last_name: "", email: "" });
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await researcherService.createResearcher(formData);
      if (res.status === 201) {
        toast.success("Researcher added successfully!");
        handleClose();
        onSuccess?.();
      }
    } catch (err) {
      const fieldErrors = extractFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        className="mr-5 font-medium mt-6"
      >
        Add Researcher
      </Button>

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Add Researcher</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClose}
                  disabled={loading}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="first_name"
                      className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]"
                    >
                      First Name
                    </Label>
                    <Input
                      id="first_name"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      disabled={loading}
                      className={errors.first_name ? "border-destructive" : ""}
                    />
                    {errors.first_name && (
                      <p className="text-xs text-destructive">
                        {errors.first_name}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label
                      htmlFor="last_name"
                      className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]"
                    >
                      Last Name
                    </Label>
                    <Input
                      id="last_name"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      disabled={loading}
                      className={errors.last_name ? "border-destructive" : ""}
                    />
                    {errors.last_name && (
                      <p className="text-xs text-destructive">
                        {errors.last_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label
                    htmlFor="email"
                    className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]"
                  >
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
              </div>

              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Researcher
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
