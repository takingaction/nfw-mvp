import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmailBySlug } from "@/lib/email";

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

    // Get template to check category
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("id, slug, name, subject, category")
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

    // Define test variables - same variables as live emails but with test values
    const siteUrl = "https://nationalfundforwomen.org";
    const testVariables: Record<string, string> = {
      name: "Test User",
      email: testEmail,
      member_id: "TEST-123456",
      membership_tier: "Contributing",
      renewal_date: "April 28, 2027",
      site_url: siteUrl,
      dashboard_url: `${siteUrl}/dashboard`,
      perks_url: `${siteUrl}/perks`,
      store_url: `${siteUrl}/store`,
      grants_url: `${siteUrl}/grants`,
      signup_url: `${siteUrl}/auth/sign-up`,
      gift_url: `${siteUrl}/gift-membership`,
      faq_url: `${siteUrl}/faq`,
      grantCycleName: "Spring 2026 Grant Cycle",
      amount: "5,000",
      applicationId: "TEST-APP-001",
      grant_cycle_name: "Spring 2026 Grant Cycle",
      message: "Thank you for your patience.",
      application_url: `${siteUrl}/grants/my-applications`,
      ctaUrl: `${siteUrl}/dashboard`,
      siteUrl: siteUrl,
      cta_text: "VISIT WEBSITE",
      cta_url: siteUrl,
    };

    // Use the same sendEmailBySlug function as live emails
    const result = await sendEmailBySlug(slug, {
      to: testEmail,
      name: "Test User",
      variables: testVariables,
      errorContext: "send-test",
    });

    if (!result.success) {
      console.error(`Test email failed for ${slug}:`, result.error);
      return NextResponse.json(
        { error: result.error || "Failed to send test email" },
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
