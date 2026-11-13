import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllPages } from "@/lib/supabase-paginate";
import { SUBSCRIPTION_SNAPSHOT_ID } from "@/lib/stripe-reconciliation";
import {
  reconcileMembers,
  type ReconProfile,
  type ReconResult,
  type StripeSubRecord,
} from "@/lib/stripe-member-reconciliation";

export type SnapshotMeta = { fetchedAt: string; subscriptionCount: number; apiCalls: number; warning: string | null };

/**
 * Load the Stripe snapshot, profiles and gift redemptions, and run the
 * member-by-member comparison. Shared by the report route and the repair
 * actions so both see the same matching.
 *
 * Returns null when there's no Stripe snapshot yet.
 */
export async function loadMemberReconciliation(
  supabase: SupabaseClient,
): Promise<{ result: ReconResult; snapshot: SnapshotMeta } | null> {
  const { data: snapshot, error: snapshotError } = await supabase
    .from("stripe_subscriptions_cache")
    .select("subscriptions_json, fetched_at, subscription_count, api_calls, warning")
    .eq("id", SUBSCRIPTION_SNAPSHOT_ID)
    .maybeSingle();
  if (snapshotError) throw new Error(`Failed to read the Stripe snapshot: ${snapshotError.message}`);
  if (!snapshot) return null;

  const [profilesRes, giftsRes] = await Promise.all([
    fetchAllPages<ReconProfile>((from, to) =>
      supabase
        .from("profiles")
        .select("id, email, full_name, membership_level, subscription_status, stripe_customer_id, is_admin, comped_at")
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
  if (profilesRes.error) throw new Error(`Failed to load profiles: ${profilesRes.error.message}`);
  if (giftsRes.error) throw new Error(`Failed to load gift codes: ${giftsRes.error.message}`);

  const result = reconcileMembers({
    subs: (snapshot.subscriptions_json ?? []) as StripeSubRecord[],
    profiles: profilesRes.data,
    giftUserIds: new Set(giftsRes.data.map((g) => g.redeemed_by_user_id).filter((id): id is string => !!id)),
  });

  return {
    result,
    snapshot: {
      fetchedAt: snapshot.fetched_at,
      subscriptionCount: snapshot.subscription_count,
      apiCalls: snapshot.api_calls,
      warning: snapshot.warning,
    },
  };
}
