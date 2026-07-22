import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let orderedIds: string[];
    try {
      const body = await request.json();
      orderedIds = body.orderedIds;
    } catch (e: any) {
      console.error("[items/reorder] JSON parse error:", e);
      return NextResponse.json({ error: "Invalid JSON: " + e.message }, { status: 400 });
    }

    if (!orderedIds || !Array.isArray(orderedIds)) {
      return NextResponse.json({ error: "orderedIds must be an array" }, { status: 400 });
    }

    console.log("[items/reorder] Processing", orderedIds.length, "items");
    console.log("[items/reorder] First item ID:", orderedIds[0]);

    // Update display_order for each item using individual updates
    for (let i = 0; i < orderedIds.length; i++) {
      const itemId = orderedIds[i];
      console.log("[items/reorder] Updating item", itemId, "to order", i);
      
      const { error } = await supabaseAdmin
        .from("perk_collection_items")
        .update({ display_order: i })
        .eq("id", itemId);
      
      if (error) {
        console.error("[items/reorder] Error updating item", itemId, error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    console.log("[items/reorder] All items updated successfully");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
