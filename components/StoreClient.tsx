"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import ClaimItemModal from "./ClaimItemModal";
import Link from "next/link";

type StoreProduct = {
  shopifyProductId: string;
  shopifyVariantId: string;
  title: string;
  description: string;
  imageUrl: string;
  availableForSale: boolean;
  variants: Array<{
    id: string;
    title: string;
    availableForSale: boolean;
    options: Array<{ name: string; value: string }>;
  }>;
  mvpVisibility: boolean;
  eligibilityTiers: string[];
  displayOrder: number;
};

export default function StoreClient({
  userId,
  userTier,
}: {
  userId?: string;
  userTier?: string;
}) {
  const router = useRouter();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingItem, setClaimingItem] = useState<{
    productId: string;
    variantId: string;
    name: string;
    variants: Array<{ name: string; options: string[] }>;
  } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [monthlyClaimed, setMonthlyClaimed] = useState(false);
  const [heroSettings, setHeroSettings] = useState<{
    hero_image_url: string | null;
    hero_heading: string;
    hero_subheading: string;
  } | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/shopify/products");
        const data = await res.json();
        if (Array.isArray(data)) {
          setProducts(data);
        } else {
          console.warn("API returned non-array data:", data);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    }

    async function fetchHeroSettings() {
      try {
        const res = await fetch("/api/store/settings");
        const data = await res.json();
        if (data && data.hero_image_url) {
          setHeroSettings(data);
        }
      } catch (error) {
        console.error("Error fetching hero settings:", error);
      }
    }

    fetchProducts();
    fetchHeroSettings();
  }, []);

  useEffect(() => {
    async function checkMonthlyClaim() {
      if (!userId) return;
      try {
        const res = await fetch(`/api/store/claims/check?userId=${userId}`);
        const data = await res.json();
        setMonthlyClaimed(data.claimedThisMonth || false);
      } catch (error) {
        console.error("Error checking claims:", error);
      }
    }
    checkMonthlyClaim();
  }, [userId]);

  const handleClaim = (item: StoreProduct) => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }
    setClaimingItem({
      productId: item.shopifyProductId,
      variantId: item.shopifyVariantId,
      name: item.title,
      variants: item.variants
        .filter((v) => v.options && v.options.length > 0)
        .map((v) => ({
          name: v.options.map((o) => o.name).join(" / ") || "Size",
          options: v.options.map((o) => o.value),
        })),
    });
  };

  const toggleExpand = (productId: string) => {
    setExpandedId(expandedId === productId ? null : productId);
  };

  const canClaim = (product: StoreProduct) => {
    if (!userTier || !product.eligibilityTiers.includes(userTier)) {
      return { eligible: false, reason: "Not Available for Your Tier" };
    }
    if (monthlyClaimed) {
      return { eligible: false, reason: "Monthly Limit Reached" };
    }
    if (!product.availableForSale) {
      return { eligible: false, reason: "Out of Stock" };
    }
    return { eligible: true, reason: "" };
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-nfw-dove">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 py-20">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-nfw-stone/20 rounded w-1/3" />
            <div className="grid grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="aspect-[3/4] bg-nfw-stone/20 rounded-none" />
                  <div className="h-4 bg-nfw-stone/20 rounded w-2/3 mt-4" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-nfw-dove">
      {heroSettings?.hero_image_url && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 pt-8">
          <div
            className="relative h-[250px] md:h-[500px] bg-cover bg-center bg-no-repeat flex items-center justify-center"
            style={{ backgroundImage: `url(${heroSettings.hero_image_url})` }}
          >
            <div className="text-center">
              <h1 className="font-serif text-4xl lg:text-6xl text-white mb-2">
                {heroSettings.hero_heading}
              </h1>
              <p className="font-ui text-sm font-medium tracking-[0.03em] text-white/80">
                {heroSettings.hero_subheading}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 py-16">
        {!heroSettings?.hero_image_url && (
          <div className="text-center mb-12">
            <h1 className="font-serif text-4xl lg:text-6xl text-nfw-aubergine mb-4">
              Zero Dollar Store
            </h1>
            <p className="font-ui text-sm font-medium tracking-[0.03em] text-nfw-blackberry/70">
              Browse our selection
            </p>
          </div>
        )}

        {products.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-6 opacity-30">📦</div>
            <p className="font-serif text-2xl text-nfw-blackberry/60">
              No items available yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {products.map((product) => {
              const claimStatus = canClaim(product);
              const isExpanded = expandedId === product.shopifyProductId;
              const needsExpand = product.description && product.description.length > 100;

              return (
                <div
                  key={product.shopifyProductId}
                  className=""
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-nfw-stone/10">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className={`w-full h-full object-cover ${!product.availableForSale ? "grayscale opacity-60" : ""}`}
                      />
                    ) : (
                      <div className="w-full h-full bg-nfw-powder/20" />
                    )}
                    {!product.availableForSale && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-nfw-aubergine text-nfw-dove px-4 py-2 font-ui text-xs font-black tracking-[0.06em] uppercase">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="py-4">
                    <h3 className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry mb-2">
                      {product.title}
                    </h3>

                    {product.description && (
                      <div>
                        <p className={`font-sans text-sm text-nfw-blackberry/70 ${isExpanded || !needsExpand ? "" : "line-clamp-2"}`}>
                          {product.description}
                        </p>
                        {needsExpand && (
                          <button
                            onClick={() => toggleExpand(product.shopifyProductId)}
                            className="flex items-center gap-1 mt-1 text-nfw-aubergine font-ui text-xs font-medium hover:underline"
                          >
                            {isExpanded ? (
                              <>
                                Show less <ChevronUp className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                Read more <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {product.variants.length > 0 && product.variants[0].title !== "Default" && (
                      <p className="font-sans text-xs text-nfw-blackberry/50 mt-2">
                        Options: {product.variants.map((v) => v.title).join(", ")}
                      </p>
                    )}

                    <button
                      onClick={() => handleClaim(product)}
                      disabled={!claimStatus.eligible}
                      className={`mt-4 w-full py-3 px-2 font-ui text-xs font-black tracking-[0.03em] uppercase transition-colors text-center ${
                        claimStatus.eligible
                          ? "bg-nfw-citrine text-nfw-blackberry hover:bg-nfw-citrine/90"
                          : "bg-nfw-stone/30 text-nfw-blackberry/50 cursor-not-allowed"
                      }`}
                    >
                      {claimStatus.eligible ? "Claim Item" : claimStatus.reason}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-center mt-12">
          <Link
            href="/store/my-claims"
            className="font-ui text-xs font-medium tracking-[0.06em] text-nfw-aubergine hover:underline"
          >
            View Your Claims →
          </Link>
        </div>
      </div>

      {claimingItem && userId && (
        <ClaimItemModal
          item={claimingItem}
          userId={userId}
          onClose={() => setClaimingItem(null)}
        />
      )}
    </main>
  );
}
