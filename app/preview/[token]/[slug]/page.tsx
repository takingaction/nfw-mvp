import { createClient } from "@supabase/supabase-js";
import SectionRenderer from "@/components/sections/SectionRenderer";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ token: string; slug: string }>;
}) {
  const { token, slug } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: page } = await supabase
    .from("pages")
    .select("id, preview_token")
    .eq("slug", slug)
    .single();

  if (!page || page.preview_token !== token) notFound();

  const { data: sections } = await supabase
    .from("page_sections")
    .select("*")
    .eq("page_id", page.id)
    .eq("version", "draft")
    .eq("visible", true)
    .order("order_index");

  return (
    <>
      <div className="sticky top-0 z-50 bg-nfw-aubergine text-nfw-citrine text-center py-2 px-4 font-ui text-xs font-black tracking-[0.06em] uppercase">
        ⚠ Preview — this page has not been published
      </div>
      <SectionRenderer sections={sections ?? []} />
    </>
  );
}
