import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(
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

    // Get cycle info
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("*, grant_tentative_approvals(grant_id, is_approved)")
      .eq("id", cycleId)
      .single();

    if (!cycle) {
      return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    }

    // Get all grants with all scores
    const { data: grants } = await supabaseAdmin
      .from("grants")
      .select(`
        id,
        user_id,
        who_are_you,
        biggest_challenge,
        fund_usage,
        is_nominating,
        nominee_name,
        nominee_email,
        status,
        submitted_at,
        profiles:user_id (full_name, email, city, state),
        grant_scores (reviewer_name, urgency_score, authenticity_score, impact_score, barriers_yn, needs_discussion, discussion_notes, total_score)
      `)
      .eq("cycle_id", cycleId)
      .order("submitted_at", { ascending: false });

    // Combine scores and calculate combined totals
    const grantsWithCombinedScores = grants?.map((g) => {
      const firstScore = g.grant_scores?.find((s: any) => s.reviewer_name === "first");
      const secondScore = g.grant_scores?.find((s: any) => s.reviewer_name === "second");

      const firstTotal = firstScore?.total_score || 0;
      const secondTotal = secondScore?.total_score || 0;
      const combinedScore = firstTotal + secondTotal;

      // Determine decision band
      let decision = "Not Approved";
      if (combinedScore >= 14) {
        decision = "Approved";
      } else if (combinedScore >= 8) {
        decision = "Runner Up";
      }

      return {
        ...g,
        first_score: firstScore || null,
        second_score: secondScore || null,
        combined_score: combinedScore,
        decision,
        needs_discussion: firstScore?.needs_discussion || false,
        discussion_notes: firstScore?.discussion_notes || null,
        is_tentatively_approved: cycle.grant_tentative_approvals?.some(
          (t: any) => t.grant_id === g.id && t.is_approved
        ) || false,
      };
    }) || [];

    // Sort by combined score descending
    grantsWithCombinedScores.sort((a, b) => b.combined_score - a.combined_score);

    // Add rank
    grantsWithCombinedScores.forEach((g: any, index: number) => {
      g.rank = index + 1;
    });

    return NextResponse.json({
      grants: grantsWithCombinedScores,
      cycle: {
        id: cycle.id,
        cycle_name: cycle.cycle_name,
        amount_per_grant: cycle.amount_per_grant,
        grants_available: cycle.grants_available,
        scoring_completed_at: cycle.scoring_completed_at,
        final_approved_at: cycle.final_approved_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
