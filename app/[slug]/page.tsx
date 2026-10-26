import SectionRenderer from "@/components/sections/SectionRenderer";
import { notFound, redirect } from "next/navigation";
import { getCachedLiveSections, getCachedPageBySlug } from "@/lib/cms-cache";
import { Metadata } from "next";
import Script from "next/script";

function isFileLikeSlug(slug: string): boolean {
  return slug.includes(".");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (isFileLikeSlug(slug)) return { title: "National Fund for Women" };

  const page = await getCachedPageBySlug(slug);

  if (!page) {
    return { title: "National Fund for Women" };
  }

  return {
    title: page.meta_title || page.title || "National Fund for Women",
    description: page.meta_description || "Uplifting American women through microgrants, perks, discounts, and more.",
  };
}

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // /favicon.ico, /meta.json etc. used to fall through to this route, cost two
  // Supabase lookups each, then redirect to "/" and render the homepage
  // (~45k wasted lookups/day). CMS slugs never contain a dot.
  if (isFileLikeSlug(slug)) notFound();

  const page = await getCachedPageBySlug(slug);

  if (!page) {
    redirect("/");
  }

  if (page.status === "unpublished") {
    redirect("/");
  }

  if (page.status !== "published") {
    redirect("/");
  }

  const sections = await getCachedLiveSections(page.id);

  return (
    <>
      {page.meta_schema && (
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: page.meta_schema }}
        />
      )}
      <SectionRenderer sections={sections} />
    </>
  );
}
