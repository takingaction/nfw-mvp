
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - (new) POST /api/push/register
 *   - (new) push_tokens table
 * Build phase: 6
 */
export default function NotificationSettingsScreen() {
  return (
    <PlaceholderScreen
      title="Notifications"
      webEquivalent={["(new) POST /api/push/register","(new) push_tokens table"]}
      phase={6}
    />
  );
}
