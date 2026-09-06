import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    // Admin auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get sync status from stripe_backfill_status - with pagination
    const rows: any[] = [];
    let ssPage = 0;
    const ssPageSize = 1000;
    let ssHasMore = true;

    while (ssHasMore) {
      const { data: batch, error } = await supabaseAdmin
        .from("stripe_backfill_status")
        .select(`
          id,
          stripe_customer_id,
          payment_sync_at,
          customer_processed_at,
          payment_count,
          total_amount,
          has_failed,
          has_refunded,
          latest_payment_status
        `)
        .eq("status", "matched")
        .not("stripe_customer_id", "is", null)
        .range(ssPage * ssPageSize, (ssPage + 1) * ssPageSize - 1);

      if (error) {
        console.error("[sync-status] Error fetching rows:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (batch && batch.length > 0) {
        rows.push(...batch);
        ssPage++;
        ssHasMore = batch.length === ssPageSize;
      } else {
        ssHasMore = false;
      }
    }

    // Calculate stats
    const total = rows?.length || 0;
    const synced = rows?.filter(r => r.payment_sync_at).length || 0;
    const notSynced = total - synced;
    const withPayments = rows?.filter(r => r.payment_count && r.payment_count > 0).length || 0;
    const withFailed = rows?.filter(r => r.has_failed).length || 0;
    const withRefunded = rows?.filter(r => r.has_refunded).length || 0;

    // Get most recent sync time
    let lastSyncAt: string | null = null;
    for (const row of rows || []) {
      if (row.payment_sync_at) {
        if (!lastSyncAt || new Date(row.payment_sync_at) > new Date(lastSyncAt)) {
          lastSyncAt = row.payment_sync_at;
        }
      }
    }

    // Get sync in progress - check if any rows were updated in the last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const syncInProgress = rows?.some(
      r => r.customer_processed_at && new Date(r.customer_processed_at) > new Date(fiveMinutesAgo)
    ) || false;

    // Get breakdown by payment status
    const statusBreakdown: Record<string, number> = {};
    for (const row of rows || []) {
      const status = row.latest_payment_status || "unknown";
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    }

    return NextResponse.json({
      total,
      synced,
      not_synced: notSynced,
      with_payments: withPayments,
      with_failed: withFailed,
      with_refunded: withRefunded,
      last_sync_at: lastSyncAt,
      sync_in_progress: syncInProgress,
      status_breakdown: statusBreakdown,
    });

  } catch (error: any) {
    console.error("[sync-status] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get sync status" },
      { status: 500 }
    );
  }
}
