import type { EditorField } from "@/lib/sections/registry";

export type EmailBlockType =
  | "email_hero"
  | "email_text"
  | "email_image"
  | "email_cta"
  | "email_divider"
  | "email_spacer"
  | "email_social"
  | "email_columns"
  | "email_variable"
  | "email_double_image_cta"
  | "email_single_image_cta"
  | "email_single_image_text_columns"
  | "email_double_image_text_columns";

export type EmailVariableName =
  | "name"
  | "email"
  | "member_id"
  | "membership_tier"
  | "renewal_date"
  | "grantCycleName"
  | "amount"
  | "site_url"
  | "dashboard_url"
  | "perks_url"
  | "store_url"
  | "grants_url";

export const EMAIL_VARIABLES: { name: EmailVariableName; label: string }[] = [
  { name: "name", label: "Recipient Name" },
  { name: "email", label: "Email Address" },
  { name: "member_id", label: "Member ID" },
  { name: "membership_tier", label: "Membership Tier" },
  { name: "renewal_date", label: "Renewal Date" },
  { name: "grantCycleName", label: "Grant Cycle Name" },
  { name: "amount", label: "Amount" },
  { name: "site_url", label: "Site URL" },
  { name: "dashboard_url", label: "Dashboard URL" },
  { name: "perks_url", label: "Perks URL" },
  { name: "store_url", label: "Store URL" },
  { name: "grants_url", label: "Grants URL" },
];

export type EmailBackgroundColor = "dove" | "aubergine" | "wisteria" | "lilac" | "blackberry";

export interface EmailHeroContent {
  image_url: string;
  hero_text: string;
  text_color?: string;
  overlay_position?: "top" | "center" | "bottom";
  background_overlay?: string;
}

export interface EmailTextContent {
  text: string;
  text_align?: "left" | "center" | "right";
  font_family?: "DM Sans" | "Playfair Display";
  font_size?: number;
  bullet_items?: string[];
}

export interface EmailImageContent {
  image_url: string;
  alt_text?: string;
  link_url?: string;
  width?: "full" | "large" | "medium" | "small";
}

export type ButtonColor = "citrine" | "wisteria" | "lilac" | "aubergine";

export interface EmailCtaContent {
  button_text: string;
  button_url: string;
  button_color?: ButtonColor;
  text_align?: "left" | "center" | "right";
}

export interface EmailDividerContent {
  color?: string;
  thickness?: number;
  width?: "full" | "large" | "medium" | "small";
}

export interface EmailSpacerContent {
  height?: number;
}

export interface EmailSocialContent {
  platforms: ("instagram" | "tiktok" | "facebook")[];
  urls: string[];
}

export interface EmailColumnsContent {
  columns: {
    content: string;
    width?: number;
  }[];
  column_gap?: number;
  text_align?: "left" | "center" | "right";
}

export interface EmailVariableContent {
  variable_name: EmailVariableName;
  fallback_text?: string;
}

export interface EmailDoubleImageCtaContent {
  image1_url: string;
  alt1_text?: string;
  button1_text: string;
  button1_url: string;
  button1_color?: ButtonColor;
  image2_url: string;
  alt2_text?: string;
  button2_text: string;
  button2_url: string;
  button2_color?: ButtonColor;
}

export interface EmailSingleImageCtaContent {
  image_url: string;
  alt_text?: string;
  button_text: string;
  button_url: string;
  button_color?: ButtonColor;
}

export interface EmailSingleImageTextContent {
  image_url: string;
  alt_text?: string;
  text: string;
  bullet_items?: string[];
  text_align?: "left" | "center" | "right";
  font_family?: "DM Sans" | "Playfair Display";
  font_size?: number;
}

export interface EmailDoubleImageTextContent {
  image1_url: string;
  image2_url: string;
  alt_text?: string;
  text: string;
  bullet_items?: string[];
  text_align?: "left" | "center" | "right";
  font_family?: "DM Sans" | "Playfair Display";
  font_size?: number;
}

export type EmailBlockContent =
  | EmailHeroContent
  | EmailTextContent
  | EmailImageContent
  | EmailCtaContent
  | EmailDividerContent
  | EmailSpacerContent
  | EmailSocialContent
  | EmailColumnsContent
  | EmailVariableContent
  | EmailDoubleImageCtaContent
  | EmailSingleImageCtaContent
  | EmailSingleImageTextContent
  | EmailDoubleImageTextContent;

export interface EmailSection {
  id: string;
  email_template_id: string;
  section_type: EmailBlockType;
  order_index: number;
  content: Record<string, unknown>;
  visible: boolean;
  background_color?: EmailBackgroundColor;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateExtended {
  id: string;
  name: string;
  slug: string;
  category: "resend" | "supabase";
  description?: string;
  subject?: string;
  html_content?: string;
  is_editable: boolean;
  source_file?: string;
  hero_image_url?: string;
  full_email_html?: string;
  preview_data?: Record<string, unknown>;
  status: "draft" | "published";
  updated_at: string;
  created_at: string;
  sections?: EmailSection[];
}

export type EmailBlockDefinition = {
  type: EmailBlockType;
  label: string;
  description: string;
  defaultContent: Record<string, unknown>;
  editorFields: EditorField[];
};

export type EmailBlockRegistry = Record<EmailBlockType, EmailBlockDefinition>;

export type ButtonColorMap = Record<ButtonColor, { bg: string; text: string }>;

export const BUTTON_COLORS: ButtonColorMap = {
  citrine: { bg: "#F8F19A", text: "#3E145F" },
  wisteria: { bg: "#7786BE", text: "#FFFFFF" },
  lilac: { bg: "#B693C0", text: "#FFFFFF" },
  aubergine: { bg: "#3E145F", text: "#FFFFFF" },
};