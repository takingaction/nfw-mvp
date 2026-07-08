import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { getPreRenderedHtmlAdmin, getPreRenderedHtml } from "./email-blocks/publish";

const FROM =
  process.env.RESEND_FROM_EMAIL || "National Fund for Women <hello@nationalfundforwomen.org>";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

async function fetchEmailTemplate(slug: string): Promise<{ subject: string; html: string; hero_image_url?: string; is_active?: boolean } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("subject, html_content, hero_image_url, is_active")
    .eq("slug", slug)
    .single();
  if (error || !data) {
    console.error(`[email] Failed to fetch template "${slug}":`, error);
    return null;
  }
  return { subject: data.subject, html: data.html_content, hero_image_url: data.hero_image_url, is_active: data.is_active };
}

import getAdminClient from "@/lib/supabase/admin";

async function fetchEmailTemplateAdmin(slug: string): Promise<{ subject: string; html: string; hero_image_url?: string; is_active?: boolean } | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("subject, html_content, hero_image_url, is_active")
    .eq("slug", slug)
    .single();
  if (error || !data) {
    console.error(`[email] Failed to fetch template "${slug}" (admin):`, error);
    return null;
  }
  return { subject: data.subject, html: data.html_content, hero_image_url: data.hero_image_url, is_active: data.is_active };
}

async function fetchTemplateWithActiveCheck(slug: string): Promise<{
  template: { subject: string; html: string; hero_image_url?: string } | null;
  isActive: boolean;
}> {
  const template = await fetchEmailTemplateAdmin(slug);
  if (!template) return { template: null, isActive: false };
  return {
    template: { subject: template.subject, html: template.html, hero_image_url: template.hero_image_url },
    isActive: template.is_active !== false
  };
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
  membershipSnapshot?: string;
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
  membershipSnapshot,
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
  const footerCtaButtonText = footerCtaText;
  const footerCtaButtonUrl = footerCtaUrl || "https://nationalfundforwomen.org";
  const shouldRenderFooterCta = footerCtaText !== undefined && footerCtaText !== null;

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

  const membershipSection = membershipSnapshot
    ? `
    <tr>
      <td style="padding: 0 40px; background-color: ${bodyBackground};">
        ${membershipSnapshot}
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
          ${membershipSection}

          <!-- Body Content -->
          <tr>
            <td style="padding: 0 40px 20px 40px; background-color: ${bodyBackground}; border-bottom-left-radius: 0; border-bottom-right-radius: 0;" class="body-cell">
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

              ${shouldRenderFooterCta ? `
              <a href="${footerCtaButtonUrl}" style="display: inline-block; background-color: ${ctaBackgroundColor}; color: ${ctaTextColor}; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; text-decoration: none; padding: 12px 24px; border-radius: 0; margin-bottom: 20px;">
                ${footerCtaButtonText}
              </a>
              ` : ''}

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
  body?: string;
  membershipSnapshot?: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  footerCtaText?: string;
  footerCtaUrl?: string;
  reply_to?: string;
  from?: string;
  preRenderedHtml?: string;
  useShell?: boolean;
}

// Timeout wrapper for email sending
async function sendEmailWithTimeout(
  options: { to: string; subject: string; html: string; reply_to?: string; from?: string },
  timeoutMs = 8000
): Promise<{ success: boolean; error?: any }> {
  return Promise.race([
    sendTemplateEmail(options),
    new Promise<{ success: boolean; error?: any }>((_, reject) =>
      setTimeout(() => reject(new Error(`Email timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]).catch(err => {
    console.error("[sendEmailWithTimeout] Error:", err);
    return { success: false, error: err };
  }) as Promise<{ success: boolean; error?: any }>;
}

export async function sendBrandedEmail({
  to,
  subject,
  name,
  heroImage,
  heroText,
  headline,
  body,
  membershipSnapshot,
  ctaText,
  ctaUrl,
  secondaryCtaText,
  secondaryCtaUrl,
  footerCtaText,
  footerCtaUrl,
  reply_to,
  from,
  preRenderedHtml,
  useShell,
}: SendBrandedEmailOptions): Promise<{ success: boolean; error?: any }> {
  try {
    let html: string;
    if (preRenderedHtml && useShell === false) {
      html = preRenderedHtml;
    } else if (body) {
      html = buildEmailHtml({
        name,
        heroImage,
        heroText,
        headline,
        body,
        membershipSnapshot,
        ctaText,
        ctaUrl,
        secondaryCtaText,
        secondaryCtaUrl,
        footerCtaText,
        footerCtaUrl,
      });
    } else {
      throw new Error("sendBrandedEmail requires either preRenderedHtml with useShell=false, or body");
    }
    return sendEmailWithTimeout({ to, subject, html, reply_to, from });
  } catch (err) {
    console.error('[sendBrandedEmail] Error:', err);
    throw err;
  }
}

