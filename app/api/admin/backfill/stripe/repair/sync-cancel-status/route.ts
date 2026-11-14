import { NextResponse } from "next/server";
import Stripe from "stripe";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";
import { loadMemberReconciliation } from "@/lib/stripe-member-reconciliation-data";
import { getScheduledCancelDate } from "@/lib/stripe-subscription";

/**
 * POST: copy Stripe's cancellation status onto the profile for every member
 * in the "Cancellation status differs" group.
 *
 * - Set to cancel in Stripe → subscription_status 'canceling' and
 *   subscription_ends_at = when access ends (same as the
 *   customer.subscription.updated webhook).
 * - Renewing in Stripe but 'canceling' in the DB → 'active', end date cleared.
 *
 * Each subscription is re-read from Stripe first, so a stale snapshot can't
 * write the wrong status. Membership level and access don't change: members
 * keep full access until the period ends either way.
 *
 * Backlog: until 2026-11-06 the webhook failed to record scheduled
 * cancellations ("Invalid time value"), so earlier ones were never saved.
 */
export const maxDuration = 120;

const BATCH = 10;

export async function POST() {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = getAdminClient();
  const loaded = await loadMemberReconciliation(supabase);
  if (!loaded) {
    return NextResponse.json({ error: "No Stripe snapshot yet. Refresh from Stripe first." }, { status: 503 });
  }

  const rows = loaded.result.rows.filter(
    (r) => r.reason === "cancel_status_mismatch" && r.profile_id && r.stripe_subscription_id,
  );
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

  let markedCanceling = 0;
  let markedActive = 0;
  let unchanged = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i += BATCH) {
    await Promise.all(
      rows.slice(i, i + BATCH).map(async (r) => {
        try {
          const sub = await stripe.subscriptions.retrieve(r.stripe_subscription_id!);
          if (sub.status !== "active" && sub.status !== "trialing") {
            unchanged++; // ended or failing since the snapshot; the webhooks handle those
            return;
          }
          const scheduled = sub.cancel_at_period_end || sub.cancel_at != null;
          const now = new Date().toISOString();
          if (scheduled) {
            const endsAt = getScheduledCancelDate(sub);
            const { data, error } = await supabase
              .from("profiles")
              .update({
                subscription_status: "canceling",
                subscription_ends_at: endsAt ? endsAt.toISOString() : null,
                updated_at: now,
              })
              .eq("id", r.profile_id!)
              .in("membership_level", ["contributing", "founding"])
              .neq("subscription_status", "canceling")
              .select("id");
            if (error) throw error;
            if (data && data.length > 0) markedCanceling++;
            else unchanged++;
          } else {
            const { data, error } = await supabase
              .from("profiles")
              .update({ subscription_status: "active", subscription_ends_at: null, updated_at: now })
              .eq("id", r.profile_id!)
              .in("membership_level", ["contributing", "founding"])
              .eq("subscription_status", "canceling")
              .select("id");
            if (error) throw error;
            if (data && data.length > 0) markedActive++;
            else unchanged++;
          }
        } catch (err) {
          console.error("[repair/sync-cancel-status] failed for", r.profile_id, err);
          errors.push(r.profile_id!);
        }
      }),
    );
  }

  console.log(
    `[repair/sync-cancel-status] ${admin.user?.email ?? admin.user?.id}: canceling ${markedCanceling}, active ${markedActive}, unchanged ${unchanged}, errors ${errors.length}`,
  );
  return NextResponse.json({ ok: true, markedCanceling, markedActive, unchanged, errors: errors.length });
}
