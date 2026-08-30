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

    // Get counts by status - PAGINATED
    const allStatusRows: Array<{status: string; email: string}> = [];
    let statusPageStart = 0;
    const statusPageSize = 1000;
    let statusHasMore = true;

    while (statusHasMore) {
      const { data: statusPage } = await supabaseAdmin
        .from("stripe_backfill_status")
        .select("status, email")
        .range(statusPageStart, statusPageStart + statusPageSize - 1);

      if (statusPage && statusPage.length > 0) {
        allStatusRows.push(...statusPage);
        statusPageStart += statusPageSize;
      }
      statusHasMore = !!(statusPage && statusPage.length === statusPageSize);
    }

    const counts = {
      totalRows: allStatusRows.length || 0,
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

    for (const row of allStatusRows) {
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

    // Get orphan count (NULL profile_id) and duplicate info - PAGINATED
    const allBackfillRows: Array<{id: string; email: string; profile_id: string | null}> = [];
    let backfillPageStart = 0;
    const backfillPageSize = 1000;
    let backfillHasMore = true;

    while (backfillHasMore) {
      const { data: backfillPage } = await supabaseAdmin
        .from("stripe_backfill_status")
        .select("id, email, profile_id")
        .range(backfillPageStart, backfillPageStart + backfillPageSize - 1);

      if (backfillPage && backfillPage.length > 0) {
        allBackfillRows.push(...backfillPage);
        backfillPageStart += backfillPageSize;
      }
      backfillHasMore = !!(backfillPage && backfillPage.length === backfillPageSize);
    }

    const nullProfileIdCount = allBackfillRows.filter(r => !r.profile_id).length;
    const emails = allBackfillRows.map(r => r.email);
    const emailSet = new Set(emails);
    const duplicateEmailCount = emails.length - emailSet.size;

    // Get latest rows (most recent first) - PAGINATED
    const allLatestRows: any[] = [];
    let latestPageStart = 0;
    const latestPageSize = 1000;
    let latestHasMore = true;

    while (latestHasMore) {
      const { data: latestPage } = await supabaseAdmin
        .from("stripe_backfill_status")
        .select(`
          id,
          email,
          profile_id,
          status,
          stripe_customer_id,
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
            membership_level,
            profile_completed,
            free_membership_contact_submitted,
            is_approved_free_member,
            is_admin,
            signup_source
          )
        `)
        .order("processed_at", { ascending: false })
        .range(latestPageStart, latestPageStart + latestPageSize - 1);

      if (latestPage && latestPage.length > 0) {
        allLatestRows.push(...latestPage);
        latestPageStart += latestPageSize;
      }
      latestHasMore = !!(latestPage && latestPage.length === latestPageSize);
    }

    // Get total profiles that should be backfilled (for progress calculation)
    const { count: totalToBackfill } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("signup_source", "stripe")
      .is("stripe_customer_id", null)
      .in("membership_level", ["contributing", "founding"]);

    // Get all backfill emails - PAGINATED
    const allBackfillEmails: Array<{email: string}> = [];
    let emailPageStart = 0;
    const emailPageSize = 1000;
    let emailHasMore = true;

    while (emailHasMore) {
      const { data: emailPage } = await supabaseAdmin
        .from("stripe_backfill_status")
        .select("email")
        .range(emailPageStart, emailPageStart + emailPageSize - 1);

      if (emailPage && emailPage.length > 0) {
        allBackfillEmails.push(...emailPage);
        emailPageStart += emailPageSize;
      }
      emailHasMore = !!(emailPage && emailPage.length === emailPageSize);
    }

    const backfillEmailSet = new Set(allBackfillEmails.map(r => r.email));

    // Get all profiles - PAGINATED
    const allProfilesForUnmatched: Array<{email: string; id: string}> = [];
    let profilesPageStart = 0;
    const profilesPageSize = 1000;
    let profilesHasMore = true;

    while (profilesHasMore) {
      const { data: profilesPage } = await supabaseAdmin
        .from("profiles")
        .select("email, id")
        .range(profilesPageStart, profilesPageStart + profilesPageSize - 1);

      if (profilesPage && profilesPage.length > 0) {
        allProfilesForUnmatched.push(...profilesPage);
        profilesPageStart += profilesPageSize;
      }
      profilesHasMore = !!(profilesPage && profilesPage.length === profilesPageSize);
    }

    const profileEmailToId = new Map(
      allProfilesForUnmatched.map(p => [p.email, p.id])
    );

    // Get all membership payments - PAGINATED
    const allPayments: Array<{user_id: string; amount: number}> = [];
    let paymentsPageStart = 0;
    const paymentsPageSize = 1000;
    let paymentsHasMore = true;

    while (paymentsHasMore) {
      const { data: paymentsPage } = await supabaseAdmin
        .from("membership_payments")
        .select("user_id, amount")
        .in("amount", [15, 100])
        .range(paymentsPageStart, paymentsPageStart + paymentsPageSize - 1);

      if (paymentsPage && paymentsPage.length > 0) {
        allPayments.push(...paymentsPage);
        paymentsPageStart += paymentsPageSize;
      }
      paymentsHasMore = !!(paymentsPage && paymentsPage.length === paymentsPageSize);
    }

    const unmatchedPaymentsList: Array<{email: string, user_id: string, amount: number}> = [];
    const processedUserEmails = new Set<string>();

    for (const payment of allPayments) {
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

    // Compute lifetime_value for each row from membership_payments
    const paymentsByUserId = new Map<string, number>();
    for (const payment of allPayments) {
      const current = paymentsByUserId.get(payment.user_id) || 0;
      paymentsByUserId.set(payment.user_id, current + (payment.amount || 0));
    }

    // Add lifetime_value to each row
    const rowsWithLifetimeValue = allLatestRows.map(row => ({
      ...row,
      lifetime_value: paymentsByUserId.get(row.profile_id) || 0,
    }));

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
      rows: rowsWithLifetimeValue,
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
