import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Admin auth check
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", session.user.id)
      .single();

    if (!adminProfile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get counts by status (row counts - includes duplicates)
    const { data: statusCounts } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("status, email");

    const counts = {
      totalRows: statusCounts?.length || 0,
      pending: 0,
      processing: 0,
      matched: 0,
      not_found: 0,
      error: 0,
    };

    // Count distinct emails per status for accurate counts
    const emailCounts: Record<string, Set<string>> = {
      pending: new Set(),
      processing: new Set(),
      matched: new Set(),
      not_found: new Set(),
      error: new Set(),
    };

    for (const row of statusCounts || []) {
      if (row.status in emailCounts) {
        emailCounts[row.status].add(row.email);
      }
    }

    const distinctCounts = {
      total: emailCounts.matched.size + emailCounts.not_found.size + emailCounts.error.size + emailCounts.pending.size + emailCounts.processing.size,
      pending: emailCounts.pending.size,
      processing: emailCounts.processing.size,
      matched: emailCounts.matched.size,
      not_found: emailCounts.not_found.size,
      error: emailCounts.error.size,
    };

    // Get orphan count (NULL profile_id) and duplicate info
    const { data: allRows } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select("id, email, profile_id");

    const nullProfileIdCount = (allRows || []).filter(r => !r.profile_id).length;
    const emails = (allRows || []).map(r => r.email);
    const emailSet = new Set(emails);
    const duplicateEmailCount = emails.length - emailSet.size;

    // Get latest rows (most recent first)
    const { data: rows } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select(`
        id,
        email,
        status,
        stripe_customer_id,
        lifetime_value,
        error_message,
        processed_at,
        payment_count,
        total_amount,
        has_failed,
        has_refunded,
        latest_payment_date,
        latest_payment_status,
        latest_payment_amount,
        latest_payment_error,
        all_payments_json,
        payment_sync_at,
        profiles!inner(
          full_name,
          membership_level
        )
      `)
      .order("processed_at", { ascending: false });

    // Get total profiles that should be backfilled (for progress calculation)
    const { count: totalToBackfill } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("signup_source", "stripe")
      .is("stripe_customer_id", null)
      .in("membership_level", ["contributing", "founding"]);

    // Get unmatched payments (payments without matching backfill status) - THESE ARE ACTUAL PROBLEMS
    // These are users who have $15/$100 payments but aren't in stripe_backfill_status
    const { data: allBackfillEmails } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select(`email`);

    const backfillEmailSet = new Set((allBackfillEmails || []).map(r => r.email));

    const { data: profilesForUnmatched } = await supabaseAdmin
      .from("profiles")
      .select(`email, id`);

    const profileEmailToId = new Map(
      (profilesForUnmatched || []).map(p => [p.email, p.id])
    );

    const { data: payments } = await supabaseAdmin
      .from("membership_payments")
      .select(`user_id, amount`)
      .in("amount", [15, 100]);

    const unmatchedPaymentsList: Array<{email: string, user_id: string, amount: number}> = [];
    const processedUserEmails = new Set<string>();

    for (const payment of payments || []) {
      const profileEmail = Array.from(profileEmailToId.entries())
        .find(([, id]) => id === payment.user_id)?.[0];

      if (profileEmail && !backfillEmailSet.has(profileEmail) && !processedUserEmails.has(profileEmail)) {
        processedUserEmails.add(profileEmail);
        unmatchedPaymentsList.push({
          email: profileEmail,
          user_id: payment.user_id,
          amount: payment.amount,
        });
      }
    }

    // Note: matchedWithoutPayment is NOT a real problem - many members paid via gift code, cash, etc.
    // The reconciliation API (/reconcile) is the proper place to compare Stripe vs DB payments.
    // Here we only show actual data quality issues.

    return NextResponse.json({
      // Row counts (includes duplicates - for debugging)
      rowCounts: counts,
      // Distinct email counts (accurate for display)
      counts: distinctCounts,
      // Problem account counts
      problemAccounts: {
        orphaned: nullProfileIdCount,
        duplicates: duplicateEmailCount,
        unmatchedPayments: unmatchedPaymentsList.length,
      },
      // Detailed problem account lists
      unmatchedPaymentsList,
      rows: rows || [],
      totalToBackfill: totalToBackfill || 0,
      initialized: distinctCounts.total > 0 || distinctCounts.total === 0 && totalToBackfill === 0,
    });

  } catch (error: any) {
    console.error("[backfill/status] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get status" },
      { status: 500 }
    );
  }
}