export async function sendTemplateEmail({
  to,
  subject,
  html,
  reply_to,
  from,
}: {
  to: string;
  subject: string;
  html: string;
  reply_to?: string;
  from?: string;
}): Promise<{ success: boolean; error?: any }> {
  try {
    const resend = getResend();
    const fromAddress = from ? `${from} <hello@nationalfundforwomen.org>` : FROM;
    const result = await resend.emails.send({
      from: fromAddress,
      to,
      subject,
      html,
      ...(reply_to && { replyTo: reply_to }),
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

  const slug = templateSlug || `welcome-${membershipType}`;

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

  const preRenderedResult = await getPreRenderedHtmlAdmin(slug, variables);

  if (preRenderedResult) {
    await sendBrandedEmail({
      to,
      subject: preRenderedResult.subject || "Welcome to NFW!",
      name,
      preRenderedHtml: preRenderedResult.html,
      useShell: false,
    });
    return;
  }

  const template = await fetchEmailTemplate(slug);
  if (!template) {
    throw new Error(`Failed to load email template: ${slug}`);
  }

  // Check if template is active before sending
  if (template.is_active === false) {
    console.log(`[sendWelcomeEmail] Template ${slug} is inactive, skipping email to ${to}`);
    return;
  }

  const heroImageUrl = heroImage || template?.hero_image_url || "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";

  if (template) {
    const body = replaceTemplateVariables(template.html, variables);

    const membershipSnapshot = `
      <div style="background-color: rgba(255,255,255,0.1); border-radius: 8px; padding: 15px 20px; margin-bottom: 20px;">
        <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 12px; font-weight: 700; color: #FFFFFF; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.05em;">Your membership snapshot</p>
        <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 4px 0;"><strong>Email:</strong> ${to}</p>
        <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 4px 0;"><strong>Membership Tier:</strong> ${tierLabel}</p>
        ${renewalDate ? `<p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0;"><strong>Renewal Date:</strong> ${formatDate(renewalDate)}</p>` : ''}
      </div>
    `;

    try {
      await sendBrandedEmail({
        to,
        subject: "Welcome to NFW! We're here to help",
        name,
        heroImage: heroImageUrl,
        heroText: 'A <em>community</em> of women showing up for each other',
        headline: "Welcome to NFW!",
        body,
        membershipSnapshot,
        ctaText: "GET STARTED",
        ctaUrl: `${siteUrl}/dashboard`,
        secondaryCtaText: "BROWSE PERKS",
        secondaryCtaUrl: `${siteUrl}/perks`,
        footerCtaText: "VISIT WEBSITE",
        footerCtaUrl: siteUrl,
      });
    } catch (err) {
      console.error('[sendWelcomeEmail] sendBrandedEmail error:', err);
      throw err;
    }
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
  const slug = "newsletter-welcome";
  const variables: Record<string, string> = { name };

const preRenderedResult = await getPreRenderedHtmlAdmin(slug, variables);

  if (preRenderedResult) {
    await sendBrandedEmail({
      to,
      subject: preRenderedResult.subject,
      name,
      preRenderedHtml: preRenderedResult.html,
      useShell: false,
    });
    return;
  }

  const template = await fetchEmailTemplateAdmin(slug);
  if (template?.is_active === false) {
    console.log(`[sendNewsletterWelcomeEmail] Template ${slug} is inactive, skipping email to ${to}`);
    return;
  }
  const heroImageUrl = template?.hero_image_url || "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";
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
    heroImage: heroImageUrl,
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
  const slug = "grant-application-received";
  const siteUrl = "https://nationalfundforwomen.org";

  const variables: Record<string, string> = {
    name,
    grantCycleName,
    applicationId,
    siteUrl,
  };

  const preRenderedResult = await getPreRenderedHtml(slug, variables);

  if (preRenderedResult) {
    await sendBrandedEmail({
      to,
      subject: preRenderedResult.subject,
      name,
      preRenderedHtml: preRenderedResult.html,
      useShell: false,
    });
    return;
  }

  const template = await fetchEmailTemplate(slug);
  if (!template) return;
  if (template.is_active === false) {
    console.log(`[sendGrantApplicationReceivedEmail] Template ${slug} is inactive, skipping email to ${to}`);
    return;
  }

  const heroImageUrl = template?.hero_image_url || "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";

  const body = replaceTemplateVariables(template.html, variables);
  await sendBrandedEmail({
    to,
    subject: template.subject,
    name,
    heroImage: heroImageUrl,
    heroText: 'Your application is <em>in review</em>',
    headline: "Application Received",
    body,
    ctaText: "VIEW YOUR APPLICATION",
    ctaUrl: `${siteUrl}/grants/my-applications`,
    footerCtaText: "VISIT WEBSITE",
    footerCtaUrl: siteUrl,
  });
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
    approved: "grant-approved",
    not_approved: "grant-not-approved",
    payment_pending: "grant-payment-pending",
    payment_sent: "grant-payment-sent",
  };

  const slug = slugMap[status];
  if (!slug) return;

  const siteUrl = "https://nationalfundforwomen.org";

  const variables: Record<string, string> = {
    name,
    grantCycleName,
    amount: amountApproved ? amountApproved.toLocaleString() : "",
  };

  const preRenderedResult = await getPreRenderedHtml(slug, variables);

  if (preRenderedResult) {
    await sendBrandedEmail({
      to,
      subject: preRenderedResult.subject,
      name,
      preRenderedHtml: preRenderedResult.html,
      useShell: false,
    });
    return;
  }

  const template = await fetchEmailTemplate(slug);
  if (!template) return;
  if (template.is_active === false) {
    console.log(`[sendGrantStatusEmail] Template ${slug} is inactive, skipping email to ${to}`);
    return;
  }

  const heroImageUrl = template?.hero_image_url || "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";

  const statusHeadlines: Record<string, string> = {
    in_review: "Application Under Review",
    approved: "Congratulations!",
    not_approved: "Update on Your Application",
    payment_pending: "Payment Processing",
    payment_sent: "Payment Sent!",
  };

  const statusHeroText: Record<string, string> = {
    in_review: "We're <em>reviewing</em> your application",
    approved: "You've been <em>approved</em>",
    not_approved: "We've <em>updated</em> your application",
    payment_pending: "Your payment is <em>on the way</em>",
    payment_sent: "Your payment is <em>on the way</em>",
  };

  const body = replaceTemplateVariables(template.html, variables);
  await sendBrandedEmail({
    to,
    subject: template.subject,
    name,
    heroImage: heroImageUrl,
    heroText: statusHeroText[status] || 'Your application status has changed',
    headline: statusHeadlines[status] || "Application Update",
    body,
    ctaText: "VIEW YOUR APPLICATION",
    ctaUrl: `${siteUrl}/grants/my-applications`,
    footerCtaText: "VISIT WEBSITE",
    footerCtaUrl: siteUrl,
  });
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
  const slug = "bank-info-request";
  const siteUrl = "https://nationalfundforwomen.org";

  const variables: Record<string, string> = {
    name,
    grantCycleName,
    amount: amountApproved ? amountApproved.toLocaleString() : "",
  };

  const preRenderedResult = await getPreRenderedHtmlAdmin(slug, variables);

  if (preRenderedResult) {
    await sendBrandedEmail({
      to,
      subject: preRenderedResult.subject,
      name,
      preRenderedHtml: preRenderedResult.html,
      useShell: false,
    });
    return;
  }

  const template = await fetchEmailTemplateAdmin(slug);
  if (!template) return;
  if (template.is_active === false) {
    console.log(`[sendBankInfoRequestEmail] Template ${slug} is inactive, skipping email to ${to}`);
    return;
  }

  const heroImageUrl = template?.hero_image_url || "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";

  const body = replaceTemplateVariables(template.html || "", variables);

  await sendBrandedEmail({
    to,
    subject: template.subject,
    name,
    heroImage: heroImageUrl,
    heroText: 'Action <em>required</em>',
    headline: isNominee ? "You've Been Nominated" : "Congratulations!",
    body,
    ctaText: "CONNECT BANK ACCOUNT",
    ctaUrl: `${siteUrl}/grants/my-applications`,
    footerCtaText: "VISIT WEBSITE",
    footerCtaUrl: siteUrl,
  });
}

export async function sendBankAccountConnectedAdminEmail({
  memberName,
  memberEmail,
  grantCycleName,
  grantId,
}: {
  memberName: string;
  memberEmail: string;
  grantCycleName: string;
  grantId: string;
}) {
  const siteUrl = "https://nationalfundforwomen.org";

  const body = `
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      A grant applicant has successfully connected their bank account and is ready to receive payment.
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      <strong>Member:</strong> ${memberName} (${memberEmail})<br/>
      <strong>Grant Cycle:</strong> ${grantCycleName}<br/>
      <strong>Grant ID:</strong> ${grantId}
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      Please initiate the payment in the Stripe dashboard and update the grant status to "Payment Sent" once completed.
    </p>
  `;

  await sendBrandedEmail({
    to: "hello@nationalfundforwomen.org",
    subject: `Bank Account Connected - ${memberName} - ${grantCycleName}`,
    name: "NFW Admin",
    heroImage: "https://nationalfundforwomen.org/images/email-welcome-hero.jpg",
    heroText: 'Bank Account <em>Connected</em>',
    headline: "Grant Payment Ready",
    body,
    footerCtaText: "VIEW APPLICATION",
    footerCtaUrl: `${siteUrl}/grants/view/${grantId}`,
  });
}

export async function sendPaymentSentAdminEmail({
  memberName,
  memberEmail,
  grantCycleName,
  grantId,
  amount,
}: {
  memberName: string;
  memberEmail: string;
  grantCycleName: string;
  grantId: string;
  amount: string;
}) {
  const siteUrl = "https://nationalfundforwomen.org";

  const body = `
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      A grant payment of <strong>$${amount}</strong> has been successfully sent to the recipient.
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      <strong>Member:</strong> ${memberName} (${memberEmail})<br/>
      <strong>Grant Cycle:</strong> ${grantCycleName}<br/>
      <strong>Grant ID:</strong> ${grantId}<br/>
      <strong>Amount:</strong> $${amount}
    </p>
  `;

  await sendBrandedEmail({
    to: "hello@nationalfundforwomen.org",
    subject: `Payment Sent - ${memberName} - ${grantCycleName} - $${amount}`,
    name: "NFW Admin",
    heroImage: "https://nationalfundforwomen.org/images/email-welcome-hero.jpg",
    heroText: 'Payment <em>Sent</em>',
    headline: "Grant Payment Sent",
    body,
    footerCtaText: "VIEW APPLICATION",
    footerCtaUrl: `${siteUrl}/grants/view/${grantId}`,
  });
}

export async function sendPaymentSentUserEmail({
  memberName,
  memberEmail,
  grantCycleName,
  amount,
}: {
  memberName: string;
  memberEmail: string;
  grantCycleName: string;
  amount: string;
}) {
  const siteUrl = "https://nationalfundforwomen.org";

  const body = `
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      Congratulations ${memberName},
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      Your grant payment of <strong>$${amount}</strong> for <strong>${grantCycleName}</strong> has been sent!
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      The funds are being processed and should arrive in your bank account within 1-3 business days.
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      If you have any questions, please contact us at <a href="mailto:hello@nationalfundforwomen.org" style="color: #F8F19A;">hello@nationalfundforwomen.org</a>.
    </p>
  `;

  await sendBrandedEmail({
    to: memberEmail,
    subject: `Your NFW Grant Payment Has Been Sent - $${amount}`,
    name: memberName,
    heroImage: "https://nationalfundforwomen.org/images/email-welcome-hero.jpg",
    heroText: 'Payment <em>Sent</em>',
    headline: "Grant Payment On Its Way!",
    body,
    footerCtaText: "VIEW APPLICATION",
    footerCtaUrl: `${siteUrl}/grants/my-applications`,
  });
}

export async function sendTransferReversedAdminEmail({
  memberName,
  memberEmail,
  grantCycleName,
  grantId,
  amount,
}: {
  memberName: string;
  memberEmail: string;
  grantCycleName: string;
  grantId: string;
  amount: string;
}) {
  const siteUrl = "https://nationalfundforwomen.org";

  const body = `
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      <strong style="color: #ff6b6b;">ALERT:</strong> A grant payment transfer was reversed and did not go through.
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      <strong>Member:</strong> ${memberName} (${memberEmail})<br/>
      <strong>Grant Cycle:</strong> ${grantCycleName}<br/>
      <strong>Grant ID:</strong> ${grantId}<br/>
      <strong>Amount:</strong> $${amount}
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      Please investigate this issue and re-initiate the payment if necessary.
    </p>
  `;

  await sendBrandedEmail({
    to: "hello@nationalfundforwomen.org",
    subject: `⚠️ Transfer Reversed - ${memberName} - ${grantCycleName} - $${amount}`,
    name: "NFW Admin",
    heroImage: "https://nationalfundforwomen.org/images/email-welcome-hero.jpg",
    heroText: 'Transfer <em>Failed</em>',
    headline: "Payment Transfer Reversed",
    body,
    footerCtaText: "VIEW APPLICATION",
    footerCtaUrl: `${siteUrl}/grants/view/${grantId}`,
  });
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
  const slug = "gift-codes";

  const codesList = codes.map((code) => `<p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 18px; font-weight: 700; color: #F8F19A; margin: 10px 0;">${code}</p>`).join("");
  const codesText = codes.join(", ");

  const variables: Record<string, string> = {
    name: buyerName,
    codes: codesText,
    codes_list: codesList,
  };

  const preRenderedResult = await getPreRenderedHtml(slug, variables);

  if (preRenderedResult) {
    await sendBrandedEmail({
      to,
      subject: preRenderedResult.subject,
      name: buyerName,
      preRenderedHtml: preRenderedResult.html,
      useShell: false,
    });
    return;
  }

  const template = await fetchEmailTemplate(slug);
  if (!template) return;
  if (template.is_active === false) {
    console.log(`[sendGiftCodesEmail] Template ${slug} is inactive, skipping email to ${to}`);
    return;
  }

  const heroImageUrl = template?.hero_image_url || "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";

  const body = `
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      Dear ${buyerName},
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      Thank you for your gift membership purchase! Here are your redemption code(s):
    </p>
    ${codesList}
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0 10px 0;">
      To redeem, share these code(s) with your friends. Each code redeems 1 year of Contributing membership.
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">
      How to redeem:
    </p>
    <ol style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 20px 0; padding-left: 20px;">
      <li style="margin-bottom: 8px;">Friend creates a free NFW account at nationalfundforwomen.org/auth/sign-up</li>
      <li style="margin-bottom: 8px;">During signup, they enter their code on the membership step</li>
      <li style="margin-bottom: 8px;">They enjoy a full year of Contributing membership!</li>
    </ol>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0 0 0;">
      Questions? Email <a href="mailto:hello@nationalfundforwomen.org" style="color: #F8F19A;">hello@nationalfundforwomen.org</a>
    </p>
  `;

  await sendBrandedEmail({
    to,
    subject: "Your National Fund for Women Gift Code(s)",
    name: buyerName,
    heroImage: heroImageUrl,
    heroText: 'Gift a <em>year of community</em>',
    headline: "Your Gift Codes",
    body,
    ctaText: "LEARN ABOUT MEMBERSHIP",
    ctaUrl: `${siteUrl}/auth/sign-up`,
    footerCtaText: "VISIT WEBSITE",
    footerCtaUrl: siteUrl,
  });
}

export async function sendFreshdeskTicketRejectionEmail({
  name,
  email,
  subject,
  message,
  rejectionReason,
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
  rejectionReason: string;
}): Promise<{ success: boolean; error?: any }> {
  const siteUrl = "https://nationalfundforwomen.org";
  const slug = "freshdesk-rejection";
  const timestamp = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const variables: Record<string, string> = {
    name,
    email,
    subject,
    message,
    rejectionReason,
    timestamp,
  };

  const preRenderedResult = await getPreRenderedHtml(slug, variables);

  if (preRenderedResult) {
    return sendBrandedEmail({
      to: "ron@myherocreative.com",
      subject: preRenderedResult.subject || `⚠️ Contact Form Rejected: ${name} - ${subject}`,
      name: "NFW Admin",
      preRenderedHtml: preRenderedResult.html,
      useShell: false,
    });
  }

  const heroImageUrl = "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";

  const body = `
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      <strong style="color: #F8F19A;">⚠️ Freshdesk rejected a contact form submission.</strong>
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      <strong>Rejection reason:</strong> ${rejectionReason}
    </p>
    <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.2); margin: 20px 0;">
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; color: #FFFFFF; margin: 0 0 10px 0;">
      <strong>Name:</strong> ${name}
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; color: #FFFFFF; margin: 0 0 10px 0;">
      <strong>Email:</strong> ${email}
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; color: #FFFFFF; margin: 0 0 10px 0;">
      <strong>Category:</strong> ${subject}
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; color: #FFFFFF; margin: 0 0 10px 0;">
      <strong>Submitted:</strong> ${timestamp}
    </p>
    <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.2); margin: 20px 0;">
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; color: #FFFFFF; margin: 0 0 20px 0;">
      <strong>Message:</strong>
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0;">
      ${message}
    </p>
  `;

  return sendBrandedEmail({
    to: "ron@myherocreative.com",
    subject: `⚠️ Contact Form Rejected: ${name} - ${subject}`,
    name: "NFW Admin",
    heroImage: heroImageUrl,
    heroText: 'Freshdesk <em>rejected</em> a submission',
    headline: "Contact Form Submission Rejected",
    body,
    footerCtaText: "VISIT ADMIN",
    footerCtaUrl: `${siteUrl}/admin/contact-submissions`,
  });
}

export async function sendFreshdeskTicket({
  name,
  email,
  subject,
  message,
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<{ success: boolean; error?: any; ticketId?: string | null }> {
  console.log("[Freshdesk] Function called with:", { name, email, subject });
  
  const domain = process.env.FRESHDESK_DOMAIN;
  const apiKey = process.env.FRESHDESK_API_KEY;

  console.log("[Freshdesk] Domain:", domain, "Has API Key:", !!apiKey);

  if (!domain || !apiKey) {
    console.error("[Freshdesk] Not configured - missing FRESHDESK_DOMAIN or FRESHDESK_API_KEY");
    return { success: false, error: "Freshdesk not configured" };
  }

  const credentials = Buffer.from(`${apiKey}:X`).toString("base64");
  console.log("[Freshdesk] Making API call to:", `https://${domain}/api/v2/tickets`);

  try {
    const response = await fetch(`https://${domain}/api/v2/tickets`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        name,
        subject: `Contact Form: ${subject}`,
        description: message,
        status: 2,
        priority: 1,
      }),
    });

    console.log("[Freshdesk] Response status:", response.status);
    const responseBody = await response.text();
    console.log("[Freshdesk] Response body:", responseBody);

    if (!response.ok) {
      console.error("[Freshdesk] API error:", responseBody);
      return { success: false, error: responseBody, ticketId: null };
    }

    console.log("[Freshdesk] Ticket created successfully!");
    try {
      const responseData = JSON.parse(responseBody);
      return { success: true, ticketId: responseData.id, error: null };
    } catch {
      return { success: true, ticketId: null, error: null };
    }
  } catch (err) {
    console.error("[Freshdesk] Failed to create ticket:", err);
    return { success: false, error: err, ticketId: null };
  }
}

export async function sendContactAcknowledgement({
  name,
  email,
  subject,
}: {
  name: string;
  email: string;
  subject: string;
}) {
  const siteUrl = "https://nationalfundforwomen.org";
  const slug = "contact-form";

const variables: Record<string, string> = {
    name,
    subject,
  };

  const preRenderedResult = await getPreRenderedHtmlAdmin(slug, variables);

  if (preRenderedResult) {
    await sendBrandedEmail({
      to: email,
      subject: preRenderedResult.subject || `NFW Contact Form: ${subject}`,
      name,
      preRenderedHtml: preRenderedResult.html,
      useShell: false,
    });
    return;
  }

  const template = await fetchEmailTemplate(slug);
  const heroImageUrl = template?.hero_image_url || "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";

  const body = `
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      Dear ${name},
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      Thanks for reaching out! We've received your message and will get back to you within 1-2 business days.
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      In the meantime, feel free to explore our <a href="${siteUrl}" style="color: #F8F19A;">website</a> or check out our <a href="${siteUrl}/faq" style="color: #F8F19A;">FAQ</a> for quick answers.
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">
      Talk soon,
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">
      The NFW Team
    </p>
  `;

  await sendBrandedEmail({
    to: email,
    subject: `NFW Contact Form: ${subject}`,
    name,
    heroImage: heroImageUrl,
    heroText: 'We\'ve <em>received</em> your message',
    headline: "Message Received",
    body,
    footerCtaText: "VISIT WEBSITE",
    footerCtaUrl: siteUrl,
  });
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
  const slug = "contact-form";
  const timestamp = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const variables: Record<string, string> = {
    name,
    email,
    subject,
    message,
    timestamp,
  };

  const preRenderedResult = await getPreRenderedHtml(slug, variables);

  if (preRenderedResult) {
    await sendBrandedEmail({
      to: email,
      subject: preRenderedResult.subject || `NFW Contact Form: ${subject}`,
      name,
      preRenderedHtml: preRenderedResult.html,
      useShell: false,
    });
    return;
  }

  const template = await fetchEmailTemplate(slug);
  if (!template) return;
  if (template.is_active === false) {
    console.log(`[sendContactFormEmail] Template ${slug} is inactive, skipping email to ${email}`);
    return;
  }

  const heroImageUrl = template?.hero_image_url || "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";

  const body = `
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      Dear ${name},
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      Thanks for reaching out! We've received your message and will get back to you within 1-2 business days.
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      In the meantime, feel free to explore our <a href="${siteUrl}" style="color: #F8F19A;">website</a> or check out our <a href="${siteUrl}/faq" style="color: #F8F19A;">FAQ</a> for quick answers.
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">
      Talk soon,
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">
      The NFW Team
    </p>
  `;

  await sendBrandedEmail({
    to: email,
    subject: `NFW Contact Form: ${subject}`,
    name,
    heroImage: heroImageUrl,
    heroText: 'We\'ve <em>received</em> your message',
    headline: "Message Received",
    body,
    footerCtaText: "VISIT WEBSITE",
    footerCtaUrl: siteUrl,
  });
}

interface StoryFormData {
  name: string;
  email: string;
  age: string;
  city: string;
  state: string;
  drawnToMembership?: string;
  programsEngaged?: string;
  favoritePart?: string;
  howNfwHelped?: string;
  whyJoin?: string;
  permissionGranted: boolean;
  preferAnonymous: boolean;
  interestedVideo: boolean;
}

export async function sendStoryNotificationEmail(data: StoryFormData) {
  const resend = getResend();
  const toEmail = "hello@nationalfundforwomen.org";

  const submittedAt = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const formatOptional = (val?: string) => val?.trim() || "<em>No response</em>";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #EBEBE8; font-family: 'DM Sans', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background-color: #3E145F; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 900;">New Story Submission</h1>
    </div>
    <div style="background-color: #B693C0; padding: 30px; border-radius: 0;">
      <table style="width: 100%; border-collapse: collapse; color: #FFFFFF; font-size: 14px;">
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2); font-weight: bold; width: 120px;">Submitted</td>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">${submittedAt}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2); font-weight: bold;">Name</td>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">${data.name}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2); font-weight: bold;">Email</td>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2);"><a href="mailto:${data.email}" style="color: #F8F19A;">${data.email}</a></td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2); font-weight: bold;">Age</td>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">${data.age}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2); font-weight: bold;">Location</td>
          <td style="padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.2);">${data.city || ""}${data.city && data.state ? ", " : ""}${data.state || ""}</td>
        </tr>
      </table>

      <div style="margin-top: 30px;">
        <h3 style="color: #F8F19A; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">Story Responses</h3>

        <div style="margin-bottom: 20px;">
          <div style="font-weight: bold; color: #FFFFFF; margin-bottom: 5px;">What drew you to becoming a National Fund for Women member?</div>
          <div style="color: #FFFFFF; line-height: 1.6;">${formatOptional(data.drawnToMembership)}</div>
        </div>

        <div style="margin-bottom: 20px;">
          <div style="font-weight: bold; color: #FFFFFF; margin-bottom: 5px;">Which NFW program(s) have you engaged with? What was your experience?</div>
          <div style="color: #FFFFFF; line-height: 1.6;">${formatOptional(data.programsEngaged)}</div>
        </div>

        <div style="margin-bottom: 20px;">
          <div style="font-weight: bold; color: #FFFFFF; margin-bottom: 5px;">What is your favorite part about being an NFW member?</div>
          <div style="color: #FFFFFF; line-height: 1.6;">${formatOptional(data.favoritePart)}</div>
        </div>

        <div style="margin-bottom: 20px;">
          <div style="font-weight: bold; color: #FFFFFF; margin-bottom: 5px;">How has NFW helped you?</div>
          <div style="color: #FFFFFF; line-height: 1.6;">${formatOptional(data.howNfwHelped)}</div>
        </div>

        <div style="margin-bottom: 20px;">
          <div style="font-weight: bold; color: #FFFFFF; margin-bottom: 5px;">Why should others join NFW?</div>
          <div style="color: #FFFFFF; line-height: 1.6;">${formatOptional(data.whyJoin)}</div>
        </div>
      </div>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.2);">
        <h3 style="color: #F8F19A; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">Permissions</h3>
        <table style="width: 100%; color: #FFFFFF; font-size: 14px;">
          <tr>
            <td style="padding: 5px 0;">Permission to use quotes:</td>
            <td style="padding: 5px 0; text-align: right;">${data.permissionGranted ? "Yes" : "No"}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">Prefer anonymous:</td>
            <td style="padding: 5px 0; text-align: right;">${data.preferAnonymous ? "Yes" : "No"}</td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">Interested in video:</td>
            <td style="padding: 5px 0; text-align: right;">${data.interestedVideo ? "Yes" : "No"}</td>
          </tr>
        </table>
      </div>
    </div>
    <div style="background-color: #2E1F38; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
      <a href="https://nationalfundforwomen.org/admin/story-submissions" style="color: #B693C0; text-decoration: none; font-size: 12px;">View in Admin</a>
    </div>
  </div>
