import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    await requireAdmin();

    const { data: cycles, error } = await supabaseAdmin
      .from("grant_cycles")
      .select("id, cycle_name, featured_image")
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching cycles:", error);
      return NextResponse.json({ error: "Failed to fetch cycles" }, { status: 500 });
    }

    return NextResponse.json({ cycles });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
