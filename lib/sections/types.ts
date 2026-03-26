// ─────────────────────────────────────────────────────────────
// NFW Section Types
// All content fields stored in page_sections.content (JSONB)
// ─────────────────────────────────────────────────────────────

export type SectionType =
  | "hero"
  | "hero_video"
  | "stats_bar"
  | "mission_quote"
  | "three_col_features"
  | "split_why_nfw"
  | "microgrant_feature"
  | "perks_feature"
  | "zero_dollar_store_teaser"
  | "split_everyday"
  | "testimonials"
  | "faq"
  | "membership_cta"
  | "right_side_3_features"
  | "4_cards"
  | "3_cards";

// ── Shared primitives ─────────────────────────────────────────

export interface NavLink {
  label: string;
  url: string;
  highlight?: boolean;
}

// ── hero ─────────────────────────────────────────────────────

export interface HeroContent {
  eyebrow: string;
  headline: string;
  headline_italic_phrase: string;
  subheadline: string;
  cta_primary_label: string;
  cta_primary_url: string;
  cta_secondary_label: string;
  cta_secondary_url: string;
  images: string | { url: string } | Array<string | { url: string }>;
}

// ── hero_video ─────────────────────────────────────────────────

export interface HeroVideoContent {
  eyebrow: string;
  headline: string;
  headline_italic_phrase: string;
  subheadline: string;
  cta_primary_label: string;
  cta_primary_url: string;
  cta_secondary_label: string;
  cta_secondary_url: string;
  video_url: string;
  poster_image_url?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  plays_inline?: boolean;
  show_controls?: boolean;
  object_fit?: "cover" | "contain";
}

// ── stats_bar ─────────────────────────────────────────────────

export interface StatItem {
  value: string; // e.g. "50,000+"
  label: string; // e.g. "Active Members"
}

export interface StatsBarContent {
  eyebrow: string;
  stats: StatItem[];
}

// ── mission_quote ─────────────────────────────────────────────

export interface MissionQuoteContent {
  eyebrow: string;
  quote_text: string;
}

// ── three_col_features ────────────────────────────────────────

export interface FeatureColumn {
  eyebrow: string;
  heading: string;
  body: string;
  bullets: string[];
  cta_label: string;
  cta_url: string;
  background_image_url: string;
}

export interface ThreeColFeaturesContent {
  columns: [FeatureColumn, FeatureColumn, FeatureColumn];
}

// ── split_why_nfw ─────────────────────────────────────────────

export interface SplitWhyNfwContent {
  eyebrow: string;
  headline: string;
  headline_italic_phrase: string;
  body: string;
  cta_label: string;
  cta_url: string;
  pullquote: string;
}

// ── microgrant_feature ────────────────────────────────────────

export interface MicrograntFeatureContent {
  eyebrow: string;
  headline: string;
  headline_italic_phrase: string;
  body: string;
  cta_label: string;
  cta_url: string;
  image_url: string;
}

// ── perks_feature ─────────────────────────────────────────────

export interface BrandLogo {
  name: string;
  image_url: string;
}

export interface PerksFeatureContent {
  eyebrow: string;
  headline: string;
  headline_italic_phrase: string;
  body: string;
  cta_label: string;
  cta_url: string;
  logo_strip_eyebrow: string; // e.g. "BRANDS SHOWING UP FOR WOMEN"
  logos: BrandLogo[];
}

// ── zero_dollar_store_teaser ──────────────────────────────────

export interface StoreProduct {
  name: string;
  image_url: string;
  retail_price: string; // e.g. "From $24"
}

export interface ZeroDollarStoreTeaserContent {
  eyebrow: string;
  headline: string;
  headline_italic_phrase: string;
  body: string;
  cta_label: string;
  cta_url: string;
  products: StoreProduct[];
}

// ── split_everyday ────────────────────────────────────────────

export interface SplitEverydayContent {
  eyebrow: string;
  headline: string;
  headline_italic_phrase: string;
  body: string;
  cta_label: string;
  cta_url: string;
  image_url: string;
  image_side: "left" | "right";
}

// ── testimonials ──────────────────────────────────────────────

export interface Testimonial {
  quote: string;
  first_name: string;
  age: string;
  state: string;
}

// ── faq ───────────────────────────────────────────────────────

export interface FaqItem {
  question: string;
  answer: string;
}

export interface FaqContent {
  eyebrow: string;
  heading: string;
  items: FaqItem[];
}

// ── membership_cta ────────────────────────────────────────────

export interface MembershipCtaContent {
  eyebrow: string;
  headline: string;
  headline_italic_phrase: string;
  body: string;
  price: string;
  price_period: string;
  benefits: string[];
  cta_label: string;
  cta_url: string;
}

// ── Shared color types ────────────────────────────────────────

export type BackgroundColor = "dove" | "aubergine" | "wisteria" | "blackberry";

export type CardSwatchColor = "yellow" | "green" | "blue" | "lavender" | "citrine" | "lilac" | "powder";

// ── right_side_3_features ──────────────────────────────────────

export interface RightSide3FeaturesItem {
  bg: CardSwatchColor;
  title: string;
  description: string;
}

export interface RightSide3FeaturesContent {
  eyebrow: string;
  headline: string;
  body: string;
  cta_label: string;
  cta_url: string;
  items: RightSide3FeaturesItem[];
  background?: BackgroundColor;
}

// ── 4_cards ─────────────────────────────────────────────────

export interface Card4Item {
  color: CardSwatchColor;
  age: string;
  title: string;
  description: string;
}

export interface FourCardsContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  cards: Card4Item[];
  background?: BackgroundColor;
}

// ── 3_cards ─────────────────────────────────────────────────

export interface Card3Item {
  color: CardSwatchColor;
  title: string;
  description: string;
  link: string;
  cta: string;
}

export interface ThreeCardsContent {
  eyebrow: string;
  headline: string;
  cards: Card3Item[];
  background?: BackgroundColor;
}

// ── testimonials ──────────────────────────────────────────────

export interface TestimonialsContent {
  eyebrow: string;
  heading: string;
  testimonials: Testimonial[];
  background: BackgroundColor;
}

// ── perks_feature ──────────────────────────────────────────────

export interface PerksFeatureContent {
  eyebrow: string;
  headline: string;
  headline_italic_phrase: string;
  body: string;
  cta_label: string;
  cta_url: string;
  logo_strip_eyebrow: string;
  logos: BrandLogo[];
  background?: BackgroundColor;
}

// ── Union type for all content ────────────────────────────────

export type SectionContent =
  | HeroContent
  | HeroVideoContent
  | StatsBarContent
  | MissionQuoteContent
  | ThreeColFeaturesContent
  | SplitWhyNfwContent
  | MicrograntFeatureContent
  | PerksFeatureContent
  | ZeroDollarStoreTeaserContent
  | SplitEverydayContent
  | TestimonialsContent
  | FaqContent
  | MembershipCtaContent
  | RightSide3FeaturesContent
  | FourCardsContent
  | ThreeCardsContent;

// ── DB row shape ──────────────────────────────────────────────

export interface PageSection {
  id: string;
  page_id: string;
  section_type: SectionType;
  version: "draft" | "live";
  order_index: number;
  content: Record<string, unknown>;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "unpublished";
  preview_token: string;
  created_at: string;
  updated_at: string;
}
