import { createStorefrontApiClient } from "@shopify/storefront-api-client";

const shopDomain = process.env.SHOPIFY_SHOP_DOMAIN;
const clientId = process.env.SHOPIFY_CLIENT_ID;
const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

export const shopifyClient = createStorefrontApiClient({
  storeDomain: shopDomain || "",
  apiVersion: "2026-01",
  publicAccessToken: `${clientId}:${clientSecret}`,
});

export function getShopifyHeaders() {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return {
    "Content-Type": "application/json",
    "Authorization": `Basic ${credentials}`,
  };
}

export async function shopifyFetch<T>({
  query,
  variables,
}: {
  query: string;
  variables?: Record<string, unknown>;
}): Promise<T> {
  const response = await fetch(`https://${shopDomain}/api/2026-01/graphql.json`, {
    method: "POST",
    headers: getShopifyHeaders(),
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
  handle: string;
  featuredImage: {
    url: string;
    altText: string | null;
  } | null;
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
  query Products($first: Int!) {
    products(first: $first) {
      edges {
        node {
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
                price {
                  amount
                  currencyCode
                }
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
    }
  }
`;

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
            price {
              amount
              currencyCode
            }
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

export const CHECKOUT_CREATE_MUTATION = `
  mutation CheckoutCreate($input: CheckoutCreateInput!) {
    checkoutCreate(input: $input) {
      checkout {
        id
        webUrl
        completedAt
        totalPriceV2 {
          amount
          currencyCode
        }
      }
      checkoutUserErrors {
        code
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
