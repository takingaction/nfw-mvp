import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";
import { fetchAllPagesIn } from "@/lib/supabase-paginate";
import { getScheduledCancelDate } from "@/lib/stripe-subscription";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * One-time repair: the customer.subscription.updated webhook never recorded
 * scheduled cancellations (it read current_period_end off the Subscription,
 * which no longer exists there). This finds every live Stripe subscription that
 * is scheduled to cancel and marks the matching profile `canceling` with its end date.
 *
 *   GET  → dry run: reports what would change, writes nothing
 *   POST → applies the changes
 */
export async function GET() {
  return run(false);
}

export async function POST() {
  return run(true);
}

type Change = {
  profile_id: string;
  stripe_customer_id: string;
  subscription_id: string;
  from_status: string | null;
  from_ends_at: string | null;
  to_ends_at: string | null;
};

async function run(apply: boolean) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Page every renewing-or-canceling subscription in Stripe.
    const scheduled = new Map<string, { subscriptionId: string; endsAt: Date | null }>();
    let scanned = 0;
    for (const status of ["active", "trialing"] as const) {
      for await (const sub of stripe.subscriptions.list({ status, limit: 100 })) {
        scanned++;
        const endsAt = getScheduledCancelDate(sub);
        if (sub.cancel_at_period_end || sub.cancel_at != null) {
          const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
          scheduled.set(customerId, { subscriptionId: sub.id, endsAt });
        }
      }
    }

    // 2. Match to profiles.
    const customerIds = [...scheduled.keys()];
    const { data: profiles, error } = await fetchAllPagesIn<{
      id: string;
      stripe_customer_id: string;
      subscription_status: string | null;
      subscription_ends_at: string | null;
    }>(customerIds, (chunk, from, to) =>
      supabaseAdmin
        .from("profiles")
        .select("id, stripe_customer_id, subscription_status, subscription_ends_at")
        .in("stripe_customer_id", chunk)
        .is("deleted_at", null)
        .order("id")
        .range(from, to),
    );
    if (error) throw error;

    // 3. Work out what needs to change.
    const changes: Change[] = [];
    for (const p of profiles ?? []) {
      const s = scheduled.get(p.stripe_customer_id);
      if (!s) continue;
      const toEndsAt = s.endsAt ? s.endsAt.toISOString() : null;
      const sameEnd =
        (p.subscription_ends_at ? new Date(p.subscription_ends_at).getTime() : null) ===
        (s.endsAt ? s.endsAt.getTime() : null);
      if (p.subscription_status === "canceling" && sameEnd) continue;
      changes.push({
        profile_id: p.id,
        stripe_customer_id: p.stripe_customer_id,
        subscription_id: s.subscriptionId,
        from_status: p.subscription_status,
        from_ends_at: p.subscription_ends_at,
        to_ends_at: toEndsAt,
      });
    }

    // 4. Apply.
    let updated = 0;
    const failures: { profile_id: string; error: string }[] = [];
    if (apply) {
      for (const c of changes) {
        const { error: upErr } = await supabaseAdmin
          .from("profiles")
          .update({
            subscription_status: "canceling",
            subscription_ends_at: c.to_ends_at,
            updated_at: new Date().toISOString(),
          })
          .eq("id", c.profile_id);
        if (upErr) failures.push({ profile_id: c.profile_id, error: upErr.message });
        else updated++;
      }
    }

    return NextResponse.json({
      mode: apply ? "apply" : "dry_run",
      stripe_subscriptions_scanned: scanned,
      stripe_scheduled_to_cancel: scheduled.size,
      matched_profiles: profiles?.length ?? 0,
      unmatched_customers: scheduled.size - (profiles?.length ?? 0),
      changes_needed: changes.length,
      updated,
      failures,
      changes: changes.slice(0, 200),
    });
  } catch (err: unknown) {
    console.error("[backfill/stripe/canceling] Error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
