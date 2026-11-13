/**
 * Ending a paid membership.
 *
 * A member keeps full access until the period they paid for ends, even after
 * cancelling (Stripe keeps the subscription active and the profile shows
 * `canceling`). When the period ends:
 *
 *   membership_level          → 'cancelled'  (dashboard only; lib/member-access.ts)
 *   previous_membership_level → the tier they had
 *   subscription_status       → 'cancelled'
 *   subscription_ends_at      → when it ended
 *
 * Callers:
 * - Stripe webhook customer.subscription.deleted (sent when the period ends,
 *   or at once for an immediate cancellation/refund).
 * - Daily cron /api/cron/expire-memberships: gift memberships past their end
 *   date, and a safety net for `canceling` members whose deleted event was
 *   missed.
 *
 * Never ends a membership while the member still has another live Stripe
 * subscription (active, trialing, past_due or unpaid) under their customer id
 * or email. That is the case behind the old blanket guard (Sep 2026): a
 * member whose extra subscription was deleted was dropped to free while
 * still paying.
 */
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BILLABLE_SUBSCRIPTION_STATUSES } from "@/lib/stripe-subscription";

export const PAID_LEVELS = ["contributing", "founding"] as const;

/**
 * Live subscriptions (active, trialing, past_due, unpaid) for any of these
 * customers or any customer with this email, other than `excludeSubscriptionId`.
 */
export async function findOtherLiveSubscriptions(
  stripe: Stripe,
  opts: { customerIds: (string | null | undefined)[]; email?: string | null; excludeSubscriptionId?: string },
): Promise<Stripe.Subscription[]> {
  const customers = new Set(opts.customerIds.filter((c): c is string => !!c));
  if (opts.email) {
    const byEmail = await stripe.customers.list({ email: opts.email, limit: 10 });
    for (const c of byEmail.data) customers.add(c.id);
  }
  const live: Stripe.Subscription[] = [];
  for (const customer of customers) {
    const subs = await stripe.subscriptions.list({ customer, status: "all", limit: 20 });
    for (const s of subs.data) {
      if (s.id !== opts.excludeSubscriptionId && BILLABLE_SUBSCRIPTION_STATUSES.includes(s.status)) live.push(s);
    }
  }
  return live;
}

export type EndOutcome =
  | { outcome: "ended"; profileId: string; previousLevel: string }
  | { outcome: "kept_other_subscription"; profileId: string; subscriptionIds: string[] }
  | { outcome: "not_paid"; profileId: string; level: string | null }
  | { outcome: "profile_not_found" };

/**
 * Mark a member cancelled. Only changes a profile that is still on a paid
 * level (the update is conditional, so a concurrent upgrade or rejoin wins).
 */
export async function markMembershipCancelled(
  admin: SupabaseClient,
  profileId: string,
  endedAt: Date,
): Promise<{ changed: boolean; previousLevel: string | null }> {
  const { data: current } = await admin
    .from("profiles")
    .select("membership_level")
    .eq("id", profileId)
    .maybeSingle();
  const previousLevel = (current?.membership_level as string | null) ?? null;
  if (!previousLevel || !(PAID_LEVELS as readonly string[]).includes(previousLevel)) {
    return { changed: false, previousLevel };
  }

  const { data, error } = await admin
    .from("profiles")
    .update({
      membership_level: "cancelled",
      previous_membership_level: previousLevel,
      subscription_status: "cancelled",
      subscription_ends_at: endedAt.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId)
    .eq("membership_level", previousLevel)
    .select("id");
  if (error) throw new Error(`Failed to mark ${profileId} cancelled: ${error.message}`);
  return { changed: (data?.length ?? 0) > 0, previousLevel };
}

/**
 * Handle a Stripe subscription that has ended (customer.subscription.deleted).
 */
export async function endMembershipForDeletedSubscription(
  stripe: Stripe,
  admin: SupabaseClient,
  subscription: Stripe.Subscription,
): Promise<EndOutcome> {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const customer = await stripe.customers.retrieve(customerId);
  const email = !("deleted" in customer && customer.deleted) ? (customer as Stripe.Customer).email : null;

  // Profile by saved customer id, then by email.
  let profile: { id: string; membership_level: string | null; stripe_customer_id: string | null; email: string | null } | null = null;
  const { data: byCustomer } = await admin
    .from("profiles")
    .select("id, membership_level, stripe_customer_id, email")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  profile = byCustomer;
  if (!profile && email) {
    const { data: rows } = await admin.rpc("find_user_by_email", { target_email: email });
    const userId = rows && rows.length > 0 ? (rows[0].id as string) : null;
    if (userId) {
      const { data } = await admin
        .from("profiles")
        .select("id, membership_level, stripe_customer_id, email")
        .eq("id", userId)
        .maybeSingle();
      profile = data;
    }
  }
  if (!profile) return { outcome: "profile_not_found" };

  if (!profile.membership_level || !(PAID_LEVELS as readonly string[]).includes(profile.membership_level)) {
    return { outcome: "not_paid", profileId: profile.id, level: profile.membership_level };
  }

  const others = await findOtherLiveSubscriptions(stripe, {
    customerIds: [customerId, profile.stripe_customer_id],
    email: email ?? profile.email,
    excludeSubscriptionId: subscription.id,
  });
  if (others.length > 0) {
    return { outcome: "kept_other_subscription", profileId: profile.id, subscriptionIds: others.map((s) => s.id) };
  }

  const endedAt = new Date((subscription.ended_at ?? Math.floor(Date.now() / 1000)) * 1000);
  const { changed, previousLevel } = await markMembershipCancelled(admin, profile.id, endedAt);
  if (!changed) return { outcome: "not_paid", profileId: profile.id, level: previousLevel };
  return { outcome: "ended", profileId: profile.id, previousLevel: previousLevel! };
}
