import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: cycleId } = await params;

    // Confirm the cycle exists
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("id")
      .eq("id", cycleId)
      .single();

    if (!cycle) {
      return NextResponse.json(
        { error: "Grant cycle not found" },
        { status: 404 },
      );
    }

    // Clear only the 4 AI result columns. Reviewer skip decisions
    // (ai_invalidated_at, ai_invalidated_by) and grants.status are preserved.
    const { data, error } = await supabaseAdmin
      .from("grants")
      .update({
        ai_relevance: "not_evaluated",
        ai_reasoning: null,
        ai_evaluated_at: null,
        ai_model_version: null,
      })
      .eq("cycle_id", cycleId)
      .select("id");

    if (error) {
      console.error("[ai-reset] Update error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      totalReset: data?.length ?? 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
