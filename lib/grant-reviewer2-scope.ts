/**
 * Which applications go to Reviewer 2 (client-safe, pure). Single source of
 * truth for the Review 2 page, its completion check, the cycle page and the
 * combined-scores page.
 *
 * Base rule (unchanged): not skipped, Reviewer 1 scored it, and her total is
 * >= 7 or she flagged it "Needs Discussion".
 *
 * Cap (grant_cycles.reviewer2_cap, optional): with AI routing, Reviewer 1
 * mostly sees strong applications, so "everything >= 7" could exceed what
 * Reviewer 2 can read. With a cap, Reviewer 2 gets:
 *   1. every "Needs Discussion" app, whatever its score. These do not count
 *      toward the cap.
 *   2. the unflagged apps scored 7+, by Reviewer 1 score, up to the cap.
 * Applications tied with the last one taken are all included, so two apps
 * Reviewer 1 scored the same are never split by an arbitrary order. The
 * score-based part can therefore exceed the cap by the size of that tie.
 */

export const REVIEWER2_MIN_SCORE = 7;

export interface Reviewer2Score {
  reviewer_name: string;
  total_score: number | string | null;
  needs_discussion: boolean | null;
}

export interface Reviewer2Candidate {
  id: string;
  ai_invalidated_at?: string | null;
  grant_scores?: Reviewer2Score[] | null;
}

export interface Reviewer2Settings {
  reviewer2_cap?: number | null;
}

function firstScore(g: Reviewer2Candidate): Reviewer2Score | undefined {
  return g.grant_scores?.find((s) => s.reviewer_name === "first");
}

const total = (g: Reviewer2Candidate) => Number(firstScore(g)?.total_score ?? 0);

/** The pre-cap rule, for one application. */
export function meetsReviewer2Bar(g: Reviewer2Candidate): boolean {
  if (g.ai_invalidated_at) return false;
  const s = firstScore(g);
  if (!s) return false;
  return Number(s.total_score ?? 0) >= REVIEWER2_MIN_SCORE || s.needs_discussion === true;
}

/** Ids of the applications in Reviewer 2's scope. */
export function reviewer2Scope(grants: Reviewer2Candidate[], cycle: Reviewer2Settings | null | undefined): Set<string> {
  const base = grants.filter(meetsReviewer2Bar);
  const cap = cycle?.reviewer2_cap ?? null;
  if (!cap || cap <= 0) return new Set(base.map((g) => g.id));

  // 1. Every "Needs Discussion" app, outside the cap.
  const chosen = new Set(base.filter((g) => firstScore(g)?.needs_discussion === true).map((g) => g.id));

  // 2. Unflagged apps by score, up to the cap.
  const byScore = (a: Reviewer2Candidate, b: Reviewer2Candidate) => total(b) - total(a);
  const rest = base.filter((g) => !chosen.has(g.id)).sort(byScore);
  takeWithTies(rest, cap, chosen);
  return chosen;
}

/** Add the first n of a score-sorted list, plus anything tied with the nth. */
function takeWithTies(sorted: Reviewer2Candidate[], n: number, into: Set<string>) {
  if (n <= 0 || sorted.length === 0) return;
  const last = total(sorted[Math.min(n, sorted.length) - 1]);
  for (let i = 0; i < sorted.length; i++) {
    if (i < n || total(sorted[i]) === last) into.add(sorted[i].id);
    else break;
  }
}
