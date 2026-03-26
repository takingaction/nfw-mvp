import { createClient } from "@/lib/supabase/server";
import SectionRenderer from "@/components/sections/SectionRenderer";
import { redirect } from "next/navigation";

export default async function DynamicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("pages")
    .select("id, status, slug")
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

  try {
    return <SectionRenderer sections={sections ?? []} />;
  } catch (e) {
    console.error("SectionRenderer error:", e);
    return <div>Error rendering sections</div>;
  }
}
