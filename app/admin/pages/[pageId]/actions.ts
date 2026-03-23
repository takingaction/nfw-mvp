"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function saveDraftSections(
  pageId: string,
  sections: {
    id?: string;
    section_type: string;
    order_index: number;
    content: Record<string, unknown>;
    visible: boolean;
  }[],
) {
  const { error } = await supabaseAdmin.from("page_sections").upsert(
    sections.map((s) => ({
      ...s,
      page_id: pageId,
      version: "draft",
    })),
  );
  if (error) throw new Error(error.message);
}

export async function deleteDraftSection(sectionId: string) {
  const { error } = await supabaseAdmin
    .from("page_sections")
    .delete()
    .eq("id", sectionId)
    .eq("version", "draft");
  if (error) throw new Error(error.message);
}

export async function publishPage(pageId: string, slug: string) {
  console.log("publishPage called with:", pageId, slug);
  
  // First, let's check what sections exist
  const { data: draftSections } = await supabaseAdmin
    .from("page_sections")
    .select("*")
    .eq("page_id", pageId)
    .eq("version", "draft");
  console.log("Draft sections before publish:", draftSections);
  
  const { data: liveSections } = await supabaseAdmin
    .from("page_sections")
    .select("*")
    .eq("page_id", pageId)
    .eq("version", "live");
  console.log("Live sections before publish:", liveSections);
  
  const { error } = await supabaseAdmin.rpc("publish_page", {
    p_page_id: pageId,
  });
  console.log("publishPage RPC error:", error);
  if (error) throw new Error(error.message);
  
  // Check after
  const { data: liveAfter } = await supabaseAdmin
    .from("page_sections")
    .select("*")
    .eq("page_id", pageId)
    .eq("version", "live");
  console.log("Live sections after publish:", liveAfter);
  
  revalidatePath(`/${slug}`);
  revalidatePath(`/admin/pages`);
  revalidatePath(`/admin/pages/${pageId}`);
}

export async function revertPage(pageId: string) {
  const { error } = await supabaseAdmin.rpc("revert_page", {
    p_page_id: pageId,
  });
  if (error) throw new Error(error.message);
}

export async function unpublishPage(pageId: string, slug: string) {
  const { error } = await supabaseAdmin.rpc("unpublish_page", {
    p_page_id: pageId,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/${slug}`);
  revalidatePath(`/admin/pages`);
}

export async function toggleSectionVisibility(
  sectionId: string,
  visible: boolean,
) {
  const { error } = await supabaseAdmin
    .from("page_sections")
    .update({ visible })
    .eq("id", sectionId)
    .eq("version", "draft");
  if (error) throw new Error(error.message);
}

export async function addSectionFromTemplate(
  pageId: string,
  sectionType: string,
  defaultContent: Record<string, unknown>,
  orderIndex: number,
) {
  const { data, error } = await supabaseAdmin
    .from("page_sections")
    .insert({
      page_id: pageId,
      section_type: sectionType,
      version: "draft",
      order_index: orderIndex,
      content: defaultContent,
      visible: true,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}
