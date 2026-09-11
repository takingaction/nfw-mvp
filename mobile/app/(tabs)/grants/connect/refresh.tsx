
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - app/grants/connect/refresh/page.tsx
 *   - POST /api/stripe/connect
 * Build phase: 3
 */
export default function ConnectRefreshScreen() {
  return (
    <PlaceholderScreen
      title="Continue Onboarding"
      webEquivalent={["app/grants/connect/refresh/page.tsx","POST /api/stripe/connect"]}
      phase={3}
    />
  );
}
