"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ClaimItemModal from "./ClaimItemModal";
import ProductDetailPanel from "./ProductDetailPanel";
import Link from "next/link";

type StoreProduct = {
  shopifyProductId: string;
  shopifyVariantId: string;
  title: string;
  description: string;
  cardDescription: string;
  imageUrl: string;
  images: string[];
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
  status: "ACTIVE" | "DRAFT" | "ARCHIVED" | null;
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
    variants: Array<{ name: string; options: string[] }> | undefined;
    fullVariants: Array<{
      id: string;
      title: string;
      availableForSale: boolean;
      options: Array<{ name: string; value: string }>;
    }>;
  } | null>(null);
  const [monthlyClaimed, setMonthlyClaimed] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(true);
  const [detailsProduct, setDetailsProduct] = useState<StoreProduct | null>(null);
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

  useEffect(() => {
    async function checkProfileCompletion() {
      if (!userId) {
        setProfileCompleted(true);
        return;
      }
      try {
        const res = await fetch("/api/auth/profile");
        const data = await res.json();
        setProfileCompleted(data.profile_completed !== false);
      } catch (error) {
        console.error("Error checking profile:", error);
        setProfileCompleted(true);
      }
    }
    checkProfileCompletion();
  }, [userId]);

  const handleClaim = (item: StoreProduct) => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }

    if (!profileCompleted) {
      router.push("/auth/sign-up?step=1");
      return;
    }

    const optionMap: Record<string, string[]> = {};
    item.variants.forEach((variant) => {
      variant.options.forEach((opt) => {
        if (!optionMap[opt.name]) {
          optionMap[opt.name] = [];
        }
        if (!optionMap[opt.name].includes(opt.value)) {
          optionMap[opt.name].push(opt.value);
        }
      });
    });

    const variants = Object.entries(optionMap).map(([name, options]) => ({
      name,
      options,
    }));

    setClaimingItem({
      productId: item.shopifyProductId,
      variantId: item.shopifyVariantId,
      name: item.title,
      variants: variants.length > 0 ? variants : undefined,
      // Pass full variant info for resolving selected options to actual variant ID
      fullVariants: item.variants,
    });
  };

  const handleShowDetails = (product: StoreProduct) => {
    setDetailsProduct(product);
  };

  const canClaim = (product: StoreProduct) => {
    if (product.status === "DRAFT") {
      return { eligible: false, reason: "Dropping Soon" };
    }
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
        <div
          className="relative h-[212px] md:h-[425px] bg-cover bg-center bg-no-repeat flex items-center justify-center"
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

              return (
                <div
                  key={product.shopifyProductId}
                  className="flex flex-col h-full"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-nfw-stone/10">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className={`w-full h-full object-cover ${
                          !product.availableForSale || product.status === "DRAFT" ? "grayscale opacity-60" : ""
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full bg-nfw-powder/20" />
                    )}
                    {!product.availableForSale && (
                      <div className="absolute top-3 left-3">
                        <span className="bg-nfw-aubergine text-white px-3 py-1.5 font-ui text-xs font-black tracking-[0.06em] uppercase">
                          Out of Stock
                        </span>
                      </div>
                    )}
                    {product.status === "DRAFT" && (
                      <div className="absolute top-3 left-3">
                        <span className="bg-nfw-lilac text-white px-3 py-1.5 font-ui text-xs font-black tracking-[0.06em] uppercase">
                          Dropping Soon
                        </span>
                      </div>
                    )}
                    {product.variants.length > 0 && product.variants[0].title !== "Default" && (
                      <div className="absolute bottom-3 left-3">
                        <span className="bg-nfw-wisteria text-white px-3 py-1.5 font-ui text-xs font-black tracking-[0.06em] uppercase">
                          {product.variants.map((v) => v.title).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col flex-1 py-4">
                    <h3 className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry mb-1">
                      {product.title}
                    </h3>

                    {product.cardDescription && (
                      <p className="flex-1 font-sans text-sm text-nfw-blackberry/70">
                        {product.cardDescription}
                      </p>
                    )}

                    <div className="mt-auto pt-2.5 flex gap-2">
                      <button
                        onClick={() => handleClaim(product)}
                        disabled={!claimStatus.eligible}
                        className={`flex-1 py-3 px-2 font-ui text-xs font-black tracking-[0.03em] uppercase transition-colors text-center ${
                          claimStatus.eligible
                            ? "bg-nfw-citrine text-nfw-blackberry hover:bg-nfw-citrine/90"
                            : "bg-nfw-stone/30 text-nfw-blackberry/50 cursor-not-allowed"
                        }`}
                      >
                        {claimStatus.eligible ? "Claim Item" : claimStatus.reason}
                      </button>
                      <button
                        onClick={() => handleShowDetails(product)}
                        className="flex-1 py-3 px-2 font-ui text-xs font-black tracking-[0.03em] uppercase transition-colors text-center bg-nfw-wisteria text-white hover:bg-nfw-wisteria/90"
                      >
                        More Info
                      </button>
                    </div>
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

      <ProductDetailPanel
        product={detailsProduct}
        isOpen={!!detailsProduct}
        onClose={() => setDetailsProduct(null)}
      />
    </main>
  );
}
