import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildEmailHtml } from "@/lib/email";

const DEFAULT_HERO_IMAGE = "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";
const SITE_URL = "https://nationalfundforwomen.org";

export async function POST(request: Request) {
  try {
    const { body, name, subject, slug, hero_image_url } = await request.json();

    if (!body) {
      return NextResponse.json({ error: "Body required" }, { status: 400 });
    }

    // Determine hero image: passed value > template DB value > default
    let finalHeroImage = hero_image_url;
    if (!finalHeroImage && slug) {
      const supabase = await createClient();
      const { data: template } = await supabase
        .from("email_templates")
        .select("hero_image_url")
        .eq("slug", slug)
        .single();
      if (template?.hero_image_url) {
        finalHeroImage = template.hero_image_url;
      }
    }
    const heroImage = finalHeroImage || DEFAULT_HERO_IMAGE;

    const ctaConfigs: Record<string, any> = {
      "welcome-free": {
        ctaText: "GET STARTED",
        ctaUrl: `${SITE_URL}/dashboard`,
        secondaryCtaText: "BROWSE PERKS",
        secondaryCtaUrl: `${SITE_URL}/perks`,
      },
      "welcome-contributing": {
        ctaText: "GET STARTED",
        ctaUrl: `${SITE_URL}/dashboard`,
        secondaryCtaText: "BROWSE PERKS",
        secondaryCtaUrl: `${SITE_URL}/perks`,
      },
      "welcome-founding": {
        ctaText: "GET STARTED",
        ctaUrl: `${SITE_URL}/dashboard`,
        secondaryCtaText: "BROWSE PERKS",
        secondaryCtaUrl: `${SITE_URL}/perks`,
      },
      "newsletter-welcome": {
        ctaText: "BECOME A MEMBER",
        ctaUrl: `${SITE_URL}/auth/sign-up`,
      },
      "grant-application-received": {
        ctaText: "VIEW APPLICATION",
        ctaUrl: `${SITE_URL}/grants/my-applications`,
      },
      "grant-under-review": {
        ctaText: "VIEW APPLICATION",
        ctaUrl: `${SITE_URL}/grants/my-applications`,
      },
      "grant-approved": {
        ctaText: "VIEW APPLICATION",
        ctaUrl: `${SITE_URL}/grants/my-applications`,
      },
      "grant-not-approved": {
        ctaText: "VIEW APPLICATION",
        ctaUrl: `${SITE_URL}/grants/my-applications`,
      },
      "grant-payment-pending": {
        ctaText: "VIEW APPLICATION",
        ctaUrl: `${SITE_URL}/grants/my-applications`,
      },
      "grant-payment-sent": {
        ctaText: "VIEW APPLICATION",
        ctaUrl: `${SITE_URL}/grants/my-applications`,
      },
      "bank-info-request": {
        ctaText: "CONNECT BANK ACCOUNT",
        ctaUrl: `${SITE_URL}/grants/my-applications`,
      },
      "gift-codes": {
        ctaText: "LEARN ABOUT MEMBERSHIP",
        ctaUrl: `${SITE_URL}/auth/sign-up`,
      },
      "contact-form": {
        footerCtaText: "VISIT WEBSITE",
        footerCtaUrl: SITE_URL,
      },
    };

    const config = ctaConfigs[slug] || {
      ctaText: "VISIT WEBSITE",
      ctaUrl: SITE_URL,
    };

    const previewHtml = buildEmailHtml({
      name: name || "Preview User",
      heroImage,
      heroText: 'A <em>community</em> of women showing up for each other',
      headline: subject || "Email Preview",
      body,
      footerCtaText: "VISIT WEBSITE",
      footerCtaUrl: SITE_URL,
      ...config,
    });

    return NextResponse.json({ html: previewHtml });
  } catch (error) {
    console.error("[api/admin/emails/preview] Error:", error);
    return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 });
  }
}
