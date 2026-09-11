
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - components/ManageSubscription.tsx (status only)
 * Build phase: 6
 *
 * Status only. Upgrade / Manage buttons open nationalfundforwomen.org in the system browser — no in-app Stripe (Apple 3.1.1).
 */
export default function MembershipScreen() {
  return (
    <PlaceholderScreen
      title="Membership"
      webEquivalent={["components/ManageSubscription.tsx (status only)"]}
      phase={6}
      notes="Status only. Upgrade / Manage buttons open nationalfundforwomen.org in the system browser — no in-app Stripe (Apple 3.1.1)."
    />
  );
}
