import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";
import Link from "next/link";
import { Plus } from "lucide-react";
import DeleteCycleButton from "@/components/admin/DeleteCycleButton";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function AdminGrantsPage() {
  await requireAdmin();

  const { data: cycles } = await supabaseAdmin
    .from("grant_cycles")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: grants } = await supabaseAdmin
    .from("grants")
    .select("id, status, cycle_id");

  const getCycleStats = (cycleId: string) => {
    const cycleGrants = grants?.filter((g) => g.cycle_id === cycleId) || [];
    return {
      total: cycleGrants.length,
      submitted: cycleGrants.filter((g) => g.status === "submitted").length,
      in_review: cycleGrants.filter((g) => g.status === "in_review").length,
      approved: cycleGrants.filter((g) => g.status === "approved").length,
      not_approved: cycleGrants.filter((g) => g.status === "not_approved")
        .length,
      payment_pending: cycleGrants.filter((g) => g.status === "payment_pending")
        .length,
      payment_sent: cycleGrants.filter((g) => g.status === "payment_sent")
        .length,
    };
  };

  const statusColor: Record<string, string> = {
    open: "bg-[#d4f1ad] text-nfw-blackberry",
    closed: "bg-gray-100 text-gray-600",
    draft: "bg-nfw-citrine text-nfw-blackberry",
  };

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
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
              value: cycles?.length || 0,
              color: "bg-nfw-blackberry",
              text: "text-white",
            },
            {
              label: "Total Applications",
              value: grants?.length || 0,
              color: "bg-[#d4f1ad]",
              text: "text-nfw-blackberry",
            },
            {
              label: "Approved",
              value: grants?.filter((g) => g.status === "approved").length || 0,
              color: "bg-[#b2d1ee]",
              text: "text-nfw-blackberry",
            },
            {
              label: "Payment Sent",
              value:
                grants?.filter((g) => g.status === "payment_sent").length || 0,
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

        <div className="space-y-4">
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
            cycles.map((cycle) => {
              const stats = getCycleStats(cycle.id);
              return (
                <div
                  key={cycle.id}
                  className="bg-white border border-gray-200 p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-xl font-black text-nfw-blackberry font-serif">
                          {cycle.cycle_name}
                        </h2>
                        <span
                          className={`text-xs px-2.5 py-1 font-semibold ${statusColor[cycle.status] || "bg-gray-100 text-gray-600"}`}
                        >
                          {cycle.status}
                        </span>
                      </div>
                      <p className="text-sm text-nfw-blackberry/50">
                        {new Date(cycle.start_date).toLocaleDateString()} —{" "}
                        {new Date(cycle.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-nfw-blackberry font-serif">
                        ${cycle.amount_per_grant?.toLocaleString()}
                      </p>
                      <p className="text-xs text-nfw-blackberry/40">
                        {cycle.grants_available} grants available
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
                    {[
                      {
                        label: "Submitted",
                        value: stats.submitted,
                        color: "bg-blue-50 text-blue-700",
                      },
                      {
                        label: "In Review",
                        value: stats.in_review,
                        color: "bg-yellow-50 text-yellow-700",
                      },
                      {
                        label: "Approved",
                        value: stats.approved,
                        color: "bg-green-50 text-green-700",
                      },
                      {
                        label: "Not Approved",
                        value: stats.not_approved,
                        color: "bg-red-50 text-red-700",
                      },
                      {
                        label: "Pmt Pending",
                        value: stats.payment_pending,
                        color: "bg-orange-50 text-orange-700",
                      },
                      {
                        label: "Pmt Sent",
                        value: stats.payment_sent,
                        color: "bg-purple-50 text-purple-700",
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className={`${s.color} p-2 text-center`}
                      >
                        <p className="text-lg font-black">{s.value}</p>
                        <p className="text-xs font-medium">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/grants/${cycle.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-nfw-blackberry/5 text-nfw-blackberry font-semibold text-sm hover:bg-nfw-blackberry/10 transition-colors"
                    >
                      Review Applications
                    </Link>
                    <Link
                      href={`/admin/grants/${cycle.id}/edit`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-nfw-lilac/10 text-nfw-blackberry font-semibold text-sm hover:bg-nfw-lilac/20 transition-colors"
                    >
                      Edit
                    </Link>
                    <DeleteCycleButton
                      cycleId={cycle.id}
                      cycleName={cycle.cycle_name}
                      applicationCount={stats.total}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
