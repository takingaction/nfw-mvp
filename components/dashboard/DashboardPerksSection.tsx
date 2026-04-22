"use client";

import { useState, useEffect } from "react";
import YourPerksAndBenefits from "./YourPerksAndBenefits";
import SavedBrandsPanel from "./SavedBrandsPanel";
import RedeemedPerksPanel from "./RedeemedPerksPanel";

interface LikedStore {
  id: string;
  store_key: string;
  store_name: string;
  logo_url: string | null;
  created_at: string;
}

interface Redemption {
  id: string;
  offer_title: string;
  store_name: string | null;
  redeemed_at: string;
}

interface DashboardPerksSectionProps {
  likedStores: LikedStore[];
}

export default function DashboardPerksSection({
  likedStores,
}: DashboardPerksSectionProps) {
  const [savedBrandsOpen, setSavedBrandsOpen] = useState(false);
  const [redeemedPerksOpen, setRedeemedPerksOpen] = useState(false);
  const [stores, setStores] = useState(likedStores);
  const [recentRedemptions, setRecentRedemptions] = useState<Redemption[]>([]);

  useEffect(() => {
    fetchRedemptions();
  }, []);

  const fetchRedemptions = async () => {
    try {
      const response = await fetch("/api/access-perks/redemptions?limit=50");
      if (response.ok) {
        const data = await response.json();
        setRecentRedemptions(data.redemptions || []);
      }
    } catch (err) {
      console.error("Failed to fetch redemptions:", err);
    }
  };

  const handleUnlike = async (storeKey: string) => {
    try {
      const res = await fetch(`/api/perks/liked-stores/${storeKey}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStores((prev) => prev.filter((s) => s.store_key !== storeKey));
      }
    } catch (err) {
      console.error("Failed to unlike store:", err);
    }
  };

  return (
    <>
      <YourPerksAndBenefits
        likedStores={stores}
        onExploreSavedBrands={() => setSavedBrandsOpen(true)}
        onExploreRedeemedPerks={() => setRedeemedPerksOpen(true)}
        recentRedemptions={recentRedemptions}
      />

      <SavedBrandsPanel
        isOpen={savedBrandsOpen}
        onClose={() => setSavedBrandsOpen(false)}
        stores={stores}
        onUnlike={handleUnlike}
      />

      <RedeemedPerksPanel
        isOpen={redeemedPerksOpen}
        onClose={() => setRedeemedPerksOpen(false)}
      />
    </>
  );
}
