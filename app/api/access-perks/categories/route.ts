import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/access-perks/offers";

export async function GET(_request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let memberKey = "guest";
    if (user) {
      memberKey = user.id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    }

    // Get categories
    const result = await getCategories(memberKey);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Get categories error:", error);
    const message = error instanceof Error ? error.message : "Failed to get categories";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
