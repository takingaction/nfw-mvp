
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - components/GrantApplicationForm.tsx (consent modal)
 *   - POST /api/grants/create
 * Build phase: 3
 */
export default function GrantApplyConfirmScreen() {
  return (
    <PlaceholderScreen
      title="Confirm & Submit"
      webEquivalent={["components/GrantApplicationForm.tsx (consent modal)","POST /api/grants/create"]}
      phase={3}
    />
  );
}
