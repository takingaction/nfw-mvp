/**
 * Random-draw cycle rules (client-safe — pure functions, no server imports).
 *
 * Used by the draw API, the Review 1 hand-off, Finalize Approvals, and the UI
 * so every place agrees on who is in the pool and what is blocking a step.
 */
import { isAiFlagPending, isAiSkipped, type AiFlagFields } from "@/lib/grant-ai-flags";

export type DrawStatus = "drawn" | "confirmed" | "rejected" | "voided";

export interface DrawRow {
  id: string;
  grant_id: string;
  round: number;
  pool_size: number;
  status: DrawStatus;
  drawn_at: string;
  drawn_by: string | null;
  decided_at: string | null;
  decided_by: string | null;
}

export interface DrawGrantFields extends AiFlagFields {
  id: string;
  status?: string | null;
}

export function isAiEvaluated(g: AiFlagFields): boolean {
  return !!g.ai_relevance && g.ai_relevance !== "not_evaluated";
}

/**
 * Eligible to be drawn (ignoring whether it was already drawn):
 * still submitted, AI-evaluated, not skipped, and no unresolved AI flag.
 * A reviewer-validated ("Mark as Valid") application is eligible.
 */
export function isDrawEligible(g: DrawGrantFields): boolean {
  return (
    (g.status ?? "submitted") === "submitted" &&
    isAiEvaluated(g) &&
    !isAiSkipped(g) &&
    !isAiFlagPending(g)
  );
}

export interface DrawSummary {
  total: number;
  notEvaluated: number;
  flagPending: number;
  irrelevantPending: number;
  skipped: number;
  eligible: number;
  /** Eligible and not already holding a non-voided draw. */
  poolRemaining: number;
  /** drawn + confirmed */
  winners: number;
  drawn: number;
  confirmed: number;
  rejected: number;
  target: number;
  /** How many more winners a draw would pick (bounded by the pool). */
  toDraw: number;
  nextRound: number;
}

export function summarizeDraw(
  grants: DrawGrantFields[],
  allDraws: DrawRow[],
  target: number,
): DrawSummary {
  const active = allDraws.filter((d) => d.status !== "voided");
  const drawnIds = new Set(active.map((d) => d.grant_id));
  const eligible = grants.filter(isDrawEligible);
  const drawn = active.filter((d) => d.status === "drawn").length;
  const confirmed = active.filter((d) => d.status === "confirmed").length;
  const rejected = active.filter((d) => d.status === "rejected").length;
  const winners = drawn + confirmed;
  const poolRemaining = eligible.filter((g) => !drawnIds.has(g.id)).length;
  const toDraw = Math.max(0, Math.min(target - winners, poolRemaining));
  return {
    total: grants.length,
    notEvaluated: grants.filter((g) => (g.status ?? "submitted") === "submitted" && !isAiEvaluated(g)).length,
    flagPending: grants.filter(isAiFlagPending).length,
    irrelevantPending: grants.filter((g) => isAiFlagPending(g) && g.ai_relevance === "irrelevant").length,
    skipped: grants.filter(isAiSkipped).length,
    eligible: eligible.length,
    poolRemaining,
    winners,
    drawn,
    confirmed,
    rejected,
    target,
    toDraw,
    nextRound: allDraws.reduce((m, d) => Math.max(m, d.round), 0) + 1,
  };
}

/** Why a draw can't run right now, or null. */
export function drawBlocker(s: DrawSummary): string | null {
  if (s.notEvaluated > 0) {
    return `${s.notEvaluated} application(s) haven't been AI-reviewed yet. Run the AI review first.`;
  }
  if (s.flagPending > 0) {
    return `${s.flagPending} flagged application(s) still need a decision (Mark as Valid or Not Approved).`;
  }
  if (s.winners >= s.target) return `All ${s.target} winners are already drawn.`;
  if (s.poolRemaining === 0) return "No eligible applications are left to draw from.";
  return null;
}

/** Why Reviewer 1 can't hand off to Reviewer 2 yet, or null. */
export function handoffBlocker(s: DrawSummary): string | null {
  if (s.flagPending > 0) {
    return `${s.flagPending} flagged application(s) still need a decision.`;
  }
  if (s.winners === 0) return "Draw winners before handing off.";
  if (s.winners < s.target && s.poolRemaining > 0) {
    return `${s.target - s.winners} more winner(s) need to be drawn.`;
  }
  return null;
}

/** Why Finalize Approvals can't run for a random cycle yet, or null. */
export function finalizeBlocker(s: DrawSummary): string | null {
  if (s.drawn > 0) return `${s.drawn} winner(s) still need to be confirmed or marked not approved.`;
  if (s.confirmed === 0) return "No confirmed winners yet.";
  if (s.confirmed < s.target && s.poolRemaining > 0) {
    return `${s.target - s.confirmed} replacement winner(s) still need to be drawn.`;
  }
  return null;
}
