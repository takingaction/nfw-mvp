"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Package, Loader2 } from "lucide-react";
import ReauthModal from "@/components/auth/ReauthModal";

type Variant = {
  name: string;
  options: string[];
};

export default function ClaimItemModal({
  item,
  userId,
  onClose,
}: {
  item: {
    productId: string;
    variantId: string;
    name: string;
    variants?: Variant[];
  };
  userId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [claiming, setClaiming] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showReauth, setShowReauth] = useState(false);

  const handleVariantChange = (variantName: string, option: string) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [variantName]: option,
    }));
  };

  const handleConfirmClaim = () => {
    if (item.variants && item.variants.length > 0) {
      const missingVariants = item.variants.filter(
        (v) => !selectedVariants[v.name],
      );
      if (missingVariants.length > 0) {
        setError(`Please select: ${missingVariants.map((v) => v.name).join(", ")}`);
        return;
      }
    }
    setError(null);
    setShowConfirm(true);
  };

  const handleReauthSuccess = async () => {
    setShowConfirm(false);
    setClaiming(true);
    setError(null);

    try {
      const res = await fetch("/api/shopify/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: item.variantId,
          productId: item.productId,
          userId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout");
      }

      router.push(data.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error claiming item");
      setClaiming(false);
    }
  };

  const handleReauthClose = () => {
    setShowReauth(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white max-w-md w-full shadow-2xl overflow-hidden">
        <div className="bg-nfw-dove px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-nfw-aubergine/10 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-nfw-aubergine" />
            </div>
            <h2 className="font-ui text-lg font-black tracking-[0.03em] text-nfw-aubergine uppercase">
              Claim Item
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={claiming}
            className="w-8 h-8 flex items-center justify-center hover:bg-nfw-aubergine/10 transition-colors text-nfw-aubergine/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="font-sans text-sm text-nfw-blackberry/70 mb-1">
            You&apos;re about to claim:
          </p>
          <p className="font-ui text-base font-black tracking-[0.03em] text-nfw-blackberry uppercase mb-6">
            {item.name}
          </p>

          {item.variants && item.variants.length > 0 && (
            <div className="space-y-4 mb-6">
              <p className="font-sans text-sm font-medium text-nfw-blackberry/60">
                Select your options:
              </p>

              {item.variants.map((variant) => (
                <div key={variant.name}>
                  <label className="block font-ui text-xs font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-2">
                    {variant.name}
                  </label>
                  <select
                    value={selectedVariants[variant.name] || ""}
                    onChange={(e) => handleVariantChange(variant.name, e.target.value)}
                    className="w-full px-4 py-3 border border-nfw-blackberry/20 font-sans text-sm text-nfw-blackberry bg-white focus:outline-none focus:border-nfw-aubergine transition-colors"
                  >
                    <option value="">Select {variant.name}</option>
                    {variant.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-6 font-sans text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleConfirmClaim}
              disabled={claiming}
              className="flex-1 bg-nfw-citrine text-nfw-blackberry px-6 py-3 font-ui text-xs font-black tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {claiming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                "Claim Now"
              )}
            </button>
            <button
              onClick={onClose}
              disabled={claiming}
              className="flex-1 bg-nfw-dove text-nfw-blackberry px-6 py-3 font-ui text-xs font-black tracking-[0.06em] uppercase hover:bg-nfw-stone/30 transition-colors border border-nfw-blackberry/20"
            >
              Cancel
            </button>
          </div>

          <p className="font-sans text-xs text-nfw-blackberry/50 text-center mt-4">
            You&apos;ll be redirected to Shopify to complete your order.
          </p>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowConfirm(false)} />
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl p-6">
            <h3 className="font-serif text-xl text-nfw-blackberry mb-2">Confirm Your Claim</h3>
            <p className="font-serif text-nfw-blackberry/70 mb-4">
              You are about to claim <strong>{item.name}</strong>. You have one claim per month.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-nfw-blackberry text-sm font-medium rounded hover:bg-gray-50"
              >
                Go Back
              </button>
              <button
                onClick={() => setShowReauth(true)}
                className="px-4 py-2 bg-nfw-blackberry text-white text-sm font-medium rounded hover:bg-nfw-blackberry/90"
              >
                Confirm & Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reauthentication Modal */}
      <ReauthModal
        isOpen={showReauth}
        onClose={handleReauthClose}
        onSuccess={handleReauthSuccess}
        title="Verify Your Identity"
        message="Enter the 6-digit code sent to your email to confirm your claim."
      />
    </div>
  );
}
