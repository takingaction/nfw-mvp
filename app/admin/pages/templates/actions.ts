"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { SECTION_REGISTRY } from "@/lib/sections/registry";
import type { SectionTemplate } from "@/types/section-templates";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function getTemplates(): Promise<SectionTemplate[]> {
  const { data, error } = await supabaseAdmin
    .from("section_templates")
    .select("*")
    .order("is_system", { ascending: false })
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function seedSystemTemplates() {
  await supabaseAdmin
    .from("section_templates")
    .delete()
    .eq("is_system", true);

  const systemTemplates = Object.values(SECTION_REGISTRY).map((def) => ({
    name: def.label,
    section_type: def.type,
    default_content: def.defaultContent,
    is_system: true,
  }));

  const { error } = await supabaseAdmin
    .from("section_templates")
    .insert(systemTemplates);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/pages/templates");
}

export async function createTemplate(
  name: string,
  sectionType: string,
  defaultContent: Record<string, unknown>,
  userId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("section_templates")
    .insert({
      name,
      section_type: sectionType,
      default_content: defaultContent,
      is_system: false,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pages/templates");
  return data;
}

export async function updateTemplate(
  id: string,
  name: string,
  defaultContent: Record<string, unknown>,
) {
  const { error } = await supabaseAdmin
    .from("section_templates")
    .update({
      name,
      default_content: defaultContent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pages/templates");
}

export async function deleteTemplate(id: string) {
  const { error } = await supabaseAdmin
    .from("section_templates")
    .delete()
    .eq("id", id)
    .eq("is_system", false);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pages/templates");
}

export async function duplicateTemplate(
  id: string,
  userId: string,
): Promise<SectionTemplate> {
  const { data: original, error: fetchError } = await supabaseAdmin
    .from("section_templates")
    .select("*")
    .eq("id", id)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const { data, error } = await supabaseAdmin
    .from("section_templates")
    .insert({
      name: `Copy of ${original.name}`,
      section_type: original.section_type,
      default_content: original.default_content,
      is_system: false,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/pages/templates");
  return data;
}