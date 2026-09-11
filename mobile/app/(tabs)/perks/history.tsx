
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - app/perks/history/page.tsx
 *   - GET /api/access-perks/redemptions
 *   - GET /api/nfw-perks/redemptions
 *   - GET /api/access-perks/redemptions/[id]/fresh-url
 * Build phase: 5
 */
export default function RedemptionHistoryScreen() {
  return (
    <PlaceholderScreen
      title="Redeemed Perks"
      webEquivalent={["app/perks/history/page.tsx","GET /api/access-perks/redemptions","GET /api/nfw-perks/redemptions","GET /api/access-perks/redemptions/[id]/fresh-url"]}
      phase={5}
    />
  );
}
