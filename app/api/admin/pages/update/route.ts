import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, title, slug, meta_title, meta_description, meta_schema, include_in_sitemap } = body;

    if (!id || !title || !slug) {
      return NextResponse.json(
        { error: "ID, title, and slug are required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, string | null | boolean> = {
      title: title.trim(),
      slug: slug.trim(),
    };

    if (meta_title?.trim()) {
      updateData.meta_title = meta_title.trim();
    } else {
      updateData.meta_title = null;
    }

    if (meta_description?.trim()) {
      updateData.meta_description = meta_description.trim();
    } else {
      updateData.meta_description = null;
    }

    if (meta_schema?.trim()) {
      updateData.meta_schema = meta_schema.trim();
    } else {
      updateData.meta_schema = null;
    }

    if (typeof include_in_sitemap === "boolean") {
      updateData.include_in_sitemap = include_in_sitemap;
    }

    const { error: updateError } = await supabaseAdmin
      .from("pages")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating page:", err);
    return NextResponse.json(
      { error: "Failed to update page" },
      { status: 500 }
    );
  }
}
