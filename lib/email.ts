import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const FROM =
  process.env.RESEND_FROM_EMAIL || "National Fund for Women <hello@nationalfundforwomen.org>";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

async function fetchEmailTemplate(slug: string): Promise<{ subject: string; html: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("subject, html_content")
    .eq("slug", slug)
    .single();
  if (error || !data) {
    console.error(`[email] Failed to fetch template "${slug}":`, error);
    return null;
  }
  return { subject: data.subject, html: data.html_content };
}

function replaceTemplateVariables(html: string, variables: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}

// =============================================================================
// EMAIL HTML BUILDER - Matches Resend Template Structure
// =============================================================================

interface EmailHtmlOptions {
  name: string;
  heroImage?: string;
  heroText?: string;
  headline?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  footerCtaText?: string;
  footerCtaUrl?: string;
}

export function buildEmailHtml({
  name,
  heroImage,
  heroText,
  headline,
  body,
  ctaText,
  ctaUrl,
  secondaryCtaText,
  secondaryCtaUrl,
  footerCtaText,
  footerCtaUrl,
}: EmailHtmlOptions): string {
  const logoUrl = "https://nationalfundforwomen.org/images/nfw-aubergine.png";
  const siteUrl = "https://nationalfundforwomen.org";
  const ctaBackgroundColor = "#F8F19A";
  const ctaTextColor = "#3E145F";
  const containerBackground = "#EBEBE8";
  const bodyBackground = "#B693C0";
  const footerBackground = "#3E145F";
  const whiteColor = "#FFFFFF";
  const footerCtaButtonText = footerCtaText || "VISIT WEBSITE";
  const footerCtaButtonUrl = footerCtaUrl || "https://nationalfundforwomen.org";

  const heroSection = heroImage
    ? `
    <tr>
      <td style="padding: 0; margin: 0; background-image: url('${heroImage}'); background-size: cover; background-position: center; background-repeat: no-repeat; position: relative;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding: 120px 40px; text-align: center; vertical-align: middle;" class="hero-cell">
              <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 28px; font-style: italic; font-weight: 400; color: ${whiteColor}; line-height: 1.4; margin: 0;">
                ${heroText}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    `
    : "";

  const headlineSection = headline
    ? `
    <tr>
      <td style="padding: 30px 40px 20px 40px; background-color: ${bodyBackground};">
        <h1 style="font-family: Georgia, 'Times New Roman', serif; font-size: 24px; font-weight: 700; color: ${whiteColor}; margin: 0; text-align: center;">
          ${headline}
        </h1>
      </td>
    </tr>
    `
    : "";

  const ctaButtons = (() => {
    if (!ctaText && !secondaryCtaText) return "";

    const primaryCta = ctaText
      ? `
      <a href="${ctaUrl || siteUrl}" style="display: inline-block; background-color: ${ctaBackgroundColor}; color: ${ctaTextColor}; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; text-decoration: none; padding: 12px 24px; border-radius: 0;">
        ${ctaText}
      </a>
    `
      : "";

    const secondaryCta = secondaryCtaText
      ? `
      <a href="${secondaryCtaUrl || siteUrl}" style="display: inline-block; background-color: transparent; color: ${whiteColor}; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 500; text-decoration: underline; padding: 12px 16px;">
        ${secondaryCtaText}
      </a>
    `
      : "";

    return `
    <tr>
      <td style="padding: 20px 40px; background-color: ${bodyBackground}; text-align: center;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
          <tr>
            <td style="padding: 0;">
              ${primaryCta}
              ${secondaryCta}
            </td>
          </tr>
        </table>
      </td>
    </tr>
    `;
  })();

  const socialIcons = `
    <span style="display: inline-block; padding: 15px 0;">
      <a href="https://www.instagram.com/nationalfundforwomen" target="_blank" style="display: inline-block; margin: 0 12px; text-decoration: none;">
        <img src="https://img.icons8.com/ios-filled/50/ffffff/instagram-new.png" alt="Instagram" width="28" height="28" style="display: block; width: 28px; height: 28px;">
      </a>
      <a href="https://www.tiktok.com/@nationalfundforwomen" target="_blank" style="display: inline-block; margin: 0 12px; text-decoration: none;">
        <img src="https://img.icons8.com/ios-filled/50/ffffff/tiktok--v1.png" alt="TikTok" width="28" height="28" style="display: block; width: 28px; height: 28px;">
      </a>
      <a href="https://www.facebook.com/nationalfundforwomen" target="_blank" style="display: inline-block; margin: 0 12px; text-decoration: none;">
        <img src="https://img.icons8.com/ios-filled/50/ffffff/facebook-new.png" alt="Facebook" width="28" height="28" style="display: block; width: 28px; height: 28px;">
      </a>
    </span>
  `;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>National Fund for Women</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    @media only screen and (max-width: 480px) {
      .email-outer { padding: 0 !important; }
      .email-container { width: 100% !important; background-color: #EBEBE8 !important; }
      .logo-img { width: 240px !important; }
      .header-cell { background-color: #EBEBE8 !important; }
      .body-cell { background-color: #B693C0 !important; }
      .footer-cell { background-color: #3E145F !important; padding: 30px 20px 50px 20px !important; }
      .snapshot-bg { background-color: rgba(255,255,255,0.1) !important; }
      .snapshot-text { color: #FFFFFF !important; }
      .snapshot-label { color: #FFFFFF !important; }
      .hero-cell { padding: 80px 30px !important; vertical-align: middle !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFFFF; font-family: 'DM Sans', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" class="email-outer">
    <tr>
      <td align="center">
        <!-- Email Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="border-radius: 50px; overflow: hidden; max-width: 600px;" class="email-container">

          <!-- Header with Logo -->
          <tr>
            <td style="padding: 0; background-color: ${containerBackground};" class="header-cell">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 30px 40px 20px 40px;">
                    <img src="${logoUrl}" alt="National Fund for Women" width="300" style="display: block; max-width: 100%; height: auto;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${heroSection}
          ${headlineSection}

          <!-- Body Content -->
          <tr>
            <td style="padding: 0 40px 20px 40px; background-color: ${bodyBackground};" class="body-cell">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${body}
              </table>
            </td>
          </tr>

          ${ctaButtons}

<!-- Footer -->
          <tr>
            <td style="background-color: #3E145F; padding: 30px 40px 40px 40px; text-align: center;" class="footer-cell">
              <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-style: italic; font-weight: 400; color: ${whiteColor}; line-height: 1.6; margin: 0 0 20px 0;">
                Together, we're building support women need today and the collective power to shape the future.
              </p>

              <a href="${footerCtaButtonUrl}" style="display: inline-block; background-color: ${ctaBackgroundColor}; color: ${ctaTextColor}; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; text-decoration: none; padding: 12px 24px; border-radius: 0; margin-bottom: 20px;">
                ${footerCtaButtonText}
              </a>

              <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 12px; font-style: italic; font-weight: 400; color: ${whiteColor}; margin: 0 0 15px 0;">
                For women. For real life.
              </p>

              ${socialIcons}

              <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 11px; color: #FFFFFF; margin: 20px 0 30px 0; text-align: center;">
                &copy; 2026 National Fund for Women. All rights reserved.
              </p>
            </td>
          </tr>
          
        </table>
        <!-- End Container -->
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return html;
}

// =============================================================================
// TEMPLATE EMAIL SENDER
// =============================================================================

interface SendTemplateEmailOptions {
  to: string;
  subject: string;
  name: string;
  heroImage?: string;
  heroText?: string;
  headline?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  footerCtaText?: string;
  footerCtaUrl?: string;
}

interface SendBrandedEmailOptions {
  to: string;
  subject: string;
  name: string;
  heroImage?: string;
  heroText?: string;
  headline?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  footerCtaText?: string;
  footerCtaUrl?: string;
}

async function sendBrandedEmail({
  to,
  subject,
  name,
  heroImage,
  heroText,
  headline,
  body,
  ctaText,
  ctaUrl,
  secondaryCtaText,
  secondaryCtaUrl,
  footerCtaText,
  footerCtaUrl,
}: SendBrandedEmailOptions): Promise<{ success: boolean; error?: any }> {
  const html = buildEmailHtml({
    name,
    heroImage,
    heroText,
    headline,
    body,
    ctaText,
    ctaUrl,
    secondaryCtaText,
    secondaryCtaUrl,
    footerCtaText,
    footerCtaUrl,
  });

  return sendTemplateEmail({ to, subject, html });
}

export async function sendTemplateEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: boolean; error?: any }> {
  try {
    const resend = getResend();
    const result = await resend.emails.send({
      from: FROM,
      to,
      subject,
      html,
    });
    if (result.error) {
      console.error("Resend API error:", result.error);
      return { success: false, error: result.error };
    }
    return { success: true };
  } catch (err) {
    console.error("Failed to send template email:", err);
    return { success: false, error: err };
  }
}

// =============================================================================
// WELCOME EMAILS
// =============================================================================

export async function sendWelcomeEmail({
  to,
  name,
  membershipType,
  memberId,
  renewalDate,
  heroImage,
  templateSlug,
}: {
  to: string;
  name: string;
  membershipType: "free" | "contributing" | "founding";
  memberId: string;
  renewalDate?: string;
  heroImage?: string;
  templateSlug?: string;
}) {
  const siteUrl = "https://nationalfundforwomen.org";
  const heroImageUrl = heroImage || "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";

  const slug = templateSlug || `welcome-${membershipType}`;
  const template = await fetchEmailTemplate(slug);

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const tierLabel = membershipType.charAt(0).toUpperCase() + membershipType.slice(1);

  const variables: Record<string, string> = {
    name,
    email: to,
    member_id: memberId,
    membership_tier: tierLabel,
    renewal_date: renewalDate ? formatDate(renewalDate) : "",
    site_url: siteUrl,
    dashboard_url: `${siteUrl}/dashboard`,
    perks_url: `${siteUrl}/perks`,
    store_url: `${siteUrl}/store`,
    grants_url: `${siteUrl}/grants`,
    signup_url: `${siteUrl}/auth/sign-up?step=3`,
    gift_url: `${siteUrl}/gift-membership`,
    faq_url: `${siteUrl}/faq`,
  };

  if (template) {
    const html = replaceTemplateVariables(template.html, variables);
    await sendTemplateEmail({
      to,
      subject: template.subject,
      html,
    });
  } else {
    throw new Error(`Failed to load email template: ${slug}`);
  }
}

// =============================================================================
// NEWSLETTER WELCOME EMAIL
// =============================================================================

export async function sendNewsletterWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  const siteUrl = "https://nationalfundforwomen.org";
  const heroImage = "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";
  const heroText = 'A <em>community</em> of women showing up for each other';

  const bodyHtml = `
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      Dear ${name},
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      Welcome to the National Fund for Women newsletter — where we share ways to make life a little more possible for women (yourself included), and where a growing community shows up for each other in real ways.
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">
      What to expect:
    </p>
    <ul style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 20px 0; padding-left: 20px;">
      <li style="margin-bottom: 8px;">Microgrant opportunities</li>
      <li style="margin-bottom: 8px;">Perks and partner discounts</li>
      <li style="margin-bottom: 8px;">Drops from the Zero Dollar Store</li>
      <li style="margin-bottom: 8px;">A few things we think are actually worth your time</li>
      <li style="margin-bottom: 8px;">Real stories from women across the country</li>
    </ul>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; color: #FFFFFF; margin: 0 0 20px 0;">
      No noise — just the good stuff.
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; color: #FFFFFF; margin: 0 0 30px 0;">
      Ready to become a member? Check out our website to find the membership tier that's right for you. With an NFW membership, you're supporting women simply by belonging.
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 0;">
      Talk soon,
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">
      The NFW Team
    </p>
  `;

  await sendBrandedEmail({
    to,
    subject: "You're subscribed to NFW!",
    name,
    heroImage,
    heroText,
    headline: "You're subscribed!",
    body: bodyHtml,
    ctaText: "BECOME A MEMBER",
    ctaUrl: `${siteUrl}/auth/sign-up`,
    footerCtaText: "VISIT WEBSITE",
    footerCtaUrl: siteUrl,
  });
}

// =============================================================================
// GRANT EMAILS
// =============================================================================

export async function sendGrantApplicationReceivedEmail({
  to,
  name,
  grantCycleName,
  applicationId,
}: {
  to: string;
  name: string;
  grantCycleName: string;
  applicationId: string;
}) {
  const template = await fetchEmailTemplate("grant-application-received");
  if (!template) return;

  const variables: Record<string, string> = {
    name,
    grantCycleName,
    applicationId,
    siteUrl: "https://nationalfundforwomen.org",
  };

  const html = replaceTemplateVariables(template.html, variables);
  await sendTemplateEmail({ to, subject: template.subject, html });
}

export async function sendGrantStatusEmail({
  to,
  name,
  status,
  grantCycleName,
  amountApproved,
}: {
  to: string;
  name: string;
  status: string;
  grantCycleName: string;
  amountApproved?: number;
}) {
  const slugMap: Record<string, string> = {
    in_review: "grant-under-review",
    approved: "grant-approved",
    not_approved: "grant-not-approved",
    payment_pending: "grant-payment-pending",
    payment_sent: "grant-payment-sent",
  };

  const slug = slugMap[status];
  if (!slug) return;

  const template = await fetchEmailTemplate(slug);
  if (!template) return;

  const variables: Record<string, string> = {
    name,
    grantCycleName,
    amount: amountApproved ? amountApproved.toLocaleString() : "",
  };

  const html = replaceTemplateVariables(template.html, variables);
  await sendTemplateEmail({ to, subject: template.subject, html });
}

export async function sendBankInfoRequestEmail({
  to,
  name,
  grantCycleName,
  amountApproved,
  isNominee,
}: {
  to: string;
  name: string;
  grantCycleName: string;
  amountApproved?: number;
  isNominee: boolean;
}) {
  const template = await fetchEmailTemplate("bank-info-request");
  if (!template) return;

  const nomineeIntro = isNominee
    ? `You've been nominated for the ${grantCycleName}`
    : `Your application for the ${grantCycleName} has been approved`;

  const variables: Record<string, string> = {
    name,
    grantCycleName,
    amount: amountApproved ? amountApproved.toLocaleString() : "",
    siteUrl: "https://nationalfundforwomen.org",
    ctaUrl: "https://nationalfundforwomen.org/grants/my-applications",
  };

  const html = replaceTemplateVariables(template.html, variables);
  await sendTemplateEmail({ to, subject: template.subject, html });
}

export async function sendGiftCodesEmail({
  to,
  buyerName,
  codes,
}: {
  to: string;
  buyerName: string;
  codes: string[];
}) {
  const siteUrl = "https://nationalfundforwomen.org";
  const codesList = codes.map((code) => `  • ${code}`).join("\n");

  const text = `${buyerName},\n\nThank you for your gift membership purchase! Here are your gift code(s):\n\n${codesList}\n\nShare these codes with your friends. Each code redeems 1 year of Contributing membership ($15 value).\n\nHow to redeem:\n1. Friend creates a free NFW account at ${siteUrl}/auth/sign-up\n2. During signup, they enter their code on the membership step\n3. They enjoy a full year of Contributing membership!\n\nNote: Each code can only be used once. If your friend already has an account, they can enter the code in their dashboard.\n\nThank you for supporting National Fund for Women!\n\nWith love,\nThe NFW Team`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Your NFW Gift Membership Code(s)",
      text,
    });
  } catch (err) {
    console.error("Failed to send gift codes email:", err);
  }
}

export async function sendContactFormEmail({
  name,
  email,
  subject,
  message,
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const siteUrl = "https://nationalfundforwomen.org";
  const timestamp = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const text = `New contact form submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage: ${message}\n\nSubmitted: ${timestamp}`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: "NFW <hello@nationalfundforwomen.org>",
      to: "hello@nationalfundforwomen.org",
      subject: "NFW Contact Form Submission",
      text,
    });
  } catch (err) {
    console.error("Failed to send contact form email:", err);
    throw err;
  }
}