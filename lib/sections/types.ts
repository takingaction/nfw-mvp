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
  | "3_cards"
  | "three_column_stories"
  | "pricing_hero"
  | "pricing_cards"
  | "pricing_cta_box"
  | "pricing_comparison"
  | "pricing_benefits"
  | "pricing_final_cta"
  | "how_it_works"
  | "benefits_checkmarks"
  | "grants_hero"
  | "grants_grid"
  | "grant_amount_cards"
  | "success_stories"
  | "perks_store_grid"
  | "testimonials_grid"
  | "member_celebration_grid";

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
  background?: BackgroundColor;
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
  background?: BackgroundColor;
}

// ── stats_bar ─────────────────────────────────────────────────

export interface StatItem {
  value: string; // e.g. "50,000+"
  label: string; // e.g. "Active Members"
}

export interface StatsBarContent {
  eyebrow: string;
  stats: StatItem[];
  background?: BackgroundColor;
}

// ── mission_quote ─────────────────────────────────────────────

export interface MissionQuoteContent {
  eyebrow: string;
  quote_text: string;
  background?: BackgroundColor;
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
  background?: BackgroundColor;
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
  background?: BackgroundColor;
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
  background?: BackgroundColor;
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
  background?: BackgroundColor;
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
  background?: BackgroundColor;
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
  background?: BackgroundColor;
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

// ── three_column_stories ──────────────────────────────────────

export interface StoryColumn {
  eyebrow?: string;
  title: string;
  content: string;
  image_url?: string;
  link_text?: string;
  link_url?: string;
}

export interface ThreeColumnStoriesContent {
  eyebrow?: string;
  columns: StoryColumn[];
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

// ── Shared color types for new templates ────────────────────

export type IconColor = "green" | "yellow" | "blue";
export type CheckboxColor = "green" | "aubergine" | "wisteria" | "citrine";
export type UncheckedColor = "blackberry10" | "blackberry20" | "wisteria20";

export type IconName =
  | "FileText"
  | "Eye"
  | "Clock"
  | "Banknote"
  | "DollarSign"
  | "Coins"
  | "CheckCircle"
  | "CircleCheck"
  | "Gift"
  | "Package"
  | "ShieldCheck"
  | "ClipboardList"
  | "Send"
  | "Search"
  | "CreditCard"
  | "UserCheck"
  | "Rocket"
  | "Calendar"
  | "MapPin"
  | "HandHeart"
  | "Sparkles"
  | "Star"
  | "Zap"
  | "Tag"
  | "Bookmark"
  | "CalendarCheck"
  | "Lock"
  | "Shield";

// ── pricing_hero ──────────────────────────────────────────────

export interface PricingHeroContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  trust_badges: string[];
  background?: BackgroundColor;
}

// ── pricing_cards ────────────────────────────────────────────

export interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted: boolean;
  badge: string | null;
}

export interface PricingCardsContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  cards: PricingPlan[];
  checkbox_checked: CheckboxColor;
  cta_headline: string;
  cta_body: string;
  cta_label: string;
  cta_url: string;
  cta_secondary_text: string;
  cta_secondary_url: string;
  background?: BackgroundColor;
}

// ── pricing_cta_box ──────────────────────────────────────────

export interface PricingCtaBoxContent {
  headline: string;
  body: string;
  cta_label: string;
  cta_url: string;
  secondary_text: string;
  secondary_url: string;
  background?: BackgroundColor;
}

// ── pricing_comparison ───────────────────────────────────────

export interface ComparisonBenefit {
  label: string;
  free: boolean;
  contributing: boolean;
  founding: boolean;
}

export interface PricingComparisonContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  column1_label: string;
  column2_label: string;
  column3_label: string;
  checkbox_checked: CheckboxColor;
  checkbox_unchecked: UncheckedColor;
  benefits: ComparisonBenefit[];
  background?: BackgroundColor;
}

// ── pricing_benefits ─────────────────────────────────────────

export interface PricingBenefitItem {
  title: string;
  description: string;
  icon_color: IconColor;
}

export interface PricingBenefitsContent {
  eyebrow: string;
  headline: string;
  body: string;
  items: PricingBenefitItem[];
  cta_label: string;
  cta_url: string;
  background?: BackgroundColor;
}

