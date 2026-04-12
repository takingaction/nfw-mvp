import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "all";
  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = supabaseAdmin
    .from("gift_membership_codes")
    .select(`
      id,
      code,
      created_at,
      redeemed_at,
      redeemed_by_email,
      purchase: gift_membership_purchases (
        id,
        buyer_name,
        buyer_email,
        quantity,
        total_amount,
        created_at
      )
    `, { count: "exact" });

  if (status === "redeemed") {
    query = query.not("redeemed_at", "is", null);
  } else if (status === "unredeemed") {
    query = query.is("redeemed_at", null);
  }

  if (search) {
    query = query.or(
      `code.ilike.%${search}%,redeemed_by_email.ilike.%${search}%,purchase.buyer_email.ilike.%${search}%`,
    );
  }

  const { data: codes, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error("Error fetching gift codes:", error);
    return NextResponse.json({ error: "Failed to fetch codes" }, { status: 500 });
  }

  const totalPages = Math.ceil((count || 0) / limit);

  const stats = await getStats();

  return NextResponse.json({
    codes,
    pagination: {
      page,
      limit,
      total: count,
      totalPages,
    },
    stats,
  });
}

async function getStats() {
  const { count: totalCodes } = await supabaseAdmin
    .from("gift_membership_codes")
    .select("*", { count: "exact", head: true });

  const { count: redeemedCodes } = await supabaseAdmin
    .from("gift_membership_codes")
    .select("*", { count: "exact", head: true })
    .not("redeemed_at", "is", null);

  const { count: purchases } = await supabaseAdmin
    .from("gift_membership_purchases")
    .select("*", { count: "exact", head: true });

  const { data: totalRevenue } = await supabaseAdmin
    .from("gift_membership_purchases")
    .select("total_amount");

  const revenue = totalRevenue?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0;

  return {
    totalCodes: totalCodes || 0,
    redeemedCodes: redeemedCodes || 0,
    unredeemedCodes: (totalCodes || 0) - (redeemedCodes || 0),
    totalPurchases: purchases || 0,
    totalRevenue: revenue,
  };
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";

  const { data: codes } = await supabaseAdmin
    .from("gift_membership_codes")
    .select(`
      id,
      code,
      created_at,
      redeemed_at,
      redeemed_by_email,
      purchase: gift_membership_purchases (
        buyer_name,
        buyer_email,
        quantity,
        total_amount,
        created_at
      )
    `)
    .order("created_at", { ascending: false });

  if (format === "csv") {
    const headers = ["Code", "Buyer Name", "Buyer Email", "Quantity", "Total Amount", "Created At", "Redeemed At", "Redeemed By Email", "Status"];
    const rows = codes?.map((c: any) => [
      c.code,
      c.purchase?.buyer_name || "",
      c.purchase?.buyer_email || "",
      c.purchase?.quantity || "",
      c.purchase?.total_amount ? `$${(c.purchase.total_amount / 100).toFixed(2)}` : "",
      c.created_at ? new Date(c.created_at).toISOString() : "",
      c.redeemed_at ? new Date(c.redeemed_at).toISOString() : "",
      c.redeemed_by_email || "",
      c.redeemed_at ? "Redeemed" : "Unredeemed",
    ]);

    const csv = [headers.join(","), ...(rows || []).map((r: string[]) => r.map((v) => `"${v}"`).join(","))].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=gift-codes.csv",
      },
    });
  }

  return NextResponse.json({ codes });
}