import { Resend } from "resend";

const FROM =
  process.env.RESEND_FROM_EMAIL || "National Fund for Women <hello@nationalfundforwomen.org>";

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
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;" class="snapshot-bg">
      <tr>
        <td style="padding: 15px 20px; background-color: rgba(255,255,255,0.1); border-radius: 8px;">
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;" class="snapshot-label">
            Your membership snapshot
          </p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 5px 0;" class="snapshot-text">
            <strong>Email:</strong> <span style="color: #FFFFFF; text-decoration: none;">${memberId.replace(/@/g, '&#64;')}</span>
          </p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 5px 0;" class="snapshot-text">
            <strong>Membership Tier:</strong> ${membershipType.charAt(0).toUpperCase() + membershipType.slice(1)}
          </p>
          ${renewalDate ? `
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0;" class="snapshot-text">
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