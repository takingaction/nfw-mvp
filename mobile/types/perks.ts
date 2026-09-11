/**
 * Perks domain types. Shapes mirror the existing Next.js API routes under
 * /api/access-perks, /api/perks, /api/nfw-perks, /api/perk-collections — see
 * mobile/migration-blueprint.md and the web files referenced per type.
 */

// ---------------------------------------------------------------------------
// Access Perks (proxied upstream shapes)
// ---------------------------------------------------------------------------

export type RedemptionMethod = "link" | "instore" | "instore_print" | "call";

export interface PhysicalLocation {
  location_key?: number | string;
  location_name?: string;
  street_address?: string;
  extended_street_address?: string;
  address_line_1?: string;
  address_line_2?: string;
  city_locality?: string;
  state_region?: string;
  postal_code?: string;
  phone_number?: string;
}

export interface OfferStore {
  store_key: number;
  name: string;
  logo_url?: string;
  image_url?: string;
  description?: string;
  website?: string;
  phone_number?: string;
  physical_location?: PhysicalLocation;
}

export interface AccessOffer {
  offer_key: number | string;
  /** Present ⇒ multi-location offer; each location has its own offer_key. */
  offer_group_key?: string;
  title: string;
  description?: string;
  teaser?: string;
  long_description?: string;
  savings_amount?: string;
  discount_percent?: number;
  offer_value?: string | number;
  logo_url?: string;
  offer_photo_url?: string;
  expires_on?: string;
  redemption_methods?: RedemptionMethod[];
  categories?: { category_key: number; category_name: string }[];
  /** Miles. ≥ 5000 is treated as "ONLINE" by the web UI. */
  search_distance?: number;
  offer_store?: OfferStore;
  physical_location?: PhysicalLocation;
  terms_and_conditions?: string;
  terms_of_use?: string;
}

export interface OfferSearchInfo {
  total_results: number;
  total_pages: number;
  current_page: number;
  total_stores?: number;
  total_locations?: number;
}

export interface OfferSearchResponse {
  offers?: AccessOffer[];
  info?: OfferSearchInfo;
  message?: string;
}

/** GET /api/access-perks/rollup?rollup=stores */
export interface StoreGroup {
  key: number;
  name: string;
  logo_url?: string;
  description: string;
  count: number;
  offers: string[];
  location?: PhysicalLocation;
  distance?: number;
}

/** GET /api/access-perks/rollup?rollup=locations */
export interface LocationGroup {
  key: number | string;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  distance?: number;
  count: number;
  offers: string[];
  store: { name: string; logo_url?: string };
}

export interface RollupResponse<G = StoreGroup> {
  info: { total_results: number; total_stores: number; total_locations: number };
  groups: G[];
  isAuthenticated?: boolean;
}

export interface UsesRemaining {
  usable: boolean;
  uses_remaining: string | number;
  /** -1 or "unlimited" ⇒ unlimited. Badge only shown when ≥ 0. */
  number_of_uses_remaining: number;
}

/** POST /api/access-perks/offers/[offerKey]/redeem */
export interface RedeemResponse {
  success: true;
  redemption_url: string | null;
  promotion_code: string | null;
  coupon_code: string | null;
  /** HTML string with custom redemption instructions. */
  display_message: string | null;
  message?: string;
  phone_number: string | null;
  instructions: string | null;
  terms?: string;
  raw_response?: unknown;
}

/** GET /api/access-perks/locations item (root-level or nested shape). */
export interface UpstreamLocation extends PhysicalLocation {
  name?: string;
  distance?: string;
  distance_miles?: string;
  search_distance?: number | string;
  physical_location?: PhysicalLocation;
}

export interface LocationsResponse {
  locations: UpstreamLocation[];
  meta: { total_count?: number; current_page?: number; total_pages?: number };
  search_postal_code: string;
}

export interface CategoryNode {
  category_key: number;
  category_name: string;
  category_type?: string;
  offer_count?: number;
  subcategories?: CategoryNode[];
}

export interface Facet {
  key: "cuisine" | "storetype" | "activities" | string;
  label: string;
  values: { key: string; label: string }[];
}

/** offer_redemptions row — GET /api/access-perks/redemptions */
export interface OfferRedemption {
  id: string;
  user_id: string;
  offer_key: string;
  usage_redeem_key: string | null;
  redeem_type: RedemptionMethod | null;
  offer_title: string | null;
  store_name: string | null;
  store_logo_url: string | null;
  location_name: string | null;
  offer_value: string | null;
  redemption_url: string | null;
  coupon_code: string | null;
  phone_number: string | null;
  instructions: string | null;
  display_message: string | null;
  expires_at: string | null;
  status: "active" | "used" | "expired" | "archived";
  redeemed_at: string;
  created_at: string;
}

