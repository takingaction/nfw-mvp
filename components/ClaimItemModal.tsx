"use client";

import { useState, useMemo } from "react";
import { X, Package, Loader2 } from "lucide-react";

type Variant = {
  name: string;
  options: string[];
};

type FullVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  options: Array<{ name: string; value: string }>;
};

function getUnavailableOptions(fullVariants: FullVariant[]): Map<string, Set<string>> {
  const allOptions = new Map<string, Set<string>>();
  const availableOptions = new Map<string, Set<string>>();
  
  // Initialize with all option values and collect available ones
  fullVariants.forEach(variant => {
    variant.options.forEach(opt => {
      if (!allOptions.has(opt.name)) {
        allOptions.set(opt.name, new Set());
        availableOptions.set(opt.name, new Set());
      }
      allOptions.get(opt.name)!.add(opt.value);
      
      if (variant.availableForSale) {
        availableOptions.get(opt.name)!.add(opt.value);
      }
    });
  });
  
  // Calculate unavailable = all - available
  const unavailable = new Map<string, Set<string>>();
  allOptions.forEach((options, variantName) => {
    const available = availableOptions.get(variantName) || new Set();
    const unavailableSet = new Set<string>();
    options.forEach(opt => {
      if (!available.has(opt)) {
        unavailableSet.add(opt);
      }
    });
    unavailable.set(variantName, unavailableSet);
  });
  
  return unavailable;
}

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
    fullVariants?: FullVariant[];
  };
  userId: string;
  onClose: () => void;
}) {
  const [claiming, setClaiming] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const unavailableOptions = useMemo(() => {
    return item.fullVariants ? getUnavailableOptions(item.fullVariants) : new Map<string, Set<string>>();
  }, [item.fullVariants]);

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
      
      for (const variant of item.variants) {
        const selected = selectedVariants[variant.name];
        if (selected && unavailableOptions.get(variant.name)?.has(selected)) {
          setError(`Selected ${variant.name} "${selected}" is out of stock. Please choose another.`);
          return;
        }
      }
    }
    setError(null);
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirm(false);
    setClaiming(true);
    setError(null);

    // Resolve selected options to the actual Shopify variant ID
    let resolvedVariantId = item.variantId;
    if (item.fullVariants && Object.keys(selectedVariants).length > 0) {
      const matchingVariant = item.fullVariants.find((variant) => {
        return variant.options.every(
          (opt) => selectedVariants[opt.name] === opt.value
        );
      });
      if (matchingVariant) {
        resolvedVariantId = matchingVariant.id;
      }
    }

    try {
      const res = await fetch("/api/shopify/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: resolvedVariantId,
          productId: item.productId,
          userId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout");
      }

      window.open(data.checkoutUrl, "_blank");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error claiming item");
      setClaiming(false);
    }
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
                    {variant.options.map((option) => {
                      const isUnavailable = unavailableOptions.get(variant.name)?.has(option);
                      return (
                        <option key={option} value={option} disabled={isUnavailable}>
                          {option}{isUnavailable ? " (Out of Stock)" : ""}
                        </option>
                      );
                    })}
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

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => !claiming && setShowConfirm(false)}
          />
          <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl p-6">
            <h3 className="font-serif text-xl text-nfw-blackberry mb-2">
              Confirm Your Claim
            </h3>
            <p className="font-serif text-nfw-blackberry/70 mb-4">
              You are about to claim <strong>{item.name}</strong>. You have
              one claim per month.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={claiming}
                className="flex-1 px-4 py-2 border border-gray-300 text-nfw-blackberry text-sm font-medium rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Go Back
              </button>
              <button
                onClick={handleConfirmSubmit}
                disabled={claiming}
                className="flex-1 px-4 py-2 bg-nfw-blackberry text-white text-sm font-medium rounded hover:bg-nfw-blackberry/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {claiming && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm & Claim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}