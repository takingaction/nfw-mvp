"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

export default function SignUpSuccessPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-nfw-dove">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <div className="border-nfw-blackberry/10 bg-white p-8 rounded-2xl shadow-sm">
            <h1 className="text-2xl font-serif text-nfw-blackberry mb-2">
              Check your email
            </h1>
            <p className="text-nfw-blackberry/60 text-sm mb-4">
              We&apos;ve sent a confirmation email to{" "}
              <span className="font-medium">{email || "your email address"}</span>.
            </p>
            <p className="text-nfw-blackberry/60 text-sm mb-6">
              Click the link in the email to confirm your account and continue
              signing up.
            </p>

            {message && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
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

            <p className="text-xs text-nfw-blackberry/40 text-center mt-4">
              Didn&apos;t receive the email? Check your spam folder or click resend
              above.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}