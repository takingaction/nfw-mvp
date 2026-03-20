export interface SectionTemplate {
  id: string;
  name: string;
  section_type: string;
  default_content: Record<string, unknown>;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SectionTemplateWithCreator extends SectionTemplate {
  creator_email?: string;
}