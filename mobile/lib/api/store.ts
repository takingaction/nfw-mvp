import { apiGet, apiPost } from "@/lib/api";
import type { CheckoutResponse, ClaimsCheck, StoreProduct, StoreSettings, SystemSettings, ZeroDollarClaim } from "@/types/store";

/**
 * Zero Dollar Store API wrappers. Products/settings are public; claims + checkout
 * carry the Bearer token. See mobile/migration-blueprint.md for contracts.
 */

/** Public. Already filtered to mvp-visible products and sorted by displayOrder. */
export async function fetchProducts(): Promise<StoreProduct[]> {
  const data = await apiGet<StoreProduct[]>("/api/shopify/products", { anonymous: true });
  return Array.isArray(data) ? data : [];
}

export function fetchStoreSettings() {
  return apiGet<StoreSettings | null>("/api/store/settings", { anonymous: true });
}

export function fetchSystemSettings() {
  return apiGet<SystemSettings>("/api/system-settings", { anonymous: true });
}

/** Has the member completed a claim this calendar month? Send our own user id. */
export function fetchClaimsCheck(userId: string) {
  return apiGet<ClaimsCheck>("/api/store/claims/check", { query: { userId } });
}

/**
 * Creates the claim + Shopify draft order and returns the hosted checkout URL.
 * Errors surface as ApiError with the server's message; 503 carries `shopify_unavailable: true`.
 */
export function createCheckout(body: { variantId: string; productId: string; userId: string }) {
  return apiPost<CheckoutResponse>("/api/shopify/checkout", body);
}

/** Latest 5 claims (all statuses, incl. abandoned `created`) with product title/image attached. */
export async function fetchMyClaims(): Promise<ZeroDollarClaim[]> {
  const data = await apiGet<ZeroDollarClaim[]>("/api/store/claims/my-claims-simple");
  return Array.isArray(data) ? data : [];
}

export interface SavingsResponse {
  total: number;
  microgrants: number;
  perks: number;
  zeroDollarStore: number;
  nfwPerks: number;
}

/** Full savings incl. the Zero Dollar Store bucket (needs service-role data → via API). */
export function fetchSavings() {
  return apiGet<SavingsResponse>("/api/dashboard/savings");
}

// ---------------------------------------------------------------------------
// Helpers mirroring components/StoreClient.tsx
// ---------------------------------------------------------------------------

export interface ClaimEligibility {
  eligible: boolean;
  reason: string;
}

/**
 * `canClaim()` from StoreClient.tsx — same order and strings.
 * Note the web never shows "Log in": logged-out users see "Approval Required".
 */
export function canClaimProduct(
  product: StoreProduct,
  ctx: { userTier: string | null; isApprovedFreeMember: boolean | null; monthlyClaimed: boolean },
): ClaimEligibility {
  if (product.status === "DRAFT") return { eligible: false, reason: "Dropping Soon" };
  if ((ctx.userTier === "free" && !ctx.isApprovedFreeMember) || ctx.userTier === "waitlist") {
    return { eligible: false, reason: "Approval Required" };
  }
  if (!ctx.userTier || !product.eligibilityTiers.includes(ctx.userTier)) {
    return { eligible: false, reason: "Not Available for Your Tier" };
  }
  if (ctx.monthlyClaimed) return { eligible: false, reason: "Monthly Limit Reached" };
  if (!product.availableForSale) return { eligible: false, reason: "Out of Stock" };
  return { eligible: true, reason: "" };
}

/** Group variant options by name → [{ name, values[] }], skipping the Shopify default. */
export function groupVariantOptions(product: StoreProduct): { name: string; values: string[] }[] {
  if (!product.variants.length || product.variants[0].title === "Default") return [];
  const map = new Map<string, Set<string>>();
  for (const v of product.variants) {
    for (const o of v.options) {
      if (o.name === "Title" && o.value === "Default Title") continue;
      if (!map.has(o.name)) map.set(o.name, new Set());
      map.get(o.name)!.add(o.value);
    }
  }
  return [...map.entries()].map(([name, values]) => ({ name, values: [...values] }));
}

/** Option values that appear in no available-for-sale variant. */
export function unavailableOptionValues(product: StoreProduct): Set<string> {
  const available = new Set<string>();
  const all = new Set<string>();
  for (const v of product.variants) {
    for (const o of v.options) {
      const key = `${o.name}::${o.value}`;
      all.add(key);
      if (v.availableForSale) available.add(key);
    }
  }
  return new Set([...all].filter((k) => !available.has(k)));
}

/** Resolve the chosen option values to a concrete variant id (falls back to the product's first variant). */
export function resolveVariantId(product: StoreProduct, selected: Record<string, string>): string {
  const match = product.variants.find((v) => v.options.every((o) => selected[o.name] === o.value));
  return match?.id ?? product.shopifyVariantId;
}
