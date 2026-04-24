import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data: pages } = await supabase
    .from("pages")
    .select("slug, updated_at")
    .eq("status", "published")
    .eq("include_in_sitemap", true)
    .order("updated_at", { ascending: false });

  const baseUrl = "https://nationalfundforwomen.org";

  const urls = pages?.map((page) => {
    const lastmod = page.updated_at
      ? new Date(page.updated_at).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    return `
  <url>
    <loc>${baseUrl}/${page.slug}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`;
  }).join("") || "";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
