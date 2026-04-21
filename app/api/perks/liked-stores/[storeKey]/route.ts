import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ storeKey: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { storeKey } = await params;

    if (!storeKey) {
      return NextResponse.json(
        { error: "storeKey is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("store_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("store_key", storeKey);

    if (error) {
      console.error("Error unliking store:", error);
      return NextResponse.json(
        { error: "Failed to unlike store" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unliking store:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
