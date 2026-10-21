/**
 * Full grant evaluation (server-only): code eligibility checks + AI criteria.
 *
 * Every AI evaluation path (submission queue, pending sweep, backfill,
 * re-evaluate, scoring start) goes through evaluateGrantFull() so they all
 * write the same columns the same way:
 *
 *   ai_relevance        overall verdict across all four criteria
 *   ai_reasoning        failing code checks first, then the AI's explanation
 *   ai_criteria         { completeness, permitted_use }   (AI)
 *   eligibility_checks  { membership, grant_restrictions } (code)
 *   ai_evaluated_at, ai_model_version
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { evaluateGrantApplication, AI_MODEL_VERSION, type EvaluationResult } from "@/lib/anthropic";
import { runEligibilityChecks } from "@/lib/grant-eligibility-checks";
import {
  combineVerdicts,
  type AiCriteria,
  type CriterionResult,
  type EligibilityChecks,
  type OverallRelevance,
} from "@/lib/grant-criteria";

/** Columns evaluateGrantFull() needs from `grants`. */
export const GRANT_EVAL_COLUMNS = "id, user_id, who_are_you, biggest_challenge, fund_usage";
/** Columns evaluateGrantFull() needs from `grant_cycles`. */
export const CYCLE_EVAL_COLUMNS = "id, cycle_name, description, end_date";

export interface EvalGrant {
  id: string;
  user_id: string;
  who_are_you: string | null;
  biggest_challenge: string | null;
  fund_usage: string | null;
}

export interface EvalCycle {
  id: string;
  cycle_name: string | null;
  description: string | null;
  end_date: string | null;
}

export interface GrantEvaluationPayload {
  ai_relevance: OverallRelevance;
  ai_reasoning: string;
  ai_criteria: AiCriteria | null;
  eligibility_checks: EligibilityChecks;
  ai_evaluated_at: string;
  ai_model_version: string;
}

const CODE_LABELS: Record<"membership" | "grant_restrictions", string> = {
  membership: "Membership",
  grant_restrictions: "Grant restrictions",
};

/** Pure: merge code checks and the AI result into the row update. */
export function buildEvaluationPayload(
  checks: EligibilityChecks,
  ai: Pick<EvaluationResult, "relevance" | "reasoning" | "criteria" | "model">,
  now: string = new Date().toISOString(),
): GrantEvaluationPayload {
  const codeResults: Array<[keyof typeof CODE_LABELS, CriterionResult]> = [
    ["membership", checks.membership],
    ["grant_restrictions", checks.grant_restrictions],
  ];
  const codeFailures = codeResults
    .filter(([, r]) => r.verdict === "fail")
    .map(([k, r]) => `${CODE_LABELS[k]}: ${r.note}`);

  let relevance: OverallRelevance;
  if (ai.criteria) {
    relevance = combineVerdicts([
      checks.membership,
      checks.grant_restrictions,
      ai.criteria.completeness,
      ai.criteria.permitted_use,
    ]);
  } else {
    // AI call failed: a failed code check still decides; otherwise fall back
    // to "uncertain" exactly as before.
    relevance = codeFailures.length > 0 ? "irrelevant" : "uncertain";
  }

  const reasoningParts: string[] = [];
  if (codeFailures.length > 0) reasoningParts.push(`Not eligible. ${codeFailures.join(" ")}`);
  if (ai.reasoning) reasoningParts.push(ai.reasoning);

  return {
    ai_relevance: relevance,
    ai_reasoning: reasoningParts.join(" ").slice(0, 1000),
    ai_criteria: ai.criteria ?? null,
    eligibility_checks: checks,
    ai_evaluated_at: now,
    ai_model_version: ai.model || AI_MODEL_VERSION,
  };
}

/**
 * Evaluate one grant. Pass `checks` when the caller already ran
 * runEligibilityChecks() for a batch; otherwise they're computed here.
 * Never throws for AI failures (those come back as "uncertain").
 */
export async function evaluateGrantFull(
  admin: SupabaseClient,
  grant: EvalGrant,
  cycle: EvalCycle,
  checks?: EligibilityChecks,
): Promise<{ payload: GrantEvaluationPayload; ai: EvaluationResult }> {
  const resolvedChecks =
    checks ??
    (await runEligibilityChecks(admin, { id: cycle.id, end_date: cycle.end_date }, [grant.user_id])).get(
      grant.user_id,
    )!;

  const ai = await evaluateGrantApplication({
    cycleName: cycle.cycle_name || "",
    cycleDescription: cycle.description || "",
    whoAreYou: grant.who_are_you || "",
    biggestChallenge: grant.biggest_challenge || "",
    fundUsage: grant.fund_usage || "",
  });

  return { payload: buildEvaluationPayload(resolvedChecks, ai), ai };
}

/** Convenience for batch workers: checks for every grant's member in one go. */
export async function eligibilityForGrants(
  admin: SupabaseClient,
  cycle: EvalCycle,
  grants: Array<Pick<EvalGrant, "user_id">>,
): Promise<Map<string, EligibilityChecks>> {
  return runEligibilityChecks(
    admin,
    { id: cycle.id, end_date: cycle.end_date },
    grants.map((g) => g.user_id),
  );
}
