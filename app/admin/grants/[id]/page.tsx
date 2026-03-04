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

  const { data: grants } = await supabaseAdmin
    .from("grants")
    .select(
      `
      *,
      profiles:user_id (full_name, email, city, state, age_range, household_income)
    `,
    )
    .eq("cycle_id", id)
    .order("submitted_at", { ascending: false });

  const { data: documents } = await supabaseAdmin
    .from("grant_documents")
    .select("*")
    .in("grant_id", grants?.map((g) => g.id) || []);

  const grantsWithDocs =
    grants?.map((g) => ({
      ...g,
      documents: documents?.filter((d) => d.grant_id === g.id) || [],
    })) || [];

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/admin/grants"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#2d1239] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Grants
        </Link>

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-[#2d1239] mb-2">
              {cycle.cycle_name}
            </h1>
            <p className="text-gray-600">
              {new Date(cycle.start_date).toLocaleDateString()} —{" "}
              {new Date(cycle.end_date).toLocaleDateString()} • $
              {cycle.amount_per_grant?.toLocaleString()} per grant •{" "}
              {cycle.grants_available} available
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-3xl font-black text-[#2d1239]"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              {grants?.length || 0}
            </p>
            <p className="text-sm text-gray-500">applications</p>
          </div>
        </div>

        <AdminGrantReviewer grants={grantsWithDocs} cycle={cycle} />
      </div>
    </main>
  );
}
