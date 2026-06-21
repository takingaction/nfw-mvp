import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const currentPath = searchParams.get("path") || "/";

    const supabase = await createClient();

    const now = new Date().toISOString();

    const { data: popups, error } = await supabase
      .from("promotional_popups")
      .select("*")
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const activePopups = (popups || []).filter((popup) => {
      const targets = popup.target_pages || [];
      return targets.includes("*") || targets.includes(currentPath);
    });

    return NextResponse.json({ popups: activePopups });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
