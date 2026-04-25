import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendTemplateEmail } from "@/lib/email";

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
      .select("slug, name, subject, html_content, category")
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

    // Send test email using the template's HTML content
    // We need to replace variables with test values
    const testHtml = template.html_content
      .replace(/\{\{\s*\.Email\s*\}\}/g, testEmail)
      .replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, "https://nationalfundforwomen.org/auth/confirm?token=test-token")
      .replace(/\{\{\s*\.Token\s*\}\}/g, "123456")
      .replace(/\{\{\s*\.TokenHash\s*\}\}/g, "test-token-hash")
      .replace(/\{\{\s*\.SiteURL\s*\}\}/g, "https://nationalfundforwomen.org")
      .replace(/\{\{\s*\.NewEmail\s*\}\}/g, testEmail)
      .replace(/\{\{\s*\.OldEmail\s*\}\}/g, "old@example.com")
      .replace(/\{\{\s*\.Phone\s*\}\}/g, "+1234567890")
      .replace(/\{\{\s*\.OldPhone\s*\}\}/g, "+0987654321")
      .replace(/\{\{\s*\.Provider\s*\}\}/g, "Google")
      .replace(/\{\{\s*\.FactorType\s*\}\}/g, "totp");

    const testSubject = `[TEST] ${template.subject}`.replace(/\{\{\s*\..*?\s*\}\}/g, testEmail);

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