/**
 * Routing rules for AI-scored first-round review (client-safe, pure).
 *
 * A cycle routes when grant_cycles.ai_scoring_enabled is true AND
 * ai_score_cutoff is set. With the cutoff empty it runs in shadow mode:
 * applications are scored but nobody's queue changes.
 *
 *   reviewer1  at/above the cutoff, already reviewed, scoring kept failing,
 *              or a code eligibility check failed (rare; she sees the flag and
 *              decides, rather than an auto-reject on a possibly wrong check)
 *   sampled    below the cutoff but in the random sample (looks identical to
 *              reviewer1 in the Reviewer 1 UI)
 *   held       below the cutoff; not reviewed; rejected with everyone else
 *              at cycle finalize
 *
 * Routing only ever moves an application toward Reviewer 1: a held app is
 * promoted if the cutoff is lowered, and nothing routed to Reviewer 1 is ever
 * taken away from her.
 */

export type ReviewQueue = "reviewer1" | "sampled" | "held";
export type ReviewQueueReason =
  | "at_or_above_cutoff"
  | "already_reviewed"
  | "scoring_failed"
  | "random_sample"
  | "below_cutoff"
  | "ineligible";

export const MAX_SCORE_ATTEMPTS = 3;

export interface RoutingCycle {
  ai_scoring_enabled: boolean | null;
  ai_score_cutoff: number | string | null;
  selection_method?: string | null;
}

/** True when the cycle's Reviewer 1 queue is filtered by review_queue. */
export function routingActive(cycle: RoutingCycle | null | undefined): boolean {
  return (
    !!cycle?.ai_scoring_enabled &&
    cycle.selection_method !== "random" &&
    cycle.ai_score_cutoff !== null &&
    cycle.ai_score_cutoff !== undefined &&
    cycle.ai_score_cutoff !== ""
  );
}

/** Should Reviewer 1 see this application? (Used by the queue and completion.) */
export function visibleToReviewer1(g: {
  review_queue: string | null;
  has_first_score: boolean;
  ai_invalidated_at: string | null;
}): boolean {
  return g.review_queue === "reviewer1" || g.review_queue === "sampled" || g.has_first_score || !!g.ai_invalidated_at;
}

/**
 * Deterministic value in [0, 1) from a grant id (FNV-1a over the UUID text).
 * Same id → same answer on every run, so the sample can be reproduced.
 */
export function sampleBucket(grantId: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < grantId.length; i++) {
    h ^= grantId.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h / 0x100000000;
}

export interface RouteInput {
  grantId: string;
  currentQueue: ReviewQueue | null;
  currentReason: ReviewQueueReason | null;
  /** Reviewer 1 has scored it, or skipped it ("Skip & Mark Invalid"). */
  alreadyReviewed: boolean;
  /** Code eligibility (membership / grant restrictions) has run. */
  eligibilityEvaluated: boolean;
  /** A code eligibility check failed. */
  codeIneligible: boolean;
  aiTotal: number | null;
  scoreAttempts: number;
  cutoff: number;
  sampleRate: number;
}

export type RouteDecision =
  | { action: "none" }
  | { action: "score" }
  | { action: "route"; queue: ReviewQueue; reason: ReviewQueueReason };

export function decideRoute(i: RouteInput): RouteDecision {
  // Never take anything away from Reviewer 1.
  if (i.currentQueue === "reviewer1" || i.currentQueue === "sampled") return { action: "none" };

  if (i.alreadyReviewed) return { action: "route", queue: "reviewer1", reason: "already_reviewed" };

  if (i.currentQueue === "held") {
    // Promote below-cutoff apps when the cutoff drops.
    if (i.currentReason === "below_cutoff" && i.aiTotal !== null && i.aiTotal >= i.cutoff) {
      return { action: "route", queue: "reviewer1", reason: "at_or_above_cutoff" };
    }
    return { action: "none" };
  }

  // Unrouted from here on.
  if (!i.eligibilityEvaluated) return { action: "none" }; // wait for the eval queue
  if (i.codeIneligible) return { action: "route", queue: "reviewer1", reason: "ineligible" };

  if (i.aiTotal === null) {
    if (i.scoreAttempts >= MAX_SCORE_ATTEMPTS) return { action: "route", queue: "reviewer1", reason: "scoring_failed" };
    return { action: "score" };
  }

  if (i.aiTotal >= i.cutoff) return { action: "route", queue: "reviewer1", reason: "at_or_above_cutoff" };
  if (sampleBucket(i.grantId) < i.sampleRate) return { action: "route", queue: "sampled", reason: "random_sample" };
  return { action: "route", queue: "held", reason: "below_cutoff" };
}

/** Both code checks present and at least one failed. */
export function codeEligibility(checks: unknown): { evaluated: boolean; ineligible: boolean } {
  if (!checks || typeof checks !== "object") return { evaluated: false, ineligible: false };
  const c = checks as Record<string, { verdict?: string } | undefined>;
  const verdicts = [c.membership?.verdict, c.grant_restrictions?.verdict];
  if (verdicts.some((v) => v === undefined)) return { evaluated: false, ineligible: false };
  return { evaluated: true, ineligible: verdicts.includes("fail") };
}
