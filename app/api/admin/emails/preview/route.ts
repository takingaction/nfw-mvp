import { NextResponse } from "next/server";
import { buildEmailHtml } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { body, name, subject } = await request.json();

    if (!body) {
      return NextResponse.json({ error: "Body required" }, { status: 400 });
    }

    const siteUrl = "https://nationalfundforwomen.org";
    const heroImage = "https://nationalfundforwomen.org/images/email-welcome-hero.jpg";

    const previewHtml = buildEmailHtml({
      name: name || "Preview User",
      heroImage,
      heroText: 'A <em>community</em> of women showing up for each other',
      headline: subject || "Email Preview",
      body,
      ctaText: "VISIT WEBSITE",
      ctaUrl: siteUrl,
      footerCtaText: "VISIT WEBSITE",
      footerCtaUrl: siteUrl,
    });

    return NextResponse.json({ html: previewHtml });
  } catch (error) {
    console.error("[api/admin/emails/preview] Error:", error);
    return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 });
  }
}
