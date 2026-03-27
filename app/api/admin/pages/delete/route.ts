import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function DELETE(request: Request) {
  try {
    const { pageId } = await request.json();

    if (!pageId?.trim()) {
      return NextResponse.json(
        { error: "Page ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("pages")
      .delete()
      .eq("id", pageId);

    if (error) {
      console.error("Error deleting page:", error);
      return NextResponse.json(
        { error: "Failed to delete page" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete page error:", error);
    return NextResponse.json(
      { error: "Failed to delete page" },
      { status: 500 }
    );
  }
}
