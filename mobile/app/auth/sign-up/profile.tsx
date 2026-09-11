
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - components/SignUpFlow.tsx (step 1)
 *   - POST /api/profile/update
 * Build phase: 2
 */
export default function SignUpProfileScreen() {
  return (
    <PlaceholderScreen
      title="Personal Info"
      webEquivalent={["components/SignUpFlow.tsx (step 1)","POST /api/profile/update"]}
      phase={2}
    />
  );
}
