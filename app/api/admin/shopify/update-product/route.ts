import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const { shopify_product_id, updates } = await request.json();

    if (!shopify_product_id) {
      return NextResponse.json({ error: "Missing product ID" }, { status: 400 });
    }

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Missing updates" }, { status: 400 });
    }

    const allowedFields = ["mvp_visibility", "eligibility_tiers", "display_order", "featured_order", "card_description"];
    const sanitizedUpdates: Record<string, unknown> = {};

    for (const key of allowedFields) {
      if (key in updates) {
        (sanitizedUpdates as Record<string, unknown>)[key] = updates[key];
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("shopify_product_mappings")
      .update(sanitizedUpdates)
      .eq("shopify_product_id", shopify_product_id);

    if (error) {
      console.error("Error updating product mapping:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in update-product:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}
