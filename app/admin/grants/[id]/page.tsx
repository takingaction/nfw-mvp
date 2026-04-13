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
      profiles:user_id (full_name, city, state, date_of_birth, household_income)
    `,
    )
    .eq("cycle_id", id)
    .order("submitted_at", { ascending: false });

  if (grantsError) {
    console.error("Error fetching grants:", grantsError);
  }

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
          <div className="text-right flex gap-6">
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
          </div>
        </div>

        <AdminGrantReviewer grants={grantsWithDocs} cycle={cycle} />
      </div>
    </main>
  );
}
