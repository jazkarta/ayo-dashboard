"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import GuardianInfoForm from "@/components/dashboard/add-guardian-form";
import participantService from "@/services/participantService";
import { CheckCircle2Icon, XCircleIcon, ClockIcon, BanIcon } from "lucide-react";

const chatDomain = process.env.NEXT_PUBLIC_CHAT_URL?.replace(/^https?:\/\//, "") ?? "";

export default function InvitationAcceptPage() {
  const params = useParams();
  const invitationId = params.id;
  const [redirecting, setRedirecting] = useState(false);
  const [invitationStatus, setInvitationStatus] = useState("loading"); // loading | available | accepted | expired | inactive | invalid

  useEffect(() => {
    participantService
      .getParticipantInvitation(invitationId)
      .then((res) => {
        const invitation = res.data;
        if (invitation.has_accepted) {
          setInvitationStatus("accepted");
        } else if (new Date(invitation.expiry_date) < new Date()) {
          setInvitationStatus("expired");
        } else if (!invitation.is_active) {
          setInvitationStatus("inactive");
        } else {
          setInvitationStatus("available");
        }
      })
      .catch(() => {
        setInvitationStatus("invalid");
      });
  }, [invitationId]);

  const handleSuccess = () => {
    setRedirecting(true);
    setTimeout(() => {
      window.location.href = process.env.NEXT_PUBLIC_CHAT_URL;
    }, 2000);
  };

  if (invitationStatus === "loading") {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="inline-block h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" />
          <p className="text-slate-600 text-sm">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (invitationStatus === "accepted") {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="flex justify-center">
            <CheckCircle2Icon className="h-16 w-16 text-green-500" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">Invitation Already Accepted</h1>
          <p className="text-slate-600">
            Looks like you already accepted this invitation. Head to login to get started!
          </p> 
          <a
            href={`${process.env.NEXT_PUBLIC_CHAT_URL}/login`}
            className="inline-block mt-2 px-6 py-2 bg-slate-800 text-white text-sm font-medium rounded-md hover:bg-slate-700 transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  if (invitationStatus === "inactive") {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="flex justify-center">
            <BanIcon className="h-16 w-16 text-amber-500" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">Invitation No Longer Active</h1>
          <p className="text-slate-600">
            Oops! This invite has been turned off. Please contact the person who sent you the invitation.
          </p>
        </div>
      </div>
    );
  }

  if (invitationStatus === "expired") {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="flex justify-center">
            <ClockIcon className="h-16 w-16 text-amber-500" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">Invitation Expired</h1>
          <p className="text-slate-600">
            Oh no! This invitation link is too old to use. Please contact the person who sent you the invitation to request a new one.
          </p>
        </div>
      </div>
    );
  }

  if (invitationStatus === "invalid") {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="flex justify-center">
            <XCircleIcon className="h-16 w-16 text-red-500" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">Invalid Invitation</h1>
          <p className="text-slate-600">
            This invitation link is invalid or no longer exists. Please contact the person who sent you the invitation.
          </p>
        </div>
      </div>
    );
  }

  if (redirecting) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="inline-block h-10 w-10 rounded-full border-4 border-slate-200 border-t-slate-800 animate-spin" />
          <p className="text-slate-600 text-sm">You're all set! Taking you to {chatDomain} now...</p>
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
