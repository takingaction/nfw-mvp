
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - app/auth/sign-up/page.tsx
 *   - components/SignUpFlow.tsx (step 0)
 *   - GET /api/signup
 * Build phase: 2
 */
export default function SignUpScreen() {
  return (
    <PlaceholderScreen
      title="Become a Member"
      webEquivalent={["app/auth/sign-up/page.tsx","components/SignUpFlow.tsx (step 0)","GET /api/signup"]}
      phase={2}
    />
  );
}
