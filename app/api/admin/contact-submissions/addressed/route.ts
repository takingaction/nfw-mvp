import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const { id } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Missing submission ID" }, { status: 400 });
    }

    // Mark as addressed
    const { error: updateError } = await supabaseAdmin
      .from("contact_submissions")
      .update({ addressed: true })
      .eq("id", id);

    if (updateError) {
      console.error("[contact-submissions/addressed] Failed to update:", updateError);
      return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact-submissions/addressed] Error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
