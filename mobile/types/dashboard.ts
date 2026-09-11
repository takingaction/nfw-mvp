/** Mirrors `dashboard_settings` (single-row table). */
export interface FeaturedItem {
  id: string; // e.g. "grant_<uuid>", "shopify_<id>", "perk_<uuid>", "article_<uuid>"
  type: "shopify_product" | "microgrant" | "article" | "perk";
  title: string;
  image: string;
  slug?: string;
  link?: string;
  button_label?: string;
}

export interface DashboardSettings {
  id: string;
  hero_image_url: string | null;
  featured_items: FeaturedItem[] | null;
  square_image1_url: string | null;
  square_image1_link: string | null;
  square_image2_url: string | null;
  square_image2_link: string | null;
  square_image3_url: string | null;
  square_image3_link: string | null;
  badge_free_url: string | null;
  badge_contributing_url: string | null;
  badge_founding_url: string | null;
}

/** Return shape of getSavings() in app/dashboard/page.tsx. */
export interface Savings {
  total: number;
  microgrants: number;
  /** Access Perks + NFW Perks combined (web combines them into one column). */
  perks: number;
  zeroDollarStore: number;
}
