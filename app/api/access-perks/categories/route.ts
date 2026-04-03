import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/access-perks/offers";
import { filterCategoriesByExclusion } from "@/lib/access-perks/category-filters";

export async function GET() {
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

    // Filter out excluded categories
    if (result && typeof result === "object" && Array.isArray(result.categories)) {
      const filtered = filterCategoriesByExclusion(result.categories);
      return NextResponse.json({ categories: filtered });
    }

    if (Array.isArray(result)) {
      const filtered = filterCategoriesByExclusion(result);
      return NextResponse.json(filtered);
    }

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
