
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - components/SignUpFlow.tsx (step 3)
 *   - POST /api/waitlist
 * Build phase: 2
 *
 * Paid tiers open nationalfundforwomen.org in the system browser (Apple 3.1.1). Free → waitlist via POST /api/waitlist.
 */
export default function SignUpMembershipScreen() {
  return (
    <PlaceholderScreen
      title="Choose Membership"
      webEquivalent={["components/SignUpFlow.tsx (step 3)","POST /api/waitlist"]}
      phase={2}
      notes="Paid tiers open nationalfundforwomen.org in the system browser (Apple 3.1.1). Free → waitlist via POST /api/waitlist."
    />
  );
}
