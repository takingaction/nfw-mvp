
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - app/store/my-claims/page.tsx
 *   - GET /api/store/claims/my-claims-simple
 *   - GET /api/shopify/orders/[id]
 * Build phase: 6
 */
export default function MyClaimsScreen() {
  return (
    <PlaceholderScreen
      title="My Claims"
      webEquivalent={["app/store/my-claims/page.tsx","GET /api/store/claims/my-claims-simple","GET /api/shopify/orders/[id]"]}
      phase={6}
    />
  );
}
