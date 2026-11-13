import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";
import { loadMemberReconciliation } from "@/lib/stripe-member-reconciliation-data";

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

  try {
    const loaded = await loadMemberReconciliation(getAdminClient());
    if (!loaded) {
      return NextResponse.json(
        { error: "No Stripe snapshot yet. Click Refresh to fetch subscriptions from Stripe.", requiresRefresh: true },
        { status: 503 },
      );
    }
    return NextResponse.json({ ...loaded.result, snapshot: loaded.snapshot });
  } catch (err) {
    console.error("[member-reconciliation] failed:", err);
    return NextResponse.json({ error: "Failed to build the comparison" }, { status: 500 });
  }
}
