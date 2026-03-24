import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: Request) {
  try {
    const { title, slug } = await request.json();

    if (!title?.trim() || !slug?.trim()) {
      return NextResponse.json(
        { error: "Title and slug are required" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const { data: existing } = await supabaseAdmin
      .from("pages")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "A page with this slug already exists" },
        { status: 400 }
      );
    }

    // Create the page
    const { data: page, error } = await supabaseAdmin
      .from("pages")
      .insert({
        title: title.trim(),
        slug: slug.trim(),
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating page:", error);
      return NextResponse.json(
        { error: "Failed to create page" },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: page.id, slug: page.slug });
  } catch (error) {
    console.error("Create page error:", error);
    return NextResponse.json(
      { error: "Failed to create page" },
      { status: 500 }
    );
  }
}
