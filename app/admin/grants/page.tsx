import { createClient } from "@supabase/supabase-js";
import { requireGrantsAccess } from "@/middleware/adminCheck";
import Link from "next/link";
import { Plus } from "lucide-react";
import SortableCycleList from "@/components/admin/SortableCycleList";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface CycleStats {
  total: number;
  submitted: number;
  approved: number;
  not_approved: number;
  payment_pending: number;
  payment_sent: number;
}

export default async function AdminGrantsPage() {
  await requireGrantsAccess({ redirectOnFailure: true });

  const { data: cycles } = await supabaseAdmin
    .from("grant_cycles")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  // Mark cycles as closed if end_date has passed (belt-and-suspenders fix)
  const now = new Date();
  const cyclesWithClosedStatus = cycles?.map((c: any) => ({
    ...c,
    status: c.end_date && new Date(c.end_date) < now && c.status === 'open' ? 'closed' : c.status,
  }));

  // Get per-cycle grant stats via RPC - bypasses 1000 row limit
  const { data: cycleStatsData } = await supabaseAdmin.rpc("get_grant_counts_by_cycle");

  // Aggregate into a map: cycleId -> CycleStats
  const cycleStats: Record<string, CycleStats> = {};
  let totalApplications = 0;
  let totalApproved = 0;
  let totalPaymentSent = 0;

  for (const row of cycleStatsData || []) {
    cycleStats[row.cycle_id] = {
      total: Number(row.total) || 0,
      submitted: Number(row.submitted) || 0,
      approved: Number(row.approved) || 0,
      not_approved: Number(row.not_approved) || 0,
      payment_pending: Number(row.payment_pending) || 0,
      payment_sent: Number(row.payment_sent) || 0,
    };
    totalApplications += Number(row.total) || 0;
    totalApproved += Number(row.approved) || 0;
    totalPaymentSent += Number(row.payment_sent) || 0;
  }

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-nfw-blackberry mb-2 font-serif">
              Manage Grants
            </h1>
            <p className="text-nfw-blackberry/60">
              Create and manage grant cycles and review applications
            </p>
          </div>
          <Link
            href="/admin/grants/new"
            className="flex items-center gap-2 px-5 py-3 bg-nfw-blackberry text-white font-bold hover:bg-nfw-blackberry/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Grant Cycle
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Cycles",
              value: cyclesWithClosedStatus?.length || 0,
              color: "bg-nfw-blackberry",
              text: "text-white",
            },
            {
              label: "Total Applications",
              value: totalApplications,
              color: "bg-nfw-wisteria/40",
              text: "text-nfw-blackberry",
            },
            {
              label: "Approved",
              value: totalApproved,
              color: "bg-[#b2d1ee]",
              text: "text-nfw-blackberry",
            },
            {
              label: "Payment Sent",
              value: totalPaymentSent,
              color: "bg-nfw-citrine",
              text: "text-nfw-blackberry",
            },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.color} p-6`}>
              <div className={`text-3xl font-black mb-1 ${stat.text}`}>
                {stat.value}
              </div>
              <div className={`text-sm font-semibold ${stat.text} opacity-70`}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {!cycles || cycles.length === 0 ? (
          <div className="bg-white border border-gray-200 p-12 text-center">
            <p className="text-nfw-blackberry/40 mb-4">No grant cycles yet.</p>
            <Link
              href="/admin/grants/new"
              className="inline-flex items-center gap-2 px-5 py-3 bg-nfw-blackberry text-white font-bold hover:bg-nfw-blackberry/90 transition-colors"
            >
              <Plus className="w-4 h-4" /> Create First Grant Cycle
            </Link>
          </div>
        ) : (
          <SortableCycleList cycles={cyclesWithClosedStatus || []} cycleStats={cycleStats} />
        )}
      </div>
    </main>
  );
}
