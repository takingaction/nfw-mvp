import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const search = searchParams.get("q");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = 20;
    const offset = (page - 1) * perPage;

    let query = supabaseAdmin
      .from("contact_submissions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (status && status !== "all") {
      query = query.eq("freshdesk_status", status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,message.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Failed to fetch contact submissions:", error);
      return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
    }

    return NextResponse.json({
      submissions: data || [],
      total: count || 0,
      page,
      perPage,
      totalPages: Math.ceil((count || 0) / perPage),
    });
  } catch (err) {
    console.error("Admin contact submissions error:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch submissions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}