
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - app/grants/connect/return/page.tsx
 * Build phase: 3
 *
 * Deep-link target nfw://grants/connect/return?grantId=…
 */
export default function ConnectReturnScreen() {
  return (
    <PlaceholderScreen
      title="Bank Account Connected"
      webEquivalent={["app/grants/connect/return/page.tsx"]}
      phase={3}
      notes="Deep-link target nfw://grants/connect/return?grantId=…"
    />
  );
}