// ── pricing_final_cta ─────────────────────────────────────────

export interface FinalCtaItem {
  title: string;
  sub: string;
  icon_color: IconColor;
}

export interface PricingFinalCtaContent {
  headline: string;
  subheadline: string;
  items: FinalCtaItem[];
  cta_label: string;
  cta_url: string;
  footnote: string;
  background?: BackgroundColor;
}

// ── how_it_works ─────────────────────────────────────────────

export interface HowItWorksStep {
  icon: IconName;
  icon_color: IconColor;
  title: string;
  description: string;
}

export interface HowItWorksContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  steps: [HowItWorksStep, HowItWorksStep, HowItWorksStep];
  background?: BackgroundColor;
}

// ── benefits_checkmarks ───────────────────────────────────────

export interface BenefitCheckItem {
  check_color: IconColor;
  title: string;
  description: string;
}

export interface BenefitsCheckmarksContent {
  eyebrow: string;
  headline: string;
  body: string;
  benefits: BenefitCheckItem[];
  cta_label: string;
  cta_url: string;
  background?: BackgroundColor;
}

// ── grants_hero ───────────────────────────────────────────────

export interface GrantsHeroContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  cta_label: string;
  cta_url: string;
  secondary_cta_label: string;
  secondary_cta_url: string;
  trust_badges: string[];
  image_url: string;
  stat_value: string;
  stat_label: string;
  secondary_stat_value: string;
  secondary_stat_label: string;
  background?: BackgroundColor;
}

// ── grants_grid ───────────────────────────────────────────────

export interface GrantCard {
  title: string;
  description: string;
  closing: string;
  image_url: string;
}

export interface GrantsGridContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  cta_label: string;
  cta_url: string;
  cards: GrantCard[];
  background?: BackgroundColor;
}

// ── grant_amount_cards ────────────────────────────────────────

export type BgTint = "powder" | "citrine" | "lilac";

export interface GrantAmountCard {
  range: string;
  label: string;
  description: string;
  bg_tint: BgTint;
}

export interface GrantAmountCardsContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  cta_label: string;
  cta_url: string;
  items: GrantAmountCard[];
  background?: BackgroundColor;
}

// ── success_stories ───────────────────────────────────────────

export interface SuccessStoryCard {
  category: string;
  bg_tint: BgTint;
  title: string;
  image_url: string;
}

export interface SuccessStoriesContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  cta_label: string;
  cta_url: string;
  cards: SuccessStoryCard[];
  background?: BackgroundColor;
}

// ── perks_store_grid ─────────────────────────────────────────

export interface PerkStoreCard {
  category: string;
  name: string;
  description: string;
  color: CardSwatchColor;
}

export interface PerksStoreGridContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  cta_label: string;
  cta_url: string;
  cards: PerkStoreCard[];
  background?: BackgroundColor;
}

// ── testimonials_grid ─────────────────────────────────────────

export interface TestimonialGridCard {
  quote: string;
  name: string;
  role: string;
  avatar_color: CardSwatchColor;
}

export interface TestimonialsGridContent {
  eyebrow: string;
  headline: string;
  subheadline: string;
  cards: TestimonialGridCard[];
  background?: BackgroundColor;
}

// ── member_celebration_grid ───────────────────────────────────

export interface MemberCelebrationGridContent {
  eyebrow: string;
  headline: string;
  body: string;
  cta_label: string;
  cta_url: string;
  image1_url: string;
  image2_url: string;
  image3_url: string;
  image4_url: string;
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
  | ThreeCardsContent
  | ThreeColumnStoriesContent
  | PricingHeroContent
  | PricingCardsContent
  | PricingCtaBoxContent
  | PricingComparisonContent
  | PricingBenefitsContent
  | PricingFinalCtaContent
  | HowItWorksContent
  | BenefitsCheckmarksContent
  | GrantsHeroContent
  | GrantsGridContent
  | GrantAmountCardsContent
  | SuccessStoriesContent
  | PerksStoreGridContent
  | TestimonialsGridContent
  | MemberCelebrationGridContent;

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
