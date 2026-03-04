import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import GrantApplicationForm from "@/components/GrantApplicationForm";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function ApplyForGrantPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  // Use service role to bypass RLS on grant_cycles
  const { data: cycles } = await supabaseAdmin
    .from("grant_cycles")
    .select("*")
    .eq("status", "open")
    .order("end_date", { ascending: true });

  return (
    <main className="min-h-screen bg-white">
      <div className="bg-white pt-8 pb-6 border-b border-[#2d1239]/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-3xl sm:text-4xl font-bold text-[#2d1239] mb-2"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            Apply for a Microgrant
          </h2>
          <p className="text-[#2d1239]/60">
            NFW microgrants help with real-life needs like childcare, medical
            costs, car repairs, and more.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {cycles && cycles.length > 0 ? (
          <GrantApplicationForm userId={user!.id} cycles={cycles} />
        ) : (
          <div className="bg-[#fdf493]/20 border border-[#fdf493] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#2d1239] mb-2">
              No Grant Cycles Available
            </h3>
            <p className="text-[#2d1239]/70">
              There are currently no open grant cycles. Please check back later
              or contact us for more information.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
