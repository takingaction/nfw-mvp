import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const { searchParams } = new URL(request.url);
    const tier = searchParams.get("tier") || "contributing"; // contributing or founding

    const amount = tier === "contributing" ? 15 : 100;

    // Get all payments for this tier
    const { data: payments, error } = await supabase
      .from("membership_payments")
      .select(`
        user_id,
        id,
        amount,
        payment_type,
        stripe_payment_id,
        stripe_invoice_id,
        created_at,
        profiles!inner(email, full_name)
      `)
      .eq("amount", amount)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[export-our-db] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unique users
    const userMap = new Map<string, any>();
    for (const p of payments || []) {
      const row = p as any;
      // profiles is an array when using join syntax
      const profiles = row.profiles;
      const email = Array.isArray(profiles) ? profiles[0]?.email : profiles?.email;
      if (email && !userMap.has(row.user_id)) {
        userMap.set(row.user_id, {
          email,
          full_name: Array.isArray(profiles) ? profiles[0]?.full_name : profiles?.full_name,
          payment_count: 0,
          total_amount: 0,
          payment_type: row.payment_type,
          last_payment_date: row.created_at,
        });
      }
      if (email) {
        const user = userMap.get(row.user_id)!;
        user.payment_count++;
        user.total_amount += row.amount;
      }
    }

    // Build CSV
    const csvRows: string[] = [];
    csvRows.push("Email,Full Name,Payment Count,Total Amount,Payment Type,Last Payment Date");

    for (const user of userMap.values()) {
      csvRows.push(`"${user.email}","${user.full_name || ""}","${user.payment_count}","${user.total_amount}","${user.payment_type}","${user.last_payment_date}"`);
    }

    const csv = csvRows.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="our-db-${tier}.csv"`,
      },
    });

  } catch (error: any) {
    console.error("[export-our-db] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export" },
      { status: 500 }
    );
  }
}