import Link from "next/link";
import { formatSiteDisplay } from "@/lib/dates";

interface CancelledMembershipBannerProps {
  /** The tier they had (profiles.previous_membership_level). */
  previousLevel?: string | null;
  /** When the membership ended (profiles.subscription_ends_at). */
  endedAt?: string | null;
}

const TIER_LABEL: Record<string, string> = {
  contributing: "Contributing",
  founding: "Founding",
};

/**
 * Shown to members whose paid membership has ended (membership_level
 * 'cancelled'). They keep the dashboard but not perks, the Zero Dollar Store
 * or new microgrant applications (lib/member-access.ts). Not dismissible.
 */
export function CancelledMembershipBanner({ previousLevel, endedAt }: CancelledMembershipBannerProps) {
  const tier = previousLevel ? TIER_LABEL[previousLevel] : undefined;
  const ended = endedAt ? new Date(endedAt) : null;
  const endedText = ended && !Number.isNaN(ended.getTime()) ? ` on ${formatSiteDisplay(ended)}` : "";

  return (
    <div className="w-full bg-nfw-wisteria py-3 px-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-white font-ui text-sm font-medium flex-1">
          Your {tier ? `${tier} ` : ""}membership ended{endedText}. You can still use your dashboard. Rejoin to get perks,
          the Zero Dollar Store and microgrants again.
        </p>
        <Link
          href="/auth/sign-up?step=3"
          className="shrink-0 px-4 py-2 text-sm font-bold font-ui uppercase bg-white text-nfw-aubergine hover:bg-nfw-citrine transition-colors"
        >
          Rejoin
        </Link>
      </div>
    </div>
  );
}
