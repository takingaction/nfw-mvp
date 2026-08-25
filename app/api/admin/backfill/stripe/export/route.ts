import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

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

    // Get all backfill status rows with profile info
    const { data: rows, error } = await supabaseAdmin
      .from("stripe_backfill_status")
      .select(`
        id,
        email,
        status,
        stripe_customer_id,
        lifetime_value,
        error_message,
        processed_at,
        profiles!inner(
          full_name,
          membership_level
        )
      `)
      .order("processed_at", { ascending: false });

    if (error) {
      console.error("[backfill/export] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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

    for (const row of rows || []) {
      const profiles = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
      const values = [
        row.email || "",
        profiles?.full_name || "",
        profiles?.membership_level || "",
        row.status || "",
        row.lifetime_value != null ? row.lifetime_value.toFixed(2) : "",
        row.stripe_customer_id || "",
        row.processed_at ? new Date(row.processed_at).toLocaleDateString() : "",
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