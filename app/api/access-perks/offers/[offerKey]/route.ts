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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memberKey = user.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    const url = `${process.env.ACCESS_OFFERS_API_URL}/v1/offers/${offerKey}?access_token=${process.env.ACCESS_OFFERS_TOKEN}&member_key=${memberKey}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(
        `Offers API Error: ${response.status} ${response.statusText} - ${responseText.substring(0, 200)}`,
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch offer" },
      { status: 500 },
    );
  }
}