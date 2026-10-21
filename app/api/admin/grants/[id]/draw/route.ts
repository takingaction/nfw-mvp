import { NextResponse } from "next/server";
import getAdminClient from "@/lib/supabase/admin";
import { requireGrantsAccess } from "@/lib/adminCheck";
import { fetchAllPages } from "@/lib/supabase-paginate";
import { fetchDocumentsByGrant } from "@/lib/grant-documents";
import { runEligibilityChecks } from "@/lib/grant-eligibility-checks";
import { drawPool, loadDrawContext, pickRandom, type DrawContext } from "@/lib/grant-draw";
import { drawBlocker, finalizeBlocker, handoffBlocker } from "@/lib/grant-draw-rules";
import { isAiSkipped } from "@/lib/grant-ai-flags";

export const dynamic = "force-dynamic";

/**
 * Random-draw review for a cycle with selection_method = 'random'.
 *
 * GET  → everything the Review 1 / Review 2 draw screens need: applications
 *        with AI criteria, the draw rows, counts, what's blocking each step,
 *        and LIVE membership / consecutive-award checks for current winners.
 *
 * POST { action, grantId? }
 *   draw     draw (target − current winners) at random from the eligible pool.
 *            The same action draws replacements for rejected winners.
 *   redraw   void every draw and draw a fresh set. Review 1 only (before
 *            hand-off to Reviewer 2).
 *   confirm  drawn → confirmed
 *   reject   drawn|confirmed → rejected (gets the normal rejection email at
 *            finalize; frees a slot for a replacement)
 *   undo     confirmed|rejected → drawn (rejected only while a slot is free)
 *
 * Nothing here changes grants.status; Finalize Approvals does that.
 */

type Action = "draw" | "redraw" | "confirm" | "reject" | "undo";
const ACTIONS: Action[] = ["draw", "redraw", "confirm", "reject", "undo"];

