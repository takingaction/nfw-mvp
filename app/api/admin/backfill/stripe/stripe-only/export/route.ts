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

    // Fetch stripe-only data
    const stripeOnlyRes = await fetch(
      new URL("/api/admin/backfill/stripe/stripe-only", request.url),
      {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      }
    );

    if (!stripeOnlyRes.ok) {
      return NextResponse.json({ error: "Failed to fetch Stripe Only data" }, { status: 500 });
    }

    const { charges, count, total } = await stripeOnlyRes.json();

    // Build CSV
    const headers = [
      "Charge ID",
      "Customer ID",
      "Email",
      "Amount",
      "Currency",
      "Date",
      "Matched By",
      "Profile ID",
    ];

    const rows = charges.map((c: any) => [
      c.charge_id,
      c.customer_id,
      c.email || "",
      c.amount.toFixed(2),
      c.currency,
      c.created,
      c.matched_by || "",
      c.profile_id || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((r: string[]) => r.map(field => `"${field}"`).join(",")),
    ].join("\n");

    const date = new Date().toISOString().split("T")[0];
    const filename = `nfw-stripe-only-${date}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error("[stripe-only/export] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export CSV" },
      { status: 500 }
    );
  }
}