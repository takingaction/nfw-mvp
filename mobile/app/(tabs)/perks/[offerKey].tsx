import { useLocalSearchParams } from "expo-router";

import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - app/perks/[offerKey]/page.tsx
 *   - components/perks/OfferDetailPanel.tsx
 *   - GET /api/access-perks/offers/[offerKey]
 *   - GET /api/access-perks/offers/[offerKey]/uses-remaining
 *   - GET /api/access-perks/locations
 *   - POST /api/access-perks/offers/[offerKey]/redeem
 * Build phase: 5
 */
export default function OfferDetailScreen() {
  const { offerKey } = useLocalSearchParams<{ offerKey: string }>();

  return (
    <PlaceholderScreen
      title={`Offer: ${offerKey}`}
      webEquivalent={["app/perks/[offerKey]/page.tsx","components/perks/OfferDetailPanel.tsx","GET /api/access-perks/offers/[offerKey]","GET /api/access-perks/offers/[offerKey]/uses-remaining","GET /api/access-perks/locations","POST /api/access-perks/offers/[offerKey]/redeem"]}
      phase={5}
    />
  );
}
