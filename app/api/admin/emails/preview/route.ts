import { NextResponse } from "next/server";
import { buildEmailHtml } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { body, name, subject, slug } = await request.json();

    if (!body) {
      return NextResponse.json({ error: "Body required" }, { status: 400 });
    }

    const siteUrl = "https://nationalfundforwomen.org";
    const heroImage = "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";

    const ctaConfigs: Record<string, any> = {
      "welcome-free": {
        ctaText: "GET STARTED",
        ctaUrl: `${siteUrl}/dashboard`,
        secondaryCtaText: "BROWSE PERKS",
        secondaryCtaUrl: `${siteUrl}/perks`,
      },
      "welcome-contributing": {
        ctaText: "GET STARTED",
        ctaUrl: `${siteUrl}/dashboard`,
        secondaryCtaText: "BROWSE PERKS",
        secondaryCtaUrl: `${siteUrl}/perks`,
      },
      "welcome-founding": {
        ctaText: "GET STARTED",
        ctaUrl: `${siteUrl}/dashboard`,
        secondaryCtaText: "BROWSE PERKS",
        secondaryCtaUrl: `${siteUrl}/perks`,
      },
      "newsletter-welcome": {
        ctaText: "BECOME A MEMBER",
        ctaUrl: `${siteUrl}/auth/sign-up`,
      },
      "grant-application-received": {
        ctaText: "VIEW APPLICATION",
        ctaUrl: `${siteUrl}/grants/my-applications`,
      },
      "grant-under-review": {
        ctaText: "VIEW APPLICATION",
        ctaUrl: `${siteUrl}/grants/my-applications`,
      },
      "grant-approved": {
        ctaText: "VIEW APPLICATION",
        ctaUrl: `${siteUrl}/grants/my-applications`,
      },
      "grant-not-approved": {
        ctaText: "VIEW APPLICATION",
        ctaUrl: `${siteUrl}/grants/my-applications`,
      },
      "grant-payment-pending": {
        ctaText: "VIEW APPLICATION",
        ctaUrl: `${siteUrl}/grants/my-applications`,
      },
      "grant-payment-sent": {
        ctaText: "VIEW APPLICATION",
        ctaUrl: `${siteUrl}/grants/my-applications`,
      },
      "bank-info-request": {
        ctaText: "CONNECT BANK ACCOUNT",
        ctaUrl: `${siteUrl}/grants/my-applications`,
      },
      "gift-codes": {
        ctaText: "LEARN ABOUT MEMBERSHIP",
        ctaUrl: `${siteUrl}/auth/sign-up`,
      },
      "contact-form": {
        footerCtaText: "VISIT WEBSITE",
        footerCtaUrl: siteUrl,
      },
    };

    const config = ctaConfigs[slug] || {
      ctaText: "VISIT WEBSITE",
      ctaUrl: siteUrl,
    };

    const previewHtml = buildEmailHtml({
      name: name || "Preview User",
      heroImage,
      heroText: 'A <em>community</em> of women showing up for each other',
      headline: subject || "Email Preview",
      body,
      footerCtaText: "VISIT WEBSITE",
      footerCtaUrl: siteUrl,
      ...config,
    });

    return NextResponse.json({ html: previewHtml });
  } catch (error) {
    console.error("[api/admin/emails/preview] Error:", error);
    return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 });
  }
}
