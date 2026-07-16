import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AdminGrantReviewer from "@/components/admin/AdminGrantReviewer";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function AdminGrantCyclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
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

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/admin/grants"
          className="flex items-center gap-2 text-sm text-nfw-blackberry/50 hover:text-nfw-blackberry mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Grants
        </Link>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-nfw-blackberry mb-2 font-serif">
              {cycle.cycle_name}
            </h1>
            <p className="text-nfw-blackberry/60">
              {new Date(cycle.start_date).toLocaleDateString()} —{" "}
              {new Date(cycle.end_date).toLocaleDateString()} • $
              {cycle.amount_per_grant?.toLocaleString()} per grant •{" "}
              {cycle.grants_available} available
            </p>
          </div>
          <div className="text-right flex gap-6 items-center">
            {/* Scoring Buttons - Always show all 3 */}
            <div className="flex gap-2">
              {/* First Review - Always active */}
              <Link
                href={`/admin/grants/${id}/scoring/first`}
                className="px-4 py-2 bg-nfw-aubergine text-white font-ui text-sm font-medium hover:bg-nfw-aubergine/90 transition-colors"
              >
                First Review
              </Link>

              {/* Second Review - Locked until all first reviews complete */}
              <Link
                href={allFirstComplete ? `/admin/grants/${id}/scoring/second` : "#"}
                className={`px-4 py-2 font-ui text-sm font-medium transition-colors ${
                  allFirstComplete
                    ? "bg-nfw-wisteria text-white hover:bg-nfw-wisteria/80"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                Second Review
              </Link>

              {/* Combined Scores - Locked until all second reviews complete */}
              <Link
                href={finalApproved ? `/admin/grants/${id}/scoring/combined` : allSecondComplete ? `/admin/grants/${id}/scoring/combined` : "#"}
                className={`px-4 py-2 font-ui text-sm font-medium transition-colors ${
                  finalApproved
                    ? "bg-nfw-green/20 border border-nfw-green text-nfw-blackberry hover:bg-nfw-green/30"
                    : allSecondComplete
                    ? "bg-nfw-citrine text-nfw-blackberry hover:bg-nfw-citrine/80"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                {finalApproved ? "View Finalized" : "Combined Scores"}
              </Link>
            </div>

            <div>
              <p
                className={`text-3xl font-black font-ui ${
                  readyToPayCount > 0 ? "text-green-600" : "text-nfw-blackberry"
                }`}
              >
                {readyToPayCount}
              </p>
              <p className="text-sm text-nfw-blackberry/50">ready to pay</p>
            </div>
            <div className="border-l border-nfw-blackberry/10 pl-6">
              <p
                className="text-3xl font-black text-nfw-blackberry font-ui"
              >
                {grants?.length || 0}
              </p>
              <p className="text-sm text-nfw-blackberry/50">applications</p>
            </div>
            <a
              href={`/api/admin/grants/${id}/export`}
              className="px-4 py-2 bg-nfw-dove border border-nfw-blackberry/20 text-nfw-blackberry font-ui text-sm font-medium hover:bg-nfw-dove/80 transition-colors"
            >
              Download CSV
            </a>
          </div>
        </div>

        <AdminGrantReviewer grants={grantsWithDocs} cycle={cycle} />
      </div>
    </main>
  );
}
