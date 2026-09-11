import { useLocalSearchParams } from "expo-router";

import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - app/privacy/page.tsx
 *   - app/terms-of-service/page.tsx
 *   - app/accessibility/page.tsx
 *   - GET /api/legal/[slug]
 * Build phase: 8
 *
 * WebView of the Termly embed.
 */
export default function LegalScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  return (
    <PlaceholderScreen
      title={`Legal: ${slug}`}
      webEquivalent={["app/privacy/page.tsx","app/terms-of-service/page.tsx","app/accessibility/page.tsx","GET /api/legal/[slug]"]}
      phase={8}
      notes="WebView of the Termly embed."
    />
  );
}
