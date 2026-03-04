"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { X, Package, Loader2 } from "lucide-react";

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
    id: string;
    name: string;
    variants?: Variant[];
  };
  userId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [claiming, setClaiming] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState<string | null>(null);

  const handleVariantChange = (variantName: string, option: string) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [variantName]: option,
    }));
  };

  const handleClaim = async () => {
    // Validate all variants are selected
    if (item.variants && item.variants.length > 0) {
      const missingVariants = item.variants.filter(
        (v) => !selectedVariants[v.name],
      );
      if (missingVariants.length > 0) {
        setError(
          `Please select: ${missingVariants.map((v) => v.name).join(", ")}`,
        );
        return;
      }
    }

    setClaiming(true);
    setError(null);

    try {
      // Check if user already claimed this item
      const { data: existingClaim } = await supabase
        .from("zero_dollar_claims")
        .select("id")
        .eq("item_id", item.id)
        .eq("member_id", userId)
        .single();

      if (existingClaim) {
        setError(
          "You have already claimed this item. Check your claims page for status.",
        );
        setClaiming(false);
        return;
      }

      // Get user's profile with address
      const { data: profile } = await supabase
        .from("profiles")
        .select("shipping_address")
        .eq("id", userId)
        .single();

      const { error: claimError } = await supabase
        .from("zero_dollar_claims")
        .insert({
          item_id: item.id,
          member_id: userId,
          status: "pending",
          shipping_address: profile?.shipping_address || null,
          selected_variants:
            item.variants && item.variants.length > 0 ? selectedVariants : null,
        });

      if (claimError) throw claimError;

      router.refresh();
      onClose();

      // Show success message
      setTimeout(() => {
        alert("Item claimed successfully! Check your claims page for status.");
      }, 100);
    } catch (err: any) {
      setError(err.message || "Error claiming item");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#f8f7fa] px-6 py-4 border-b border-[#2d1239]/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#BCAFCF]/30 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-[#2d1239]" />
            </div>
            <h2
              className="text-xl font-bold text-[#2d1239]"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              Claim Item
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={claiming}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#2d1239]/10 transition-colors text-[#2d1239]/60 hover:text-[#2d1239]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-[#2d1239]/70 mb-1">You're about to claim:</p>
          <p className="text-[#2d1239] font-semibold text-lg mb-6">
            {item.name}
          </p>

          {/* Variant Selection */}
          {item.variants && item.variants.length > 0 && (
            <div className="space-y-4 mb-6">
              <p className="text-sm text-[#2d1239]/60 font-medium">
                Please select your preferences:
              </p>

              {item.variants.map((variant) => (
                <div key={variant.name}>
                  <label className="block text-sm font-medium text-[#2d1239] mb-2">
                    {variant.name} <span className="text-[#BCAFCF]">*</span>
                  </label>
                  <select
                    value={selectedVariants[variant.name] || ""}
                    onChange={(e) =>
                      handleVariantChange(variant.name, e.target.value)
                    }
                    className="w-full px-4 py-2.5 border border-[#2d1239]/20 rounded-lg text-[#2d1239] bg-white focus:outline-none focus:ring-2 focus:ring-[#BCAFCF] focus:border-transparent transition-all"
                  >
                    <option value="" className="text-[#2d1239]/40">
                      Select {variant.name}
                    </option>
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

          {(!item.variants || item.variants.length === 0) && (
            <p className="text-sm text-[#2d1239]/60 mb-6">
              Click "Claim Item" to confirm your claim.
            </p>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="flex-1 bg-[#2d1239] text-white px-6 py-3 rounded-xl hover:bg-[#2d1239]/90 font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {claiming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Claiming...
                </>
              ) : (
                "Claim Item"
              )}
            </button>
            <button
              onClick={onClose}
              disabled={claiming}
              className="flex-1 bg-[#f8f7fa] text-[#2d1239] px-6 py-3 rounded-xl hover:bg-[#2d1239]/10 font-medium transition-colors border border-[#2d1239]/10"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
