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

    // Get cycle to check scoring_started_at
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("scoring_started_at, scoring_completed_at")
      .eq("id", cycleId)
      .single();

    if (!cycle?.scoring_started_at) {
      return NextResponse.json({ error: "Scoring has not started yet" }, { status: 400 });
    }

    // Get all grants with first reviewer scores
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
        grant_scores!left (reviewer_name, urgency_score, authenticity_score, impact_score, barriers_yn, needs_discussion, discussion_notes, is_complete, total_score)
      `)
      .eq("cycle_id", cycleId)
      .order("submitted_at", { ascending: false });

    // Filter to only first reviewer scores
    const grantsWithFirstScores = grants?.map((g) => ({
      ...g,
      grant_scores: g.grant_scores?.filter((s: any) => s.reviewer_name === "first") || [],
    }));

    return NextResponse.json({
      grants: grantsWithFirstScores || [],
      scoring_started_at: cycle.scoring_started_at,
      scoring_completed_at: cycle.scoring_completed_at,
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
          reviewer_name: "first",
          reviewer_admin_id: user.id,
          urgency_score: urgency_score ?? null,
          authenticity_score: authenticity_score ?? null,
          impact_score: impact_score ?? null,
          barriers_yn: barriers_yn ?? null,
          needs_discussion: needs_discussion ?? false,
          discussion_notes: discussion_notes || null,
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

    // If marking complete, also update grants.rachel_complete
    if (is_complete) {
      await supabaseAdmin
        .from("grants")
        .update({ rachel_complete: true })
        .eq("id", grantId);
    }

    return NextResponse.json({ success: true, total_score });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
