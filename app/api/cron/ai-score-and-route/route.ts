import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { fetchAllPages, fetchAllPagesIn } from "@/lib/supabase-paginate";
import {
  scoreGrantRubric,
  toScoreRow,
  RUBRIC_PROMPT_VERSION,
} from "@/lib/grant-ai-scoring";
import {
  codeEligibility,
  decideRoute,
  routingActive,
  MAX_SCORE_ATTEMPTS,
  type ReviewQueue,
  type ReviewQueueReason,
} from "@/lib/grant-ai-routing";

/**
 * AI rubric scoring + first-round routing (lib/grant-ai-routing.ts).
 *
 * Every 5 minutes, for each scored cycle with ai_scoring_enabled and not yet
 * finalized:
 *   1. Score eligible applications that have no AI score yet (live calls,
 *      cached prompt prefix; results in grant_ai_scores).
 *   2. If the cycle has an ai_score_cutoff, route each application to
 *      reviewer1 / sampled / held. Without a cutoff (shadow mode) nothing is
 *      routed and Reviewer 1's queue is unchanged.
 *
 * Applications appear in Reviewer 1's queue within minutes of submission
 * (after the 2-minute eligibility queue), so daily review keeps working with
 * an incomplete pool. Turning a cycle on mid-way backfills it over a few runs.
 *
 * Failures: a scoring failure increments grants.ai_score_attempts; after
 * MAX_SCORE_ATTEMPTS the app goes to Reviewer 1. Nothing is held on a guess.
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TIME_BUDGET_MS = 240_000;
const CONCURRENCY = 4;

interface CycleRow {
  id: string;
  cycle_name: string | null;
  description: string | null;
  amount_per_grant: number | string | null;
  reviewer_guidance: string | null;
  selection_method: string | null;
  ai_scoring_enabled: boolean | null;
  ai_score_cutoff: number | string | null;
  ai_sample_rate: number | string | null;
}

interface GrantRow {
  id: string;
  who_are_you: string | null;
  biggest_challenge: string | null;
  fund_usage: string | null;
  eligibility_checks: unknown;
  ai_invalidated_at: string | null;
  review_queue: ReviewQueue | null;
  review_queue_reason: ReviewQueueReason | null;
  ai_score_attempts: number;
  grant_scores: Array<{ reviewer_name: string; is_complete: boolean | null }> | null;
}

interface CycleResult {
  cycle: string;
  routing: boolean;
  scored: number;
  scoreFailed: number;
  routed: Record<string, number>;
  pending: number;
  error?: string;
}

async function runPool<T>(items: T[], n: number, fn: (item: T) => Promise<void>, deadline: number) {
  let next = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length && Date.now() < deadline) {
      const item = items[next++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

async function processCycle(cycle: CycleRow, deadline: number): Promise<CycleResult> {
  const active = routingActive(cycle);
  const cutoff = active ? Number(cycle.ai_score_cutoff) : NaN;
  const sampleRate = Number(cycle.ai_sample_rate ?? 0.05);
  const result: CycleResult = { cycle: cycle.cycle_name ?? cycle.id, routing: active, scored: 0, scoreFailed: 0, routed: {}, pending: 0 };

  const grantsRes = await fetchAllPages<GrantRow>((from, to) =>
    supabaseAdmin
      .from("grants")
      .select(
        "id, who_are_you, biggest_challenge, fund_usage, eligibility_checks, ai_invalidated_at, review_queue, review_queue_reason, ai_score_attempts, grant_scores!left(reviewer_name, is_complete)",
      )
      .eq("cycle_id", cycle.id)
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (grantsRes.error) return { ...result, error: grantsRes.error.message };
  const grants = grantsRes.data;

  // Latest AI total per grant, any prompt version (re-scoring is explicit).
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
  if (scoresRes.error) return { ...result, error: scoresRes.error.message };
  const aiTotal = new Map<string, number>();
  for (const s of scoresRes.data) if (!aiTotal.has(s.grant_id)) aiTotal.set(s.grant_id, Number(s.total));

  const routeOne = async (g: GrantRow) => {
    const elig = codeEligibility(g.eligibility_checks);
    const alreadyReviewed =
      !!g.ai_invalidated_at || (g.grant_scores ?? []).some((s) => s.reviewer_name === "first" && s.is_complete === true);

    // Shadow mode: score only.
    if (!active) {
      if (!g.review_queue && elig.evaluated && !elig.ineligible && !alreadyReviewed && !aiTotal.has(g.id) && g.ai_score_attempts < MAX_SCORE_ATTEMPTS) {
        await scoreOne(g);
      }
      return;
    }

    let decision = decideRoute({
      grantId: g.id,
      currentQueue: g.review_queue,
      currentReason: g.review_queue_reason,
      alreadyReviewed,
      eligibilityEvaluated: elig.evaluated,
      codeIneligible: elig.ineligible,
      aiTotal: aiTotal.get(g.id) ?? null,
      scoreAttempts: g.ai_score_attempts,
      cutoff,
      sampleRate,
    });
    if (decision.action === "score") {
      await scoreOne(g);
      decision = decideRoute({
        grantId: g.id,
        currentQueue: null,
        currentReason: null,
        alreadyReviewed,
        eligibilityEvaluated: true,
        codeIneligible: false,
        aiTotal: aiTotal.get(g.id) ?? null,
        scoreAttempts: g.ai_score_attempts,
        cutoff,
        sampleRate,
      });
      if (decision.action === "score") {
        result.pending++; // failed this time; retried next run
        return;
      }
    }
    if (decision.action !== "route") {
      if (!g.review_queue) result.pending++;
      return;
    }
    const { error } = await supabaseAdmin
      .from("grants")
      .update({ review_queue: decision.queue, review_queue_reason: decision.reason, routed_at: new Date().toISOString() })
      .eq("id", g.id)
      // Guard against a concurrent run having routed it toward Reviewer 1.
      .or("review_queue.is.null,review_queue.eq.held");
    if (error) {
      console.error(`[ai-score-and-route] route update failed for ${g.id}:`, error.message);
      return;
    }
    result.routed[decision.queue] = (result.routed[decision.queue] ?? 0) + 1;
  };

  // Prompt caching only pays off when a later call in this run reads the
  // prefix the first call wrote (the 5-minute TTL doesn't survive until the
  // next cron run). So: cache only when 2+ applications will be scored, and
  // let the first call finish before the rest start, so they read the cache
  // instead of all writing it in parallel. Estimate mirrors the scoring
  // conditions; an overestimate just costs one 1.25x cache write.
  const toScore = grants.filter((g) => {
    if (g.review_queue || aiTotal.has(g.id) || g.ai_score_attempts >= MAX_SCORE_ATTEMPTS) return false;
    if (g.ai_invalidated_at || (g.grant_scores ?? []).some((s) => s.reviewer_name === "first" && s.is_complete === true)) return false;
    const e = codeEligibility(g.eligibility_checks);
    return e.evaluated && !e.ineligible;
  }).length;
  const useCache = toScore >= 2;
  let primed: Promise<void> | null = null;

  const callScorer = (g: GrantRow) =>
    scoreGrantRubric(
      {
        cycleName: cycle.cycle_name ?? "",
        cycleDescription: cycle.description ?? "",
        amountPerGrant: cycle.amount_per_grant ? Number(cycle.amount_per_grant) : null,
        reviewerGuidance: cycle.reviewer_guidance,
        whoAreYou: g.who_are_you ?? "",
        biggestChallenge: g.biggest_challenge ?? "",
        fundUsage: g.fund_usage ?? "",
      },
      { cache: useCache },
    );

  const scoreOne = async (g: GrantRow) => {
    let res: Awaited<ReturnType<typeof callScorer>>;
    if (!useCache) {
      res = await callScorer(g);
    } else if (!primed) {
      const first = callScorer(g);
      primed = first.then(() => undefined, () => undefined);
      res = await first;
    } else {
      await primed;
      res = await callScorer(g);
    }
    if (!res) {
      g.ai_score_attempts += 1;
      result.scoreFailed++;
      await supabaseAdmin
        .from("grants")
        .update({ ai_score_attempts: g.ai_score_attempts, ai_score_error: "scoring failed (see function logs)" })
        .eq("id", g.id);
      return;
    }
    const { error } = await supabaseAdmin
      .from("grant_ai_scores")
      .upsert(toScoreRow(g.id, cycle.id, res, false), { onConflict: "grant_id,prompt_version" });
    if (error) {
      console.error(`[ai-score-and-route] score insert failed for ${g.id}:`, error.message);
      g.ai_score_attempts += 1;
      result.scoreFailed++;
      return;
    }
    aiTotal.set(g.id, res.total);
    result.scored++;
  };

  // Cheap decisions first (no API call), then the ones that need scoring.
  const needsScore = (g: GrantRow) => !g.review_queue && !aiTotal.has(g.id);
  const ordered = [...grants.filter((g) => !needsScore(g)), ...grants.filter(needsScore)];
  await runPool(ordered, CONCURRENCY, routeOne, deadline);
  return result;
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("Authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ message: "ANTHROPIC_API_KEY not configured, skipping" });
  }

  const startedAt = Date.now();
  const deadline = startedAt + TIME_BUDGET_MS;

  const { data: cycles, error } = await supabaseAdmin
    .from("grant_cycles")
    .select("id, cycle_name, description, amount_per_grant, reviewer_guidance, selection_method, ai_scoring_enabled, ai_score_cutoff, ai_sample_rate")
    .eq("ai_scoring_enabled", true)
    .eq("selection_method", "scored")
    .is("final_approved_at", null);
  if (error) {
    console.error("[ai-score-and-route] cycle load failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: CycleResult[] = [];
  for (const c of (cycles ?? []) as CycleRow[]) {
    if (Date.now() >= deadline) break;
    try {
      results.push(await processCycle(c, deadline));
    } catch (err) {
      console.error(`[ai-score-and-route] cycle ${c.id} failed:`, err);
      results.push({ cycle: c.cycle_name ?? c.id, routing: false, scored: 0, scoreFailed: 0, routed: {}, pending: 0, error: String(err) });
    }
  }

  return NextResponse.json({ success: true, promptVersion: RUBRIC_PROMPT_VERSION, elapsedMs: Date.now() - startedAt, results });
}
