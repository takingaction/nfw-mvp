"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Search, X } from "lucide-react";
import ClaimItemModal from "./ClaimItemModal";

type ItemWithDetails = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  quantity_available: number;
  max_claims_per_member: number;
  variants: any;
  category?: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
  } | null;
  user_claim_count?: number;
};

type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  display_order: number;
};

export default function StoreClient({
  items,
  categories,
  currentCategory,
  currentSearch,
  userId,
}: {
  items: ItemWithDetails[];
  categories: Category[];
  currentCategory?: string;
  currentSearch?: string;
  userId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(currentSearch || "");
  const [claimingItem, setClaimingItem] = useState<ItemWithDetails | null>(
    null,
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery) {
      params.set("search", searchQuery);
    } else {
      params.delete("search");
    }
    router.push(`/store?${params.toString()}`);
  };

  const handleCategoryFilter = (categorySlug: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (categorySlug) {
      params.set("category", categorySlug);
    } else {
      params.delete("category");
    }
    router.push(`/store?${params.toString()}`);
  };

  const handleClaim = (item: ItemWithDetails) => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }

    setClaimingItem(item);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Lean Header */}
      <div className="bg-white pt-8 pb-6 border-b border-[#2d1239]/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-3xl sm:text-4xl font-bold text-[#2d1239] mb-2"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Zero Dollar Store
          </h2>
          <p className="text-[#2d1239]/60">
            Browse and claim free items. All items are completely free for NFW
            members!
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="bg-[#f8f7fa] rounded-xl p-4 mb-6">
          <form onSubmit={handleSearch}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2d1239]/40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#2d1239]/10 rounded-lg text-[#2d1239] placeholder-[#2d1239]/40 focus:outline-none focus:ring-2 focus:ring-[#BCAFCF] focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#2d1239] text-white rounded-lg font-medium hover:bg-[#2d1239]/90 transition-colors"
              >
                Search
              </button>
              {(currentSearch || currentCategory) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    router.push("/store");
                  }}
                  className="px-3 py-2.5 bg-white border border-[#2d1239]/10 text-[#2d1239]/60 rounded-lg hover:bg-[#2d1239]/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Category Filters */}
        <div className="mb-8">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => handleCategoryFilter(null)}
              className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${
                !currentCategory
                  ? "bg-[#2d1239] text-white"
                  : "bg-white text-[#2d1239] border border-[#2d1239]/20 hover:bg-[#2d1239]/5"
              }`}
            >
              All Items ({items.length})
            </button>
            {categories.map((category) => {
              const categoryItemCount = items.filter(
                (item) => item.category?.id === category.id,
              ).length;
              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryFilter(category.slug)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${
                    currentCategory === category.slug
                      ? "bg-[#2d1239] text-white"
                      : "bg-white text-[#2d1239] border border-[#2d1239]/20 hover:bg-[#2d1239]/5"
                  }`}
                >
                  {category.icon} {category.name} ({categoryItemCount})
                </button>
              );
            })}
          </div>
        </div>

        {/* Items Grid */}
        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4 opacity-30">📦</div>
            <p className="text-[#2d1239]/60 text-lg">
              {currentSearch || currentCategory
                ? "No items found matching your criteria."
                : "No items available yet. Check back soon!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => {
              const canClaim =
                item.quantity_available > 0 &&
                (item.user_claim_count || 0) < item.max_claims_per_member;
              const isOutOfStock = item.quantity_available === 0;
              const hasReachedLimit =
                (item.user_claim_count || 0) >= item.max_claims_per_member;

              return (
                <div
                  key={item.id}
                  className="group bg-white rounded-xl border border-[#2d1239]/10 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  {item.image_url ? (
                    <div className="relative h-48 bg-[#f8f7fa] overflow-hidden">
                      <Image
                        src={item.image_url}
                        alt={item.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="bg-[#2d1239] text-white px-4 py-2 rounded-lg font-semibold">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="relative h-48 bg-[#f8f7fa] flex items-center justify-center">
                      <span className="text-5xl opacity-20">📦</span>
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="bg-[#2d1239] text-white px-4 py-2 rounded-lg font-semibold">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-5">
                    {item.category && (
                      <span className="inline-block text-xs px-2.5 py-1 rounded-full mb-3 bg-[#BCAFCF]/20 text-[#2d1239] font-medium">
                        {item.category.icon} {item.category.name}
                      </span>
                    )}

                    <h3 className="text-lg font-semibold text-[#2d1239] mb-2">
                      {item.name}
                    </h3>

                    {item.description && (
                      <p className="text-[#2d1239]/60 text-sm mb-4 line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {/* Variants */}
                    {item.variants && item.variants.length > 0 && (
                      <div className="mb-4 text-sm">
                        {item.variants.map((variant: any, idx: number) => (
                          <div key={idx} className="text-[#2d1239]/60">
                            <strong className="text-[#2d1239]/80">
                              {variant.name}:
                            </strong>{" "}
                            {variant.options.join(", ")}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-[#2d1239]/50 mb-4">
                      <span>{item.quantity_available} available</span>
                      {userId && item.user_claim_count! > 0 && (
                        <span className="text-[#BCAFCF] font-medium">
                          You claimed: {item.user_claim_count}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleClaim(item)}
                      disabled={!canClaim}
                      className={`w-full py-2.5 rounded-lg font-medium transition-colors ${
                        canClaim
                          ? "bg-[#2d1239] text-white hover:bg-[#2d1239]/90"
                          : "bg-[#2d1239]/10 text-[#2d1239]/40 cursor-not-allowed"
                      }`}
                    >
                      {isOutOfStock
                        ? "Out of Stock"
                        : hasReachedLimit
                          ? "Claim Limit Reached"
                          : "Claim Item"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Claim Modal */}
        {claimingItem && userId && (
          <ClaimItemModal
            item={claimingItem}
            userId={userId}
            onClose={() => setClaimingItem(null)}
          />
        )}
      </div>
    </main>
  );
}