export interface RedemptionCheck {
  redeemed: boolean;
  coupon_code: string | null;
  redeem_type: RedemptionMethod | null;
}

// ---------------------------------------------------------------------------
// NFW-owned data
// ---------------------------------------------------------------------------

/** store_likes row — GET /api/perks/liked-stores. NFW partner likes use store_key = partner_name. */
export interface LikedStore {
  id: string;
  user_id: string;
  store_key: string;
  store_name: string;
  logo_url: string | null;
  created_at: string;
}

export interface NfwPerk {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  partner_name: string | null;
  partner_logo_url: string | null;
  discount_type: "percent" | "fixed" | "free_item" | "landing_page" | null;
  discount_value: string | null;
  landing_page_url: string | null;
  coupon_code: string | null;
  estimated_value: number;
  terms_and_conditions: string | null;
  categories: string[] | null;
  expires_at: string | null;
  is_active: boolean;
  is_admin_only: boolean;
  /** 0 = unlimited */
  max_redemptions_total: number;
  userHasRedeemed?: boolean;
}

export interface NfwPerkRedeemResponse {
  success: true;
  landingPageUrl: string;
  discountDescription: string | null;
  partnerName: string | null;
  couponCode: string | null;
}

export interface NfwPerkRedemption {
  id: string;
  perk_id: string;
  redeemed_at: string;
  title: string;
  slug: string | null;
  partner_name: string | null;
  logo_url: string | null;
  landing_page_url: string | null;
  coupon_code: string | null;
}

export interface PerkCollectionItem {
  id: string;
  collection_id: string;
  item_type: "access_perk" | "nfw_perk";
  /** offer_key (access) or slug (nfw), stored as string */
  item_identifier: string;
  display_order: number;
}

export interface PerkCollection {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  display_order: number;
  is_active: boolean;
  is_admin_only: boolean;
  items: PerkCollectionItem[];
  item_count: number;
}

export interface PerksSettings {
  id: string;
  hero_image_url: string | null;
  hero_heading: string;
  hero_subheading: string;
  is_test_mode: boolean;
}

// ---------------------------------------------------------------------------
// UI constants (parity with components/perks/PerksSearch.tsx + FilterSidebar.tsx)
// ---------------------------------------------------------------------------

export const NATIONWIDE_DISTANCE = "2500mi";

export const DISTANCE_OPTIONS: { value: string; label: string }[] = [
  { value: "5mi", label: "5 mi" },
  { value: "10mi", label: "10 mi" },
  { value: "25mi", label: "25 mi" },
  { value: "50mi", label: "50 mi" },
  { value: "100mi", label: "100 mi" },
  { value: NATIONWIDE_DISTANCE, label: "Nationwide" },
];

export const OFFER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "new", label: "New Offers" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "promo_code", label: "Has Promo Code" },
  { value: "50_off", label: "50% Off or More" },
  { value: "bogo", label: "Buy One Get One" },
  { value: "unlimited", label: "Unlimited Use" },
  { value: "limited", label: "Limited Use" },
  { value: "popular", label: "Popular" },
];

/** Gun/shooting-range stores hidden from the stores view (app/perks/page.tsx EXCLUDED_STORES). */
export const EXCLUDED_STORES = new Set([
  "Williams Gun Works",
  "Medlock Range",
  "Miami Valley Shooting Grounds",
  "Learn 2 Shoot Handgun Training Academy",
  "Paladin Tactical Firearms Training",
  "Republic Arms",
  "Defender Shooting Sports",
  "New American Arms",
  "Hopkins Gun & Tackle",
  "Range Masters of Utah",
  "Original Bob's Shooting Range",
  "Impact Guns",
  "Personal Defense Depot",
  "Vegas Machine Gun Experience",
]);

export const REDEMPTION_METHOD_LABELS: Record<RedemptionMethod, { action: string; redeemed: string }> = {
  link: { action: "Redeem Online", redeemed: "Redeemed (Online)" },
  instore: { action: "Redeem In-Store", redeemed: "Redeemed (In-Store)" },
  instore_print: { action: "Print Coupon", redeemed: "Redeemed (Print)" },
  call: { action: "Redeem by Phone", redeemed: "Redeemed (Call)" },
};
