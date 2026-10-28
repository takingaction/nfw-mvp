import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

import { SITE_TZ } from "@/lib/dates";
const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Request parameter required by Next.js but we don't use it
  void request;

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

    // Get all backfill status rows with profile info - PAGINATED
    const allRows: any[] = [];
    let pageStart = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: rowsPage, error } = await supabaseAdmin
        .from("stripe_backfill_status")
        .select(`
          id,
          email,
          status,
          stripe_customer_id,
          profile_id,
          error_message,
          processed_at,
          profiles!inner(
            full_name,
            membership_level
          )
        `)
        .order("processed_at", { ascending: false })
        .range(pageStart, pageStart + pageSize - 1);

      if (error) {
        console.error("[backfill/export] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (rowsPage && rowsPage.length > 0) {
        allRows.push(...rowsPage);
        pageStart += pageSize;
      }
      hasMore = rowsPage && rowsPage.length === pageSize;
    }

    // Lifetime value is computed from membership_payments (the single source
    // of truth since Aug 2026); stripe_backfill_status.lifetime_value is no
    // longer written. Net value: refunds are negative 'refunded' rows.
    const lifetimeByUser = new Map<string, number>();
    let payStart = 0;
    for (;;) {
      const { data: payPage, error: payError } = await supabaseAdmin
        .from("membership_payments")
        .select("user_id, amount")
        .in("status", ["succeeded", "refunded"])
        .order("id", { ascending: true })
        .range(payStart, payStart + pageSize - 1);
      if (payError) {
        console.error("[backfill/export] payments error:", payError);
        return NextResponse.json({ error: payError.message }, { status: 500 });
      }
      if (!payPage || payPage.length === 0) break;
      for (const p of payPage as { user_id: string; amount: number | string }[]) {
        lifetimeByUser.set(p.user_id, (lifetimeByUser.get(p.user_id) || 0) + Number(p.amount || 0));
      }
      if (payPage.length < pageSize) break;
      payStart += pageSize;
    }

    // Build CSV
    const headers = [
      "Email",
      "Full Name",
      "Membership Level",
      "Status",
      "Lifetime Value",
      "Stripe Customer ID",
      "Processed At",
      "Error Message"
    ];

    const csvRows = [headers.join(",")];

    for (const row of allRows) {
      const profiles = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const values = [
        row.email || "",
        profiles?.full_name || "",
        profiles?.membership_level || "",
        row.status || "",
        row.profile_id ? (lifetimeByUser.get(row.profile_id) || 0).toFixed(2) : "",
        row.stripe_customer_id || "",
        row.processed_at ? new Date(row.processed_at).toLocaleDateString(undefined, { timeZone: SITE_TZ }) : "",
        row.error_message || ""
      ];
      // Escape values with commas or quotes
      const escaped = values.map((v: string) => {
        const str = String(v);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
      });
      csvRows.push(escaped.join(","));
    }

    const csv = csvRows.join("\n");
    const date = new Date().toISOString().split("T")[0];

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="stripe-backfill-status-${date}.csv"`,
      },
    });

  } catch (error) {
    console.error("[backfill/export] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export" },
      { status: 500 }
    );
  }
}