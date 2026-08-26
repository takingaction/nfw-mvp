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

    // Get all duplicate emails (emails that appear more than once)
    const { data: allRows, error } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select(`
        id,
        email,
        status,
        stripe_customer_id,
        profile_id,
        processed_at,
        error_message,
        profiles!inner(
          full_name,
          membership_level
        )
      `)
      .order("processed_at", { ascending: false });

    if (error) {
      console.error("[duplicates] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get all payments to compute lifetime_value per user
    const { data: allPayments } = await supabaseAdmin
      .from("membership_payments")
      .select(`user_id, amount`);

    // Compute lifetime_value per user_id
    const lifetimeValueByUserId = new Map<string, number>();
    for (const payment of allPayments || []) {
      const current = lifetimeValueByUserId.get(payment.user_id) || 0;
      lifetimeValueByUserId.set(payment.user_id, current + (payment.amount || 0));
    }

    // Group by email and find duplicates
    const emailMap = new Map<string, typeof allRows>();
    for (const row of allRows || []) {
      const email = row.email.toLowerCase();
      if (!emailMap.has(email)) {
        emailMap.set(email, []);
      }
      emailMap.get(email)!.push(row);
    }

    // Filter to only emails with duplicates (count > 1)
    const duplicates: Array<{
      email: string;
      count: number;
      rows: Array<{
        id: string;
        status: string;
        stripe_customer_id: string | null;
        lifetime_value: number | null;
        processed_at: string | null;
        error_message: string | null;
        full_name: string | null;
        membership_level: string | null;
      }>;
    }> = [];

    for (const [email, rows] of emailMap) {
      if (rows.length > 1) {
        duplicates.push({
          email,
          count: rows.length,
          rows: rows.map(r => ({
            id: r.id,
            status: r.status,
            stripe_customer_id: r.stripe_customer_id,
            lifetime_value: lifetimeValueByUserId.get(r.profile_id) || 0,
            processed_at: r.processed_at,
            error_message: r.error_message,
            full_name: (r as any).profiles?.full_name || null,
            membership_level: (r as any).profiles?.membership_level || null,
          })),
        });
      }
    }

    // Sort by count descending
    duplicates.sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      totalDuplicates: duplicates.reduce((sum, d) => sum + d.count, 0),
      uniqueEmailsWithDuplicates: duplicates.length,
      duplicates,
    });

  } catch (error) {
    console.error("[duplicates] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
