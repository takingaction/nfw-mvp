import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

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

    const { id: cycleId } = await params;

    // Get all grants in this cycle with their first reviewer scores
    const { data: grantsWithScores } = await supabaseAdmin
      .from("grants")
      .select(`
        id,
        rachel_complete,
        grant_scores!left(reviewer_name, total_score, needs_discussion)
      `)
      .eq("cycle_id", cycleId);

    if (!grantsWithScores || grantsWithScores.length === 0) {
      return NextResponse.json({ error: "No grants found" }, { status: 404 });
    }

    // Filter to only grants that second reviewer should score:
    // - First reviewer completed (rachel_complete = true), AND
    // - First score >= 7 OR first reviewer flagged
    const filteredGrantIds = grantsWithScores
      .filter((g: any) => {
        if (!g.rachel_complete) return false;
        const firstScore = g.grant_scores?.find((s: any) => s.reviewer_name === "first");
        if (!firstScore) return false;
        const totalScore = firstScore.total_score || 0;
        const wasFlagged = firstScore.needs_discussion === true;
        return totalScore >= 7 || wasFlagged;
      })
      .map((g: any) => g.id);

    if (filteredGrantIds.length === 0) {
      return NextResponse.json({ error: "No grants in scope for second review" }, { status: 400 });
    }

    // Check if all filtered grants have been scored by second reviewer
    const { data: scores } = await supabaseAdmin
      .from("grant_scores")
      .select("grant_id, is_complete")
      .eq("reviewer_name", "second")
      .in("grant_id", filteredGrantIds);

    const allScored = filteredGrantIds.every((gid: string) =>
      scores?.some((s: any) => s.grant_id === gid && s.is_complete === true)
    );

    if (!allScored) {
      const incompleteCount = filteredGrantIds.filter((gid: string) =>
        !scores?.some((s: any) => s.grant_id === gid && s.is_complete === true)
      ).length;
      return NextResponse.json({
        error: `${incompleteCount} application(s) have not been scored yet`,
        incomplete_count: incompleteCount,
      }, { status: 400 });
    }

    // Set michelle_complete = true on ALL grants in this cycle
    const { error: updateError } = await supabaseAdmin
      .from("grants")
      .update({ michelle_complete: true })
      .eq("cycle_id", cycleId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
