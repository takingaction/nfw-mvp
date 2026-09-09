"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ErrorContent() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error") || "";
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

      setMessage({ type: "success", text: "Confirmation email resent! Check your inbox." });
      setResendCooldown(60);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to resend email. Please try again." });
    } finally {
      setResending(false);
    }
  };

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

      <div className="grid gap-2">
        <label htmlFor="resend-email" className="text-sm font-medium text-nfw-blackberry">
          Enter your email to resend the confirmation link
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
        className="w-full py-3 bg-nfw-blackberry text-white font-bold text-sm hover:bg-nfw-blackberry/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 rounded-xl"
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

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="w-6 h-6 animate-spin text-nfw-blackberry/40" />
    </div>
  );
}

export default function ErrorPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-nfw-dove">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card className="border-nfw-blackberry/10">
            <CardHeader>
              <CardTitle className="text-2xl font-serif text-nfw-blackberry">
                Confirmation Issue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<LoadingFallback />}>
                <ErrorContent />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
