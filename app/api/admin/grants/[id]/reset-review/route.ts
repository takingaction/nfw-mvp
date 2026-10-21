import { NextResponse } from "next/server";
import getAdminClient from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/adminCheck";
import { fetchAllPages } from "@/lib/supabase-paginate";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Reset ALL review activity for a cycle, human and AI, so it can be reviewed
 * from scratch. Admin only. Refuses once the cycle is finalized (emails have
 * gone out by then).
 *
 *   GET  → dry run: counts of what would be cleared. Changes nothing.
 *   POST { confirm: "<cycle id>" } → performs the reset.
 *
 * Clears:
 *   - grant_scores (first + second reviewer) for the cycle's applications
 *   - grant_tentative_approvals and grant_draws for the cycle
 *   - on every application: AI verdict/reasoning/criteria/eligibility checks,
 *     reviewer skip + valid marks, first/second review complete flags
 *   - grant_cycles.scoring_started_at / scoring_completed_at
 *   - pending/processing AI jobs for the cycle (queue rows deleted; re-evaluate
 *     and backfill jobs marked failed) so a half-finished old run can't write
 *     results over the reset
 *
 * Does NOT change grants.status or anything a member can see.
 *
 * After the reset every submitted application has ai_relevance =
 * 'not_evaluated', so the ai-evaluate-pending cron (every 5 min) re-runs the
 * AI review automatically with the current prompt. Admins can also start it
 * immediately with the existing "AI Backfill" button on the cycle page.
 */

