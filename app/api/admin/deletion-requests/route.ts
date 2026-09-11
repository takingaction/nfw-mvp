import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status"); // pending, verified, processed, cancelled

    let query = supabaseAdmin
      .from("deletion_requests")
      .select(`
        *,
        profile:profiles!deletion_requests_user_id_fkey(
          id,
          full_name,
          email,
          membership_level,
          subscription_status
        )
      `)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[admin/deletion-requests] Fetch error:", error);
      return NextResponse.json(
        { error: "Failed to fetch deletion requests" },
        { status: 500 }
      );
    }

    return NextResponse.json({ requests: data || [] });
  } catch (error: any) {
    console.error("[admin/deletion-requests] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
