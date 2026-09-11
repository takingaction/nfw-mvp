
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - app/profile/page.tsx
 *   - GET /api/auth/profile
 *   - GET /api/profile
 * Build phase: 2
 */
export default function ProfileScreen() {
  return (
    <PlaceholderScreen
      title="My Profile"
      webEquivalent={["app/profile/page.tsx","GET /api/auth/profile","GET /api/profile"]}
      phase={2}
    />
  );
}
