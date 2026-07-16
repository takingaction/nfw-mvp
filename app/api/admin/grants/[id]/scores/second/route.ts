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

    // Get cycle to check if first reviewer is complete
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("scoring_started_at, scoring_completed_at")
      .eq("id", cycleId)
      .single();

    if (!cycle?.scoring_completed_at) {
      return NextResponse.json({ error: "First reviewer has not completed yet" }, { status: 400 });
    }

    // Get all grants with second reviewer scores AND first reviewer scores (for filtering)
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
        michelle_complete,
        profiles:user_id (full_name, email, city, state),
        grant_scores (reviewer_name, urgency_score, authenticity_score, impact_score, barriers_yn, needs_discussion, discussion_notes, is_complete, total_score)
      `)
      .eq("cycle_id", cycleId)
      .order("submitted_at", { ascending: false });

    // Separate first and second reviewer scores, then filter
    const grantsWithSeparatedScores = grants?.map((g) => {
      const firstScore = g.grant_scores?.find((s: any) => s.reviewer_name === "first");
      const secondScores = g.grant_scores?.filter((s: any) => s.reviewer_name === "second") || [];
      return {
        ...g,
        first_score: firstScore || null,
        grant_scores: secondScores,
      };
    });

    // Filter: only show grants where first reviewer scored >= 7 (approved) OR first reviewer flagged them
    const filteredGrants = grantsWithSeparatedScores?.filter((g) => {
      const firstTotal = g.first_score?.total_score || 0;
      const firstFlagged = g.first_score?.needs_discussion === true;
      return firstTotal >= 7 || firstFlagged;
    });

    return NextResponse.json({
      grants: filteredGrants || [],
      scoring_completed_at: cycle.scoring_completed_at,
      totalInCycle: grants?.length || 0,
      totalFiltered: filteredGrants?.length || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
    const body = await request.json();

    const {
      grantId,
      urgency_score,
      authenticity_score,
      impact_score,
      barriers_yn,
      needs_discussion,
      discussion_notes,
      is_complete,
    } = body;

    // Calculate total score
    const total_score = (urgency_score || 0) + (authenticity_score || 0) + (impact_score || 0);

    // Upsert the score
    const { error } = await supabaseAdmin
      .from("grant_scores")
      .upsert(
        {
          grant_id: grantId,
          reviewer_name: "second",
          reviewer_admin_id: user.id,
          urgency_score: urgency_score ?? null,
          authenticity_score: authenticity_score ?? null,
          impact_score: impact_score ?? null,
          barriers_yn: barriers_yn ?? null,
          needs_discussion: needs_discussion ?? false,
          discussion_notes: discussion_notes ?? null,
          is_complete: is_complete ?? false,
          completed_at: is_complete ? new Date().toISOString() : null,
          total_score,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "grant_id,reviewer_name",
        }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If marking complete, also update grants.michelle_complete
    if (is_complete) {
      await supabaseAdmin
        .from("grants")
        .update({ michelle_complete: true })
        .eq("id", grantId);
    }

    return NextResponse.json({ success: true, total_score });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
