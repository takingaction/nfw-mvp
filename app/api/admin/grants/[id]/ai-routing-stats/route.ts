import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { fetchAllPages, fetchAllPagesIn } from "@/lib/supabase-paginate";
import { codeEligibility, MAX_SCORE_ATTEMPTS } from "@/lib/grant-ai-routing";
import { cycleElapsed, type AiRoutingStats } from "@/lib/grant-ai-settings";

/**
 * Aggregate AI scoring / routing numbers for one cycle, for the "AI review"
 * section of the grant edit page. Admin only. Returns counts and a score
 * histogram only — never per-application scores or which apps were sampled.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: cycleId } = await params;
  const { data: cycle, error: cErr } = await supabaseAdmin
    .from("grant_cycles")
    .select("start_date, end_date")
    .eq("id", cycleId)
    .single();
  if (cErr || !cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });

  const grantsRes = await fetchAllPages<{
    id: string;
    eligibility_checks: unknown;
    ai_invalidated_at: string | null;
    review_queue: string | null;
    ai_score_attempts: number;
    grant_scores: Array<{ reviewer_name: string; is_complete: boolean | null }> | null;
  }>((from, to) =>
    supabaseAdmin
      .from("grants")
      .select("id, eligibility_checks, ai_invalidated_at, review_queue, ai_score_attempts, grant_scores!left(reviewer_name, is_complete)")
      .eq("cycle_id", cycleId)
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (grantsRes.error) return NextResponse.json({ error: grantsRes.error.message }, { status: 500 });
  const grants = grantsRes.data;

  const scoresRes = await fetchAllPagesIn<{ grant_id: string; total: number | string; created_at: string }>(
    grants.map((g) => g.id),
    (chunk, from, to) =>
      supabaseAdmin
        .from("grant_ai_scores")
        .select("grant_id, total, created_at")
        .in("grant_id", chunk)
        .order("created_at", { ascending: false })
        .range(from, to),
  );
  if (scoresRes.error) return NextResponse.json({ error: scoresRes.error.message }, { status: 500 });
  const aiTotal = new Map<string, number>();
  for (const s of scoresRes.data) if (!aiTotal.has(s.grant_id)) aiTotal.set(s.grant_id, Number(s.total));

  const stats: AiRoutingStats = {
    total: grants.length,
    alreadyReviewed: 0,
    ineligible: 0,
    scoringFailed: 0,
    pending: 0,
    scoredHistogram: Array(19).fill(0),
    queues: { reviewer1: 0, sampled: 0, held: 0, unrouted: 0 },
    elapsed: cycleElapsed(cycle.start_date, cycle.end_date),
  };

  for (const g of grants) {
    if (g.review_queue === "reviewer1" || g.review_queue === "sampled" || g.review_queue === "held") stats.queues[g.review_queue]++;
    else stats.queues.unrouted++;

    const reviewed = !!g.ai_invalidated_at || (g.grant_scores ?? []).some((s) => s.reviewer_name === "first" && s.is_complete === true);
    if (reviewed) { stats.alreadyReviewed++; continue; }
    const elig = codeEligibility(g.eligibility_checks);
    if (!elig.evaluated) { stats.pending++; continue; }
    if (elig.ineligible) { stats.ineligible++; continue; }
    const t = aiTotal.get(g.id);
    if (t === undefined) {
      if (g.ai_score_attempts >= MAX_SCORE_ATTEMPTS) stats.scoringFailed++;
      else stats.pending++;
      continue;
    }
    stats.scoredHistogram[Math.max(0, Math.min(18, Math.round(t * 2)))]++;
  }

  return NextResponse.json(stats);
}
