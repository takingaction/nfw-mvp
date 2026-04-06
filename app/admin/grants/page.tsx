import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";
import Link from "next/link";
import { Plus } from "lucide-react";
import SortableCycleList from "@/components/admin/SortableCycleList";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function AdminGrantsPage() {
  await requireAdmin();

  const { data: cycles } = await supabaseAdmin
    .from("grant_cycles")
    .select("*")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  const { data: grants } = await supabaseAdmin
    .from("grants")
    .select("id, status, cycle_id");

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
          <SortableCycleList cycles={cycles} grants={grants || []} />
        )}
      </div>
    </main>
  );
}
