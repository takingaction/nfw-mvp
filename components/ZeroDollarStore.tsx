import { createClient } from "@/lib/supabase/server";
import {
  ZeroDollarItemWithClaim,
  ZeroDollarCategory,
} from "@/types/zero-dollar-store";
import ZeroDollarStoreClient from "@/components/ZeroDollarStoreClient";

export default async function ZeroDollarStore({
  userId,
  userTier,
}: {
  userId: string;
  userTier: string;
}) {
  const supabase = await createClient();

  // Fetch all active categories
  const { data: categories } = await supabase
    .from("zero_dollar_categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });

  // Fetch all active items with their categories
  const { data: items, error } = await supabase
    .from("zero_dollar_items")
    .select(
      `
      *,
      category:zero_dollar_categories(*)
    `,
    )
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching items:", error);
    return <div className="text-red-600">Error loading store items</div>;
  }

  // Fetch user's claims
  const { data: claims } = await supabase
    .from("zero_dollar_claims")
    .select("*")
    .eq("member_id", userId);

  // Fetch claim counts for each item
  const { data: claimCounts } = await supabase
    .from("zero_dollar_claims")
    .select("item_id");

  // Combine data
  const itemsWithClaims: ZeroDollarItemWithClaim[] = (items || []).map(
    (item) => {
      const userClaim = claims?.find((c) => c.item_id === item.id);
      const totalClaims =
        claimCounts?.filter((c) => c.item_id === item.id).length || 0;

      return {
        ...item,
        user_claim: userClaim || null,
        total_claims: totalClaims,
      };
    },
  );

  // Filter items based on user's membership tier
  const eligibleItems = itemsWithClaims.filter((item) =>
    item.eligibility_tiers.includes(userTier),
  );

  return (
    <ZeroDollarStoreClient
      items={eligibleItems}
      categories={categories || []}
      userId={userId}
    />
  );
}
