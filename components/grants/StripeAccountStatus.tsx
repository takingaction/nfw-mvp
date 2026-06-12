"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface StripeStatusProps {
  grantId: string;
  hasAccountId: boolean;
}

interface StripeAccountStatus {
  connected: boolean;
  status: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements: {
    currently_due: string[];
    eventually_due: string[];
  } | null;
}

export default function StripeAccountStatus({ grantId, hasAccountId }: StripeStatusProps) {
  const [status, setStatus] = useState<StripeAccountStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!hasAccountId) {
      setLoading(false);
      return;
    }

    async function checkStatus() {
      try {
        const res = await fetch(`/api/stripe/connect/status?grantId=${grantId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to check status");
        setStatus(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, [grantId, hasAccountId]);

  const handleContinueOnboarding = async () => {
    setRedirecting(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to continue onboarding");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setRedirecting(false);
    }
  };

  // No account created yet
  if (!hasAccountId) {
    return null; // Parent handles showing "Connect Bank Account" button
  }

  // Loading state
  if (loading) {
    return (
      <div className="bg-[#b2d1ee]/20 border border-[#b2d1ee] p-6 mt-6">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-nfw-blackberry/60" />
          <span className="font-serif text-nfw-blackberry/70">Checking Stripe account status...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-6 mt-6">
        <h3 className="font-ui text-sm font-black tracking-[0.03em] uppercase text-red-800 mb-2">
          Error Checking Stripe Status
        </h3>
        <p className="font-serif text-red-700/70 mb-4">{error}</p>
        <button
          onClick={() => { setError(""); setLoading(true); }}
          className="px-4 py-2 bg-nfw-blackberry text-white font-ui text-sm hover:bg-nfw-blackberry/90"
        >
          Retry
        </button>
      </div>
    );
  }

  // Fully connected - all checks passed
  if (status?.connected) {
    return (
      <div className="bg-[#d4f1ad]/20 border border-[#d4f1ad] p-6 mt-6">
        <h3 className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-2">
          ✅ Bank Account Connected
        </h3>
        <p className="font-serif text-nfw-blackberry/70">
          Your bank account is connected. Our team will process your payment
          shortly.
        </p>
      </div>
    );
  }

  // Incomplete onboarding - needs action
  return (
    <div className="bg-nfw-citrine/20 border border-nfw-citrine p-6 mt-6">
      <h3 className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-2">
        ⚠️ Complete Your Stripe Onboarding
      </h3>
      <p className="font-serif text-nfw-blackberry/70 mb-4">
        Please finish setting up your Stripe account to receive your grant funds.
      </p>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <button
        onClick={handleContinueOnboarding}
        disabled={redirecting}
        className="inline-flex items-center gap-2 px-6 py-3 bg-nfw-blackberry text-white font-ui hover:bg-nfw-blackberry/90 disabled:opacity-50 transition-all"
      >
        {redirecting && <Loader2 className="w-4 h-4 animate-spin" />}
        {redirecting ? "Redirecting..." : "Continue Onboarding →"}
      </button>
    </div>
  );
}