import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireGrantsAccess } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireGrantsAccess();
    if (!auth.authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!auth.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: cycleId } = await params;
    const body = await request.json();
    const { grantId, action } = body as {
      grantId?: string;
      action?: "skip" | "restore";
    };

    if (!grantId || !action || !["skip", "restore"].includes(action)) {
      return NextResponse.json(
        { error: "Missing or invalid grantId/action" },
        { status: 400 },
      );
    }

    // Confirm the grant belongs to this cycle
    const { data: grant, error: grantError } = await supabaseAdmin
      .from("grants")
      .select("id, status, cycle_id")
      .eq("id", grantId)
      .eq("cycle_id", cycleId)
      .single();

    if (grantError || !grant) {
      return NextResponse.json(
        { error: "Grant not found in this cycle" },
        { status: 404 },
      );
    }

    if (action === "skip") {
      const { error: updateError } = await supabaseAdmin
        .from("grants")
        .update({
          status: "not_approved",
          reviewed_at: new Date().toISOString(),
          ai_invalidated_at: new Date().toISOString(),
          ai_invalidated_by: auth.user.id,
        })
        .eq("id", grantId);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        action: "skip",
        grantId,
        invalidatedBy: auth.user.id,
      });
    }

    // action === "restore"
    const { error: restoreError } = await supabaseAdmin
      .from("grants")
      .update({
        status: "submitted",
        reviewed_at: null,
        ai_invalidated_at: null,
        ai_invalidated_by: null,
      })
      .eq("id", grantId);

    if (restoreError) {
      return NextResponse.json(
        { error: restoreError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      action: "restore",
      grantId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
