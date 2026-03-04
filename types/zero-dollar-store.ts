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

export type ZeroDollarClaim = {
  id: string;
  item_id: string;
  member_id: string;
  claimed_at: string;
  shipping_address: {
    full_name: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
  };
  selected_variant: {
    size?: string;
    color?: string;
    [key: string]: string | undefined;
  } | null;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  tracking_number: string | null;
  notes: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
};

export type ZeroDollarItemWithClaim = ZeroDollarItem & {
  category?: ZeroDollarCategory | null;
  user_claim?: ZeroDollarClaim | null;
  total_claims?: number;
};
