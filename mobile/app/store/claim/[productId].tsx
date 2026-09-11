import { useLocalSearchParams } from "expo-router";

import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - components/ClaimItemModal.tsx
 *   - POST /api/shopify/checkout
 * Build phase: 6
 *
 * Shopify checkout URL opens in expo-web-browser.
 */
export default function ClaimItemScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();

  return (
    <PlaceholderScreen
      title={`Claim Item: ${productId}`}
      webEquivalent={["components/ClaimItemModal.tsx","POST /api/shopify/checkout"]}
      phase={6}
      notes="Shopify checkout URL opens in expo-web-browser."
    />
  );
}
