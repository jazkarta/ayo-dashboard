"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import participantService from "@/services/participantService";

export default function GuardianInfoForm({ invitationId = null, onSuccess = null }) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [username, setUsername] = useState("");
  const [suggestedUsernames, setSuggestedUsernames] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  useEffect(() => {
    participantService.suggestUsername().then((res) => {
      setSuggestedUsernames(res.data.usernames || []);
    }).catch(() => {}).finally(() => setLoadingSuggestions(false));
  }, []);

  const refreshSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await participantService.suggestUsername();
      setSuggestedUsernames(res.data.usernames || []);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSubmit = async () => {
    if (!username.trim()) {
      setErrors({ username: "Username is required." });
      return;
    }
    if (/\s/.test(username)) {
      setErrors({ username: "Username must not contain spaces." });
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const guardianData = { username };
      if (invitationId) guardianData.invitation_id = invitationId;

      await participantService.acceptParticipantInvitation(invitationId, guardianData);
      setSubmitted(true);
      toast.success("Participant information has been saved successfully.");

      if (onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      }
    } catch (err) {
      console.error("Error submitting guardian info:", err);
      const apiErrors = err?.response?.data;
      if (apiErrors?.non_field_errors?.length) {
        toast.error(apiErrors.non_field_errors[0]);
      } else if (apiErrors?.detail) {
        toast.error(apiErrors.detail);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Participant Information</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username" className="after:content-['*'] after:ml-0.5 after:text-destructive after:text-[20px]">
                Username
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  name="username"
                  value={username}
                  readOnly
                  disabled={loading}
                  placeholder="Select a username below"
                  className={`pr-8 cursor-default ${errors.username ? "border-destructive" : ""}`}
                />
                {username && (
                  <button
                    type="button"
                    onClick={() => setUsername("")}
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
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-600" />
                      <p className="text-xs font-semibold text-blue-600 tracking-wide capitalize">Suggested Usernames</p>
                    </div>
                    {loadingSuggestions ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" />
                    ) : (
                      <button
                        type="button"
                        onClick={refreshSuggestions}
                        className="flex items-center gap-1.5 text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Different names
                      </button>
                    )}
                  </div>
                  {loadingSuggestions ? (
                    <div className="flex flex-wrap gap-2">
                      {[80, 96, 72, 88].map((w) => (
                        <div key={w} className="h-6 rounded-full bg-blue-200 animate-pulse" style={{ width: w }} />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {suggestedUsernames.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setUsername(name);
                            setErrors({});
                          }}
                          className="rounded-full border border-blue-300 bg-white text-blue-700 px-3 py-1 text-xs font-medium shadow-sm hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all cursor-pointer"
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              onClick={handleSubmit}
              disabled={loading || submitted}
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
