import { createClient } from "@supabase/supabase-js";
import { requireGrantsAccess } from "@/middleware/adminCheck";
import Link from "next/link";
import { ArrowLeft, Lock, Sparkles } from "lucide-react";
import AdminGrantReviewer from "@/components/admin/AdminGrantReviewer";
import AiReevaluateButton from "@/components/admin/AiReevaluateButton";
import AiResetButton from "@/components/admin/AiResetButton";
import AiBackfillButton from "@/components/admin/AiBackfillButton";
import { formatESTDisplay } from "@/lib/dates";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function AdminGrantCyclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { isAdmin } = await requireGrantsAccess({ redirectOnFailure: true });
  const { id } = await params;

  const { data: cycle } = await supabaseAdmin
    .from("grant_cycles")
    .select("*")
    .eq("id", id)
    .single();

  if (!cycle)
    return <div className="p-8 text-red-600">Grant cycle not found.</div>;

  const { data: grants, error: grantsError } = await supabaseAdmin
    .from("grants")
    .select(
      `
      *,
      profiles:user_id (full_name, city, state, date_of_birth, household_income, email),
      grant_scores (reviewer_name, total_score, needs_discussion)
    `,
    )
    .eq("cycle_id", id)
    .order("submitted_at", { ascending: false });

  if (grantsError) {
    console.error("Error fetching grants:", grantsError);
  }

  // Count of submitted grants that haven't been AI-evaluated yet
  const unevaluatedAiCount = (grants || []).filter(
    (g: any) => g.status === "submitted" && (g.ai_relevance === "not_evaluated" || !g.ai_relevance),
  ).length;

  // Get grants in scope for second review (first score >= 7 OR first flagged)
  const grantsInScope = grants?.filter((g: any) => {
    if (!g.rachel_complete) return false;
    const firstScore = g.grant_scores?.find((s: any) => s.reviewer_name === "first");
    if (!firstScore) return false;
    const totalScore = firstScore.total_score || 0;
    const wasFlagged = firstScore.needs_discussion === true;
    return totalScore >= 7 || wasFlagged;
  }) || [];

  // Second review is complete if:
  // - No grants in scope (nothing to review), OR
  // - All grants in scope have michelle_complete = true
  const allSecondComplete = grantsInScope.length === 0
    ? true
    : grantsInScope.every((g: any) => g.michelle_complete);

  const { data: documents } = await supabaseAdmin
    .from("grant_documents")
    .select("*")
    .in("grant_id", grants?.map((g) => g.id) || []);

  // Fetch the in-flight AI job (if any) for this cycle. Used by the
  // citrine banner so the copy reflects reality when cron is mid-tick.
  // 2026-09-20: previously the banner always said "click 'Continue AI
  // Backfill' to run Claude" even when the cron worker was actively
  // processing the cycle — confusing for the admin who'd click and see
  // nothing happen. Now the banner says "Claude is currently evaluating"
  // and the button (separately) shows its own progress.
  const { data: inflightAiJob } = await supabaseAdmin
    .from("ai_backfill_jobs")
    .select("id, status, processed_count, total_count")
    .eq("cycle_id", id)
    .in("status", ["pending", "processing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const grantsWithDocs =
    grants?.map((g) => ({
      ...g,
      documents: documents?.filter((d) => d.grant_id === g.id) || [],
    })) || [];

  const readyToPayCount = grants?.filter(
    (g) => g.status === "payment_pending",
  ).length || 0;

  // Check scoring status
  const scoringStarted = !!cycle.scoring_started_at;
  const finalApproved = !!cycle.final_approved_at;

  // Check if first reviewer has completed all scores (all grants have rachel_complete = true)
  const allFirstComplete = grants?.every((g) => g.rachel_complete) || false;

  const submittedCount = (grants || []).filter(
    (g: { status: string }) => g.status === "submitted",
  ).length;
  const totalCount = grants?.length || 0;

  // Scoring workflow step states
  const secondUnlocked = allFirstComplete;
  const combinedUnlocked = finalApproved || allSecondComplete;

  const stepBase =
    "w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 font-ui text-sm font-medium transition-colors";
  const stepBadge =
    "w-5 h-5 inline-flex items-center justify-center text-[11px] font-black flex-shrink-0";

  return (
    <main className="min-h-screen p-4 sm:p-8 bg-nfw-dove">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/admin/grants"
          className="flex items-center gap-2 text-sm text-nfw-blackberry/50 hover:text-nfw-blackberry mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Grants
        </Link>

        {unevaluatedAiCount > 0 && (
          <div className="mb-6 px-4 py-3 bg-nfw-citrine/20 border-l-4 border-nfw-citrine flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm font-ui text-nfw-blackberry">
              <strong>{unevaluatedAiCount}</strong> application
              {unevaluatedAiCount === 1 ? "" : "s"} still need
              {unevaluatedAiCount === 1 ? "s" : ""} AI evaluation
              {inflightAiJob
                ? ` — Claude is currently evaluating (${inflightAiJob.processed_count}/${inflightAiJob.total_count}).`
                : scoringStarted
                  ? isAdmin
                    ? " — click 'Continue AI Backfill' to run Claude."
                    : "."
                  : " — these will be evaluated when you click Start Scoring."}
            </p>
            {scoringStarted && isAdmin && (
              <AiBackfillButton
                cycleId={id}
                initialCount={unevaluatedAiCount}
              />
            )}
          </div>
        )}

        {/* ── Title + stats ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
          <div className="min-w-0">
            <h1 className="text-3xl sm:text-4xl font-bold text-nfw-blackberry mb-2 font-serif break-words">
              {cycle.cycle_name}
            </h1>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-nfw-blackberry/60">
              <span>
                {formatESTDisplay(new Date(cycle.start_date))} —{" "}
                {formatESTDisplay(new Date(cycle.end_date))}
              </span>
              <span aria-hidden="true">·</span>
              <span>${cycle.amount_per_grant?.toLocaleString("en-US")} per grant</span>
              <span aria-hidden="true">·</span>
              <span>{cycle.grants_available} available</span>
            </p>
          </div>

          <div className="flex gap-3 flex-shrink-0">
            <div className="flex-1 md:flex-none min-w-[7.5rem] px-4 py-2 bg-white border border-nfw-blackberry/10">
              <p className="text-2xl sm:text-3xl font-black text-nfw-blackberry font-ui leading-none">
                {totalCount}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wide font-ui text-nfw-blackberry/50">
                applications
              </p>
            </div>
            <div className="flex-1 md:flex-none min-w-[7.5rem] px-4 py-2 bg-white border border-nfw-blackberry/10">
              <p
                className={`text-2xl sm:text-3xl font-black font-ui leading-none ${
                  readyToPayCount > 0 ? "text-green-600" : "text-nfw-blackberry"
                }`}
              >
                {readyToPayCount}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-wide font-ui text-nfw-blackberry/50">
                ready to pay
              </p>
            </div>
          </div>
        </div>

        {/* ── Scoring workflow ──────────────────────────────────────── */}
        <div className="bg-white border border-nfw-blackberry/10 p-3 sm:p-4 mb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wide font-ui font-bold text-nfw-blackberry/50 mb-2">
                Scoring workflow
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* 1 — First Review: always active */}
                <Link
                  href={`/admin/grants/${id}/scoring/first`}
                  className={`${stepBase} bg-nfw-aubergine text-white hover:bg-nfw-aubergine/90`}
                >
                  <span className={`${stepBadge} bg-white/20`}>1</span>
                  First Review
                </Link>

                {/* 2 — Second Review: locked until all first reviews complete */}
                <Link
                  href={secondUnlocked ? `/admin/grants/${id}/scoring/second` : "#"}
                  aria-disabled={!secondUnlocked}
                  tabIndex={secondUnlocked ? undefined : -1}
                  title={secondUnlocked ? undefined : "Unlocks when the first review is complete"}
                  className={`${stepBase} ${
                    secondUnlocked
                      ? "bg-nfw-wisteria text-white hover:bg-nfw-wisteria/80"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
                  }`}
                >
                  <span className={`${stepBadge} ${secondUnlocked ? "bg-white/20" : "bg-gray-200"}`}>
                    {secondUnlocked ? "2" : <Lock className="w-3 h-3" />}
                  </span>
                  Second Review
                </Link>

                {/* 3 — Combined Scores: locked until all second reviews complete */}
                <Link
                  href={combinedUnlocked ? `/admin/grants/${id}/scoring/combined` : "#"}
                  aria-disabled={!combinedUnlocked}
                  tabIndex={combinedUnlocked ? undefined : -1}
                  title={combinedUnlocked ? undefined : "Unlocks when the second review is complete"}
                  className={`${stepBase} ${
                    finalApproved
                      ? "bg-green-100 border border-green-600 text-green-800 hover:bg-green-200"
                      : combinedUnlocked
                      ? "bg-nfw-citrine text-nfw-blackberry hover:bg-nfw-citrine/80"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none"
                  }`}
                >
                  <span
                    className={`${stepBadge} ${
                      finalApproved
                        ? "bg-green-600/15"
                        : combinedUnlocked
                        ? "bg-nfw-blackberry/10"
                        : "bg-gray-200"
                    }`}
                  >
                    {combinedUnlocked ? "3" : <Lock className="w-3 h-3" />}
                  </span>
                  {finalApproved ? "View Finalized" : "Combined Scores"}
                </Link>
              </div>
            </div>

            {isAdmin && (
              <a
                href={`/api/admin/grants/${id}/export`}
                className="w-full sm:w-auto lg:self-end inline-flex items-center justify-center px-4 py-2.5 bg-nfw-dove border border-nfw-blackberry/20 text-nfw-blackberry font-ui text-sm font-medium hover:bg-nfw-dove/80 transition-colors flex-shrink-0"
              >
                Download CSV
              </a>
            )}
          </div>
        </div>

        {/* ── AI Evaluation (admin only) ───────────────────────────── */}
        {isAdmin && (
          <div className="bg-nfw-dove border border-nfw-blackberry/10 p-3 sm:p-4 mb-8">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-ui font-bold text-nfw-blackberry/50">
                <Sparkles className="w-3.5 h-3.5" />
                AI Evaluation
              </p>
              {unevaluatedAiCount > 0 && (
                <p className="text-xs font-ui text-nfw-blackberry/50">
                  {unevaluatedAiCount} of {submittedCount} submitted not yet evaluated
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-start gap-2">
              <AiReevaluateButton
                cycleId={id}
                unevaluatedCount={unevaluatedAiCount}
                totalCount={submittedCount}
              />
              <AiResetButton cycleId={id} totalCount={totalCount} />
            </div>
          </div>
        )}

        <AdminGrantReviewer grants={grantsWithDocs} cycle={cycle} isAdmin={isAdmin} />
      </div>
    </main>
  );
}
