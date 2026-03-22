"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Package, Loader2, MapPin } from "lucide-react";

type Variant = {
  name: string;
  options: string[];
};

type ShippingAddress = {
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
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
  const [claiming, setClaiming] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
  const [useProfileAddress, setUseProfileAddress] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(true);

  useEffect(() => {
    async function loadProfileAddress() {
      try {
        const res = await fetch(`/api/profile/address/${userId}`);
        const data: { address: ShippingAddress | null } = await res.json();
        if (data.address) {
          setShippingAddress(data.address);
        }
      } catch (err) {
        console.error("Error loading address:", err);
      } finally {
        setLoadingAddress(false);
      }
    }
    loadProfileAddress();
  }, [userId]);

  const handleVariantChange = (variantName: string, option: string) => {
    setSelectedVariants((prev) => ({
      ...prev,
      [variantName]: option,
    }));
  };

  const handleClaim = async () => {
    if (item.variants && item.variants.length > 0) {
      const missingVariants = item.variants.filter(
        (v) => !selectedVariants[v.name],
      );
      if (missingVariants.length > 0) {
        setError(`Please select: ${missingVariants.map((v) => v.name).join(", ")}`);
        return;
      }
    }

    setClaiming(true);
    setError(null);

    try {
      const res = await fetch("/api/shopify/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          variantId: item.id,
          productId: item.id,
          userId,
          shippingAddress: useProfileAddress ? shippingAddress : null,
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

          {!loadingAddress && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-nfw-aubergine" />
                <p className="font-ui text-xs font-black tracking-[0.03em] uppercase text-nfw-blackberry">
                  Shipping Address
                </p>
              </div>

              {shippingAddress ? (
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      id="useProfile"
                      checked={useProfileAddress}
                      onChange={(e) => setUseProfileAddress(e.target.checked)}
                      className="mt-1"
                    />
                    <div className="font-sans text-sm text-nfw-blackberry/70">
                      <span className="font-medium">{shippingAddress.full_name}</span>
                      <br />
                      {shippingAddress.address_line1}
                      {shippingAddress.address_line2 && <>, {shippingAddress.address_line2}</>}
                      <br />
                      {shippingAddress.city}, {shippingAddress.state} {shippingAddress.zip}
                      <p className="text-nfw-blackberry/50 mt-1">You can change this later on Shopify</p>
                    </div>
                  </label>
                  {!useProfileAddress && (
                    <p className="font-sans text-sm text-nfw-blackberry/50 italic pl-7">
                      Enter a different address on the next step
                    </p>
                  )}
                </div>
              ) : (
                <p className="font-sans text-sm font-normal text-nfw-blackberry/50">
                  No shipping address on file. You&apos;ll enter one on Shopify.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 mb-6 font-sans text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleClaim}
              disabled={claiming || loadingAddress}
              className="flex-1 bg-nfw-citrine text-nfw-blackberry px-6 py-3 font-ui text-xs font-black tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {claiming ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting...
                </>
              ) : (
                "Checkout"
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
    </div>
  );
}
