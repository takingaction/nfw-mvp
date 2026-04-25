import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildEmailHtml } from "@/lib/email";

interface TemplateContent {
  slug: string;
  subject: string;
  html_generator: () => string;
}

const TEMPLATE_GENERATORS: TemplateContent[] = [
  {
    slug: "welcome",
    subject: "Welcome to NFW! We're here to help",
    html_generator: () => {
      return buildEmailHtml({
        name: "Member",
        heroImage: "https://nationalfundforwomen.org/images/email-welcome-hero.jpg",
        heroText: 'A <em>community</em> of women showing up for each other',
        headline: "Welcome to NFW!",
        body: `
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
            Welcome to the National Fund for Women! We couldn't be more excited to have you join our community.
          </p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">
            At NFW, we believe that women deserve real support when they need it. Asking for help shouldn't come with added barriers or additional stress. Our goal is to provide immediate, practical support for women at every stage of their lives, while building collective power along the way. We hope you find plenty of support, connection, and joy here — we've got your back!
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
            <tr>
              <td style="padding: 15px 20px; background-color: rgba(255,255,255,0.1); border-radius: 8px;">
                <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">Your membership snapshot</p>
                <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 5px 0;"><strong>Email:</strong> member@example.com</p>
                <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0;"><strong>Membership Tier:</strong> Free</p>
              </td>
            </tr>
          </table>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 20px 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">Check out what you just unlocked</p>
          <ul style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 20px 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">Browse our current <a href="https://nationalfundforwomen.org/grants" style="color: #F8F19A;">microgrant offerings</a> and apply in just a few minutes.</li>
            <li style="margin-bottom: 8px;">Explore thousands of <a href="https://nationalfundforwomen.org/perks" style="color: #F8F19A;">perks and discounts</a> and start saving on items you were already buying.</li>
            <li style="margin-bottom: 8px;">Shop the <a href="https://nationalfundforwomen.org/store" style="color: #F8F19A;">Zero Dollar Store</a> where every item is — completely free.</li>
          </ul>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">Thank you for showing up for women,</p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 5px 0 0 0;">The NFW Team</p>
        `,
        ctaText: "GET STARTED",
        ctaUrl: "https://nationalfundforwomen.org/dashboard",
        secondaryCtaText: "BROWSE PERKS",
        secondaryCtaUrl: "https://nationalfundforwomen.org/perks",
        footerCtaText: "VISIT WEBSITE",
        footerCtaUrl: "https://nationalfundforwomen.org",
      });
    },
  },
  {
    slug: "newsletter-welcome",
    subject: "You're subscribed to NFW!",
    html_generator: () => {
      return buildEmailHtml({
        name: "Subscriber",
        heroImage: "https://nationalfundforwomen.org/images/email-welcome-hero.jpg",
        heroText: 'A <em>community</em> of women showing up for each other',
        headline: "You're subscribed!",
        body: `
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Dear Subscriber,</p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Welcome to the National Fund for Women newsletter — where we share ways to make life a little more possible for women (yourself included), and where a growing community shows up for each other in real ways.</p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.05em;">What to expect:</p>
          <ul style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 20px 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">Microgrant opportunities</li>
            <li style="margin-bottom: 8px;">Perks and partner discounts</li>
            <li style="margin-bottom: 8px;">Drops from the Zero Dollar Store</li>
            <li style="margin-bottom: 8px;">Real stories from women across the country</li>
          </ul>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; color: #FFFFFF; margin: 0 0 30px 0;">No noise — just the good stuff.</p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 0;">Talk soon,<br>The NFW Team</p>
        `,
        ctaText: "BECOME A MEMBER",
        ctaUrl: "https://nationalfundforwomen.org/auth/sign-up",
        footerCtaText: "VISIT WEBSITE",
        footerCtaUrl: "https://nationalfundforwomen.org",
      });
    },
  },
  {
    slug: "grant-status",
    subject: "Your Grant Application Update",
    html_generator: () => {
      return buildEmailHtml({
        name: "Applicant",
        heroImage: "https://nationalfundforwomen.org/images/email-welcome-hero.jpg",
        heroText: 'A <em>community</em> of women showing up for each other',
        headline: "Your Grant Application Update",
        body: `
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Hi Applicant,</p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Great news — your application for the Grant Cycle is now being reviewed by our team. We'll be in touch soon with a decision.</p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0;">Thank you for applying.</p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">With love,<br>The NFW Team</p>
        `,
        ctaText: "VIEW MY APPLICATIONS",
        ctaUrl: "https://nationalfundforwomen.org/grants/my-applications",
        footerCtaText: "VISIT WEBSITE",
        footerCtaUrl: "https://nationalfundforwomen.org",
      });
    },
  },
  {
    slug: "bank-info-request",
    subject: "Action Required: Connect Your Bank Account",
    html_generator: () => {
      return buildEmailHtml({
        name: "Grant Recipient",
        heroImage: "https://nationalfundforwomen.org/images/email-welcome-hero.jpg",
        heroText: 'A <em>community</em> of women showing up for each other',
        headline: "Action Required: Connect Your Bank Account",
        body: `
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Hi Grant Recipient,</p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Great news — your application has been approved!</p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">To receive your grant funds, please click the link below to securely connect your bank account. This only takes a few minutes.</p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">If you don't already have an NFW account, you'll be prompted to create one before connecting your bank info.</p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 0;">With love,<br>The NFW Team</p>
        `,
        ctaText: "CONNECT BANK ACCOUNT",
        ctaUrl: "https://nationalfundforwomen.org/grants/my-applications",
        footerCtaText: "VISIT WEBSITE",
        footerCtaUrl: "https://nationalfundforwomen.org",
      });
    },
  },
  {
    slug: "gift-codes",
    subject: "Your National Fund for Women Gift Codes",
    html_generator: () => {
      return buildEmailHtml({
        name: "Gift Buyer",
        heroImage: "https://nationalfundforwomen.org/images/email-welcome-hero.jpg",
        heroText: 'A <em>community</em> of women showing up for each other',
        headline: "Your National Fund for Women Gift Codes",
        body: `
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Hi Gift Buyer,</p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Thank you for your gift membership purchase! Here are your gift code(s):</p>
          <div style="background-color: rgba(255,255,255,0.1); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <code style="font-size: 18px; color: #F8F19A; font-family: monospace;">NFW-GIFT-XXXX-XXXX</code>
          </div>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; margin: 0 0 10px 0;">Each code redeems 1 year of Contributing membership ($15 value).</p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; font-weight: 700; color: #FFFFFF; margin: 20px 0 10px 0;">How to redeem:</p>
          <ol style="font-family: 'DM Sans', Arial, sans-serif; font-size: 14px; color: #FFFFFF; line-height: 1.8; padding-left: 20px; margin: 0;">
            <li>Friend creates a free NFW account at nationalfundforwomen.org/auth/sign-up</li>
            <li>During signup, they enter their code on the membership step</li>
            <li>They enjoy a full year of Contributing membership!</li>
          </ol>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 30px 0 0 0;">Thank you for supporting National Fund for Women!<br>The NFW Team</p>
        `,
        ctaText: "GIFT MORE MEMBERSHIPS",
        ctaUrl: "https://nationalfundforwomen.org/gift-membership",
        footerCtaText: "VISIT WEBSITE",
        footerCtaUrl: "https://nationalfundforwomen.org",
      });
    },
  },
  {
    slug: "contact-form",
    subject: "We Received Your Message - National Fund for Women",
    html_generator: () => {
      return buildEmailHtml({
        name: "Contact",
        heroImage: "https://nationalfundforwomen.org/images/email-welcome-hero.jpg",
        heroText: 'A <em>community</em> of women showing up for each other',
        headline: "We Received Your Message",
        body: `
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Hi Contact,</p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">Thank you for reaching out to the National Fund for Women. We've received your message and will respond within 1-2 business days.</p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #FFFFFF; margin: 0 0 20px 0;">In the meantime, feel free to explore our <a href="https://nationalfundforwomen.org/faq" style="color: #F8F19A;">FAQ page</a> for quick answers to common questions.</p>
          <p style="font-family: 'DM Sans', Arial, sans-serif; font-size: 16px; font-style: italic; color: #FFFFFF; margin: 0;">With love,<br>The NFW Team</p>
        `,
        ctaText: "VISIT FAQ",
        ctaUrl: "https://nationalfundforwomen.org/faq",
        footerCtaText: "VISIT WEBSITE",
        footerCtaUrl: "https://nationalfundforwomen.org",
      });
    },
  },
];

export async function POST() {
  try {
    const supabase = await createClient();

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

    const results = [];
    for (const template of TEMPLATE_GENERATORS) {
      const html = template.html_generator();

      const { data, error } = await supabase
        .from("email_templates")
        .update({
          html_content: html,
          subject: template.subject,
          updated_at: new Date().toISOString(),
        })
        .eq("slug", template.slug)
        .select()
        .single();

      if (error) {
        console.error(`Error updating ${template.slug}:`, error);
        results.push({ slug: template.slug, success: false, error: error.message });
      } else {
        results.push({ slug: template.slug, success: true });
      }
    }

    return NextResponse.json({
      message: "Email HTML content populated",
      results,
    });
  } catch (error) {
    console.error("[api/admin/emails/populate-html] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}