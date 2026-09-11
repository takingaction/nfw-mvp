
import { PlaceholderScreen } from "@/components/ui/PlaceholderScreen";

/**
 * Web equivalent:
 *   - app/auth/sign-up-success/page.tsx
 * Build phase: 2
 *
 * Resend confirmation via supabase.auth.resend({ type: 'signup' }) with 60s cooldown.
 */
export default function SignUpSuccessScreen() {
  return (
    <PlaceholderScreen
      title="Check Your Email"
      webEquivalent={["app/auth/sign-up-success/page.tsx"]}
      phase={2}
      notes="Resend confirmation via supabase.auth.resend({ type: 'signup' }) with 60s cooldown."
    />
  );
}
