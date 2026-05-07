import { createClient } from "@/lib/supabase/server";
import SectionRenderer from "@/components/sections/SectionRenderer";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("pages")
    .select("meta_title, meta_description")
    .eq("slug", "home")
    .single();

  return {
    title: {
      absolute: page?.meta_title || "National Fund for Women | Nonprofit for Women",
    },
    description: page?.meta_description || "Uplifting American women through microgrants, perks, discounts, and more. Join today!",
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Removed: redirect non-authenticated users to /coming-soon
  // Homepage now serves to all visitors

  const { data: page } = await supabase
    .from("pages")
    .select("id, status")
    .eq("slug", "home")
    .single();

  if (!page) notFound();

  const { data: sections } = await supabase
    .from("page_sections")
    .select("*")
    .eq("page_id", page.id)
    .eq("version", "live")
    .eq("visible", true)
    .order("order_index");

  return <SectionRenderer sections={sections ?? []} />;
}
