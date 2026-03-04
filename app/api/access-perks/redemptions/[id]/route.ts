import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { status } = await request.json();

    if (!["active", "used", "expired", "archived"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("👤 Current user ID:", user.id);
    console.log("🎯 Redemption ID to update:", id);
    console.log("📝 New status:", status);

    const { data, error } = await supabase
      .from("offer_redemptions")
      .update({ status })
      .eq("id", id)
      .eq("user_id", user.id)
      .select();

    if (error) {
      console.error("❌ Update failed:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      console.error(
        "❌ No rows updated - redemption not found or unauthorized",
      );
      return NextResponse.json(
        { error: "Redemption not found or unauthorized" },
        { status: 404 },
      );
    }

    console.log("✅ Updated successfully:", data[0]);

    return NextResponse.json({ redemption: data[0] });
  } catch (error: any) {
    console.error("❌ Update redemption error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
