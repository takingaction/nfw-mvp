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
  logo_url?: string | null;
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
      // Fetch Access Perks redemptions
      const accessResponse = await fetch("/api/access-perks/redemptions?limit=50");
      let accessRedemptions: any[] = [];
      if (accessResponse.ok) {
        const accessData = await accessResponse.json();
        accessRedemptions = accessData.redemptions || [];
      }

      // Fetch NFW perk redemptions
      const nfwResponse = await fetch("/api/nfw-perks/redemptions");
      let nfwRedemptions: any[] = [];
      if (nfwResponse.ok) {
        const nfwData = await nfwResponse.json();
        nfwRedemptions = (nfwData.redemptions || []).map((r: any) => ({
          ...r,
          offer_key: undefined,
          offer_title: r.title,
          store_name: r.partner_name,
          store_logo_url: r.logo_url,
          logo_url: r.logo_url,
          redeem_type: "landing_page",
          redemption_url: r.landing_page_url,
          coupon_code: null,
          phone_number: null,
          status: "active",
          expires_at: null,
        }));
      }

      // Combine and sort by date
      const allRedemptions = [...accessRedemptions, ...nfwRedemptions];
      allRedemptions.sort((a, b) => {
        return new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime();
      });

      setRecentRedemptions(allRedemptions.slice(0, 50));
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
