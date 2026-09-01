import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendSecondReviewerNotification } from "@/lib/email";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or reviewer
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin, is_reviewer")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin && !profile?.is_reviewer) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: cycleId } = await params;

    // Check if first scoring is complete for all grants
    const { data: grants } = await supabaseAdmin
      .from("grants")
      .select("id, rachel_complete")
      .eq("cycle_id", cycleId);

    if (!grants || grants.length === 0) {
      return NextResponse.json({ error: "No grants found" }, { status: 404 });
    }

    // Check if all grants have been scored (is_complete = true on grant_scores)
    const { data: scores } = await supabaseAdmin
      .from("grant_scores")
      .select("grant_id, is_complete")
      .eq("reviewer_name", "first")
      .in("grant_id", grants.map(g => g.id));

    const grantsWithScores = new Set(scores?.map(s => s.grant_id) || []);
    const allScored = grants.every(g => 
      scores?.some(s => s.grant_id === g.id && s.is_complete === true)
    );

    if (!allScored) {
      const incompleteCount = grants.filter(g => 
        !scores?.some(s => s.grant_id === g.id && s.is_complete === true)
      ).length;
      return NextResponse.json({
        error: `${incompleteCount} application(s) have not been scored yet`,
        incomplete_count: incompleteCount,
      }, { status: 400 });
    }

    // Set rachel_complete = true on ALL grants in this cycle
    const { error: updateError } = await supabaseAdmin
      .from("grants")
      .update({ rachel_complete: true })
      .eq("cycle_id", cycleId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update cycle scoring_completed_at
    const { error: cycleError } = await supabaseAdmin
      .from("grant_cycles")
      .update({ scoring_completed_at: new Date().toISOString() })
      .eq("id", cycleId);

    if (cycleError) {
      return NextResponse.json({ error: cycleError.message }, { status: 500 });
    }

    // Get cycle name for email
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("cycle_name")
      .eq("id", cycleId)
      .single();

    // Send notification email to Michelle
    await sendSecondReviewerNotification({
      cycleName: cycle?.cycle_name || "Grant Review",
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
