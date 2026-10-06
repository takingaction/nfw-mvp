import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/middleware/adminCheck";
import AdminClaimsClient from "@/components/admin/AdminClaimsClient";
import { Suspense } from "react";

async function AdminClaimsContent() {
  await requireAdmin({ redirectOnFailure: true });

  const supabase = await createClient();

  // Fetch all claims with item and member details (paginated past 1000-row cap).
  // Member email comes from the profiles.email join (synced from auth.users via trigger).
  // No separate supabase.auth.admin.listUsers() call — that has its own 1000-row cap
  // and is the wrong tool for batch email lookups.
  const PAGE_SIZE = 1000;
  const allClaims: any[] = [];
  let claimsPage = 0;
  let claimsHasMore = true;

  while (claimsHasMore) {
    const from = claimsPage * PAGE_SIZE;
    const { data: pageData, error: pageError } = await supabase
      .from("zero_dollar_claims")
      .select(
        `
        *,
        item:zero_dollar_items(
          id,
          name,
          image_url,
          category:zero_dollar_categories(name)
        ),
        member:profiles(
          id,
          full_name,
          email
        )
      `,
      )
      .order("claimed_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (pageError) {
      console.error("Error fetching claims:", pageError);
      return <div className="text-red-600">Error loading claims</div>;
    }

    if (pageData && pageData.length > 0) {
      allClaims.push(...pageData);
      claimsPage++;
      claimsHasMore = pageData.length === PAGE_SIZE;
    } else {
      claimsHasMore = false;
    }
  }

  // Email comes straight off the embedded member join.
  const claimsWithEmails = allClaims.map((claim) => ({
    ...claim,
    member_email: claim.member?.email ?? "N/A",
  }));

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-nfw-blackberry font-serif">Manage Claims</h1>
          <p className="text-nfw-blackberry/60 text-lg">
            View and manage all Zero Dollar Store claims
          </p>
        </div>

        <AdminClaimsClient claims={claimsWithEmails || []} />
      </div>
    </main>
  );
}

export default function AdminClaimsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse">
              <div className="h-10 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-2/3 mb-8"></div>
              <div className="h-96 bg-gray-200 rounded"></div>
            </div>
          </div>
        </main>
      }
    >
      <AdminClaimsContent />
    </Suspense>
  );
}
