import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const maxDuration = 300;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runAiEvaluationForUnevaluatedGrants(cycleId: string) {
  // Lazy import so a missing key / SDK doesn't break the rest of the route
  const { evaluateGrantApplication, AI_MODEL_VERSION } = await import(
    "@/lib/anthropic"
  );

  // Fetch cycle description for context
  const { data: cycle } = await supabaseAdmin
    .from("grant_cycles")
    .select("cycle_name, description")
    .eq("id", cycleId)
    .single();
  if (!cycle) return { total: 0, evaluated: 0, failed: 0 };

  // Find all submitted grants in this cycle that have not been AI-evaluated
  const { data: unevaluated } = await supabaseAdmin
    .from("grants")
    .select("id, who_are_you, biggest_challenge, fund_usage")
    .eq("cycle_id", cycleId)
    .eq("status", "submitted")
    .eq("ai_relevance", "not_evaluated");

  if (!unevaluated || unevaluated.length === 0) {
    return { total: 0, evaluated: 0, failed: 0 };
  }

  let evaluated = 0;
  let failed = 0;

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
      console.error(`[scoring/start] AI eval failed for grant ${g.id}:`, err);
      failed++;
    }
    // Gentle throttle to stay well under Claude's rate limit
    await sleep(200);
  }

  return { total: unevaluated.length, evaluated, failed };
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

    // Check if scoring has already started
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("scoring_started_at")
      .eq("id", cycleId)
      .single();

    if (cycle?.scoring_started_at) {
      return NextResponse.json(
        {
          error: "Scoring has already started",
          scoring_started_at: cycle.scoring_started_at,
        },
        { status: 400 },
      );
    }

    // Set scoring_started_at
    const { error } = await supabaseAdmin
      .from("grant_cycles")
      .update({ scoring_started_at: new Date().toISOString() })
      .eq("id", cycleId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Run AI evaluation for any unevaluated submitted grants (best-effort, fire-and-await)
    // We await here so that by the time the client navigates to the first review page,
    // flags are already populated. If something fails, scoring still works.
    let aiResult: { total: number; evaluated: number; failed: number } | null =
      null;
    try {
      aiResult = await runAiEvaluationForUnevaluatedGrants(cycleId);
      if (aiResult.evaluated > 0 || aiResult.failed > 0) {
        console.log(
          `[scoring/start] AI eval: ${aiResult.evaluated}/${aiResult.total} succeeded, ${aiResult.failed} failed`,
        );
      }
    } catch (err) {
      console.error("[scoring/start] AI eval phase error:", err);
    }

    return NextResponse.json({ success: true, aiResult });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
