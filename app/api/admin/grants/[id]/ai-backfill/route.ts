import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const maxDuration = 300;

const TIME_BUDGET_MS = 250_000; // 250s — leaves 50s buffer for Vercel 300s limit

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: cycleId } = await params;

    // Confirm the cycle exists
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("cycle_name, description, scoring_started_at")
      .eq("id", cycleId)
      .single();

    if (!cycle) {
      return NextResponse.json(
        { error: "Grant cycle not found" },
        { status: 404 },
      );
    }

    if (!cycle.scoring_started_at) {
      return NextResponse.json(
        {
          error:
            "Start Scoring has not been clicked yet. Click Start Scoring first, then run AI backfill.",
        },
        { status: 400 },
      );
    }

    // Lazy import so a missing key / SDK doesn't break the rest of the route
    const { evaluateGrantApplication, AI_MODEL_VERSION } = await import(
      "@/lib/anthropic"
    );

    // Find all submitted grants in this cycle that have not been AI-evaluated
    // Match both NULL (pre-AI apps) and 'not_evaluated' (post-AI, fresh apps)
    const { data: unevaluated } = await supabaseAdmin
      .from("grants")
      .select("id, who_are_you, biggest_challenge, fund_usage")
      .eq("cycle_id", cycleId)
      .eq("status", "submitted")
      .or("ai_relevance.is.null,ai_relevance.eq.not_evaluated");

    if (!unevaluated || unevaluated.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        evaluated: 0,
        failed: 0,
        remaining: 0,
        budgetReached: false,
        message: "No grants need AI evaluation.",
      });
    }

    let evaluated = 0;
    let failed = 0;
    const startTime = Date.now();
    let budgetReached = false;

    for (const g of unevaluated) {
      try {
        const result = await evaluateGrantApplication({
          cycleName: cycle.cycle_name || "",
          cycleDescription: cycle.description || "",
          whoAreYou: g.who_are_you || "",
          biggestChallenge: g.biggest_challenge || "",
          fundUsage: g.fund_usage || "",
        });
        await supabaseAdmin
          .from("grants")
          .update({
            ai_relevance: result.relevance,
            ai_reasoning: result.reasoning,
            ai_evaluated_at: new Date().toISOString(),
            ai_model_version: result.model || AI_MODEL_VERSION,
          })
          .eq("id", g.id);
        evaluated++;
      } catch (err) {
        console.error(`[ai-backfill] AI eval failed for grant ${g.id}:`, err);
        failed++;
      }

      // Time budget check (after every call so we don't overrun)
      if (Date.now() - startTime > TIME_BUDGET_MS) {
        console.log(
          `[ai-backfill] Time budget reached after ${evaluated + failed}/${unevaluated.length}`,
        );
        budgetReached = true;
        break;
      }

      // Gentle throttle to stay well under Claude's rate limit
      await sleep(200);
    }

    const remaining = unevaluated.length - evaluated - failed;

    console.log(
      `[ai-backfill] Complete: ${evaluated}/${unevaluated.length} succeeded, ${failed} failed, ${remaining} remaining${budgetReached ? " (budget reached)" : ""}`,
    );

    return NextResponse.json({
      success: true,
      total: unevaluated.length,
      evaluated,
      failed,
      remaining,
      budgetReached,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET endpoint returns the current backfill count without running anything.
// Useful for the cycle detail page to know whether to show the backfill button.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: cycleId } = await params;

    const { count, error } = await supabaseAdmin
      .from("grants")
      .select("id", { count: "exact", head: true })
      .eq("cycle_id", cycleId)
      .eq("status", "submitted")
      .or("ai_relevance.is.null,ai_relevance.eq.not_evaluated");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ unevaluatedCount: count ?? 0 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
