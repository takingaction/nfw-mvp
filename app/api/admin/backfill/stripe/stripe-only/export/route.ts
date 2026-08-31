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

    // Check for cached export data from the main stripe-only endpoint
    const cachedData = (global as any).__stripeOnlyExportData;
    
    if (!cachedData) {
      return NextResponse.json(
        { error: "No cached data. Please click 'Generate CSV' button first and wait for it to complete." },
        { status: 400 }
      );
    }

    // Check if cache is older than 10 minutes
    const TEN_MINUTES = 10 * 60 * 1000;
    if (Date.now() - cachedData.generatedAt > TEN_MINUTES) {
      return NextResponse.json(
        { error: "Cache expired. Please click 'Generate CSV' button again." },
        { status: 400 }
      );
    }

    const { charges } = cachedData;

    // Build CSV
    const headers = [
      "Email",
      "Name",
      "Charge ID",
      "Customer ID",
      "Amount",
      "Currency",
      "Date",
    ];

    const rows = charges.map((c: any) => [
      c.email || "",
      c.name || "",
      c.charge_id,
      c.customer_id,
      c.amount.toFixed(2),
      c.currency,
      c.created,
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