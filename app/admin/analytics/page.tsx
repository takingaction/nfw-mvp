import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/middleware/adminCheck";
import { Suspense } from "react";
import dynamic from "next/dynamic";

const AdminAnalyticsClient = dynamic(
  () => import("@/components/admin/AdminAnalyticsClient"),
  {
    loading: () => (
      <div className="h-96 bg-gray-100 rounded animate-pulse flex items-center justify-center">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    ),
  }
);

async function AdminAnalyticsContent() {
  await requireAdmin();
  const supabase = await createClient();

  // Members data
  const { data: profiles } = await supabase
    .from("profiles")
    .select(
      "id, joined_at, subscription_status, state, city, household_income, age_range",
    )
    .order("joined_at", { ascending: true });

  // Grants data
  const { data: grants } = await supabase
    .from("grants")
    .select(
      "id, status, amount_requested, payout_amount, category, submitted_at, funded_at",
    )
    .order("submitted_at", { ascending: true });

  // Perks redemptions
  const { data: redemptions } = await supabase
    .from("offer_redemptions")
    .select("id, offer_key, offer_title, store_name, redeem_type, created_at")
    .order("created_at", { ascending: true });

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-nfw-blackberry">Analytics</h1>
          <p className="text-nfw-blackberry/60 text-lg">
            Member, grant, and perks performance data
          </p>
        </div>
        <AdminAnalyticsClient
          profiles={profiles || []}
          grants={grants || []}
          redemptions={redemptions || []}
        />
      </div>
    </main>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-8 bg-nfw-dove">
          <div className="max-w-7xl mx-auto animate-pulse">
            <div className="h-10 bg-nfw-stone/20 w-1/3 mb-4"></div>
            <div className="h-6 bg-nfw-stone/20 w-2/3 mb-8"></div>
            <div className="h-96 bg-nfw-stone/20"></div>
          </div>
        </main>
      }
    >
      <AdminAnalyticsContent />
    </Suspense>
  );
}
