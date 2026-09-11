import { useLocalSearchParams } from "expo-router";

import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - app/perks/nfw/[slug]/page.tsx
 *   - GET /api/nfw-perks/slug/[slug]
 *   - POST /api/nfw-perks/[id]/redeem
 * Build phase: 5
 */
export default function NfwPerkDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return (
    <PlaceholderScreen
      title={`NFW Exclusive: ${slug}`}
      webEquivalent={["app/perks/nfw/[slug]/page.tsx","GET /api/nfw-perks/slug/[slug]","POST /api/nfw-perks/[id]/redeem"]}
      phase={5}
    />
  );
}
