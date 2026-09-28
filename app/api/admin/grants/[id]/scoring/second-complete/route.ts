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

    // Load every grant in the cycle with its embedded first + second scores,
    // paged 1000 at a time. Do NOT use `.in("grant_id", ids)` — large ID lists
    // overflow the request URL and the query fails.
    type ScoreRow = {
      reviewer_name: string;
      total_score: number | null;
      needs_discussion: boolean | null;
      is_complete: boolean | null;
    };
    type GrantRow = {
      id: string;
      rachel_complete: boolean | null;
      ai_invalidated_at: string | null;
      grant_scores: ScoreRow[] | null;
    };

    const PAGE_SIZE = 1000;
    const grantsWithScores: GrantRow[] = [];
    for (let page = 0; ; page++) {
      const from = page * PAGE_SIZE;
      const { data, error } = await supabaseAdmin
        .from("grants")
        .select(`
          id,
          rachel_complete,
          ai_invalidated_at,
          grant_scores!left(reviewer_name, total_score, needs_discussion, is_complete)
        `)
        .eq("cycle_id", cycleId)
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        console.error("[scoring/second-complete] Failed to load grants:", error);
        return NextResponse.json(
          { error: `Failed to load applications: ${error.message}` },
          { status: 500 },
        );
      }
      if (!data || data.length === 0) break;
      grantsWithScores.push(...(data as GrantRow[]));
      if (data.length < PAGE_SIZE) break;
    }

    if (grantsWithScores.length === 0) {
      return NextResponse.json({ error: "No grants found" }, { status: 404 });
    }

    // Grants in second-review scope (matches the Review 2 page):
    // - First reviewer completed (rachel_complete = true), AND
    // - Not skipped (ai_invalidated_at IS NULL), AND
    // - First score >= 7 OR first reviewer flagged
    const inScope = grantsWithScores.filter((g) => {
      if (!g.rachel_complete) return false;
      if (g.ai_invalidated_at) return false;
      const firstScore = g.grant_scores?.find((s) => s.reviewer_name === "first");
      if (!firstScore) return false;
      const totalScore = firstScore.total_score || 0;
      const wasFlagged = firstScore.needs_discussion === true;
      return totalScore >= 7 || wasFlagged;
    });

    if (inScope.length === 0) {
      return NextResponse.json({ error: "No grants in scope for second review" }, { status: 400 });
    }

    const incompleteCount = inScope.filter(
      (g) =>
        !(g.grant_scores ?? []).some(
          (s) => s.reviewer_name === "second" && s.is_complete === true,
        ),
    ).length;

    if (incompleteCount > 0) {
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
