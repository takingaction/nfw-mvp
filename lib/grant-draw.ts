/**
 * Random-draw cycles (server-only): load state and pick winners.
 * Rules live in lib/grant-draw-rules.ts (shared with the UI).
 */
import { randomInt } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllPages } from "@/lib/supabase-paginate";
import {
  isDrawEligible,
  summarizeDraw,
  type DrawGrantFields,
  type DrawRow,
  type DrawSummary,
} from "@/lib/grant-draw-rules";

export const DRAW_CYCLE_COLUMNS =
  "id, cycle_name, end_date, grants_available, selection_method, scoring_started_at, scoring_completed_at, final_approved_at, is_finalized";

export interface DrawCycle {
  id: string;
  cycle_name: string | null;
  end_date: string | null;
  grants_available: number;
  selection_method: string | null;
  scoring_started_at: string | null;
  scoring_completed_at: string | null;
  final_approved_at: string | null;
  is_finalized: boolean | null;
}

export interface DrawContext {
  cycle: DrawCycle;
  grants: Array<DrawGrantFields & { user_id: string }>;
  draws: DrawRow[];
  summary: DrawSummary;
}

/**
 * Unbiased random sample of `n` items (partial Fisher–Yates using the OS
 * CSPRNG via crypto.randomInt). Does not mutate `items`.
 */
export function pickRandom<T>(items: readonly T[], n: number, rand: (max: number) => number = randomInt): T[] {
  const a = items.slice();
  const k = Math.max(0, Math.min(n, a.length));
  for (let i = 0; i < k; i++) {
    const j = i + rand(a.length - i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, k);
}

export async function loadDrawContext(
  admin: SupabaseClient,
  cycleId: string,
): Promise<{ ctx: DrawContext | null; error: string | null }> {
  const { data: cycle, error: cycleErr } = await admin
    .from("grant_cycles")
    .select(DRAW_CYCLE_COLUMNS)
    .eq("id", cycleId)
    .maybeSingle<DrawCycle>();
  if (cycleErr) return { ctx: null, error: cycleErr.message };
  if (!cycle) return { ctx: null, error: "Cycle not found" };

  const grantsRes = await fetchAllPages<DrawGrantFields & { user_id: string }>((from, to) =>
    admin
      .from("grants")
      .select("id, user_id, status, ai_relevance, ai_invalidated_at, ai_validated_at")
      .eq("cycle_id", cycleId)
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (grantsRes.error) return { ctx: null, error: grantsRes.error.message };

  const drawsRes = await fetchAllPages<DrawRow>((from, to) =>
    admin
      .from("grant_draws")
      .select("id, grant_id, round, pool_size, status, drawn_at, drawn_by, decided_at, decided_by")
      .eq("cycle_id", cycleId)
      .order("drawn_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to),
  );
  if (drawsRes.error) return { ctx: null, error: drawsRes.error.message };

  const summary = summarizeDraw(grantsRes.data, drawsRes.data, cycle.grants_available || 0);
  return {
    ctx: { cycle, grants: grantsRes.data, draws: drawsRes.data, summary },
    error: null,
  };
}

/** Grants that can be drawn now: eligible and not holding a non-voided draw. */
export function drawPool(ctx: DrawContext): Array<DrawGrantFields & { user_id: string }> {
  const taken = new Set(ctx.draws.filter((d) => d.status !== "voided").map((d) => d.grant_id));
  return ctx.grants.filter((g) => isDrawEligible(g) && !taken.has(g.id));
}

/**
 * For random cycles: replace grant_tentative_approvals with the confirmed
 * winners so the existing Finalize Approvals logic approves exactly them.
 */
export async function syncTentativeApprovalsFromDraws(
  admin: SupabaseClient,
  cycleId: string,
  confirmedGrantIds: string[],
  approvedBy: string,
): Promise<string | null> {
  const { error: delErr } = await admin
    .from("grant_tentative_approvals")
    .delete()
    .eq("cycle_id", cycleId);
  if (delErr) return delErr.message;
  if (confirmedGrantIds.length === 0) return null;
  const now = new Date().toISOString();
  const { error: insErr } = await admin.from("grant_tentative_approvals").insert(
    confirmedGrantIds.map((grantId) => ({
      grant_id: grantId,
      cycle_id: cycleId,
      combined_score: null,
      is_approved: true,
      approved_by: approvedBy,
      approved_at: now,
    })),
  );
  return insErr ? insErr.message : null;
}
