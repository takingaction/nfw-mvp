
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - app/perks/page.tsx
 *   - GET /api/access-perks/rollup
 *   - GET /api/access-perks/offers/search
 *   - GET /api/nfw-perks
 *   - GET /api/perk-collections
 *   - GET /api/perks/settings
 * Build phase: 4
 */
export default function PerksScreen() {
  return (
    <PlaceholderScreen
      title="Perks"
      webEquivalent={["app/perks/page.tsx","GET /api/access-perks/rollup","GET /api/access-perks/offers/search","GET /api/nfw-perks","GET /api/perk-collections","GET /api/perks/settings"]}
      phase={4}
    />
  );
}
