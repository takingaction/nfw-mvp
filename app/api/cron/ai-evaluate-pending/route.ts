import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TIME_BUDGET_MS = 250_000; // 250s — leaves 50s buffer for Vercel 300s limit
const THROTTLE_MS = 200;
const PAGE_SIZE = 100;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function GET(request: Request) {
  // CRON_SECRET authorization (same convention as other cron routes)
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    console.log("[ai-evaluate-pending] Unauthorized request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Skip work if the API key isn't configured (lib/anthropic.ts logs the warning
  // on first call; no point looping through N rows just to record the same fallback).
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log(
      "[ai-evaluate-pending] ANTHROPIC_API_KEY not configured, skipping",
    );
    return NextResponse.json(
      { message: "ANTHROPIC_API_KEY not configured, skipping" },
      { status: 200 },
    );
  }

  // Lazy import so a missing SDK doesn't break the route
  const { evaluateGrantApplication, AI_MODEL_VERSION } = await import(
    "@/lib/anthropic"
  );

  const startTime = Date.now();

  // Fetch all unevaluated grants (status='submitted', ai_relevance IS NULL or
  // 'not_evaluated') across all cycles, paginated. For each row we need the
  // cycle's name + description — fetch in bulk after gathering grant IDs.
  const allGrants: Array<{
    id: string;
    cycle_id: string;
    who_are_you: string | null;
    biggest_challenge: string | null;
    fund_usage: string | null;
  }> = [];

  let page = 0;
  let hasMore = true;
  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabaseAdmin
      .from("grants")
      .select("id, cycle_id, who_are_you, biggest_challenge, fund_usage")
      .eq("status", "submitted")
      .or("ai_relevance.is.null,ai_relevance.eq.not_evaluated")
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) {
      console.error("[ai-evaluate-pending] Error fetching grants:", error);
      return NextResponse.json(
        { error: "Failed to fetch grants" },
        { status: 500 },
      );
    }

    if (data && data.length > 0) {
      allGrants.push(...data);
      hasMore = data.length === PAGE_SIZE;
      page++;
    } else {
      hasMore = false;
    }
  }

  if (allGrants.length === 0) {
    console.log("[ai-evaluate-pending] No grants need evaluation");
    return NextResponse.json({
      message: "No grants need evaluation",
      evaluated: 0,
      failed: 0,
      remaining: 0,
    });
  }

  // Gather unique cycle IDs and fetch their names + descriptions in one query
  const uniqueCycleIds = Array.from(
    new Set(allGrants.map((g) => g.cycle_id).filter(Boolean)),
  ) as string[];

  const cycleMap = new Map<string, { cycle_name: string; description: string }>();
  if (uniqueCycleIds.length > 0) {
    const { data: cycles, error: cyclesError } = await supabaseAdmin
      .from("grant_cycles")
      .select("id, cycle_name, description")
      .in("id", uniqueCycleIds);

    if (cyclesError) {
      console.error(
        "[ai-evaluate-pending] Error fetching cycles:",
        cyclesError,
      );
      return NextResponse.json(
        { error: "Failed to fetch cycles" },
        { status: 500 },
      );
    }

    for (const c of cycles ?? []) {
      cycleMap.set(c.id, {
        cycle_name: c.cycle_name || "",
        description: c.description || "",
      });
    }
  }

  let evaluated = 0;
  let failed = 0;
  let budgetReached = false;

  for (const grant of allGrants) {
    const cycle = cycleMap.get(grant.cycle_id);
    if (!cycle) {
      // Cycle was deleted or id mismatch — skip without failing
      console.warn(
        `[ai-evaluate-pending] No cycle found for grant ${grant.id} (cycle_id=${grant.cycle_id}), skipping`,
      );
      failed++;
      continue;
    }

    try {
      const result = await evaluateGrantApplication({
        cycleName: cycle.cycle_name,
        cycleDescription: cycle.description,
        whoAreYou: grant.who_are_you || "",
        biggestChallenge: grant.biggest_challenge || "",
        fundUsage: grant.fund_usage || "",
      });
      await supabaseAdmin
        .from("grants")
        .update({
          ai_relevance: result.relevance,
          ai_reasoning: result.reasoning,
          ai_evaluated_at: new Date().toISOString(),
          ai_model_version: result.model || AI_MODEL_VERSION,
        })
        .eq("id", grant.id);
      evaluated++;
    } catch (err) {
      console.error(
        `[ai-evaluate-pending] AI eval failed for grant ${grant.id}:`,
        err,
      );
      failed++;
    }

    // Time budget check (after every call so we don't overrun)
    if (Date.now() - startTime > TIME_BUDGET_MS) {
      console.log(
        `[ai-evaluate-pending] Time budget reached after ${evaluated + failed}/${allGrants.length}`,
      );
      budgetReached = true;
      break;
    }

    // Gentle throttle to stay well under Claude's rate limit
    await sleep(THROTTLE_MS);
  }

  const remaining = allGrants.length - evaluated - failed;
  const elapsedMs = Date.now() - startTime;

  console.log(
    `[ai-evaluate-pending] Complete: ${evaluated}/${allGrants.length} succeeded, ${failed} failed, ${remaining} remaining${budgetReached ? " (budget reached)" : ""} in ${elapsedMs}ms`,
  );

  return NextResponse.json({
    success: true,
    total: allGrants.length,
    evaluated,
    failed,
    remaining,
    budgetReached,
    elapsedMs,
  });
}
