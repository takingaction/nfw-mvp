import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";
import { notFound } from "next/navigation";
import SectionCanvas from "@/components/admin/pages/SectionCanvas";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function AdminPageEditor({
  params,
}: {
  params: Promise<{ pageId: string }>;
}) {
  await requireAdmin();

  const { pageId } = await params;

  const { data: page } = await supabaseAdmin
    .from("pages")
    .select("*")
    .eq("id", pageId)
    .single();

  if (!page) notFound();

  const { data: sections } = await supabaseAdmin
    .from("page_sections")
    .select("*")
    .eq("page_id", pageId)
    .eq("version", "draft")
    .order("order_index");

  return (
    <main className="min-h-screen bg-gray-50">
      <SectionCanvas page={page} initialSections={sections ?? []} />
    </main>
  );
}
