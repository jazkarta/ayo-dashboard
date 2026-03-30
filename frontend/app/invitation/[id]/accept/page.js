"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import GuardianInfoForm from "@/components/dashboard/add-guardian-form";

export default function InvitationAcceptPage() {
  const params = useParams();
  const invitationId = params.id;
  const [redirecting, setRedirecting] = useState(false);

  const handleSuccess = () => {
    setRedirecting(true);
    setTimeout(() => {
      window.location.href = process.env.NEXT_PUBLIC_CHAT_URL;
    }, 2000);
  };

  if (redirecting) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="inline-block h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" />
          <p className="text-slate-600 text-sm">Redirecting User to chat-ayo.jazkarta.com</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <GuardianInfoForm
          invitationId={invitationId}
          onSuccess={handleSuccess}
        />
      </div>
    </div>
  );
}
