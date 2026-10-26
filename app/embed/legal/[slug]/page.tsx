import Script from "next/script";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

/**
 * Legal pages for the mobile app's in-app web view.
 *
 * Served under /embed/, where the root layout leaves out site navigation, the
 * cookie banner and Google Tag Manager: app users cannot answer the banner, so
 * no analytics or ad tags run here. Same content as /privacy,
 * /terms-of-service and /accessibility.
 */

const TITLES: Record<string, string> = {
  privacy: "Privacy Policy",
  "terms-of-service": "Terms of Service",
  accessibility: "Accessibility",
};

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function EmbeddedLegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const title = TITLES[slug];
  if (!title) notFound();

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { data } = await supabaseAdmin
    .from("legal_pages")
    .select("termly_embed_code")
    .eq("slug", slug)
    .single();

  const embedCode = data?.termly_embed_code ?? "";
  // Termly "embed" policies render through Termly's policy viewer script
  // (not the consent banner); the static HTML policies need nothing extra.
  const needsPolicyViewer = embedCode.includes('name="termly-embed"');

  return (
    <main className="min-h-screen bg-white px-4 py-6">
      <h1 className="text-2xl font-bold text-nfw-blackberry mb-4 font-serif">{title}</h1>
      <div dangerouslySetInnerHTML={{ __html: embedCode }} />
      {needsPolicyViewer && (
        <Script id="termly-jssdk" src="https://app.termly.io/embed-policy.min.js" strategy="afterInteractive" />
      )}
    </main>
  );
}