async function loadCounts(admin: ReturnType<typeof getAdminClient>, cycleId: string) {
  const grantsRes = await fetchAllPages<{
    id: string;
    status: string;
    ai_relevance: string | null;
    ai_invalidated_at: string | null;
    ai_validated_at: string | null;
    rachel_complete: boolean | null;
    michelle_complete: boolean | null;
  }>((from, to) =>
    admin
      .from("grants")
      .select("id, status, ai_relevance, ai_invalidated_at, ai_validated_at, rachel_complete, michelle_complete")
      .eq("cycle_id", cycleId)
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (grantsRes.error) throw new Error(grantsRes.error.message);
  const grants = grantsRes.data;

  const countFor = async (table: string) => {
    const { count, error } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("cycle_id", cycleId);
    if (error) throw new Error(`${table}: ${error.message}`);
    return count ?? 0;
  };

  // grant_scores has no cycle_id; count through the grants embed.
  const { count: scoreCount, error: scoreErr } = await admin
    .from("grant_scores")
    .select("id, grants!inner(cycle_id)", { count: "exact", head: true })
    .eq("grants.cycle_id", cycleId);
  if (scoreErr) throw new Error(`grant_scores: ${scoreErr.message}`);

  return {
    grantIds: grants.map((g) => g.id),
    counts: {
      applications: grants.length,
      aiEvaluated: grants.filter((g) => g.ai_relevance && g.ai_relevance !== "not_evaluated").length,
      skipped: grants.filter((g) => g.ai_invalidated_at).length,
      markedValid: grants.filter((g) => g.ai_validated_at).length,
      reviewCompleteFlags: grants.filter((g) => g.rachel_complete || g.michelle_complete).length,
      scores: scoreCount ?? 0,
      tentativeApprovals: await countFor("grant_tentative_approvals"),
      draws: await countFor("grant_draws"),
      queuedAiEvaluations: await countFor("grant_ai_eval_queue"),
      notSubmittedStatus: grants.filter((g) => g.status !== "submitted").length,
    },
  };
}

async function loadCycle(admin: ReturnType<typeof getAdminClient>, cycleId: string) {
  const { data: cycle, error } = await admin
    .from("grant_cycles")
    .select("id, cycle_name, scoring_started_at, scoring_completed_at, final_approved_at, is_finalized")
    .eq("id", cycleId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return cycle;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id: cycleId } = await params;
    const admin = getAdminClient();
    const cycle = await loadCycle(admin, cycleId);
    if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    const { counts } = await loadCounts(admin, cycleId);
    return NextResponse.json({
      dryRun: true,
      cycle,
      blocked: cycle.final_approved_at || cycle.is_finalized ? "Cycle is finalized." : null,
      wouldClear: counts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAdmin();
    if (!auth.authorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { id: cycleId } = await params;

    let body: { confirm?: string } = {};
    try {
      body = await request.json();
    } catch {
      // fall through to the confirm check
    }
    if (body.confirm !== cycleId) {
      return NextResponse.json(
        { error: "Confirmation required: POST { confirm: \"<cycle id>\" }" },
        { status: 400 },
      );
    }

    const admin = getAdminClient();
    const cycle = await loadCycle(admin, cycleId);
    if (!cycle) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    if (cycle.final_approved_at || cycle.is_finalized) {
      return NextResponse.json(
        { error: "This cycle is finalized; its review can't be reset." },
        { status: 400 },
      );
    }

    const { grantIds, counts } = await loadCounts(admin, cycleId);
    const now = new Date().toISOString();
    const steps: string[] = [];
    const fail = (step: string, message: string) =>
      NextResponse.json({ error: `${step} failed: ${message}`, completedSteps: steps }, { status: 500 });

    // 1. Stop in-flight AI work for this cycle first so nothing writes after
    //    the grants are cleared.
    {
      const { error } = await admin.from("grant_ai_eval_queue").delete().eq("cycle_id", cycleId);
      if (error) return fail("Clearing AI queue", error.message);
      for (const table of ["ai_reevaluate_jobs", "ai_backfill_jobs"]) {
        const { error: jobErr } = await admin
          .from(table)
          .update({ status: "failed", error_message: "Cancelled by review reset", completed_at: now })
          .eq("cycle_id", cycleId)
          .in("status", ["pending", "processing"]);
        if (jobErr) return fail(`Cancelling ${table}`, jobErr.message);
      }
      steps.push("ai_jobs");
    }

    // 2. Draws and tentative approvals.
    {
      const { error: drawErr } = await admin.from("grant_draws").delete().eq("cycle_id", cycleId);
      if (drawErr) return fail("Clearing draws", drawErr.message);
      const { error: taErr } = await admin.from("grant_tentative_approvals").delete().eq("cycle_id", cycleId);
      if (taErr) return fail("Clearing tentative approvals", taErr.message);
      steps.push("draws_and_tentative_approvals");
    }

    // 3. Reviewer scores, in grant-id chunks (no cycle_id on grant_scores).
    for (let i = 0; i < grantIds.length; i += 100) {
      const { error } = await admin
        .from("grant_scores")
        .delete()
        .in("grant_id", grantIds.slice(i, i + 100));
      if (error) return fail("Clearing scores", error.message);
    }
    steps.push("scores");

    // 4. Per-application AI + reviewer state.
    {
      const { error } = await admin
        .from("grants")
        .update({
          ai_relevance: "not_evaluated",
          ai_reasoning: null,
          ai_evaluated_at: null,
          ai_model_version: null,
          ai_criteria: null,
          eligibility_checks: null,
          ai_invalidated_at: null,
          ai_invalidated_by: null,
          ai_validated_at: null,
          ai_validated_by: null,
          rachel_complete: false,
          michelle_complete: false,
        })
        .eq("cycle_id", cycleId);
      if (error) return fail("Clearing application review state", error.message);
      steps.push("applications");
    }

    // 5. Cycle review timestamps.
    {
      const { error } = await admin
        .from("grant_cycles")
        .update({ scoring_started_at: null, scoring_completed_at: null })
        .eq("id", cycleId);
      if (error) return fail("Clearing cycle review timestamps", error.message);
      steps.push("cycle");
    }

    console.log(
      `[reset-review] cycle=${cycleId} by=${auth.user?.id} cleared=${JSON.stringify(counts)}`,
    );

    return NextResponse.json({ success: true, cleared: counts, completedSteps: steps });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
