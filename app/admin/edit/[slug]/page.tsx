import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/middleware/adminCheck";
import EditableSections from "@/components/admin/edit/EditableSections";
import type { SectionTemplate } from "@/types/section-templates";
import { PageSection } from "@/lib/sections/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AdminEditPage({ params }: Props) {
  const { slug } = await params;
  
  // Auth check
  await requireAdmin({ redirectOnFailure: true });

  // Create admin client (bypasses RLS)
  const supabase = await createClient();

  // Fetch page by slug
  const { data: page } = await supabase
    .from("pages")
    .select("id, slug, title, status, preview_token")
    .eq("slug", slug)
    .single();

  if (!page) {
    redirect("/admin/pages");
  }

  // Fetch draft sections
  const { data: sections } = await supabase
    .from("page_sections")
    .select("*")
    .eq("page_id", page.id)
    .eq("version", "draft")
    .order("order_index");

  // Fetch templates for adding sections
  const { data: templates } = await supabase
    .from("section_templates")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <EditableSections
      page={page}
      initialSections={(sections ?? []) as PageSection[]}
      templates={(templates ?? []) as SectionTemplate[]}
    />
  );
}
