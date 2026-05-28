import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { renderAllBlocks } from "@/lib/email-blocks/renderer";
import { buildEmailShell } from "@/lib/email-blocks/shell";
import type { EmailSection } from "@/lib/email-blocks/types";

const DEFAULT_HERO_IMAGE = "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";
const SITE_URL = "https://nationalfundforwomen.org";

export async function POST(request: NextRequest) {
  try {
    const { slug, name, subject, hero_image_url } = await request.json();

    if (!slug) {
      return NextResponse.json({ error: "Slug required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("id, name, slug, subject, hero_image_url, category, full_email_html")
      .eq("slug", slug)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Determine hero image
    const finalHeroImage = hero_image_url || template.hero_image_url || DEFAULT_HERO_IMAGE;

    // Fetch sections using admin client (bypasses RLS)
    const { data: sections, error: sectionsError } = await supabaseAdmin()
      .from("email_sections")
      .select("*")
      .eq("email_template_id", template.id)
      .eq("visible", true)
      .order("order_index", { ascending: true });

    // If we have sections, use the builder's rendering system
    if (sections && sections.length > 0 && !sectionsError) {
      const sectionsHtml = renderAllBlocks(sections as EmailSection[]);
      const fullHtml = buildEmailShell({
        sectionsHtml,
      });

      // Replace variables
      const previewData = {
        name: name || "Preview User",
        email: "preview@example.com",
      };

      let finalHtml = fullHtml;
      for (const [key, value] of Object.entries(previewData)) {
        finalHtml = finalHtml.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value));
      }

      return NextResponse.json({ html: finalHtml });
    }

    // No sections - check if we have full_email_html from a previous publish
    if (template.full_email_html) {
      // Replace variables in the stored HTML
      const previewData = {
        name: name || "Preview User",
        email: "preview@example.com",
      };

      let finalHtml = template.full_email_html;
      for (const [key, value] of Object.entries(previewData)) {
        finalHtml = finalHtml.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value));
      }

      return NextResponse.json({ html: finalHtml });
    }

    // No sections and no full_email_html - return placeholder
    return NextResponse.json({
      html: `<html><body style="font-family: sans-serif; padding: 40px; text-align: center; color: #666;">
        <h2>${template.name}</h2>
        <p>No sections or content to preview.</p>
        <p>Build sections in the email builder to see a preview.</p>
      </body></html>`,
    });
  } catch (error) {
    console.error("[api/admin/emails/preview] Error:", error);
    return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 });
  }
}