import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const EMAIL_TEMPLATES = [
  // Resend Templates
  {
    name: "Welcome Email",
    slug: "welcome",
    category: "resend",
    description: "Sent to new members after completing signup",
    subject: "Welcome to National Fund for Women",
    source_file: "lib/email.ts:sendWelcomeEmail",
    is_editable: true,
  },
  {
    name: "Newsletter Welcome",
    slug: "newsletter-welcome",
    category: "resend",
    description: "Sent when someone subscribes to newsletter",
    subject: "You're in! Welcome to the NFW community",
    source_file: "lib/email.ts:sendNewsletterWelcomeEmail",
    is_editable: true,
  },
  {
    name: "Grant Status Update",
    slug: "grant-status",
    category: "resend",
    description: "Notifies applicants about their grant application status",
    subject: "Your Grant Application Update",
    source_file: "lib/email.ts:sendGrantStatusEmail",
    is_editable: true,
  },
  {
    name: "Bank Info Request",
    slug: "bank-info-request",
    category: "resend",
    description: "Sent to request bank information from grant recipients",
    subject: "Action Required: Connect Your Bank Account",
    source_file: "lib/email.ts:sendBankInfoRequestEmail",
    is_editable: true,
  },
  {
    name: "Gift Codes Email",
    slug: "gift-codes",
    category: "resend",
    description: "Sent after purchasing gift memberships with redemption codes",
    subject: "Your National Fund for Women Gift Codes",
    source_file: "lib/email.ts:sendGiftCodesEmail",
    is_editable: true,
  },
  {
    name: "Contact Form",
    slug: "contact-form",
    category: "resend",
    description: "Auto-reply when someone submits contact form",
    subject: "We Received Your Message - National Fund for Women",
    source_file: "lib/email.ts:sendContactFormEmail",
    is_editable: true,
  },
  // Supabase Templates (read-only, copy/paste into Supabase Dashboard)
  {
    name: "Confirm Signup",
    slug: "supabase-confirm-signup",
    category: "supabase",
    description: "Email confirmation link sent after signup. Configure in Supabase Dashboard → Authentication → Email Templates.",
    subject: "Confirm Your Email",
    source_file: "Supabase Dashboard",
    is_editable: false,
  },
  {
    name: "Reset Password",
    slug: "supabase-reset-password",
    category: "supabase",
    description: "Password reset link. Configure in Supabase Dashboard → Authentication → Email Templates.",
    subject: "Reset Your Password",
    source_file: "Supabase Dashboard",
    is_editable: false,
  },
  {
    name: "Change Email",
    slug: "supabase-change-email",
    category: "supabase",
    description: "Email change confirmation. Configure in Supabase Dashboard → Authentication → Email Templates.",
    subject: "Confirm Your New Email Address",
    source_file: "Supabase Dashboard",
    is_editable: false,
  },
  {
    name: "Invite User",
    slug: "supabase-invite-user",
    category: "supabase",
    description: "Invitation to join. Configure in Supabase Dashboard → Authentication → Email Templates.",
    subject: "You've Been Invited to National Fund for Women",
    source_file: "Supabase Dashboard",
    is_editable: false,
  },
];

export async function POST() {
  try {
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

    // Upsert templates
    const results = [];
    for (const template of EMAIL_TEMPLATES) {
      const { data, error } = await supabase
        .from("email_templates")
        .upsert(
          { ...template, updated_at: new Date().toISOString() },
          { onConflict: "slug" }
        )
        .select()
        .single();

      if (error) {
        console.error(`Error upserting ${template.slug}:`, error);
        results.push({ slug: template.slug, success: false, error: error.message });
      } else {
        results.push({ slug: template.slug, success: true });
      }
    }

    return NextResponse.json({
      message: "Seeded email templates",
      results,
    });
  } catch (error) {
    console.error("[api/admin/emails/seed] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}