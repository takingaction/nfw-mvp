import { useLocalSearchParams } from "expo-router";

import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - app/perks/page.tsx?collection=slug
 *   - GET /api/perk-collections
 * Build phase: 4
 */
export default function PerkCollectionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return (
    <PlaceholderScreen
      title={`Collection: ${slug}`}
      webEquivalent={["app/perks/page.tsx?collection=slug","GET /api/perk-collections"]}
      phase={4}
    />
  );
}
