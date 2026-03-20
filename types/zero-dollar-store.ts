export type ZeroDollarCategory = {
  id: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ZeroDollarItem = {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  image_url: string | null;
  images: string[] | null;
  quantity_available: number;
  eligibility_tiers: string[];
  tags: string[];
  size_variants: {
    sizes?: string[];
    colors?: string[];
    [key: string]: string[] | undefined;
  } | null;
  weight_oz: number | null;
  is_featured: boolean;
  is_active: boolean;
  available_from: string | null;
  available_until: string | null;
  restrictions: string | null;
  external_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ShopifyProductMapping = {
  id: string;
  shopify_product_id: string;
  shopify_variant_id: string;
  mvp_visibility: boolean;
  eligibility_tiers: string[];
  display_order: number;
  created_at: string;
  updated_at: string;
};

export type ZeroDollarClaim = {
  id: string;
  user_id: string;
  shopify_product_id: string;
  shopify_variant_id: string;
  shopify_checkout_id: string | null;
  shopify_order_id: string | null;
  status: "pending" | "created" | "fulfilled" | "delivered";
  shipping_address: ShippingAddress | null;
  tracking_number: string | null;
  tracking_url: string | null;
  claimed_at: string;
  created_at: string;
  updated_at: string;
};

export type ShippingAddress = {
  full_name: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
};

export type StoreProduct = {
  shopifyProductId: string;
  shopifyVariantId: string;
  title: string;
  description: string;
  imageUrl: string;
  availableForSale: boolean;
  variants: ProductVariant[];
  mvpVisibility: boolean;
  eligibilityTiers: string[];
  displayOrder: number;
};

export type ProductVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  options: Array<{ name: string; value: string }>;
};

export type ZeroDollarItemWithClaim = ZeroDollarItem & {
  category?: ZeroDollarCategory | null;
  user_claim?: ZeroDollarClaim | null;
  total_claims?: number;
};

export type ClaimWithProduct = ZeroDollarClaim & {
  product?: StoreProduct;
};
