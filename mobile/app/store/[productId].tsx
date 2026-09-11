import { useLocalSearchParams } from "expo-router";

import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - components/ProductDetailPanel.tsx
 * Build phase: 6
 */
export default function ProductDetailScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();

  return (
    <PlaceholderScreen
      title={`Product: ${productId}`}
      webEquivalent={["components/ProductDetailPanel.tsx"]}
      phase={6}
    />
  );
}
