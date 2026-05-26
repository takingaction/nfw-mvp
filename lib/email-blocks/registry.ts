import type { EmailBlockDefinition, EmailBlockType } from "./types";

export const EMAIL_BLOCK_REGISTRY: Record<EmailBlockType, EmailBlockDefinition> = {
  email_hero: {
    type: "email_hero",
    label: "Hero Image",
    description: "Full-width hero image with text overlay",
    defaultContent: {
      image_url: "",
      hero_text: "Your message here",
      text_color: "#FFFFFF",
      overlay_position: "center",
      background_overlay: "rgba(0,0,0,0.3)",
    },
    editorFields: [
      { key: "image_url", label: "Image URL", type: "image" },
      { key: "hero_text", label: "Overlay Text", type: "text" },
      { key: "text_color", label: "Text Color", type: "text" },
      {
        key: "overlay_position",
        label: "Text Position",
        type: "select",
        options: ["top", "center", "bottom"],
      },
      { key: "background_overlay", label: "Overlay Color", type: "text" },
    ],
  },

  email_text: {
    type: "email_text",
    label: "Text Block",
    description: "Body text with optional alignment and bullets",
    defaultContent: {
      text: "Enter your text here...",
      text_align: "left",
      font_family: "DM Sans",
      font_size: 16,
      bullet_items: [],
    },
    editorFields: [
      { key: "text", label: "Text", type: "richtext" },
      {
        key: "bullet_items",
        label: "Bullet Items",
        type: "string-array",
        itemLabel: "Bullet",
      },
      {
        key: "text_align",
        label: "Alignment",
        type: "select",
        options: ["left", "center", "right"],
      },
      {
        key: "font_family",
        label: "Font Family",
        type: "select",
        options: ["DM Sans", "Playfair Display"],
      },
      {
        key: "font_size",
        label: "Font Size",
        type: "select",
        options: ["12", "14", "16", "18", "20", "24", "28", "32"],
      },
    ],
  },

  email_image: {
    type: "email_image",
    label: "Image",
    description: "Standalone image with optional link",
    defaultContent: {
      image_url: "",
      alt_text: "",
      link_url: "",
      width: "full",
    },
    editorFields: [
      { key: "image_url", label: "Image URL", type: "image" },
      { key: "alt_text", label: "Alt Text", type: "text" },
      { key: "link_url", label: "Link URL (optional)", type: "url" },
      {
        key: "width",
        label: "Width",
        type: "select",
        options: ["full", "large", "medium", "small"],
      },
    ],
  },

  email_cta: {
    type: "email_cta",
    label: "CTA Button",
    description: "Call-to-action button",
    defaultContent: {
      button_text: "Click Here",
      button_url: "https://nationalfundforwomen.org",
      button_color: "citrine",
      text_align: "center",
    },
    editorFields: [
      { key: "button_text", label: "Button Text", type: "text" },
      { key: "button_url", label: "Button URL", type: "url" },
      {
        key: "button_color",
        label: "Button Color",
        type: "select",
        options: ["citrine", "wisteria", "lilac", "aubergine"],
      },
      {
        key: "text_align",
        label: "Alignment",
        type: "select",
        options: ["left", "center", "right"],
      },
    ],
  },

  email_divider: {
    type: "email_divider",
    label: "Divider",
    description: "Horizontal rule divider",
    defaultContent: {
      color: "#B693C0",
      thickness: 1,
      width: "full",
    },
    editorFields: [
      { key: "color", label: "Color", type: "text" },
      { key: "thickness", label: "Thickness (px)", type: "text" },
      {
        key: "width",
        label: "Width",
        type: "select",
        options: ["full", "large", "medium", "small"],
      },
    ],
  },

  email_spacer: {
    type: "email_spacer",
    label: "Spacer",
    description: "Vertical spacing",
    defaultContent: {
      height: 20,
    },
    editorFields: [
      { key: "height", label: "Height (px)", type: "text" },
    ],
  },

  email_social: {
    type: "email_social",
    label: "Social Icons",
    description: "Social media icons row",
    defaultContent: {
      platforms: ["instagram", "tiktok", "facebook"],
      urls: [
        "https://www.instagram.com/nationalfundforwomen",
        "https://www.tiktok.com/@nationalfundforwomen",
        "https://www.facebook.com/nationalfundforwomen",
      ],
    },
    editorFields: [
      {
        key: "platforms",
        label: "Platforms",
        type: "string-array",
        itemLabel: "Platform",
      },
      {
        key: "urls",
        label: "URLs",
        type: "string-array",
        itemLabel: "URL",
      },
    ],
  },

  email_columns: {
    type: "email_columns",
    label: "Columns",
    description: "2-column layout",
    defaultContent: {
      columns: [{ content: "Left column text..." }, { content: "Right column text..." }],
      column_gap: 20,
      text_align: "left",
    },
    editorFields: [
      {
        key: "columns",
        label: "Columns",
        type: "array",
        itemLabel: "Column",
        fields: [
          { key: "content", label: "Content", type: "richtext" },
          { key: "width", label: "Width %", type: "text" },
        ],
      },
      { key: "column_gap", label: "Gap (px)", type: "text" },
      {
        key: "text_align",
        label: "Alignment",
        type: "select",
        options: ["left", "center", "right"],
      },
    ],
  },

  email_variable: {
    type: "email_variable",
    label: "Variable",
    description: "Dynamic variable placeholder (e.g., recipient name)",
    defaultContent: {
      variable_name: "name",
      fallback_text: "Friend",
    },
    editorFields: [
      {
        key: "variable_name",
        label: "Variable",
        type: "select",
        options: [
          "name",
          "email",
          "member_id",
          "membership_tier",
          "renewal_date",
          "grantCycleName",
          "amount",
          "site_url",
          "dashboard_url",
          "perks_url",
          "store_url",
          "grants_url",
        ],
      },
      { key: "fallback_text", label: "Fallback Text", type: "text" },
    ],
  },

  email_double_image_cta: {
    type: "email_double_image_cta",
    label: "Double Image + CTA",
    description: "Two images side by side with buttons below each",
    defaultContent: {
      image1_url: "",
      alt1_text: "",
      button1_text: "",
      button1_url: "https://nationalfundforwomen.org",
      button1_color: "citrine",
      image2_url: "",
      alt2_text: "",
      button2_text: "",
      button2_url: "https://nationalfundforwomen.org",
      button2_color: "citrine",
    },
    editorFields: [
      { key: "image1_url", label: "Image 1 URL", type: "image" },
      { key: "alt1_text", label: "Image 1 Alt Text", type: "text" },
      { key: "button1_text", label: "Button 1 Text", type: "text" },
      { key: "button1_url", label: "Button 1 URL", type: "url" },
      {
        key: "button1_color",
        label: "Button 1 Color",
        type: "select",
        options: ["citrine", "wisteria", "lilac", "aubergine"],
      },
      { key: "image2_url", label: "Image 2 URL", type: "image" },
      { key: "alt2_text", label: "Image 2 Alt Text", type: "text" },
      { key: "button2_text", label: "Button 2 Text", type: "text" },
      { key: "button2_url", label: "Button 2 URL", type: "url" },
      {
        key: "button2_color",
        label: "Button 2 Color",
        type: "select",
        options: ["citrine", "wisteria", "lilac", "aubergine"],
      },
    ],
  },

  email_single_image_cta: {
    type: "email_single_image_cta",
    label: "Single Image + CTA",
    description: "One image spanning full width with button below",
    defaultContent: {
      image_url: "",
      alt_text: "",
      button_text: "",
      button_url: "https://nationalfundforwomen.org",
      button_color: "citrine",
    },
    editorFields: [
      { key: "image_url", label: "Image URL", type: "image" },
      { key: "alt_text", label: "Alt Text", type: "text" },
      { key: "button_text", label: "Button Text", type: "text" },
      { key: "button_url", label: "Button URL", type: "url" },
      {
        key: "button_color",
        label: "Button Color",
        type: "select",
        options: ["citrine", "wisteria", "lilac", "aubergine"],
      },
    ],
  },

  email_single_image_text_columns: {
    type: "email_single_image_text_columns",
    label: "Image + Text (1 image)",
    description: "Single image on left (33%), text with paragraphs and bullets on right (67%)",
    defaultContent: {
      image_url: "",
      alt_text: "",
      text: "",
      bullet_items: [],
      text_align: "left",
      font_family: "DM Sans",
      font_size: 16,
    },
    editorFields: [
      { key: "image_url", label: "Image URL", type: "image" },
      { key: "alt_text", label: "Image Alt Text", type: "text" },
      { key: "text", label: "Text", type: "richtext" },
      {
        key: "bullet_items",
        label: "Bullet Items",
        type: "string-array",
        itemLabel: "Bullet",
      },
      {
        key: "text_align",
        label: "Alignment",
        type: "select",
        options: ["left", "center", "right"],
      },
      {
        key: "font_family",
        label: "Font Family",
        type: "select",
        options: ["DM Sans", "Playfair Display"],
      },
      {
        key: "font_size",
        label: "Font Size",
        type: "select",
        options: ["12", "14", "16", "18", "20", "24", "28", "32"],
      },
    ],
  },

  email_double_image_text_columns: {
    type: "email_double_image_text_columns",
    label: "Image + Text (2 images)",
    description: "Two stacked images on left (33%), text with paragraphs and bullets on right (67%)",
    defaultContent: {
      image1_url: "",
      image2_url: "",
      alt_text: "",
      text: "",
      bullet_items: [],
      text_align: "left",
      font_family: "DM Sans",
      font_size: 16,
    },
    editorFields: [
      { key: "image1_url", label: "Image 1 URL (top)", type: "image" },
      { key: "image2_url", label: "Image 2 URL (bottom)", type: "image" },
      { key: "alt_text", label: "Images Alt Text", type: "text" },
      { key: "text", label: "Text", type: "richtext" },
      {
        key: "bullet_items",
        label: "Bullet Items",
        type: "string-array",
        itemLabel: "Bullet",
      },
      {
        key: "text_align",
        label: "Alignment",
        type: "select",
        options: ["left", "center", "right"],
      },
      {
        key: "font_family",
        label: "Font Family",
        type: "select",
        options: ["DM Sans", "Playfair Display"],
      },
      {
        key: "font_size",
        label: "Font Size",
        type: "select",
        options: ["12", "14", "16", "18", "20", "24", "28", "32"],
      },
    ],
  },
};

export function getEmailBlockDefinition(type: EmailBlockType): EmailBlockDefinition {
  return EMAIL_BLOCK_REGISTRY[type];
}