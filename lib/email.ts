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

async function fetchEmailTemplate(slug: string): Promise<{ subject: string; html: string; hero_image_url?: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("email_templates")
    .select("subject, html_content, hero_image_url")
    .eq("slug", slug)
    .single();
  if (error || !data) {
    console.error(`[email] Failed to fetch template "${slug}":`, error);
    return null;
  }
  return { subject: data.subject, html: data.html_content, hero_image_url: data.hero_image_url };
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
  body: string;
  membershipSnapshot?: string;
  ctaText?: string;
  ctaUrl?: string;
  secondaryCtaText?: string;
  secondaryCtaUrl?: string;
  footerCtaText?: string;
  footerCtaUrl?: string;
  reply_to?: string;
  from?: string;
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
}: SendBrandedEmailOptions): Promise<{ success: boolean; error?: any }> {
  try {
    const html = buildEmailHtml({
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
  const template = await fetchEmailTemplate(slug);

  const heroImageUrl = heroImage || template?.hero_image_url || "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";

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
  const template = await fetchEmailTemplate("newsletter-welcome");
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
  const template = await fetchEmailTemplate("grant-application-received");
  if (!template) return;

  const siteUrl = "https://nationalfundforwomen.org";
  const heroImageUrl = template?.hero_image_url || "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";

  const variables: Record<string, string> = {
    name,
    grantCycleName,
    applicationId,
    siteUrl,
  };

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

  const siteUrl = "https://nationalfundforwomen.org";
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

  const variables: Record<string, string> = {
    name,
    grantCycleName,
    amount: amountApproved ? amountApproved.toLocaleString() : "",
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
  const template = await fetchEmailTemplate("bank-info-request");
  if (!template) return;

  const siteUrl = "https://nationalfundforwomen.org";
  const heroImageUrl = template?.hero_image_url || "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";

  const variables: Record<string, string> = {
    name,
    grantCycleName,
    amount: amountApproved ? amountApproved.toLocaleString() : "",
  };

  const body = replaceTemplateVariables(template.html, variables);
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
  const template = await fetchEmailTemplate("gift-codes");
  const heroImageUrl = template?.hero_image_url || "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";
  const codesList = codes.map((code) => `<p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 18px; font-weight: 700; color: #F8F19A; margin: 10px 0;">${code}</p>`).join("");

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
}): Promise<{ success: boolean; error?: any }> {
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
        subject: `Contact Form: ${subject}`,
        description: message,
        status: 2,
        priority: 1,
        requester: {
          name,
        },
      }),
    });

    console.log("[Freshdesk] Response status:", response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error("[Freshdesk] API error:", error);
      return { success: false, error };
    }

    console.log("[Freshdesk] Ticket created successfully!");
    return { success: true };
  } catch (err) {
    console.error("[Freshdesk] Failed to create ticket:", err);
    return { success: false, error: err };
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
  const template = await fetchEmailTemplate("contact-form");
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
  const template = await fetchEmailTemplate("contact-form");
  const heroImageUrl = template?.hero_image_url || "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";
  const timestamp = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

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

  // Send acknowledgement to the sender
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

  // Also send notification to the organization with submission details
  const notificationBody = `
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
      <strong>New Contact Form Submission</strong>
    </p>
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

  await sendBrandedEmail({
    to: "hello@nationalfundforwomen.org",
    subject: `New Contact: ${name} - ${subject}`,
    name: "NFW Team",
    heroImage: heroImageUrl,
    heroText: 'New <em>contact form</em> submission',
    headline: "Contact Form Submission",
    body: notificationBody,
    footerCtaText: "VISIT WEBSITE",
    footerCtaUrl: siteUrl,
    reply_to: email,
    from: name,
  });
}