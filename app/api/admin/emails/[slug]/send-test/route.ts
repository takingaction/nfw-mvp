import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendBrandedEmail } from "@/lib/email";

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
      .select("slug, name, subject, html_content, category, hero_image_url")
      .eq("slug", slug)
      .single();

    if (templateError || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // For Supabase templates, we can't send them directly - return instruction
    if (template.category === "supabase") {
      return NextResponse.json(
        { error: "Cannot send test for Supabase templates. Copy HTML and test in Supabase Dashboard." },
        { status: 400 }
      );
    }

    const siteUrl = "https://nationalfundforwomen.org";
    const defaultHeroImage = "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";
    const heroImage = template.hero_image_url || defaultHeroImage;

    // Determine membership tier from slug for welcome templates
    const isWelcomeTemplate = slug.startsWith('welcome-');
    const membershipTier = isWelcomeTemplate
      ? slug === 'welcome-free' ? 'Free'
        : slug === 'welcome-contributing' ? 'Contributing'
        : slug === 'welcome-founding' ? 'Founding'
        : 'Free'
      : 'Free';

    // Helper to replace template variables with test values
    function replaceVariables(html: string, email: string): string {
      return html
        .replace(/\{\{\s*name\s*\}\}/gi, "Test User")
        .replace(/\{\{\s*email\s*\}\}/gi, email)
        .replace(/\{\{\s*member_id\s*\}\}/g, "TEST-123456")
        .replace(/\{\{\s*membership_tier\s*\}\}/gi, membershipTier)
        .replace(/\{\{\s*renewal_date\s*\}\}/gi, "April 28, 2027")
        .replace(/\{\{\s*site_url\s*\}\}/g, siteUrl)
        .replace(/\{\{\s*dashboard_url\s*\}\}/g, `${siteUrl}/dashboard`)
        .replace(/\{\{\s*perks_url\s*\}\}/g, `${siteUrl}/perks`)
        .replace(/\{\{\s*store_url\s*\}\}/g, `${siteUrl}/store`)
        .replace(/\{\{\s*grants_url\s*\}\}/g, `${siteUrl}/grants`)
        .replace(/\{\{\s*signup_url\s*\}\}/g, `${siteUrl}/auth/sign-up`)
        .replace(/\{\{\s*gift_url\s*\}\}/g, `${siteUrl}/gift-membership`)
        .replace(/\{\{\s*faq_url\s*\}\}/g, `${siteUrl}/faq`)
        .replace(/\{\{\s*grantCycleName\s*\}\}/g, "Spring 2026 Grant Cycle")
        .replace(/\{\{\s*amount\s*\}\}/g, "5,000")
        .replace(/\{\{\s*applicationId\s*\}\}/g, "TEST-APP-001")
        .replace(/\{\{\s*status\s*\}\}/g, "under review")
        .replace(/\{\{\s*siteUrl\s*\}\}/g, siteUrl)
        .replace(/\{\{\s*ctaUrl\s*\}\}/g, `${siteUrl}/dashboard`)
        // Handlebars-style conditionals - remove them for test
        .replace(/\{\{\#if\s+\w+\s*\}\}/g, "")
        .replace(/\{\{\s*\/if\s*\}\}/g, "")
        // Grant-specific variable replacements
        .replace(/\{\{\s*grant_cycle_name\s*\}\}/g, "Spring 2026 Grant Cycle")
        .replace(/\{\{\s*message\s*\}\}/g, "Thank you for your patience.")
        .replace(/\{\{\s*application_url\s*\}\}/g, `${siteUrl}/grants/my-applications`);
    }

    const processedBody = replaceVariables(template.html_content || "", testEmail);
    const testSubject = `[TEST] ${template.subject}`;

    // Headline for welcome templates (same for all tiers)
    const headline = isWelcomeTemplate ? "Welcome to NFW!" : template.name;

    // Build membership snapshot for welcome-type templates
    const membershipSnapshot = isWelcomeTemplate ? `
      <div style="background-color: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px 20px; margin-bottom: 20px;">
        <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; font-weight: 700; color: #FFFFFF; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">Your membership snapshot</p>
        <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 4px 0;"><strong>Email:</strong> ${testEmail}</p>
        <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0;"><strong>Membership Tier:</strong> ${membershipTier}</p>
      </div>
    ` : undefined;

    // Wrap body in branded template via sendBrandedEmail
    const { success, error: sendError } = await sendBrandedEmail({
      to: testEmail,
      subject: testSubject,
      name: "Test User",
      heroImage,
      heroText: 'A <em>community</em> of women showing up for each other',
      headline,
      body: processedBody,
      membershipSnapshot,
      ctaText: "GET STARTED",
      ctaUrl: `${siteUrl}/dashboard`,
      secondaryCtaText: "BROWSE PERKS",
      secondaryCtaUrl: `${siteUrl}/perks`,
      footerCtaText: "VISIT WEBSITE",
      footerCtaUrl: siteUrl,
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