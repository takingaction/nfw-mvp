import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOfferUsesRemaining } from "@/lib/access-perks/offers";

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

    const usesRemaining = await getOfferUsesRemaining(offerKey, memberKey);

    return NextResponse.json(usesRemaining);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch uses remaining" },
      { status: 500 },
    );
  }
}