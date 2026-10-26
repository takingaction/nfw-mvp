import { getCachedLiveSections, getCachedPageBySlug } from "@/lib/cms-cache";
import SectionRenderer from "@/components/sections/SectionRenderer";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const page = await getCachedPageBySlug("home");

  return {
    title: {
      absolute: page?.meta_title || "National Fund for Women | Nonprofit for Women",
    },
    description: page?.meta_description || "Uplifting American women through microgrants, perks, discounts, and more. Join today!",
    verification: {
      google: "tFw3oh5vEDuNnwAGv9nVh6Ym7BjtVAAh6Ax6gHarQPs",
    },
    openGraph: {
      siteName: "National Fund for Women",
      title: "National Fund for Women",
      description: page?.meta_description || "Uplifting American women through microgrants, perks, discounts, and more. Join today!",
      url: "https://nationalfundforwomen.org",
      images: [{ url: "/images/og-default.jpg", width: 1200, height: 630 }],
    },
  };
}

export default async function Home() {
  // Homepage serves to all visitors. Page + sections come from the CMS cache
  // (lib/cms-cache.ts), invalidated when an admin publishes.
  const page = await getCachedPageBySlug("home");
  if (!page) notFound();

  const sections = await getCachedLiveSections(page.id);

  return <SectionRenderer sections={sections} />;
}