function lockError(ctx: DrawContext): string | null {
  if (ctx.cycle.selection_method !== "random") return "This cycle doesn't use random selection.";
  if (ctx.cycle.final_approved_at) return "This cycle has already been finalized.";
  if (!ctx.cycle.scoring_started_at) return "Review hasn't started for this cycle yet.";
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireGrantsAccess();
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { id: cycleId } = await params;
    const admin = getAdminClient();

    const { ctx, error } = await loadDrawContext(admin, cycleId);
    if (!ctx) return NextResponse.json({ error }, { status: error === "Cycle not found" ? 404 : 500 });
    if (ctx.cycle.selection_method !== "random") {
      return NextResponse.json({ error: "This cycle doesn't use random selection." }, { status: 400 });
    }
    if (!ctx.cycle.scoring_started_at) {
      return NextResponse.json({ error: "Scoring has not started yet" }, { status: 400 });
    }

    const detailRes = await fetchAllPages((from, to) =>
      admin
        .from("grants")
        .select(`
          id,
          user_id,
          who_are_you,
          biggest_challenge,
          fund_usage,
          is_nominating,
          nominee_name,
          status,
          submitted_at,
          ai_relevance,
          ai_reasoning,
          ai_criteria,
          eligibility_checks,
          ai_evaluated_at,
          ai_invalidated_at,
          ai_validated_at,
          profiles:user_id (full_name, email, city, state)
        `)
        .eq("cycle_id", cycleId)
        .order("submitted_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, to),
    );
    if (detailRes.error) {
      return NextResponse.json({ error: detailRes.error.message }, { status: 500 });
    }
    const grants = detailRes.data;
    const documentsByGrant = await fetchDocumentsByGrant(
      admin,
      grants.map((g: { id: string }) => g.id),
    );

    // Live re-check of the code criteria for current and rejected winners so
    // Reviewer 2 sees today's membership state, not the state at AI time.
    const activeDraws = ctx.draws.filter((d) => d.status !== "voided");
    const drawnGrantIds = new Set(activeDraws.map((d) => d.grant_id));
    const winnerUsers = ctx.grants.filter((g) => drawnGrantIds.has(g.id)).map((g) => g.user_id);
    const liveByUser = await runEligibilityChecks(
      admin,
      { id: ctx.cycle.id, end_date: ctx.cycle.end_date },
      winnerUsers,
    );
    const liveChecks: Record<string, unknown> = {};
    for (const g of ctx.grants) {
      if (drawnGrantIds.has(g.id)) liveChecks[g.id] = liveByUser.get(g.user_id) ?? null;
    }

    return NextResponse.json({
      cycle: ctx.cycle,
      grants: grants.map((g: { id: string }) => ({ ...g, documents: documentsByGrant[g.id] || [] })),
      draws: ctx.draws,
      summary: ctx.summary,
      blockers: {
        draw: drawBlocker(ctx.summary),
        handoff: handoffBlocker(ctx.summary),
        finalize: finalizeBlocker(ctx.summary),
      },
      liveChecks,
      viewer: { isAdmin: auth.isAdmin },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function performDraw(
  admin: ReturnType<typeof getAdminClient>,
  ctx: DrawContext,
  userId: string,
): Promise<NextResponse> {
  const blocker = drawBlocker(ctx.summary);
  if (blocker) return NextResponse.json({ error: blocker }, { status: 400 });

  const pool = drawPool(ctx);
  const picked = pickRandom(pool, ctx.summary.toDraw);
  const round = ctx.summary.nextRound;
  const now = new Date().toISOString();

  const { data: inserted, error: insErr } = await admin
    .from("grant_draws")
    .insert(
      picked.map((g) => ({
        cycle_id: ctx.cycle.id,
        grant_id: g.id,
        round,
        pool_size: pool.length,
        status: "drawn",
        drawn_by: userId,
        drawn_at: now,
      })),
    )
    .select("id");

  if (insErr) {
    if (insErr.code === "23505") {
      return NextResponse.json(
        { error: "Another draw just ran for this cycle. Refresh and try again." },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // Concurrency guard: two simultaneous clicks could overfill the winners.
  // Re-count and back out this batch if so.
  const { ctx: after } = await loadDrawContext(admin, ctx.cycle.id);
  if (after && after.summary.winners > after.summary.target) {
    await admin
      .from("grant_draws")
      .update({ status: "voided" })
      .in("id", (inserted ?? []).map((r: { id: string }) => r.id));
    return NextResponse.json(
      { error: "Another draw just ran for this cycle. Refresh and try again." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    success: true,
    round,
    poolSize: pool.length,
    drawnGrantIds: picked.map((g) => g.id),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireGrantsAccess();
    if (!auth.authorized || !auth.user) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const userId = auth.user.id;
    const { id: cycleId } = await params;

    let body: { action?: Action; grantId?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { action, grantId } = body;
    if (!action || !ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Missing or invalid action" }, { status: 400 });
    }

    const admin = getAdminClient();
    const { ctx, error } = await loadDrawContext(admin, cycleId);
    if (!ctx) return NextResponse.json({ error }, { status: error === "Cycle not found" ? 404 : 500 });
    const locked = lockError(ctx);
    if (locked) return NextResponse.json({ error: locked }, { status: 400 });

    if (action === "draw") return performDraw(admin, ctx, userId);

    if (action === "redraw") {
      if (ctx.cycle.scoring_completed_at) {
        return NextResponse.json(
          { error: "Redraw is only available before handing off to Reviewer 2. Reject individual winners instead." },
          { status: 400 },
        );
      }
      const { error: voidErr } = await admin
        .from("grant_draws")
        .update({ status: "voided" })
        .eq("cycle_id", cycleId)
        .neq("status", "voided");
      if (voidErr) return NextResponse.json({ error: voidErr.message }, { status: 500 });
      const { ctx: fresh, error: reloadErr } = await loadDrawContext(admin, cycleId);
      if (!fresh) return NextResponse.json({ error: reloadErr }, { status: 500 });
      return performDraw(admin, fresh, userId);
    }

    // confirm / reject / undo act on one winner
    if (!grantId) return NextResponse.json({ error: "Missing grantId" }, { status: 400 });
    const draw = ctx.draws.find((d) => d.grant_id === grantId && d.status !== "voided");
    if (!draw) {
      return NextResponse.json({ error: "That application isn't a current winner." }, { status: 404 });
    }

    let next: "drawn" | "confirmed" | "rejected";
    if (action === "confirm") {
      if (draw.status !== "drawn") {
        return NextResponse.json({ error: `Can't confirm a ${draw.status} winner.` }, { status: 400 });
      }
      const grant = ctx.grants.find((g) => g.id === grantId);
      if (grant && isAiSkipped(grant)) {
        return NextResponse.json(
          { error: "This application was marked Not Approved. Mark the winner not approved instead." },
          { status: 400 },
        );
      }
      next = "confirmed";
    } else if (action === "reject") {
      if (draw.status === "rejected") {
        return NextResponse.json({ error: "Already marked not approved." }, { status: 400 });
      }
      next = "rejected";
    } else {
      if (draw.status === "drawn") {
        return NextResponse.json({ error: "Nothing to undo." }, { status: 400 });
      }
      if (draw.status === "rejected" && ctx.summary.winners >= ctx.summary.target) {
        return NextResponse.json(
          { error: "A replacement has already been drawn for this slot, so this can't be undone." },
          { status: 400 },
        );
      }
      next = "drawn";
    }

    const { error: updErr } = await admin
      .from("grant_draws")
      .update({
        status: next,
        decided_by: next === "drawn" ? null : userId,
        decided_at: next === "drawn" ? null : new Date().toISOString(),
      })
      .eq("id", draw.id)
      .eq("status", draw.status);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({ success: true, action, grantId, status: next });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
