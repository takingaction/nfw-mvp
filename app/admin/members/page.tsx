import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
import { requireAdmin } from "@/middleware/adminCheck";
import { Suspense } from "react";
import AdminMembersClient from "@/components/admin/AdminMembersClient";
// BackfillButton removed - no longer needed

async function AdminMembersContent({ page }: { page: number }) {
  await requireAdmin();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Query for exact total count (bypasses 1000 row limit)
  const { count: total, error: countError } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });

  // Query for breakdown counts (each query is lightweight with head: true)
  const { count: paid } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_admin", false)
    .in("membership_level", ["contributing", "founding"]);

  const { count: admins } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_admin", true);

  const { count: incomplete } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_admin", false)
    .or("profile_completed.is.null,profile_completed.eq.false");

  // Free members sub-categories (non-admin, completed profiles only)
  const { count: freeApproved } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_admin", false)
    .eq("membership_level", "free")
    .eq("is_approved_free_member", true)
    .eq("profile_completed", true);

  const { count: freeStarted } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_admin", false)
    .eq("membership_level", "free")
    .eq("is_approved_free_member", false)
    .eq("free_membership_contact_submitted", false)
    .eq("profile_completed", true);

  // Waitlist count
  const { count: waitlist } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("membership_level", "waitlist");

  // Active Profiles = Free (approved) + Contributing + Founding (excludes admins, waitlist, incomplete, in limbo)
  const { count: active } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_admin", false)
    .in("membership_level", ["free", "contributing", "founding"])
    .eq("profile_completed", true)
    .or("membership_level.eq.free.and(is_approved_free_member.eq.true),membership_level.eq.contributing,membership_level.eq.founding");

  // Query for actual data to display with pagination
  const pageSize = 100;
  const offset = (page - 1) * pageSize;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, membership_level, subscription_status, date_of_birth, state, city, household_income, subscription_ends_at, joined_at, is_admin, access_perks_synced_at, profile_completed, is_approved_free_member, free_membership_contact_submitted",
    )
    .order("joined_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error || countError) {
    console.error("Error fetching members:", error || countError);
    return <div className="text-red-600 p-8">Error loading members</div>;
  }

  const percent = (value: number | null | undefined) => {
    if (!total || total === 0 || !value) return "0";
    return ((value / total) * 100).toFixed(1);
  };

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-nfw-blackberry font-serif">Manage Members</h1>
            <p className="text-nfw-blackberry/60 text-lg">
              View and manage all NFW members
            </p>
          </div>
          <a
            href="/api/admin/members/export"
            className="px-4 py-2 border border-nfw-blackberry/20 text-nfw-blackberry font-medium hover:bg-nfw-blackberry/5 transition-colors text-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download CSV
          </a>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Profiles",
              value: total,
              showPercent: false,
              color: "bg-nfw-blackberry",
              text: "text-white",
            },
            {
              label: "Active Profiles",
              value: `${active} (${percent(active)}%)`,
              showPercent: false,
              color: "bg-nfw-aubergine",
              text: "text-white",
            },
            {
              label: "Paid Members",
              value: `${paid} (${percent(paid)}%)`,
              showPercent: false,
              color: "bg-nfw-wisteria/40",
              text: "text-nfw-blackberry",
            },
            {
              label: "Admins",
              value: admins,
              showPercent: false,
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

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            {
              label: "Free Members",
              value: `${freeApproved} (${percent(freeApproved)}%)`,
              color: "bg-nfw-lilac/40",
              text: "text-nfw-blackberry",
            },
            {
              label: "In Limbo",
              value: `${freeStarted} (${percent(freeStarted)}%)`,
              color: "bg-nfw-stone/40",
              text: "text-nfw-blackberry",
            },
            {
              label: "Waitlist",
              value: `${waitlist} (${percent(waitlist)}%)`,
              color: "bg-nfw-stone/40",
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

        <AdminMembersClient
          members={profiles || []}
          currentUserId={user?.id || ""}
          totalCount={total || 0}
          currentPage={page}
          pageSize={pageSize}
        />
      </div>
    </main>
  );
}

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminMembersPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams.page || "1", 10);

  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-8 bg-gray-50">
          <div className="max-w-7xl mx-auto animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-2/3 mb-8"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </main>
      }
    >
      <AdminMembersContent page={page} />
    </Suspense>
  );
}
