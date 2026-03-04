import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{
    offerKey: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const { offerKey } = resolvedParams;

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("Offer detail: User not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Sanitize member_key
    const memberKey = user.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    console.log("Fetching offer:", offerKey, "for member:", memberKey);

    // Fetch offer from Access Perks API
    const url = `${process.env.ACCESS_OFFERS_API_URL}/v1/offers/${offerKey}?access_token=${process.env.ACCESS_OFFERS_TOKEN}&member_key=${memberKey}`;

    console.log(
      "Fetching offer from:",
      url.replace(process.env.ACCESS_OFFERS_TOKEN!, "HIDDEN_TOKEN"),
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    console.log("Offer response status:", response.status);

    const responseText = await response.text();
    console.log(
      "Offer response (first 500 chars):",
      responseText.substring(0, 500),
    );

    if (!response.ok) {
      throw new Error(
        `Offers API Error: ${response.status} ${response.statusText} - ${responseText.substring(0, 200)}`,
      );
    }

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse offer response as JSON:", parseError);
      throw new Error("Offers API returned invalid JSON response");
    }

    console.log("Offer fetch result: success");

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Offer detail error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch offer" },
      { status: 500 },
    );
  }
}
