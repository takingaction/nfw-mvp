import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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

    // Fetch database-only data
    const databaseOnlyRes = await fetch(
      new URL("/api/admin/backfill/stripe/database-only", request.url),
      {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
      }
    );

    if (!databaseOnlyRes.ok) {
      return NextResponse.json({ error: "Failed to fetch Database Only data" }, { status: 500 });
    }

    const { payments, count, total } = await databaseOnlyRes.json();

    // Build CSV
    const headers = [
      "Payment ID",
      "Stripe Payment ID",
      "Email",
      "User ID",
      "Amount",
      "Created At",
      "Issue",
      "Stripe Status",
    ];

    const rows = payments.map((p: any) => [
      p.id,
      p.stripe_payment_id || "",
      p.email,
      p.user_id,
      p.amount.toFixed(2),
      p.created_at,
      p.issue,
      p.stripe_status || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((r: string[]) => r.map(field => `"${field}"`).join(",")),
    ].join("\n");

    const date = new Date().toISOString().split("T")[0];
    const filename = `nfw-database-only-${date}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });

  } catch (error: any) {
    console.error("[database-only/export] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to export CSV" },
      { status: 500 }
    );
  }
}