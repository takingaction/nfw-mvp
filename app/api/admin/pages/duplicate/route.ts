import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: Request) {
  try {
    // Verify admin authentication
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { originalPageId, title, slug } = await request.json();

    if (!originalPageId?.trim()) {
      return NextResponse.json(
        { error: "Original page ID is required" },
        { status: 400 }
      );
    }

    if (!title?.trim() || !slug?.trim()) {
      return NextResponse.json(
        { error: "Title and slug are required" },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug can only contain lowercase letters, numbers, and hyphens" },
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

    // Fetch the original page
    const { data: originalPage, error: pageError } = await supabaseAdmin
      .from("pages")
      .select("*")
      .eq("id", originalPageId)
      .single();

    if (pageError || !originalPage) {
      return NextResponse.json(
        { error: "Original page not found" },
        { status: 404 }
      );
    }

    // Create the new page
    const { data: newPage, error: createError } = await supabaseAdmin
      .from("pages")
      .insert({
        title: title.trim(),
        slug: slug.trim(),
        status: "draft",
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating page:", createError);
      return NextResponse.json(
        { error: "Failed to create page" },
        { status: 500 }
      );
    }

    // Fetch all draft sections from the original page
    const { data: originalSections, error: sectionsError } = await supabaseAdmin
      .from("page_sections")
      .select("*")
      .eq("page_id", originalPageId)
      .eq("version", "draft");

    if (sectionsError) {
      console.error("Error fetching sections:", sectionsError);
      // Still return success since page was created
      return NextResponse.json({ id: newPage.id, slug: newPage.slug });
    }

    // Copy sections to the new page
    if (originalSections && originalSections.length > 0) {
      const newSections = originalSections.map((section) => ({
        page_id: newPage.id,
        section_type: section.section_type,
        version: "draft",
        order_index: section.order_index,
        content: section.content,
        visible: section.visible,
      }));

      const { error: insertError } = await supabaseAdmin
        .from("page_sections")
        .insert(newSections);

      if (insertError) {
        console.error("Error copying sections:", insertError);
        // Still return success since page was created
      }
    }

    return NextResponse.json({ id: newPage.id, slug: newPage.slug });
  } catch (error) {
    console.error("Duplicate page error:", error);
    return NextResponse.json(
      { error: "Failed to duplicate page" },
      { status: 500 }
    );
  }
}
