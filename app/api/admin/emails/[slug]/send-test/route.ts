import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import supabaseAdmin from "@/lib/supabase/admin";
import { renderAllBlocks } from "@/lib/email-blocks/renderer";
import { buildEmailShell } from "@/lib/email-blocks/shell";
import { sendTemplateEmail } from "@/lib/email";
import type { EmailSection } from "@/lib/email-blocks/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { testEmail } = body;

    if (!testEmail || !testEmail.includes("@")) {
      return NextResponse.json({ error: "Valid email address required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Check admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get template
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("id, slug, name, subject, hero_image_url, category")
      .eq("slug", slug)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // For Supabase templates, we can't send them directly
    if (template.category === "supabase") {
      return NextResponse.json(
        { error: "Cannot send test for Supabase templates. Copy HTML and test in Supabase Dashboard." },
        { status: 400 }
      );
    }

    // Fetch sections using admin client (bypasses RLS)
    const { data: sections, error: sectionsError } = await supabaseAdmin
      .from("email_sections")
      .select("*")
      .eq("email_template_id", template.id)
      .eq("visible", true)
      .order("order_index", { ascending: true });

    if (sectionsError) {
      return NextResponse.json({ error: "Failed to fetch sections" }, { status: 500 });
    }

    // Render all blocks
    const sectionsHtml = renderAllBlocks(sections as EmailSection[]);

    // Build full HTML with shell (same as preview route)
    const fullHtml = buildEmailShell({
      sectionsHtml,
    });

    // Replace variables with test values
    const siteUrl = "https://nationalfundforwomen.org";
    const testHtml = fullHtml
      .replace(/\{\{\s*name\s*\}\}/gi, "Test User")
      .replace(/\{\{\s*email\s*\}\}/gi, testEmail)
      .replace(/\{\{\s*member_id\s*\}\}/g, "TEST-123456")
      .replace(/\{\{\s*membership_tier\s*\}\}/gi, "Contributing")
      .replace(/\{\{\s*renewal_date\s*\}\}/gi, "April 28, 2027")
      .replace(/\{\{\s*site_url\s*\}\}/g, siteUrl)
      .replace(/\{\{\s*dashboard_url\s*\}\}/g, `${siteUrl}/dashboard`)
      .replace(/\{\{\s*perks_url\s*\}\}/g, `${siteUrl}/perks`)
      .replace(/\{\{\s*store_url\s*\}\}/g, `${siteUrl}/store`)
      .replace(/\{\{\s*grants_url\s*\}\}/g, `${siteUrl}/grants`)
      .replace(/\{\{\s*grantCycleName\s*\}\}/g, "Spring 2026 Grant Cycle")
      .replace(/\{\{\s*amount\s*\}\}/g, "5,000")
      .replace(/\{\{\s*applicationId\s*\}\}/g, "TEST-APP-001")
      .replace(/\{\{\s*grant_cycle_name\s*\}\}/g, "Spring 2026 Grant Cycle")
      .replace(/\{\{\s*message\s*\}\}/g, "Thank you for your patience.")
      .replace(/\{\{\s*application_url\s*\}\}/g, `${siteUrl}/grants/my-applications`)
      .replace(/\{\{\s*ctaUrl\s*\}\}/g, `${siteUrl}/dashboard`)
      .replace(/\{\{\s*signup_url\s*\}\}/g, `${siteUrl}/auth/sign-up`)
      .replace(/\{\{\s*gift_url\s*\}\}/g, `${siteUrl}/gift-membership`)
      .replace(/\{\{\s*faq_url\s*\}\}/g, `${siteUrl}/faq`)
      .replace(/\{\{\s*store_url\s*\}\}/g, `${siteUrl}/store`)
      .replace(/\{\{\s*siteUrl\s*\}\}/g, siteUrl)
      // Remove Handlebars conditionals
      .replace(/\{\{\#if\s+\w+\s*\}\}/g, "")
      .replace(/\{\{\s*\/if\s*\}\}/g, "")
      .replace(/\{\{\s*else\s*\}\}/g, "");

    const testSubject = `[TEST] ${template.subject || template.name}`;

    // Send using sendTemplateEmail (raw HTML, not branded wrapper)
    const { success, error: sendError } = await sendTemplateEmail({
      to: testEmail,
      subject: testSubject,
      html: testHtml,
    });

    if (!success) {
      console.error("Failed to send test email:", sendError);
      return NextResponse.json(
        { error: sendError || "Failed to send test email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email sent to ${testEmail}`,
    });
  } catch (error) {
    console.error("[api/admin/emails/[slug]/send-test] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}