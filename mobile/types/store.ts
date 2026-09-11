/**
 * Zero Dollar Store types — mirror GET /api/shopify/products (lib/mock-shopify.ts MockProduct),
 * zero_dollar_claims rows, store_settings and system_settings.
 */

export interface StoreVariant {
  id: string; // "gid://shopify/ProductVariant/456"
  title: string;
  availableForSale: boolean;
  options: { name: string; value: string }[];
}

export interface StoreProduct {
  shopifyProductId: string; // "gid://shopify/Product/123"
  shopifyVariantId: string; // first variant GID, "" if none
  title: string;
  /** Raw HTML (descriptionHtml || description) */
  description: string;
  /** Plain text, ≤150 chars, server-generated (entities NOT decoded) */
  cardDescription: string;
  imageUrl: string;
  images: string[];
  availableForSale: boolean;
  /** Empty when the only variant is "Default Title" */
  variants: StoreVariant[];
  mvpVisibility: boolean;
  eligibilityTiers: string[];
  displayOrder: number;
  featuredOrder: number;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED" | null;
  compareAtPrice?: number;
}

export type ClaimStatus =
  | "pending"
  | "created"
  | "completed"
  | "fulfilled"
  | "delivered"
  | "cancelled"
  | "rejected_invalid_user"
  | "rejected_monthly_limit"
  | "paid";

/** Statuses that count as a successful claim (lifetime + monthly limits). */
export const SUCCESSFUL_CLAIM_STATUSES: ClaimStatus[] = ["completed", "fulfilled", "paid", "delivered"];

export interface ZeroDollarClaim {
  id: string;
  user_id: string;
  shopify_product_id: string;
  shopify_variant_id: string | null;
  shopify_checkout_id: string | null; // "draft_…"
  shopify_order_id: string | null; // "gid://shopify/Order/…"
  status: ClaimStatus;
  tracking_number: string | null;
  tracking_url: string | null;
  order_status_url: string | null;
  claimed_at: string;
  claim_month: string | null;
  checkout_completed_at: string | null;
  /** Attached by /api/store/claims/my-claims-simple */
  product?: { title: string; imageUrl: string } | null;
}

export interface StoreSettings {
  id: string;
  hero_image_url: string | null;
  hero_heading: string;
  hero_subheading: string;
}

export interface SystemSettings {
  id: string;
  shopify_checkout_enabled: boolean;
  shopify_health_status: string;
  shopify_health_message: string | null;
}

export interface ClaimsCheck {
  claimedThisMonth: boolean;
  claimCount: number;
}

export interface CheckoutResponse {
  checkoutUrl: string;
  checkoutId: string;
  remainingThisMonth: number;
}

/** /store/my-claims STATUS_INFO (web: components/MyClaimsClient.tsx) — with completed/paid added. */
export const CLAIM_STATUS_INFO: Record<string, { label: string; description: string; tone: "info" | "success" | "danger" | "neutral" | "purple" }> = {
  pending: { label: "Pending", description: "Your claim is being processed", tone: "neutral" },
  created: { label: "Processing", description: "Your order is being prepared", tone: "info" },
  completed: { label: "Completed", description: "Your order has been placed", tone: "success" },
  paid: { label: "Completed", description: "Your order has been placed", tone: "success" },
  fulfilled: { label: "Shipped", description: "Your item is on its way", tone: "success" },
  delivered: { label: "Delivered", description: "Your item has been delivered", tone: "success" },
  cancelled: { label: "Cancelled", description: "This order was cancelled", tone: "danger" },
  rejected_invalid_user: { label: "Invalid", description: "This claim was not valid", tone: "danger" },
  rejected_monthly_limit: { label: "Monthly Limit", description: "Monthly claim limit reached", tone: "danger" },
};

/** Dashboard order-history pill labels (web: YourZeroDollarStoreSection.getStatusLabel). */
export const DASHBOARD_CLAIM_LABELS: Record<string, string> = {
  created: "Order Placed",
  fulfilled: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  completed: "Completed",
  paid: "Completed",
  pending: "Pending",
};
