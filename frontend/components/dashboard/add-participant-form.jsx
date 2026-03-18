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
import { CheckCircle2Icon } from "lucide-react";

export default function AddParticipantForm() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formState, setFormState] = useState({
    firstName: "",
    lastName: "",
    email: "",
    username: "",
    role: "participant",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);

    setTimeout(() => {
      setSubmitted(false);
      setIsModalOpen(false);
      setFormState({
        firstName: "",
        lastName: "",
        email: "",
        username: "",
        role: "participant",
      });
    }, 1000);
  };

  return (
    <>
      <Button onClick={() => setIsModalOpen(true)} className="mr-5 font-medium mt-6">
        Add Participant
      </Button>

      {submitted && (
        <div className="fixed right-4 top-4 z-50 w-[320px]">
          <Alert>
            <CheckCircle2Icon className="text-green-500!"/>
            <AlertTitle>Participant added successfully.</AlertTitle>
          </Alert>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle>Add Participant</CardTitle>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formState.firstName}
                      onChange={handleChange}
                      required
                      placeholder="First name"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formState.lastName}
                      onChange={handleChange}
                      required
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    value={formState.email}
                    onChange={handleChange}
                    required
                    placeholder="name@example.com"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    value={formState.username}
                    onChange={handleChange}
                    required
                    placeholder="username"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    id="role"
                    value={formState.role}
                    onValueChange={(value) =>
                      setFormState((prev) => ({ ...prev, role: value }))
                    }
                    disabled
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Participant" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="participant">Participant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button type="submit">Save participant</Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
