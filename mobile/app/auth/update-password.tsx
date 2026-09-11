
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - app/auth/update-password/page.tsx
 *   - POST /api/auth/update-password
 * Build phase: 2
 *
 * Calls supabase.auth.updateUser directly — no cookie exchange needed on mobile.
 */
export default function UpdatePasswordScreen() {
  return (
    <PlaceholderScreen
      title="New Password"
      webEquivalent={["app/auth/update-password/page.tsx","POST /api/auth/update-password"]}
      phase={2}
      notes="Calls supabase.auth.updateUser directly — no cookie exchange needed on mobile."
    />
  );
}
