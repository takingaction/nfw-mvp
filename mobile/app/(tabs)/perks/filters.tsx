
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - components/perks/FilterSidebar.tsx
 *   - GET /api/access-perks/categories
 *   - GET /api/access-perks/categories/counts
 *   - GET /api/access-perks/facets
 * Build phase: 4
 */
export default function PerksFiltersScreen() {
  return (
    <PlaceholderScreen
      title="Filters"
      webEquivalent={["components/perks/FilterSidebar.tsx","GET /api/access-perks/categories","GET /api/access-perks/categories/counts","GET /api/access-perks/facets"]}
      phase={4}
    />
  );
}
