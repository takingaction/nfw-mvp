
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - components/SignUpFlow.tsx (step 2)
 *   - POST /api/profile/update
 * Build phase: 2
 */
export default function SignUpIdentityScreen() {
  return (
    <PlaceholderScreen
      title="About You"
      webEquivalent={["components/SignUpFlow.tsx (step 2)","POST /api/profile/update"]}
      phase={2}
    />
  );
}
