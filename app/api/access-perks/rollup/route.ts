import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchOffers } from "@/lib/access-perks/offers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rollup = searchParams.get("rollup") || "stores";
    const categoryKey = searchParams.get("category_key");
    const facet = searchParams.get("facet");
    const postalCode = searchParams.get("postal_code");
    const distance = searchParams.get("distance") || "25mi";
    const page = searchParams.get("page");
    const offerTypes = searchParams.get("offer_types");
    const query = searchParams.get("query");

    let isAuthenticated = false;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let memberKey = "guest";
    if (user) {
      isAuthenticated = true;
      memberKey = user.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    }

    const params: any = {
      member_key: memberKey,
      per_page: 100,
    };

    if (page) params.page = parseInt(page, 10);

    if (categoryKey) params.category_key = categoryKey;
    if (query) params.query = query;
    if (postalCode) {
      params.postal_code = postalCode;
      params.distance = distance;
      params.sort = "distance";
    }
    if (facet) params.facet = facet;
    if (offerTypes) params.offer_type = offerTypes;
    if (rollup) params.rollup = rollup;
    if (rollup === "stores") params.aggregations = "stores";
    if (rollup === "locations") params.aggregations = "locations";

    console.log("Rollup API call with params:", JSON.stringify(params, null, 2));

    const result = await searchOffers(params);

    if (!result.offers || result.offers.length === 0) {
      return NextResponse.json({
        info: { total_results: 0, total_stores: 0, total_locations: 0 },
        groups: [],
      });
    }

    let groups: any[] = [];

    if (rollup === "stores") {
      const storeMap = new Map<string, any>();
      for (const offer of result.offers) {
        const storeKey = offer.offer_store?.store_key;
        if (!storeKey) continue;

        if (storeMap.has(storeKey)) {
          storeMap.get(storeKey).count++;
          if (!storeMap.get(storeKey).offers.includes(offer.title)) {
            storeMap.get(storeKey).offers.push(offer.title);
          }
          if (offer.search_distance && (!storeMap.get(storeKey).distance || offer.search_distance < storeMap.get(storeKey).distance)) {
            storeMap.get(storeKey).distance = offer.search_distance;
          }
        } else {
          storeMap.set(storeKey, {
            key: storeKey,
            name: offer.offer_store?.name || "Unknown Store",
            logo_url: offer.offer_store?.logo_url || offer.logo_url,
            description: offer.offer_store?.description || "",
            count: 1,
            offers: offer.title ? [offer.title] : [],
            location: offer.offer_store?.physical_location,
            distance: offer.search_distance,
          });
        }
      }
      groups = Array.from(storeMap.values());
    } else if (rollup === "locations") {
      const locationMap = new Map<string, any>();
      for (const offer of result.offers) {
        const location = offer.offer_store?.physical_location;
        if (!location || !location.location_key) continue;

        if (locationMap.has(location.location_key)) {
          locationMap.get(location.location_key).count++;
          if (!locationMap.get(location.location_key).offers.includes(offer.title)) {
            locationMap.get(location.location_key).offers.push(offer.title);
          }
        } else {
          locationMap.set(location.location_key, {
            key: location.location_key,
            name: location.location_name || offer.offer_store?.name || "Unknown Location",
            address: location.street_address || "",
            city: location.city_locality || "",
            state: location.state_region || "",
            postal_code: location.postal_code || "",
            distance: offer.search_distance,
            count: 1,
            offers: offer.title ? [offer.title] : [],
            store: {
              name: offer.offer_store?.name || "",
              logo_url: offer.offer_store?.logo_url || offer.logo_url,
            },
          });
        }
      }
      groups = Array.from(locationMap.values());
      groups.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else {
      groups = result.offers.map((offer: any) => ({
        ...offer,
        key: offer.offer_key,
      }));
    }

    const totalCount = rollup === "offers" 
      ? (result.info?.total_results || 0)
      : groups.length;

    return NextResponse.json({
      info: { 
        total_results: totalCount,
        total_stores: result.info?.total_stores || 0,
        total_locations: result.info?.total_locations || 0,
      },
      groups,
      isAuthenticated,
    });
  } catch (error: unknown) {
    console.error("Rollup error:", error);
    const message = error instanceof Error ? error.message : "Failed to get rollup data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
