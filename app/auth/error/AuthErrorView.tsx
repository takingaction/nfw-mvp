"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ErrorContent({ errorParam, emailParam }: { errorParam: string; emailParam: string }) {
  const [email, setEmail] = useState(emailParam);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Set by /auth/confirm when a link was already used or too old:
  // "link_invalid:email" (signup confirmation) or "link_invalid:recovery".
  const isRecoveryLinkError = errorParam === "link_invalid:recovery";

  const isConfirmationError =
    errorParam.toLowerCase().includes("expired") ||
    errorParam.toLowerCase().includes("invalid") ||
    errorParam.toLowerCase().includes("confirm") ||
    errorParam.toLowerCase().includes("token");

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!email || resendCooldown > 0) return;

    setResending(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/sign-up?step=1`,
        },
      });

      if (error) throw error;

      // Supabase reports success without sending anything when the address is
      // already confirmed, so don't promise an email that may never come.
      setMessage({
        type: "success",
        text: "If this email still needs confirming, a new link is on its way. If you already confirmed, log in instead.",
      });
      setResendCooldown(60);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to resend email. Please try again." });
    } finally {
      setResending(false);
    }
  };

  if (isRecoveryLinkError) {
    return (
      <div className="flex flex-col gap-4">
        <div className="p-3 bg-nfw-citrine/20 border border-nfw-citrine/40 rounded-lg">
          <p className="text-sm text-nfw-blackberry font-medium mb-1">
            This reset link has expired or was already used
          </p>
          <p className="text-xs text-nfw-blackberry/60">
            Reset links work once and only for a limited time. Request a new one below.
          </p>
        </div>
        <Link
          href="/auth/forgot-password"
          className="w-full py-3 bg-nfw-blackberry text-white font-bold text-sm hover:bg-nfw-blackberry/90 transition-all flex items-center justify-center rounded-xl"
        >
          Request a new reset link
        </Link>
        <div className="text-center">
          <Link href="/auth/login" className="text-sm text-nfw-aubergine hover:underline">
            Back to log in
          </Link>
        </div>
      </div>
    );
  }

  if (!isConfirmationError) {
    return (
      <>
        {errorParam ? (
          <p className="text-sm text-nfw-blackberry/60">
            {decodeURIComponent(errorParam)}
          </p>
        ) : (
          <p className="text-sm text-nfw-blackberry/60">
            An unspecified error occurred.
          </p>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="p-3 bg-nfw-citrine/20 border border-nfw-citrine/40 rounded-lg">
        <p className="text-sm text-nfw-blackberry font-medium mb-1">
          Confirmation link expired or invalid
        </p>
        <p className="text-xs text-nfw-blackberry/60">
          The confirmation link you clicked has expired or is no longer valid.
        </p>
      </div>

      <div className="p-3 border border-nfw-blackberry/10 rounded-lg">
        <p className="text-sm text-nfw-blackberry font-medium mb-1">
          Already confirmed your email?
        </p>
        <p className="text-xs text-nfw-blackberry/60 mb-3">
          Your account may already be ready. Log in with the email and password you chose
          when you signed up, and you&apos;ll pick up where you left off.
        </p>
        <Link
          href="/auth/login"
          className="w-full py-3 bg-nfw-blackberry text-white font-bold text-sm hover:bg-nfw-blackberry/90 transition-all flex items-center justify-center rounded-xl"
        >
          Log in
        </Link>
      </div>

      <div className="grid gap-2">
        <label htmlFor="resend-email" className="text-sm font-medium text-nfw-blackberry">
          Still need to confirm? Enter your email to get a new link
        </label>
        <input
          id="resend-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-3 py-2 border border-nfw-blackberry/20 rounded-lg text-sm focus:border-nfw-blackberry focus:ring-1 focus:ring-nfw-lilac focus:outline-none"
        />
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-nfw-citrine/30 text-nfw-blackberry"
              : "bg-red-50 text-red-600"
          }`}
        >
          {message.text}
        </div>
      )}

      <button
        onClick={handleResend}
        disabled={resending || resendCooldown > 0 || !email}
        className="w-full py-3 border border-nfw-blackberry text-nfw-blackberry font-bold text-sm hover:bg-nfw-blackberry/5 transition-all disabled:opacity-50 flex items-center justify-center gap-2 rounded-xl"
      >
        {resending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Resending...
          </>
        ) : resendCooldown > 0 ? (
          `Resend in ${resendCooldown}s`
        ) : (
          "Resend confirmation email"
        )}
      </button>

      <div className="text-center">
        <Link
          href="/auth/sign-up"
          className="text-sm text-nfw-aubergine hover:underline"
        >
          Back to sign up
        </Link>
      </div>
    </div>
  );
}

export default function AuthErrorView({ errorParam, emailParam }: { errorParam: string; emailParam: string }) {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-nfw-dove">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card className="border-nfw-blackberry/10">
            <CardHeader>
              <CardTitle className="text-2xl font-serif text-nfw-blackberry">
                {errorParam === "link_invalid:recovery" ? "Reset Link Issue" : "Confirmation Issue"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ErrorContent errorParam={errorParam} emailParam={emailParam} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
