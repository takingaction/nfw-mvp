import { createClient } from "@/lib/supabase/server";
import SectionRenderer from "@/components/sections/SectionRenderer";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import Script from "next/script";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("pages")
    .select("meta_title, meta_description, title")
    .eq("slug", slug)
    .single();

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
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("pages")
    .select("id, status, slug, title, meta_title, meta_description, meta_schema")
    .eq("slug", slug)
    .single();

  if (!page) {
    redirect("/");
  }

  if (page.status === "unpublished") {
    redirect("/");
  }

  if (page.status !== "published") {
    redirect("/");
  }

  const { data: sections } = await supabase
    .from("page_sections")
    .select("*")
    .eq("page_id", page.id)
    .eq("version", "live")
    .eq("visible", true)
    .order("order_index");

  return (
    <>
      {page.meta_schema && (
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: page.meta_schema }}
        />
      )}
      <SectionRenderer sections={sections ?? []} />
    </>
  );
}