</body>
</html>
  `;

  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `New Story Submission from ${data.name}`,
    html,
  });
}

// =============================================================================
// ABANDONED CHECKOUT RECOVERY EMAIL
// =============================================================================

export async function sendAbandonedCheckoutEmail({
  to,
  name,
  membershipLevel,
  ctaUrl,
}: {
  to: string;
  name: string;
  membershipLevel: string;
  ctaUrl: string;
}) {
  const slug = "abandoned-checkout-recovery";
  const siteUrl = "https://nationalfundforwomen.org";

  const variables: Record<string, string> = {
    name: name || "there",
    membershipLevel: membershipLevel === "founding" ? "Founding" : "Contributing",
    ctaUrl: ctaUrl || `${siteUrl}/checkout/resume`,
    siteUrl,
  };

  // Check if template is published and use that, otherwise fall back
  const preRenderedResult = await getPreRenderedHtmlAdmin(slug, variables);

  if (preRenderedResult) {
    await sendBrandedEmail({
      to,
      subject: preRenderedResult.subject || "Complete your membership",
      name: variables.name,
      preRenderedHtml: preRenderedResult.html,
      useShell: false,
    });
    return;
  }

  // Fall back to html_content if not published
  const template = await fetchEmailTemplateAdmin(slug);
  if (!template) {
    console.log(`[sendAbandonedCheckoutEmail] Template "${slug}" not found`);
    return;
  }

  if (template.is_active === false) {
    console.log(`[sendAbandonedCheckoutEmail] Template ${slug} is inactive, skipping email to ${to}`);
    return;
  }

  const body = replaceTemplateVariables(template.html, variables);

  await sendBrandedEmail({
    to,
    subject: template.subject,
    name: variables.name,
    heroImage: template.hero_image_url || "https://nationalfundforwomen.org/images/email-welcome-hero.jpg",
    heroText: "Complete your <em>membership</em>",
    headline: "You left something behind",
    body,
    ctaText: "COMPLETE YOUR MEMBERSHIP",
    ctaUrl: variables.ctaUrl,
    footerCtaText: "VISIT WEBSITE",
    footerCtaUrl: siteUrl,
  });
}

// =============================================================================
// WAITLIST WELCOME EMAIL
// =============================================================================

export async function sendWaitlistWelcomeEmail({
  to,
  name,
  waitlistCount,
}: {
  to: string;
  name: string;
  waitlistCount: number;
}): Promise<{ success: boolean; error?: string }> {
  const slug = "waitlist-welcome";
  const siteUrl = "https://nationalfundforwomen.org";

  const variables: Record<string, string> = {
    name: name || "there",
    waitlistCount: waitlistCount.toString(),
    ctaUrl: `${siteUrl}/auth/sign-up?step=3`,
    siteUrl,
  };

  try {
    // Check if template is published and use that, otherwise fall back
    const preRenderedResult = await getPreRenderedHtmlAdmin(slug, variables);

    if (preRenderedResult) {
      await sendBrandedEmail({
        to,
        subject: preRenderedResult.subject || "You're on the List",
        name: variables.name,
        preRenderedHtml: preRenderedResult.html,
        useShell: false,
      });
      return { success: true };
    }

    // Fall back to html_content if not published
    const template = await fetchEmailTemplateAdmin(slug);
    if (!template) {
      console.log(`[sendWaitlistWelcomeEmail] Template "${slug}" not found`);
      return { success: false, error: "Template not found" };
    }

    if (template.is_active === false) {
      console.log(`[sendWaitlistWelcomeEmail] Template ${slug} is inactive, skipping email to ${to}`);
      return { success: false, error: "Template inactive" };
    }

    const body = replaceTemplateVariables(template.html, variables);

    await sendBrandedEmail({
      to,
      subject: template.subject,
      name: variables.name,
      heroImage: template.hero_image_url || "https://nationalfundforwomen.org/images/email-welcome-hero.jpg",
      heroText: "You're on the List",
      headline: "Thanks for joining the waitlist!",
      body,
      ctaText: "BECOME A CONTRIBUTING MEMBER",
      ctaUrl: variables.ctaUrl,
      footerCtaText: "VISIT WEBSITE",
      footerCtaUrl: siteUrl,
    });

    return { success: true };
  } catch (err: any) {
    console.error("[sendWaitlistWelcomeEmail] Error:", err);
    return { success: false, error: err?.message || "Unknown error" };
  }
}