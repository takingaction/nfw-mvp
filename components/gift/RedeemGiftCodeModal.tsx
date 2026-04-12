"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, X, Gift, Check } from "lucide-react";

interface RedeemGiftCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RedeemGiftCodeModal({
  isOpen,
  onClose,
  onSuccess,
}: RedeemGiftCodeModalProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/gift-codes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      setError("Failed to redeem code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCode("");
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-nfw-blackberry/50"
        onClick={handleClose}
      />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-nfw-blackberry/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-nfw-wisteria/20 rounded-full flex items-center justify-center">
              <Gift className="w-5 h-5 text-nfw-wisteria" />
            </div>
            <h2 className="text-lg font-bold text-nfw-aubergine font-serif">
              Redeem Gift Code
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-nfw-blackberry/40 hover:text-nfw-blackberry transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#d4f1ad]/30 rounded-full mb-4">
                <Check className="w-8 h-8 text-nfw-blackberry" />
              </div>
              <h3 className="text-lg font-bold text-nfw-aubergine mb-2 font-serif">
                Gift code applied!
              </h3>
              <p className="text-nfw-blackberry/60 text-sm">
                You now have 1 year of Contributing membership.
              </p>
            </div>
          ) : (
            <>
              <p className="text-nfw-blackberry/60 text-sm mb-6">
                Enter the gift code you received to unlock your Contributing
                membership.
              </p>

              <form onSubmit={handleRedeem} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.toUpperCase())
                    }
                    placeholder="Enter gift code"
                    className="w-full px-4 py-3 border border-nfw-blackberry/20 text-nfw-blackberry placeholder-nfw-blackberry/30 bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent text-center font-mono uppercase tracking-wider text-lg"
                    autoFocus
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm text-center">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="w-full py-3 bg-nfw-aubergine text-white font-bold text-base hover:bg-nfw-aubergine/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 rounded-lg"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? "Redeeming..." : "Redeem Code"}
                </button>
              </form>

              <p className="text-xs text-nfw-blackberry/40 text-center mt-4">
                Have a friend who would love NFW?{" "}
                <a
                  href="/gift-membership"
                  className="text-nfw-wisteria hover:underline"
                >
                  Gift a membership
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}