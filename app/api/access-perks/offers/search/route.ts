import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchOffers } from "@/lib/access-perks/offers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("Offers search: User not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sanitize member_key (uppercase alphanumeric)
    const memberKey = user.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    // Build search parameters
    const params: any = {
      member_key: memberKey,
    };

    // Add all search parameters from query string
    searchParams.forEach((value, key) => {
      if (key !== "member_key") {
        params[key] = value;
      }
    });

    // LOG ALL PARAMETERS BEING SENT
    console.log("=== OFFERS SEARCH PARAMETERS ===");
    console.log("Full params object:", JSON.stringify(params, null, 2));
    console.log("================================");

    // Search offers
    const result = await searchOffers(params);

    console.log(
      "Offers search: success, found",
      result.offers?.length || 0,
      "offers",
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Offers search error:", error);
    console.error("Error message:", error.message);
    return NextResponse.json(
      { error: error.message || "Failed to search offers" },
      { status: 500 },
    );
  }
}
