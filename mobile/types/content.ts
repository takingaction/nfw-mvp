/**
 * Admin-editable site content consumed by the misc root screens.
 * Contracts: app/api/contact/route.ts, app/api/faq/route.ts, app/api/testimonials/route.ts.
 */

// ---------------------------------------------------------------------------
// Contact — site_contact row
// ---------------------------------------------------------------------------

export interface ContactHelpCard {
  icon: "mail" | "clock" | "heart" | string;
  title: string;
  content: string;
  email?: string;
}

export interface ContactQuickLink {
  label: string;
  url: string;
}

export interface SiteContact {
  hero_eyebrow: string;
  hero_headline: string;
  hero_subheadline: string;
  help_heading: string;
  help_intro: string;
  help_cards: ContactHelpCard[];
  quick_links: ContactQuickLink[];
  not_member_heading: string;
  not_member_subheading: string;
}

/** Dropdown in components/contact/ContactClient.tsx — order and labels verbatim. */
export const CONTACT_SUBJECTS = [
  { value: "microgrant", label: "Microgrant question" },
  { value: "membership", label: "Membership and billing" },
  { value: "perks", label: "Perks and discounts" },
  { value: "store", label: "Zero Dollar Store" },
  { value: "account", label: "My account" },
  { value: "partnership", label: "Partnership inquiry" },
  { value: "donations-matriarch", label: "Donations or Matriarch Program" },
  { value: "press", label: "Press and media" },
  { value: "other", label: "Something else" },
] as const;

export interface ContactSubmitBody {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// ---------------------------------------------------------------------------
// FAQ — site_faq row
// ---------------------------------------------------------------------------

export interface FaqQuestion {
  question: string;
  /** May contain markdown links: [text](url) or [text](url)|_blank */
  answer: string;
}

export interface FaqSection {
  category: string;
  questions: FaqQuestion[];
}

export interface FaqButton {
  label: string;
  url: string;
  style: "solid" | "ghost";
  open_in_new_tab: boolean;
}

export interface SiteFaq {
  hero_eyebrow: string;
  hero_headline: string;
  hero_subheadline: string;
  faq_sections: FaqSection[];
  still_have_questions_heading: string;
  still_have_questions_subheading: string;
  still_have_questions_buttons: FaqButton[];
}

// ---------------------------------------------------------------------------
// Share Your Story — POST /api/testimonials
// ---------------------------------------------------------------------------

export interface TestimonialBody {
  name: string;
  email: string;
  age: string;
  city?: string;
  state?: string;
  drawnToMembership?: string;
  programsEngaged?: string;
  favoritePart?: string;
  howNfwHelped?: string;
  whyJoin?: string;
  permissionGranted: boolean;
  preferAnonymous?: boolean;
  interestedVideo?: boolean;
}

/** Prompts from components/dashboard/ShareStoryClient.tsx, verbatim and in order. */
export const STORY_PROMPTS: { key: keyof Pick<TestimonialBody, "drawnToMembership" | "programsEngaged" | "favoritePart" | "howNfwHelped" | "whyJoin">; label: string }[] = [
  { key: "drawnToMembership", label: "What drew you to becoming a National Fund for Women member?" },
  { key: "programsEngaged", label: "Which NFW program(s) have you engaged with? What was your experience?" },
  { key: "favoritePart", label: "What is your favorite part about being an NFW member?" },
  { key: "howNfwHelped", label: "How has NFW helped you?" },
  { key: "whyJoin", label: "Why should others join NFW?" },
];

export const STORY_PERMISSIONS = {
  permissionGranted:
    "I grant NFW permission to utilize excerpts from this submission for its website, email newsletters, social media platforms, and various other external outreach. When using quotes, we will only attribute them by your first name, age, and state of residence.",
  preferAnonymous: "I prefer that any of my quoted statements remain anonymous.",
  interestedVideo:
    "Are you interested in recording a brief video for NFW's social media platforms? A modest honorarium may be available for participants.",
} as const;

// ---------------------------------------------------------------------------
// Legal — app/api/legal/[slug]
// ---------------------------------------------------------------------------

export const LEGAL_PAGES = {
  privacy: "Privacy Policy",
  "terms-of-service": "Terms of Service",
  accessibility: "Accessibility",
} as const;

export type LegalSlug = keyof typeof LEGAL_PAGES;
