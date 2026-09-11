
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - app/faq/page.tsx
 *   - GET /api/faq
 * Build phase: 6
 */
export default function FaqScreen() {
  return (
    <PlaceholderScreen
      title="FAQ"
      webEquivalent={["app/faq/page.tsx","GET /api/faq"]}
      phase={6}
    />
  );
}
