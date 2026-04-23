"use client";

import Link from "next/link";
import { Heart, Gift, ChevronRight } from "lucide-react";

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
          className="flex items-center gap-3 p-2 bg-white/5 rounded-lg"
        >
          <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center flex-shrink-0">
            <Gift className="w-4 h-4 text-white/40" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{redemption.offer_title}</p>
            {redemption.store_name && (
              <p className="text-white/50 text-xs truncate">{redemption.store_name}</p>
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
          className="flex items-center gap-3 p-2 bg-white/5 rounded-lg"
        >
          <div className="w-10 h-10 bg-white/10 rounded flex items-center justify-center flex-shrink-0">
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
          <span className="text-white text-sm font-medium truncate flex-1">
            {store.store_name}
          </span>
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
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white font-serif">
          Your Perks & Benefits
        </h2>
        <Link
          href="/perks"
          className="px-4 py-2 bg-nfw-lilac text-white font-ui text-sm font-medium rounded-lg hover:bg-nfw-lilac/90 transition-colors"
        >
          Explore Perks
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column: Saved Brands */}
          <div>
            <div className="bg-white/5 rounded-xl p-6">
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
                  className="mt-4 w-full text-center text-sm text-nfw-citrine hover:text-nfw-citrine/80 py-2 border border-nfw-citrine/20 rounded-lg transition-colors"
                >
                  Explore Your Saved Brands
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Redeemed Perks */}
          <div>
            <div className="bg-white/5 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Gift className="w-5 h-5 text-nfw-citrine" />
                <h3 className="text-lg font-bold text-white font-serif">
                  Your Redeemed Perks
                </h3>
              </div>
              <RedeemedPerksList redemptions={recentRedemptions} onExplore={onExploreRedeemedPerks} />
              <button
                onClick={onExploreRedeemedPerks}
                className="mt-4 w-full text-center text-sm text-nfw-citrine hover:text-nfw-citrine/80 py-2 border border-nfw-citrine/20 rounded-lg transition-colors"
              >
                Explore Your Redeemed Perks
              </button>
            </div>
          </div>
        </div>
    </section>
  );
}
