import { NextResponse } from "next/server";
import Stripe from "stripe";
import getAdminClient from "@/lib/supabase/admin";
import { fetchAllPages } from "@/lib/supabase-paginate";
import { findOtherLiveSubscriptions, markMembershipCancelled } from "@/lib/membership-end";

/**
 * Cron (daily): end paid memberships whose period is over.
 *
 * 1. Gift memberships past subscription_ends_at (redeem_gift_code sets it,
 *    usually 12 months out). They have no Stripe subscription, so nothing
 *    else would ever end them.
 * 2. Safety net for paid members still `canceling` more than 2 days after
 *    their end date: normally Stripe's customer.subscription.deleted webhook
 *    ends them on the day. Stripe is checked first, so a member who
 *    re-subscribed or reactivated is left alone.
 *
 * Ended members become membership_level 'cancelled' (dashboard only); see
 * lib/membership-end.ts. Schedule: vercel.json.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const WEBHOOK_GRACE_MS = 2 * 24 * 60 * 60 * 1000;

type Candidate = {
  id: string;
  email: string | null;
  stripe_customer_id: string | null;
  subscription_status: string | null;
  subscription_ends_at: string;
};

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdminClient();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });
  const now = Date.now();

  const [candidatesRes, giftsRes] = await Promise.all([
    fetchAllPages<Candidate>((from, to) =>
      admin
        .from("profiles")
        .select("id, email, stripe_customer_id, subscription_status, subscription_ends_at")
        .in("membership_level", ["contributing", "founding"])
        .not("subscription_ends_at", "is", null)
        .lt("subscription_ends_at", new Date(now).toISOString())
        .order("id")
        .range(from, to),
    ),
    fetchAllPages<{ redeemed_by_user_id: string | null }>((from, to) =>
      admin
        .from("gift_membership_codes")
        .select("redeemed_by_user_id")
        .not("redeemed_by_user_id", "is", null)
        .order("id")
        .range(from, to),
    ),
  ]);
  if (candidatesRes.error || giftsRes.error) {
    console.error("[expire-memberships] read failed:", candidatesRes.error ?? giftsRes.error);
    return NextResponse.json({ error: "read failed" }, { status: 500 });
  }
  const giftUserIds = new Set(giftsRes.data.map((g) => g.redeemed_by_user_id));

  const results = { ended: [] as string[], kept: [] as string[], skipped: [] as string[], errors: [] as string[] };

  for (const p of candidatesRes.data) {
    const endsAt = new Date(p.subscription_ends_at);
    const isGift = giftUserIds.has(p.id);
    // Paid (non-gift) members are only ended here after the webhook had its
    // chance; their end date is otherwise Stripe's to act on.
    if (!isGift && (p.subscription_status !== "canceling" || now - endsAt.getTime() < WEBHOOK_GRACE_MS)) {
      results.skipped.push(p.id);
      continue;
    }
    try {
      const live = await findOtherLiveSubscriptions(stripe, { customerIds: [p.stripe_customer_id], email: p.email });
      if (live.length > 0) {
        results.kept.push(p.id);
        continue;
      }
      const { changed } = await markMembershipCancelled(admin, p.id, endsAt);
      (changed ? results.ended : results.skipped).push(p.id);
    } catch (err) {
      console.error("[expire-memberships] failed for", p.id, err);
      results.errors.push(p.id);
    }
  }

  console.log(
    `[expire-memberships] ended ${results.ended.length}, kept (live Stripe subscription) ${results.kept.length}, ` +
      `skipped ${results.skipped.length}, errors ${results.errors.length}`,
  );
  return NextResponse.json({
    ended: results.ended.length,
    kept: results.kept.length,
    skipped: results.skipped.length,
    errors: results.errors.length,
  });
}
