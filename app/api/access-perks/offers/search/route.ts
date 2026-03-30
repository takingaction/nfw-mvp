import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchOffers } from "@/lib/access-perks/offers";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = rateLimit(`offers-search:${ip}`, 100, 60_000);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const supabase = await createClient();

    let memberKey = "guest";

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      memberKey = user.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    }

    const params: Record<string, string> = {
      member_key: memberKey,
    };

    searchParams.forEach((value, key) => {
      if (key !== "member_key") {
        params[key] = value;
      }
    });

    const result = await searchOffers(params as unknown as Parameters<typeof searchOffers>[0]);

    // Deduplicate by offer_group_key when filtering by store_key
    if (result.offers && params.store_key) {
      const beforeCount = result.offers.length;
      const seen = new Set();
      result.offers = result.offers.filter((offer: any) => {
        const key = offer.offer_group_key || offer.offer_key;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const afterCount = result.offers.length;
      console.log(`[SEARCH] store_key=${params.store_key} before dedup=${beforeCount} after=${afterCount}`);
      // Update pagination info to reflect deduplicated count
      if (result.info) {
        result.info.total_results = result.offers.length;
        const perPage = parseInt(params.per_page || "10", 10);
        result.info.total_pages = Math.ceil(result.offers.length / perPage);
      }
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to search offers" },
      { status: 500 },
    );
  }
}