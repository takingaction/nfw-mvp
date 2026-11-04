/**
 * AI review settings on grant_cycles (client-safe, pure): parsing for the
 * update-cycle route and projections for the admin readout.
 */

export const AI_CUTOFF_OPTIONS = Array.from({ length: 19 }, (_, i) => i * 0.5); // 0–9

export interface AiSettingsUpdate {
  ai_scoring_enabled?: boolean;
  ai_score_cutoff?: number | null;
  ai_sample_rate?: number;
  reviewer2_cap?: number | null;
  reviewer2_discussion_slots?: number;
}

const blank = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

/**
 * Validate the AI fields of an update-cycle body. Fields absent from the body
 * are left out (column unchanged). `ai_sample_rate` arrives as a percent.
 */
export function parseAiSettings(body: Record<string, unknown>): { update: AiSettingsUpdate; error?: string } {
  const u: AiSettingsUpdate = {};
  if ("ai_scoring_enabled" in body) u.ai_scoring_enabled = body.ai_scoring_enabled === true;

  if ("ai_score_cutoff" in body) {
    if (blank(body.ai_score_cutoff)) u.ai_score_cutoff = null;
    else {
      const n = Number(body.ai_score_cutoff);
      if (!AI_CUTOFF_OPTIONS.includes(n)) return { update: u, error: "AI cutoff must be 0–9 in half points, or blank for shadow mode." };
      u.ai_score_cutoff = n;
    }
  }
  if ("ai_sample_rate" in body && !blank(body.ai_sample_rate)) {
    const pct = Number(body.ai_sample_rate);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return { update: u, error: "Sample rate must be between 0% and 100%." };
    u.ai_sample_rate = Math.round(pct * 10) / 1000; // one decimal place of percent
  }
  if ("reviewer2_cap" in body) {
    if (blank(body.reviewer2_cap)) u.reviewer2_cap = null;
    else {
      const n = Number(body.reviewer2_cap);
      if (!Number.isInteger(n) || n <= 0) return { update: u, error: "Reviewer 2 cap must be a whole number above 0, or blank for no cap." };
      u.reviewer2_cap = n;
    }
  }
  if ("reviewer2_discussion_slots" in body && !blank(body.reviewer2_discussion_slots)) {
    const n = Number(body.reviewer2_discussion_slots);
    if (!Number.isInteger(n) || n < 0) return { update: u, error: "Needs Discussion slots must be a whole number, 0 or more." };
    u.reviewer2_discussion_slots = n;
  }
  return { update: u };
}

/** Stats returned by /api/admin/grants/[id]/ai-routing-stats. */
export interface AiRoutingStats {
  total: number;
  /** Reviewer 1 already scored or skipped: always stays with her. */
  alreadyReviewed: number;
  /** Failed a code eligibility check: routed to Reviewer 1. */
  ineligible: number;
  /** Rubric scoring failed 3 times: routed to Reviewer 1. */
  scoringFailed: number;
  /** Eligibility not evaluated yet, or waiting to be scored. */
  pending: number;
  /** AI totals of scored, not-yet-reviewed apps: histogram by half point (index = total × 2). */
  scoredHistogram: number[];
  /** Current routing (only meaningful while routing is on). */
  queues: { reviewer1: number; sampled: number; held: number; unrouted: number };
  /** Share of the cycle's application window elapsed (0–1). */
  elapsed: number;
}

/** Expected Reviewer 1 volume if the cutoff were `c`. */
export function projectReviewer1(stats: AiRoutingStats, c: number, sampleRate: number) {
  let above = 0, below = 0;
  stats.scoredHistogram.forEach((n, i) => (i / 2 >= c ? (above += n) : (below += n)));
  const always = stats.alreadyReviewed + stats.ineligible + stats.scoringFailed;
  const soFar = always + above + Math.round(below * sampleRate);
  const scored = above + below;
  const share = scored ? (above + below * sampleRate) / scored : 0;
  // Pending apps route like the scored ones; extrapolate the rest of the window.
  const withPending = soFar + stats.pending * share;
  const atClose = stats.elapsed > 0.02 ? Math.round(withPending / Math.min(stats.elapsed, 1)) : null;
  return { soFar, atClose, above, below };
}

/** Fraction of [start, end-of-end-date] elapsed. Dates are date-only (PT site). */
export function cycleElapsed(start: string | null, end: string | null, now = Date.now()): number {
  if (!start || !end) return 1;
  const s = Date.parse(start.slice(0, 10) + "T08:00:00Z"); // midnight PT (PST)
  const e = Date.parse(end.slice(0, 10) + "T08:00:00Z") + 24 * 3600 * 1000;
  if (!(e > s)) return 1;
  return Math.max(0, Math.min(1, (now - s) / (e - s)));
}
