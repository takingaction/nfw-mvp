import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const offerGroup = searchParams.get("offer_group");
    const storeKey = searchParams.get("store_key");
    const postalCode = searchParams.get("postal_code");
    const distance = searchParams.get("distance") || "25mi";
    const page = searchParams.get("page") || "1";
    const perPage = searchParams.get("per_page") || "50";

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let searchPostalCode = postalCode;
    if (!searchPostalCode) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("zip")
        .eq("id", user.id)
        .single();
      searchPostalCode = profile?.zip || "10001";
    }

    const accessApiUrl =
      process.env.ACCESS_OFFERS_API_URL || "https://offer.adcrws.com";
    const accessToken = process.env.ACCESS_OFFERS_TOKEN;

    if (!accessToken) {
      return NextResponse.json(
        { error: "API not configured" },
        { status: 500 },
      );
    }

    const params = new URLSearchParams({
      member_key: user.id,
      postal_code: searchPostalCode ?? "",
      distance: distance,
      page: page,
      per_page: perPage,
    });

    if (offerGroup) {
      params.append("offer_group", offerGroup);
    }

    if (storeKey) {
      params.append("store_key", storeKey);
    }

    const fullUrl = `${accessApiUrl}/v1/locations?${params.toString()}`;

    const response = await fetch(fullUrl, {
      headers: {
        "Access-Token": accessToken,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: "Failed to fetch locations",
          status: response.status,
          details: errorText,
        },
        { status: response.status },
      );
    }

    const data = await response.json();

    return NextResponse.json({
      locations: data.locations || [],
      meta: {
        total_count: data.info?.total_results,
        current_page: data.info?.current_page,
        total_pages: data.info?.total_pages,
      },
      search_postal_code: searchPostalCode,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch locations";
    return NextResponse.json(
      { error: "Failed to fetch locations", details: message },
      { status: 500 },
    );
  }
}