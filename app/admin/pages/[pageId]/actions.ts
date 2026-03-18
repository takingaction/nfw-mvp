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
  const { error } = await supabaseAdmin.rpc("publish_page", {
    p_page_id: pageId,
  });
  if (error) throw new Error(error.message);
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
