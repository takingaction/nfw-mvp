import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking } from "react-native";

import { Banner } from "@/components/ui/Banner";
import { env } from "@/lib/env";
import { needsDateOfBirth, type Profile } from "@/types/profile";

type Props = {
  profile: Profile;
  /** Approved/paid grant (cycle ended after 2026-07-12) exists → Stripe connect prompts. */
  hasPaidOrApprovedGrant: boolean;
  latestGrantId: string | null;
};

/**
 * Stacked dashboard notices. Web equivalents (app/dashboard/page.tsx render order):
 *   1. components/profile/ProfileBanner.tsx           — DOB placeholder (non-dismissible)
 *   2. components/dashboard/AbandonedCheckoutBanner   — OMITTED on mobile (Stripe purchase is web-only)
 *   3. components/dashboard/PendingFreeMembershipBanner — pending free / waitlist (dismissible per session)
 *   4. "YOU'RE APPROVED!" connect-bank banner          — approved grant, Stripe not onboarded
 *   5. "YOU'RE APPROVED!" already-connected banner     — approved grant, Stripe onboarded
 */
export function DashboardBanners({ profile, hasPaidOrApprovedGrant, latestGrantId }: Props) {
  const router = useRouter();
  const [pendingDismissed, setPendingDismissed] = useState(false);

  const level = profile.membership_level;
  const isPendingFreeMember =
    (level === "free" || level === "waitlist") &&
    profile.is_approved_free_member !== true &&
    profile.free_membership_contact_submitted === true;
  const isWaitlist = level === "waitlist";

  return (
    <>
      {needsDateOfBirth(profile) && (
        <Banner
          surface="wisteria"
          message="Please add your date of birth to complete your profile. This is required for grant applications."
          actionLabel="Add Date of Birth"
          onAction={() => router.push("/(tabs)/settings/profile/edit")}
        />
      )}

      {isPendingFreeMember && !pendingDismissed && (
        <Banner
          surface="wisteria"
          message={
            isWaitlist
              ? "You're on the free membership waitlist. We'll email you when a spot opens up. You can also upgrade at any time."
              : "Your free membership request is pending review. You'll receive an email once our team approves your application."
          }
          actionLabel={isWaitlist ? "Upgrade" : undefined}
          onAction={isWaitlist ? () => Linking.openURL(`${env.siteUrl}/auth/sign-up?step=3`) : undefined}
          onDismiss={() => setPendingDismissed(true)}
        />
      )}

      {hasPaidOrApprovedGrant && latestGrantId && !profile.stripe_onboarding_completed && (
        <Banner
          surface="citrine"
          title="You're Approved!"
          message="Connect your bank account to receive your grant payments."
          note="IMPORTANT: If you don't have a website, please input nationalfundforwomen.org when prompted."
          actionLabel="Connect Bank Account"
          // Stripe Connect onboarding link requires POST /api/stripe/connect (Bearer token
          // support pending). Until then, hand off to the web application page.
          onAction={() => Linking.openURL(`${env.siteUrl}/grants/view/${latestGrantId}`)}
        />
      )}

      {hasPaidOrApprovedGrant && latestGrantId && profile.stripe_onboarding_completed && (
        <Banner
          surface="citrine"
          title="You're Approved!"
          message="You're already connected and ready to receive payments!"
          note="Bank Connected ✓"
        />
      )}
    </>
  );
}
