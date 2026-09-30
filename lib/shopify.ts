import { createClient } from "@supabase/supabase-js";

function getShopifyConfig() {
  return {
    storeDomain: process.env.SHOPIFY_SHOP_DOMAIN || "",
  };
}

// Service role client bypasses RLS for server-side operations
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function getShopifyAccessToken(): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  
  const { data, error } = await supabase
    .from("shopify_tokens")
    .select("access_token")
    .eq("shop", process.env.SHOPIFY_SHOP_DOMAIN)
    .single();
  
  if (error || !data) {
    return process.env.SHOPIFY_ACCESS_TOKEN || null;
  }
  return data.access_token as string;
}

export async function shopifyFetch<T>({
  query,
  variables,
  accessToken,
}: {
  query: string;
  variables?: Record<string, unknown>;
  accessToken?: string;
}): Promise<T> {
  const { storeDomain } = getShopifyConfig();
  
  // If no access token provided, fetch it from Supabase
  const token = accessToken || await getShopifyAccessToken();
  
  if (!token) {
    throw new Error("No Shopify access token available");
  }
  
  const response = await fetch(`https://${storeDomain}/admin/api/2026-01/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await response.json();

  if (json.errors) {
    throw new Error(json.errors[0].message);
  }

  return json.data as T;
}

export type ShopifyProduct = {
  id: string;
  title: string;
  description: string;
  descriptionHtml: string | null;
  handle: string;
  featuredImage: {
    url: string;
    altText: string | null;
  } | null;
  images: {
    edges: Array<{
      node: {
        url: string;
        altText: string | null;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: ShopifyVariant;
    }>;
  };
  priceRange: {
    minVariantPrice: {
      amount: string;
      currencyCode: string;
    };
  };
  status: "ACTIVE" | "DRAFT" | "ARCHIVED" | null;
};

export type ShopifyVariant = {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
  price: {
    amount: string;
    currencyCode: string;
  };
  compareAtPrice: string | null;
};

export type ShopifyCheckout = {
  id: string;
  webUrl: string;
  completedAt: string | null;
  totalPriceV2: {
    amount: string;
    currencyCode: string;
  };
  order: {
    id: string;
    name: string;
    fulfillments: {
      edges: Array<{
        node: {
          trackingInfo: Array<{
            number: string;
            url: string;
          }>;
        };
      }>;
    } | null;
  } | null;
};

export const PRODUCTS_QUERY = `
  query Products($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          description
          descriptionHtml
          handle
          status
          featuredImage {
            url
            altText
          }
          images(first: 20) {
            edges {
              node {
                url
                altText
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                availableForSale
                selectedOptions {
                  name
                  value
                }
                compareAtPrice
              }
            }
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const PRODUCTS_PAGE_SIZE = 250;

type ProductsConnection = {
  products: {
    edges: Array<{ node: ShopifyProduct }>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
};

/**
 * Fetches every product from the shop via cursor pagination.
 *
 * Single-page GraphQL queries (e.g. `products(first: 50)`) silently drop rows
 * once the shop outgrows the limit, which causes:
 *   - /admin/shopify to render fewer rows than the DB actually has
 *   - /api/admin/shopify/sync to UPSERT only the visible page, then DELETE
 *     still-existing products because they weren't in the response
 *
 * Loops until pageInfo.hasNextPage is false.
 */
export async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  const all: ShopifyProduct[] = [];

  // Hard ceiling protects against runaway loops if Shopify ever returns
  // hasNextPage=true with a null/invalid cursor. 100 pages × 250 = 25k products.
  const MAX_PAGES = 100;

  let after: string | null | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const data: ProductsConnection = await shopifyFetch<ProductsConnection>({
      query: PRODUCTS_QUERY,
      variables: { first: PRODUCTS_PAGE_SIZE, after },
    });

    for (const { node } of data.products.edges) {
      all.push(node);
    }

    if (!data.products.pageInfo.hasNextPage) {
      return all;
    }
    const endCursor = data.products.pageInfo.endCursor;
    if (!endCursor) {
      // Defensive: hasNextPage=true but no cursor would loop forever.
      console.warn("[fetchAllProducts] hasNextPage=true with no endCursor; stopping pagination");
      return all;
    }
    after = endCursor;
  }

  console.warn(`[fetchAllProducts] Hit MAX_PAGES (${MAX_PAGES}); returning ${all.length} products`);
  return all;
}

export const PRODUCT_BY_HANDLE_QUERY = `
  query ProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      description
      handle
      featuredImage {
        url
        altText
      }
      variants(first: 10) {
        edges {
          node {
            id
            title
            availableForSale
            selectedOptions {
              name
              value
            }
            compareAtPrice
          }
        }
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
    }
  }
`;

export const CART_CREATE_MUTATION = `
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const CHECKOUT_SHIPPING_ADDRESS_UPDATE_MUTATION = `
  mutation CheckoutShippingAddressUpdateV2($shippingAddress: MailingAddressInput!, $checkoutId: ID!) {
    checkoutShippingAddressUpdateV2(shippingAddress: $shippingAddress, checkoutId: $checkoutId) {
      checkout {
        id
        webUrl
      }
      checkoutUserErrors {
        code
        field
        message
      }
    }
  }
`;

export const CHECKOUT_QUERY = `
  query Checkout($id: ID!) {
    node(id: $id) {
      ... on Checkout {
        id
        webUrl
        completedAt
        totalPriceV2 {
          amount
          currencyCode
        }
        order {
          id
          name
          fulfillments(first: 5) {
            edges {
              node {
                trackingInfo(first: 5) {
                  number
                  url
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const DRAFT_ORDER_QUERY = `
  query DraftOrder($id: ID!) {
    draftOrder(id: $id) {
      id
      name
      status
      completedAt
      invoiceUrl
      order {
        id
        name
        statusPageUrl
        displayFulfillmentStatus
        fulfillments {
          trackingInfo {
            number
            url
          }
        }
      }
    }
  }
`;

export type ShopifyDraftOrder = {
  id: string;
  name: string;
  status: "COMPLETED" | "INVOICE_SENT" | "PENDING";
  completedAt: string | null;
  invoiceUrl: string | null;
  order: {
    id: string;
    name: string;
    statusPageUrl: string;
    displayFulfillmentStatus: string;
    fulfillments: Array<{
      trackingInfo: Array<{
        number: string;
        url: string;
      }>;
    }> | null;
  } | null;
};

export type ShopifyOrder = {
  id: string;
  name: string;
  email: string | null;
  customer: {
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
  } | null;
};

export async function getShopifyOrder(orderGid: string): Promise<ShopifyOrder | null> {
  const { storeDomain } = getShopifyConfig();
  const token = await getShopifyAccessToken();

  if (!token) {
    console.error("[getShopifyOrder] No Shopify access token available");
    return null;
  }

  // Extract numeric ID from gid://shopify/Order/123456
  const numericId = orderGid.split('/').pop();

  try {
    const response = await fetch(
      `https://${storeDomain}/admin/api/2026-01/orders/${numericId}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': token,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error(`[getShopifyOrder] Shopify API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data.order as ShopifyOrder;
  } catch (error) {
    console.error("[getShopifyOrder] Fetch error:", error);
    return null;
  }
}
