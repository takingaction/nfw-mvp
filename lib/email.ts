import { Resend } from "resend";

const FROM =
  process.env.RESEND_FROM_EMAIL || "NFW <hello@nationalfundforwomen.org>";

function getResend() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(process.env.RESEND_API_KEY);
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

function buildEmailHtml({
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
            <td style="padding: 120px 40px; text-align: center; vertical-align: middle;">
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
    <tr>
      <td style="padding: 15px 0; text-align: center;">
        <a href="https://www.instagram.com/nationalfundforwomen" style="display: inline-block; margin: 0 8px; width: 24px; height: 24px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="${whiteColor}">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </a>
        <a href="https://www.tiktok.com/@nationalfundforwomen" style="display: inline-block; margin: 0 8px; width: 24px; height: 24px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="${whiteColor}">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
          </svg>
        </a>
        <a href="https://www.facebook.com/nationalfundforwomen" style="display: inline-block; margin: 0 8px; width: 24px; height: 24px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="${whiteColor}">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
        </a>
      </td>
    </tr>
  `;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>National Fund for Women</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'DM Sans', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <!-- Email Container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: ${containerBackground}; border-radius: 50px 50px 0 0; overflow: hidden; max-width: 600px;">
          
          <!-- Header with Logo -->
          <tr>
            <td style="padding: 0; background-color: ${containerBackground}; overflow: hidden;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 30px 40px 20px 40px;">
                    <img src="${logoUrl}" alt="National Fund for Women" width="200" style="display: block;" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${heroSection}
          ${headlineSection}

          <!-- Body Content -->
          <tr>
            <td style="padding: 0 40px 20px 40px; background-color: ${bodyBackground};">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${body}
              </table>
            </td>
          </tr>

          ${ctaButtons}

<!-- Footer -->
          <tr>
            <td style="background-color: ${footerBackground}; padding: 30px 40px; text-align: center;">
              <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-style: italic; font-weight: 400; color: ${whiteColor}; line-height: 1.6; margin: 0 0 20px 0;">
                Together, we're building support women need today and the collective power to share the future.
              </p>

              <a href="${footerCtaButtonUrl}" style="display: inline-block; background-color: ${ctaBackgroundColor}; color: ${ctaTextColor}; font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; text-decoration: none; padding: 12px 24px; border-radius: 0; margin-bottom: 20px;">
                ${footerCtaButtonText}
              </a>

              <p style="font-family: Georgia, 'Times New Roman', serif; font-size: 12px; font-style: italic; font-weight: 400; color: ${whiteColor}; margin: 0 0 15px 0;">
                For women. For real life.
              </p>

              ${socialIcons}

              <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 11px; color: ${whiteColor}; opacity: 0.7; margin: 15px 0 0 0;">
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

async function sendTemplateEmail({
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
}: SendTemplateEmailOptions): Promise<{ success: boolean; error?: any }> {
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
}: {
  to: string;
  name: string;
  membershipType: "free" | "contributing" | "founding";
  memberId: string;
  renewalDate?: string;
  heroImage?: string;
}) {
  const siteUrl = "https://nationalfundforwomen.org";
  const heroImageUrl = heroImage || "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";
  const heroText = 'A <em>community</em> of women showing up for each other';

  const tierMessages = {
    free: `
      <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
        Welcome to the National Fund for Women! We couldn't be more excited to have you join our community.
      </p>
      <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
        At NFW, we believe that women deserve real support when they need it. Asking for help shouldn't come with added barriers or additional stress. Our goal is to provide immediate, practical support for women at every stage of their lives, while building collective power along the way. We hope you find plenty of support, connection, and joy here — we've got your back!
      </p>
    `,
    contributing: `
      <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
        Welcome to the National Fund for Women! We couldn't be more excited to have you join our community.
      </p>
      <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
        At NFW, we believe that women deserve real support when they need it. As a Contributing Member, your membership helps make that possible for you and for every woman who comes after you. You're supporting women simply by belonging, while building a future where women's needs are impossible to ignore. To that, we say: thank YOU!
      </p>
    `,
    founding: `
      <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
        Welcome to the National Fund for Women! We couldn't be more excited to have you join our community.
      </p>
      <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
        At NFW, we believe that women deserve real support when they need it. As a Founding Member, you're helping us power our programs and multiply our impact for women across the country. You're supporting women simply by belonging, while building a future where women's needs are impossible to ignore. To that, we say: thank YOU!
      </p>
    `,
  };

  const membershipSnapshot = `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
      <tr>
        <td style="padding: 15px 20px; background-color: rgba(255,255,255,0.1); border-radius: 8px;">
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">
            Your membership snapshot
          </p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 5px 0;">
            <strong>Email:</strong> ${memberId}
          </p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 5px 0;">
            <strong>Membership Tier:</strong> ${membershipType.charAt(0).toUpperCase() + membershipType.slice(1)}
          </p>
          ${renewalDate ? `
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0;">
            <strong>Renewal Date:</strong> ${renewalDate}
          </p>
          ` : ""}
        </td>
      </tr>
    </table>
  `;

  const unlockedContent = `
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">
      Check out what you just unlocked
    </p>
    <ul style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 20px 0; padding-left: 20px;">
      <li style="margin-bottom: 8px;">Browse our current <a href="${siteUrl}/grants" style="color: #F8F19A;">microgrant offerings</a> and apply in just a few minutes.</li>
      <li style="margin-bottom: 8px;">Explore thousands of <a href="${siteUrl}/perks" style="color: #F8F19A;">perks and discounts</a> and start saving on items you were already buying.</li>
      <li style="margin-bottom: 8px;">Shop the <a href="${siteUrl}/store" style="color: #F8F19A;">Zero Dollar Store</a> where every item is — completely free. Items drop daily so check back often!</li>
    </ul>
  `;

  const footerNote = membershipType === "free"
    ? `
      <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0;">
        Ready to level up your impact? Consider becoming a <a href="${siteUrl}/auth/sign-up?step=3" style="color: #F8F19A;">Contributing Member</a> — 100% of membership dues go towards improving the lives of American women.
      </p>
    `
    : `
      <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0;">
        Want to spread the love? <a href="${siteUrl}/gift-membership" style="color: #F8F19A;">Share a year of community, resources, and support</a> by gifting a membership to a woman in your life.
      </p>
    `;

  const bodyHtml = `
    ${tierMessages[membershipType]}
    ${membershipSnapshot}
    ${unlockedContent}
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0;">
      Your membership dashboard is your home base. Here you can track your savings, find your favorite perks, and see what other NFW members are up to. <a href="${siteUrl}/dashboard" style="color: #F8F19A;">Log in and get started!</a>
    </p>
    ${footerNote}
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 20px 0 0 0;">
      Need a hand? Visit our <a href="${siteUrl}/faq" style="color: #F8F19A;">FAQ page</a> for quick answers, or reach out to <a href="mailto:hello@nationalfundforwomen.org" style="color: #F8F19A;">hello@nationalfundforwomen.org</a> any time.
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">
      Thank you for showing up for women,
    </p>
    <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">
      The NFW Team
    </p>
  `;

  await sendTemplateEmail({
    to,
    subject: "Welcome to NFW! We're here to help",
    name,
    heroImage: heroImageUrl,
    heroText,
    headline: "Welcome to NFW!",
    body: bodyHtml,
    ctaText: "GET STARTED",
    ctaUrl: `${siteUrl}/dashboard`,
    secondaryCtaText: "BROWSE PERKS",
    secondaryCtaUrl: `${siteUrl}/perks`,
    footerCtaText: "VISIT WEBSITE",
    footerCtaUrl: siteUrl,
  });
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

  await sendTemplateEmail({
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
// LEGACY EMAIL FUNCTIONS (plain text - to be updated later)
// =============================================================================

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
  const subjects: Record<string, string> = {
    in_review: "Your NFW grant application is being reviewed",
    approved: "Your NFW grant application has been approved!",
    not_approved: "Update on your NFW grant application",
    payment_pending: "Your NFW grant payment is being processed",
    payment_sent: "Your NFW grant payment has been sent!",
  };

  const bodies: Record<string, string> = {
    in_review: `Hi ${name},\n\nGreat news — your application for the ${grantCycleName} is now being reviewed by our team. We'll be in touch soon with a decision.\n\nThank you for applying.\n\nWith love,\nThe NFW Team`,
    approved: `Hi ${name},\n\nWe're thrilled to let you know that your application for the ${grantCycleName} has been approved${amountApproved ? ` for $${amountApproved.toLocaleString()}` : ""}!\n\nPlease log in to your dashboard to connect your bank account so we can send your funds.\n\nWith love,\nThe NFW Team`,
    not_approved: `Hi ${name},\n\nThank you for applying to the ${grantCycleName}. After careful review, we were unable to approve your application at this time.\n\nWe encourage you to apply again in a future cycle. We're rooting for you.\n\nWith love,\nThe NFW Team`,
    payment_pending: `Hi ${name},\n\nYour grant payment of${amountApproved ? ` $${amountApproved.toLocaleString()}` : ""} is being processed and will arrive in your bank account within 1-3 business days.\n\nWith love,\nThe NFW Team`,
    payment_sent: `Hi ${name},\n\nYour grant payment of${amountApproved ? ` $${amountApproved.toLocaleString()}` : ""} has been sent! Please allow 1-3 business days for it to appear in your account.\n\nThank you for being part of NFW.\n\nWith love,\nThe NFW Team`,
  };

  const subject = subjects[status];
  const text = bodies[status];

  if (!subject || !text) return;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM,
      to,
      subject,
      text,
    });
  } catch (err) {
    console.error("Failed to send email:", err);
  }
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
  const siteUrl = "https://nationalfundforwomen.org";

  const nomineeIntro = isNominee
    ? `You've been nominated for the ${grantCycleName} and your nomination has been approved${amountApproved ? ` for $${amountApproved.toLocaleString()}` : ""}!`
    : `Great news — your application for the ${grantCycleName} has been approved${amountApproved ? ` for $${amountApproved.toLocaleString()}` : ""}!`;

  const text = `${name},\n\n${nomineeIntro}\n\nTo receive your grant funds, please click the link below to securely connect your bank account. This only takes a few minutes.\n\nIf you don't already have an NFW account, you'll be prompted to create one before connecting your bank info.\n\nLink: ${siteUrl}/grants/my-applications\n\nIf you have any questions, please reply to this email.\n\nWith love,\nThe NFW Team`;

  try {
    const resend = getResend();
    await resend.emails.send({
      from: FROM,
      to,
      subject: "Action Required: Connect Your Bank Account for Your NFW Grant",
      text,
    });
  } catch (err) {
    console.error("Failed to send bank info request email:", err);
  }
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