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

    // Get all grants to check completion status
    const { data: grantsCheck } = await supabaseAdmin
      .from("grants")
      .select("id, rachel_complete, michelle_complete, grant_scores (reviewer_name, total_score, needs_discussion)")
      .eq("cycle_id", cycleId);

    if (!grantsCheck || grantsCheck.length === 0) {
      return NextResponse.json({ error: "No grants found" }, { status: 404 });
    }

    // Check if first review is complete
    const allFirstComplete = grantsCheck.every((g) => g.rachel_complete === true);

    if (!allFirstComplete) {
      return NextResponse.json({
        error: "First review is not complete. Please complete all first reviews first."
      }, { status: 400 });
    }

    // Get grants in scope for second review (first score >= 7 OR first flagged)
    const grantsInScope = grantsCheck.filter((g: any) => {
      if (!g.rachel_complete) return false;
      const firstScore = g.grant_scores?.find((s: any) => s.reviewer_name === "first");
      if (!firstScore) return false;
      const totalScore = firstScore.total_score || 0;
      const wasFlagged = firstScore.needs_discussion === true;
      return totalScore >= 7 || wasFlagged;
    });

    // Second review is complete if all grants in scope have michelle_complete = true
    const allSecondComplete = grantsInScope.length === 0
      ? true
      : grantsInScope.every((g: any) => g.michelle_complete === true);

    if (!allSecondComplete) {
      return NextResponse.json({
        error: "Second review is not complete. Please complete all second reviews first."
      }, { status: 400 });
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
        stripe_connect_account_id,
        funded_at,
        transfer_id,
        profiles:user_id (full_name, email, city, state, stripe_onboarding_completed),
        grant_scores (reviewer_name, urgency_score, authenticity_score, impact_score, barriers_yn, needs_discussion, discussion_notes, total_score),
        amount_approved
      `)
      .eq("cycle_id", cycleId)
      .order("submitted_at", { ascending: false });

    // Filter to only grants in scope for second review (first score >= 7 OR first flagged)
    const grantsForDisplay = grants?.filter((g: any) => {
      const firstScore = g.grant_scores?.find((s: any) => s.reviewer_name === "first");
      if (!firstScore) return false;
      const totalScore = firstScore.total_score || 0;
      const wasFlagged = firstScore.needs_discussion === true;
      return totalScore >= 7 || wasFlagged;
    }) || [];

    // Combine scores and calculate combined totals
    const grantsWithCombinedScores = grantsForDisplay.map((g) => {
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
        second_needs_discussion: secondScore?.needs_discussion || false,
        second_discussion_notes: secondScore?.discussion_notes || null,
        barriers_yn: firstScore?.barriers_yn || null,
        is_tentatively_approved: cycle.grant_tentative_approvals?.some(
          (t: any) => t.grant_id === g.id && t.is_approved
        ) || false,
        stripe_connect_account_id: g.stripe_connect_account_id || null,
        funded_at: g.funded_at || null,
        transfer_id: g.transfer_id || null,
        stripe_onboarding_completed: (g.profiles as any)?.stripe_onboarding_completed ?? false,
        amount_approved: g.amount_approved || null,
      };
    }) || [];

    // Calculate total paid (sum of amount_approved where funded_at IS NOT NULL)
    const totalPaid = grantsWithCombinedScores
      .filter((g: any) => g.funded_at && g.amount_approved)
      .reduce((sum: number, g: any) => sum + Number(g.amount_approved), 0);

    // Check for previous grants for each user
    const userIds = [...new Set(grantsForDisplay.map((g: any) => g.user_id).filter(Boolean))];
    let previousGrantsByUser: Record<string, boolean> = {};

    if (userIds.length > 0) {
      const { data: previousGrants } = await supabaseAdmin
        .from("grants")
        .select("user_id")
        .in("user_id", userIds)
        .eq("status", "payment_sent")
        .neq("cycle_id", cycleId); // Exclude current cycle

      previousGrantsByUser = (previousGrants || []).reduce((acc: Record<string, boolean>, g: any) => {
        acc[g.user_id] = true;
        return acc;
      }, {});
    }

    // Add previous grant flag to each grant
    grantsWithCombinedScores.forEach((g: any) => {
      g.has_received_grant = previousGrantsByUser[g.user_id] || false;
    });

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
        total_funds: cycle.total_funds,
        scoring_completed_at: cycle.scoring_completed_at,
        final_approved_at: cycle.final_approved_at,
      },
      totalPaid,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
