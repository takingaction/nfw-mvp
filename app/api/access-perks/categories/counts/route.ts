import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchOffers } from "@/lib/access-perks/offers";

let categoryCountsCache: { data: Record<number, number>; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function GET() {
  try {
    const now = Date.now();

    if (categoryCountsCache && now - categoryCountsCache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ counts: categoryCountsCache.data });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberKey = user.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    const result = await searchOffers({
      member_key: memberKey,
      aggregations: "all_categories",
      per_page: 1,
    });

    const counts: Record<number, number> = {};

    if (result.offer_count_in_categories) {
      const processCategory = (cat: any) => {
        if (cat.category_key) {
          counts[cat.category_key] = cat.offer_count || 0;
        }
        if (cat.subcategories) {
          for (const sub of cat.subcategories) {
            processCategory(sub);
          }
        }
      };

      for (const category of result.offer_count_in_categories) {
        processCategory(category);
      }
    }

    categoryCountsCache = { data: counts, timestamp: now };

    return NextResponse.json({ counts });
  } catch (error: unknown) {
    console.error("Get category counts error:", error);
    const message = error instanceof Error ? error.message : "Failed to get category counts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}