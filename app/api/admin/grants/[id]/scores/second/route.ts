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

    // Get cycle to check if first reviewer is complete
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("scoring_started_at, scoring_completed_at, end_date")
      .eq("id", cycleId)
      .single();

    if (!cycle?.scoring_completed_at) {
      return NextResponse.json({ error: "First reviewer has not completed yet" }, { status: 400 });
    }

    // Calculate applications per user for grants ending in the same month
    let applicationsThisMonth: Record<string, number> = {};
    let totalAvailableGrants = 0;

    if (cycle?.end_date) {
      const endDate = new Date(cycle.end_date);
      const monthStart = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      const monthEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);

      // Find all non-testing cycles ending in the same month
      const { data: cyclesInMonth } = await supabaseAdmin
        .from("grant_cycles")
        .select("id")
        .gte("end_date", monthStart.toISOString().split('T')[0])
        .lte("end_date", monthEnd.toISOString().split('T')[0])
        .eq("is_testing_only", false);

      const cycleIds = cyclesInMonth?.map((c: any) => c.id) || [];
      totalAvailableGrants = cycleIds.length;

      if (cycleIds.length > 0) {
        // Count applications per user for those cycles
        const { data: allGrantsInMonth } = await supabaseAdmin
          .from("grants")
          .select("user_id")
          .in("cycle_id", cycleIds);

        applicationsThisMonth = (allGrantsInMonth || []).reduce((acc: Record<string, number>, g: any) => {
          if (g.user_id) {
            acc[g.user_id] = (acc[g.user_id] || 0) + 1;
          }
          return acc;
        }, {});
      }
    }

    // Get all grants with second reviewer scores AND first reviewer scores (for filtering) (no FK join for documents)
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

    // Fetch documents manually for these grants
    const grantIds = grants?.map((g) => g.id) || [];
    let documentsByGrant: Record<string, any[]> = {};
    if (grantIds.length > 0) {
      const { data: allDocs } = await supabaseAdmin
        .from("grant_documents")
        .select("id, file_name, file_size, uploaded_at, document_url, grant_id")
        .in("grant_id", grantIds);
      
      documentsByGrant = (allDocs || []).reduce((acc: Record<string, any[]>, doc: any) => {
        if (!acc[doc.grant_id]) acc[doc.grant_id] = [];
        acc[doc.grant_id].push(doc);
        return acc;
      }, {});
    }

    // Separate first and second reviewer scores, then filter
    const grantsWithSeparatedScores = grants?.map((g) => {
      const firstScore = g.grant_scores?.find((s: any) => s.reviewer_name === "first");
      const secondScores = g.grant_scores?.filter((s: any) => s.reviewer_name === "second") || [];
      return {
        ...g,
        first_score: firstScore || null,
        grant_scores: secondScores,
        documents: documentsByGrant[g.id] || [],
      };
    });

    // Filter: only show grants where first reviewer scored >= 7 (approved) OR first reviewer flagged them
    const filteredGrants = grantsWithSeparatedScores?.map((g) => ({
      ...g,
      applications_this_month: applicationsThisMonth[g.user_id] || 1,
      total_available_grants: totalAvailableGrants,
    })).filter((g) => {
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

    // NOTE: michelle_complete is ONLY set when the /scoring/second-complete endpoint is called
    // NOT during individual score auto-save

    return NextResponse.json({ success: true, total_score });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
