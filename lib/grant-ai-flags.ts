/**
 * Shared AI-flag rules for grant scoring pages (client-safe — no server imports).
 *
 * Single source of truth so the badge, the "AI flagged (N)" count, and the
 * sort order agree on every scoring page.
 */

export type AiRelevance =
  | "relevant"
  | "irrelevant"
  | "uncertain"
  | "not_evaluated"
  | null
  | undefined;

export interface AiFlagFields {
  ai_relevance?: AiRelevance;
  ai_invalidated_at?: string | null;
  ai_validated_at?: string | null;
}

/** AI returned a non-relevant verdict (regardless of reviewer action). */
export function aiRaisedFlag(g: AiFlagFields): boolean {
  return g.ai_relevance === "irrelevant" || g.ai_relevance === "uncertain";
}

/** A reviewer marked this AI-flagged application as valid. */
export function isAiValidated(g: AiFlagFields): boolean {
  return aiRaisedFlag(g) && !!g.ai_validated_at;
}

/** A reviewer skipped / marked this application invalid. */
export function isAiSkipped(g: AiFlagFields): boolean {
  return !!g.ai_invalidated_at;
}

/**
 * Still needs a reviewer decision: AI flagged it and nobody has
 * marked it valid or skipped it yet.
 */
export function isAiFlagPending(g: AiFlagFields): boolean {
  return aiRaisedFlag(g) && !g.ai_validated_at && !g.ai_invalidated_at;
}

/**
 * Should sort to the bottom of the list: unresolved AI flag OR skipped.
 * Validated applications sort with everyone else.
 */
export function sortsToBottom(g: AiFlagFields): boolean {
  return isAiFlagPending(g) || isAiSkipped(g);
}
