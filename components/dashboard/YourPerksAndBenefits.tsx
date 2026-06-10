"use client";

import Link from "next/link";
import { Heart, Gift, ChevronRight } from "lucide-react";

const decodeHtml = (html: string): string => {
  if (typeof document === "undefined") return html || "";
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || "";
};

interface LikedStore {
  id: string;
  store_key: string;
  store_name: string;
  logo_url: string | null;
  created_at: string;
}

interface SavedBrandsListProps {
  stores: LikedStore[];
  onExplore: () => void;
}

interface RedeemedPerksListProps {
  redemptions: {
    id: string;
    offer_title: string;
    store_name: string | null;
    redeemed_at: string;
  }[];
  onExplore: () => void;
}

function RedeemedPerksList({ redemptions, onExplore }: RedeemedPerksListProps) {
  if (redemptions.length === 0) {
    return (
      <div className="text-center py-6">
        <Gift className="w-10 h-10 text-white/30 mx-auto mb-3" />
        <p className="text-white/60 text-sm mb-3">Redeem perks to see them here</p>
        <button
          onClick={onExplore}
          className="text-sm text-nfw-citrine hover:text-nfw-citrine/80 underline"
        >
          Browse Perks
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {redemptions.slice(0, 6).map((redemption) => (
        <div
          key={redemption.id}
          className="flex items-center gap-3 p-2 bg-white/5"
        >
          <div className="w-10 h-10 bg-white/10 flex items-center justify-center flex-shrink-0">
            <Gift className="w-4 h-4 text-white/40" />
          </div>
          <div className="flex-1 min-w-0">
<p className="text-white text-sm font-medium truncate [&_sup]:text-[0.6em] [&_sup]:align-super"
                    dangerouslySetInnerHTML={{ __html: decodeHtml(redemption.offer_title) }}
                  />
                  {redemption.store_name && (
                    <p className="text-white/50 text-xs truncate [&_sup]:text-[0.6em] [&_sup]:align-super"
                       dangerouslySetInnerHTML={{ __html: decodeHtml(redemption.store_name) }}
                    />
            )}
          </div>
        </div>
      ))}
      {redemptions.length > 6 && (
        <button
          onClick={onExplore}
          className="w-full text-center text-sm text-nfw-citrine hover:text-nfw-citrine/80 py-2"
        >
          +{redemptions.length - 6} more
        </button>
      )}
    </div>
  );
}

function SavedBrandsList({ stores, onExplore }: SavedBrandsListProps) {
  if (stores.length === 0) {
    return (
      <div className="text-center py-6">
        <Heart className="w-10 h-10 text-white/30 mx-auto mb-3" />
        <p className="text-white/60 text-sm mb-3">No saved brands yet</p>
        <button
          onClick={onExplore}
          className="text-sm text-nfw-citrine hover:text-nfw-citrine/80 underline"
        >
          Explore Perks to Save
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {stores.slice(0, 6).map((store) => (
        <div
          key={store.id}
          className="flex items-center gap-3 p-2 bg-white/5"
        >
          <div className="w-10 h-10 bg-white/10 flex items-center justify-center flex-shrink-0">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt=""
                className="w-8 h-8 object-contain"
              />
            ) : (
              <Heart className="w-4 h-4 text-white/40" />
            )}
          </div>
          <span className="text-white text-sm font-medium truncate flex-1 [&_sup]:text-[0.6em] [&_sup]:align-super"
            dangerouslySetInnerHTML={{ __html: decodeHtml(store.store_name) }}
          />
        </div>
      ))}
      {stores.length > 6 && (
        <button
          onClick={onExplore}
          className="w-full text-center text-sm text-nfw-citrine hover:text-nfw-citrine/80 py-2"
        >
          +{stores.length - 6} more
        </button>
      )}
    </div>
  );
}

interface YourPerksAndBenefitsProps {
  likedStores: LikedStore[];
  onExploreSavedBrands: () => void;
  onExploreRedeemedPerks: () => void;
  recentRedemptions: {
    id: string;
    offer_title: string;
    store_name: string | null;
    redeemed_at: string;
  }[];
}

export default function YourPerksAndBenefits({
  likedStores,
  onExploreSavedBrands,
  onExploreRedeemedPerks,
  recentRedemptions,
}: YourPerksAndBenefitsProps) {
  return (
    <section className="bg-nfw-aubergine py-12 px-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
        <h2 className="text-2xl font-bold text-white font-serif">
          Your Perks & Benefits
        </h2>
        <Link
          href="/perks"
          className="px-4 py-2 bg-nfw-lilac text-white font-ui text-sm font-medium hover:bg-nfw-lilac/90 transition-colors"
        >
          Explore Perks
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
          {/* Left Column: Saved Brands - 1/3 width */}
          <div>
            <div className="bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Heart className="w-5 h-5 text-nfw-citrine" />
                <h3 className="text-lg font-bold text-white font-serif">
                  Your Saved Brands
                </h3>
              </div>
              <SavedBrandsList stores={likedStores} onExplore={onExploreSavedBrands} />
              {likedStores.length > 0 && (
                <button
                  onClick={onExploreSavedBrands}
                  className="mt-4 w-full text-center text-sm text-nfw-citrine hover:text-nfw-citrine/80 py-2 border border-nfw-citrine/20 transition-colors"
                >
                  Explore Your Saved Brands
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Redeemed Perks - 2/3 width */}
          <div className="md:col-span-2">
            <div className="bg-white/5 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Gift className="w-5 h-5 text-nfw-citrine" />
                <h3 className="text-lg font-bold text-white font-serif">
                  Your Redeemed Perks
                </h3>
              </div>
              <RedeemedPerksList redemptions={recentRedemptions} onExplore={onExploreRedeemedPerks} />
              <button
                onClick={onExploreRedeemedPerks}
                className="mt-4 w-full text-center text-sm text-nfw-citrine hover:text-nfw-citrine/80 py-2 border border-nfw-citrine/20 transition-colors"
              >
                Explore Your Redeemed Perks
              </button>
            </div>
          </div>
        </div>
    </section>
  );
}
