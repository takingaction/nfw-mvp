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

  // Check profile completion and membership level
  const { data: profile } = await supabase
    .from("profiles")
    .select("profile_completed, membership_level, is_approved_free_member, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.profile_completed) {
    redirect("/auth/sign-up?step=1");
  } else if ((profile?.membership_level === "free" && profile?.is_approved_free_member !== true) || profile?.membership_level === "waitlist") {
    redirect("/auth/sign-up?step=3");
  } else if (profile?.membership_level && !["free", "contributing", "founding", "waitlist"].includes(profile.membership_level)) {
    redirect("/auth/sign-up?step=3");
  }

  // Build query - admins see all cycles, non-admins don't see testing-only cycles
  let cyclesQuery = supabaseAdmin
    .from("grant_cycles")
    .select("*")
    .eq("status", "open")
    .order("display_order", { ascending: true })
    .order("end_date", { ascending: true });

  // Non-admins should not see testing-only cycles
  if (!profile?.is_admin) {
    cyclesQuery = cyclesQuery.eq("is_testing_only", false);
  }

  const { data: cycles } = await cyclesQuery;

  // Server-side filter: exclude grants where end_date is in the past
  // (Supabase date filters can be unreliable, so we filter in JS after fetch)
  const todayStr = new Date().toISOString().split('T')[0];
  const validCycles = cycles?.filter(c => c.end_date >= todayStr) || [];

  return (
    <main className="min-h-screen bg-nfw-dove">
      <div className="bg-white pt-8 pb-6 border-b border-nfw-blackberry/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl lg:text-6xl leading-[1.1] text-nfw-aubergine mb-2">
            Apply for a Microgrant
          </h2>
          <p className="font-serif text-nfw-blackberry/60">
            NFW microgrants help with real-life needs like childcare, medical
            costs, car repairs, and more.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {validCycles && validCycles.length > 0 ? (
          <GrantApplicationForm userId={user!.id} cycles={validCycles} />
        ) : (
          <div className="bg-nfw-citrine/20 border border-nfw-citrine p-6">
            <h3 className="font-serif text-lg font-semibold text-nfw-blackberry mb-2">
              No Grant Cycles Available
            </h3>
            <p className="font-serif text-nfw-blackberry/70">
              There are currently no open grant cycles. Please check back later
              or contact us for more information.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
