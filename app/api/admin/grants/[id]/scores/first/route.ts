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
    console.log("[scores/first GET] Request received");
    
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("[scores/first GET] Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: cycleId } = await params;
    console.log("[scores/first GET] cycleId:", cycleId);

    // Get cycle to check scoring_started_at and get end_date for "current month" calculation
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("scoring_started_at, scoring_completed_at, end_date")
      .eq("id", cycleId)
      .single();

    console.log("[scores/first GET] cycle:", cycle);

    if (!cycle?.scoring_started_at) {
      console.log("[scores/first GET] Scoring has not started yet");
      return NextResponse.json({ error: "Scoring has not started yet" }, { status: 400 });
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

    // Get all grants with first reviewer scores (no FK join for documents)
    const { data: grants, error: grantsError } = await supabaseAdmin
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
        rachel_complete,
        profiles:user_id (full_name, email, city, state),
        grant_scores!left (reviewer_name, urgency_score, authenticity_score, impact_score, barriers_yn, needs_discussion, discussion_notes, is_complete, total_score)
      `)
      .eq("cycle_id", cycleId)
      .order("submitted_at", { ascending: false });

    console.log("[scores/first GET] grantsError:", grantsError);
    console.log("[scores/first GET] grants count:", grants?.length);

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

    // Filter to only first reviewer scores and add applications_this_month and documents
    const grantsWithFirstScores = grants?.map((g) => ({
      ...g,
      grant_scores: g.grant_scores?.filter((s: any) => s.reviewer_name === "first") || [],
      documents: documentsByGrant[g.id] || [],
      applications_this_month: applicationsThisMonth[g.user_id] || 1,
      total_available_grants: totalAvailableGrants,
    }));

    console.log("[scores/first GET] filtered grantsWithFirstScores sample:", grantsWithFirstScores?.[0]?.grant_scores);

    return NextResponse.json({
      grants: grantsWithFirstScores || [],
      scoring_started_at: cycle.scoring_started_at,
      scoring_completed_at: cycle.scoring_completed_at,
    });
  } catch (err: any) {
    console.error("[scores/first GET] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("[scores/first POST] Request received");
    
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("[scores/first POST] Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: cycleId } = await params;
    const body = await request.json();
    console.log("[scores/first POST] Body:", body);

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
    console.log("[scores/first POST] Calculated total_score:", total_score);

    // Upsert the score
    console.log("[scores/first POST] Upserting to grant_scores...");
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

    console.log("[scores/first POST] Upsert error:", error);

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

    console.log("[scores/first POST] Success! Returning total_score:", total_score);
    return NextResponse.json({ success: true, total_score });
  } catch (err: any) {
    console.error("[scores/first POST] Exception:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
