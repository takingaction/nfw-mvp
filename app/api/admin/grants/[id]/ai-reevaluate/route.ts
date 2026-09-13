import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const maxDuration = 300;

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
    const url = new URL(request.url);
    // Default: re-evaluate only apps that are NOT already marked relevant.
    // Pass ?onlyNonRelevant=false to force a full re-eval.
    const onlyNonRelevant =
      (url.searchParams.get("onlyNonRelevant") ?? "true") !== "false";

    // Fetch cycle description
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("cycle_name, description")
      .eq("id", cycleId)
      .single();

    if (!cycle) {
      return NextResponse.json(
        { error: "Grant cycle not found" },
        { status: 404 },
      );
    }

    // Find grants to re-evaluate
    let query = supabaseAdmin
      .from("grants")
      .select("id, who_are_you, biggest_challenge, fund_usage, ai_relevance")
      .eq("cycle_id", cycleId)
      .eq("status", "submitted");

    if (onlyNonRelevant) {
      // Only re-evaluate apps that are not currently 'relevant'
      query = query.neq("ai_relevance", "relevant");
    }

    const { data: grants, error: fetchError } = await query;
    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!grants || grants.length === 0) {
      return NextResponse.json({
        total: 0,
        reEvaluated: 0,
        failed: 0,
        message: onlyNonRelevant
          ? "No non-relevant grants to re-evaluate"
          : "No grants to re-evaluate",
      });
    }

    const { evaluateGrantApplication, AI_MODEL_VERSION } = await import(
      "@/lib/anthropic"
    );

    let reEvaluated = 0;
    let failed = 0;

    for (const g of grants) {
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
            // If reviewer already marked invalid, don't auto-restore
            ai_invalidated_at: g.ai_relevance === "irrelevant" ? null : undefined,
          })
          .eq("id", g.id);
        reEvaluated++;
      } catch (err) {
        console.error(`[ai-reevaluate] Failed for grant ${g.id}:`, err);
        failed++;
      }
      await sleep(200);
    }

    return NextResponse.json({
      total: grants.length,
      reEvaluated,
      failed,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
