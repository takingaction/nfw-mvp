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

    let postalCode: string | null = null;
    let distance: string | null = null;
    let onlineParam: string | null = null;

    searchParams.forEach((value, key) => {
      if (key !== "member_key") {
        if (key === "postal_code") postalCode = value;
        else if (key === "distance") distance = value;
        else if (key === "online") onlineParam = value;
        else params[key] = value;
      }
    });

    // Handle Nationwide - use postal_code=50001 (Iowa center) + distance=6000mi as anchor, plus national+online flags
    // Online behavior is uniform across both paths: "only" → only online, otherwise → include all.
    // (Previously the online assignment was nested inside the if/else-if branches, so when no
    // postal_code/distance was in the URL — which is what the client sends when Online Only is on —
    // params.online was never forwarded to Access Perks. That caused Domino's in-store offers to leak
    // through under "Online Only" in the offers view.)
    if (distance === "2500mi") {
      params.postal_code = "50001";
      params.distance = "6000mi";
      params.national = "include";
    } else if (postalCode && distance) {
      params.postal_code = postalCode;
      params.distance = distance;
    }

    if (onlineParam === "only") {
      params.online = "only";
    } else {
      params.online = "include";
    }

    const result = await searchOffers(params as unknown as Parameters<typeof searchOffers>[0]);

    // Deduplicate by offer_group_key when filtering by store_key
    if (result.offers && params.store_key) {
      const seen = new Set();
      result.offers = result.offers.filter((offer: any) => {
        const key = offer.offer_group_key || offer.offer_key;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
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
