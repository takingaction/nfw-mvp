import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";
import { fetchAllPages } from "@/lib/supabase-paginate";
import { SUBSCRIPTION_SNAPSHOT_ID } from "@/lib/stripe-reconciliation";
import {
  reconcileMembers,
  type ReconProfile,
  type StripeSubRecord,
} from "@/lib/stripe-member-reconciliation";

/**
 * GET: member-by-member comparison of paid members vs Stripe subscriptions,
 * with a reason for every mismatch (see lib/stripe-member-reconciliation.ts).
 *
 * Reads the Stripe snapshot written by refreshStripeLiveCache() (the
 * reconcile "Refresh" button and the hourly cron), so it makes no Stripe
 * calls itself. Returns 503 { requiresRefresh } if there's no snapshot yet.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const supabase = getAdminClient();

  const { data: snapshot, error: snapshotError } = await supabase
    .from("stripe_subscriptions_cache")
    .select("subscriptions_json, fetched_at, subscription_count, api_calls, warning")
    .eq("id", SUBSCRIPTION_SNAPSHOT_ID)
    .maybeSingle();
  if (snapshotError) {
    console.error("[member-reconciliation] snapshot read failed:", snapshotError);
    return NextResponse.json({ error: "Failed to read the Stripe snapshot" }, { status: 500 });
  }
  if (!snapshot) {
    return NextResponse.json(
      { error: "No Stripe snapshot yet. Click Refresh to fetch subscriptions from Stripe.", requiresRefresh: true },
      { status: 503 },
    );
  }

  const [profilesRes, giftsRes] = await Promise.all([
    fetchAllPages<ReconProfile>((from, to) =>
      supabase
        .from("profiles")
        .select("id, email, full_name, membership_level, subscription_status, stripe_customer_id, is_admin")
        .order("id")
        .range(from, to),
    ),
    fetchAllPages<{ redeemed_by_user_id: string | null }>((from, to) =>
      supabase
        .from("gift_membership_codes")
        .select("redeemed_by_user_id")
        .not("redeemed_by_user_id", "is", null)
        .order("id")
        .range(from, to),
    ),
  ]);
  if (profilesRes.error || giftsRes.error) {
    console.error("[member-reconciliation] read failed:", profilesRes.error ?? giftsRes.error);
    return NextResponse.json({ error: "Failed to load profiles" }, { status: 500 });
  }

  const result = reconcileMembers({
    subs: (snapshot.subscriptions_json ?? []) as StripeSubRecord[],
    profiles: profilesRes.data,
    giftUserIds: new Set(giftsRes.data.map((g) => g.redeemed_by_user_id!).filter(Boolean)),
  });

  return NextResponse.json({
    ...result,
    snapshot: {
      fetchedAt: snapshot.fetched_at,
      subscriptionCount: snapshot.subscription_count,
      apiCalls: snapshot.api_calls,
      warning: snapshot.warning,
    },
  });
}
