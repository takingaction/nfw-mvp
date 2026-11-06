import Stripe from "stripe";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  BILLABLE_SUBSCRIPTION_STATUSES,
  getScheduledCancelDate,
} from "@/lib/stripe-subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export type DeletionBlockCode =
  | "renewing_subscription"
  | "pending_grants"
  | "profile_not_found"
  | "already_deleted";

export interface DeletionBlock {
  code: DeletionBlockCode;
  /** Shown to the member. */
  memberMessage: string;
  /** Shown to admins. */
  adminMessage: string;
}

export interface DeletionEligibility {
  eligible: boolean;
  blocks: DeletionBlock[];
  /** Live Stripe subscriptions that can still bill; anonymize must cancel these. */
  billableSubscriptions: { id: string; status: string; scheduledCancelAt: string | null }[];
  /** True when Stripe couldn't be reached and the DB copy was used instead. */
  usedFallback: boolean;
}

/**
 * Single source of truth for "can this member's account be deleted right now?"
 * Used by self-serve request, admin create, and admin verify.
 *
 * A subscription that is already scheduled to cancel does NOT block deletion:
 * processing cancels it immediately in Stripe (see lib/anonymize.ts).
 * Only a subscription that will renew blocks, so nobody is deleted while they
 * still believe they're a member.
 */
export async function checkDeletionEligibility(userId: string): Promise<DeletionEligibility> {
  const blocks: DeletionBlock[] = [];
  let usedFallback = false;
  const billableSubscriptions: DeletionEligibility["billableSubscriptions"] = [];

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("membership_level, subscription_status, stripe_customer_id, deleted_at")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return {
      eligible: false,
      blocks: [{
        code: "profile_not_found",
        memberMessage: "We couldn't find your account.",
        adminMessage: "Member profile not found.",
      }],
      billableSubscriptions,
      usedFallback,
    };
  }

  if (profile.deleted_at) {
    return {
      eligible: false,
      blocks: [{
        code: "already_deleted",
        memberMessage: "This account has already been deleted.",
        adminMessage: "This member has already been anonymized.",
      }],
      billableSubscriptions,
      usedFallback,
    };
  }

  // Subscription check — live from Stripe, because our copy has been wrong before.
  let hasRenewing = false;
  if (profile.stripe_customer_id) {
    try {
      const subs = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: "all",
        limit: 100,
      });
      for (const sub of subs.data) {
        if (!BILLABLE_SUBSCRIPTION_STATUSES.includes(sub.status)) continue;
        const cancelAt = getScheduledCancelDate(sub);
        const scheduled = sub.cancel_at_period_end || sub.cancel_at != null;
        billableSubscriptions.push({
          id: sub.id,
          status: sub.status,
          scheduledCancelAt: cancelAt ? cancelAt.toISOString() : null,
        });
        if (!scheduled) hasRenewing = true;
      }
    } catch (err) {
      console.error("[deletion-eligibility] Stripe lookup failed, using DB copy:", err);
      usedFallback = true;
    }
  }

  if (usedFallback || !profile.stripe_customer_id) {
    const paid = profile.membership_level === "contributing" || profile.membership_level === "founding";
    hasRenewing = paid && profile.subscription_status === "active";
  }

  if (hasRenewing) {
    blocks.push({
      code: "renewing_subscription",
      memberMessage:
        "Your membership is set to renew automatically. Please cancel your subscription first, then you can delete your account. If you've already cancelled, contact us and we'll take care of it.",
      adminMessage:
        "Member has a subscription that will renew. Confirm with the member, then cancel it in Stripe (or set it to cancel) before verifying.",
    });
  }

  const { data: pendingGrants } = await supabaseAdmin
    .from("grants")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["submitted", "in_review"])
    .limit(1);

  if (pendingGrants && pendingGrants.length > 0) {
    blocks.push({
      code: "pending_grants",
      memberMessage:
        "You have a grant application under review. You can delete your account once it's been decided.",
      adminMessage: "Member has a grant application that is submitted or in review.",
    });
  }

  return { eligible: blocks.length === 0, blocks, billableSubscriptions, usedFallback };
}
