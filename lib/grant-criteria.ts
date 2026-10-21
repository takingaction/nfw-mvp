/**
 * Grant review criteria (client-safe — no server imports).
 *
 * Four criteria are checked for every application:
 *   - membership          (code)  member is contributing/founding, or an
 *                                 approved free member, and not paused
 *   - grant_restrictions  (code)  no award in a cycle that ended the month
 *                                 before this cycle's end month
 *   - completeness        (AI)    answers say what the need is and how funds
 *                                 will be used, in enough detail to judge
 *   - permitted_use       (AI)    use fits the cycle's purpose and NFW's
 *                                 policy on harmful/discriminatory/
 *                                 exploitative/unlawful activities
 *
 * The overall ai_relevance is derived from all four: any fail → irrelevant,
 * else any uncertain → uncertain, else relevant.
 */

export type CriterionVerdict = "pass" | "fail" | "uncertain";

export interface CriterionResult {
  verdict: CriterionVerdict;
  note: string;
}

export interface AiCriteria {
  completeness: CriterionResult;
  permitted_use: CriterionResult;
}

export interface EligibilityChecks {
  membership: CriterionResult;
  grant_restrictions: CriterionResult;
  checked_at: string;
}

export type CriterionKey =
  | "membership"
  | "grant_restrictions"
  | "completeness"
  | "permitted_use";

export const CRITERIA: Array<{ key: CriterionKey; label: string; source: "code" | "ai" }> = [
  { key: "membership", label: "Membership", source: "code" },
  { key: "grant_restrictions", label: "Grant restrictions", source: "code" },
  { key: "completeness", label: "Completeness", source: "ai" },
  { key: "permitted_use", label: "Permitted use", source: "ai" },
];

export type OverallRelevance = "relevant" | "irrelevant" | "uncertain";

export function isCriterionResult(v: unknown): v is CriterionResult {
  if (!v || typeof v !== "object") return false;
  const verdict = (v as { verdict?: unknown }).verdict;
  return verdict === "pass" || verdict === "fail" || verdict === "uncertain";
}

/** Collect every criterion result present on a grant row, in display order. */
export function criteriaResults(
  aiCriteria: unknown,
  eligibilityChecks: unknown,
): Array<{ key: CriterionKey; label: string; source: "code" | "ai"; result: CriterionResult }> {
  const merged: Record<string, unknown> = {
    ...(eligibilityChecks && typeof eligibilityChecks === "object" ? eligibilityChecks : {}),
    ...(aiCriteria && typeof aiCriteria === "object" ? aiCriteria : {}),
  };
  const out: Array<{ key: CriterionKey; label: string; source: "code" | "ai"; result: CriterionResult }> = [];
  for (const c of CRITERIA) {
    const r = merged[c.key];
    if (isCriterionResult(r)) out.push({ ...c, result: r });
  }
  return out;
}

/** any fail → irrelevant; else any uncertain → uncertain; else relevant. */
export function combineVerdicts(results: CriterionResult[]): OverallRelevance {
  if (results.some((r) => r.verdict === "fail")) return "irrelevant";
  if (results.length === 0 || results.some((r) => r.verdict === "uncertain")) return "uncertain";
  return "relevant";
}
