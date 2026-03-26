import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchOffers } from "@/lib/access-perks/offers";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = rateLimit(`offers-search:${ip}`, 30, 60_000);
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

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to search offers" },
      { status: 500 },
    );
  }
}