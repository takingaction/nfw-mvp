import { ShopifyProduct } from "./shopify";

export type MockProduct = {
  shopifyProductId: string;
  shopifyVariantId: string;
  title: string;
  description: string;
  imageUrl: string;
  images: string[];
  availableForSale: boolean;
  variants: Array<{
    id: string;
    title: string;
    availableForSale: boolean;
    options: Array<{ name: string; value: string }>;
  }>;
  mvpVisibility: boolean;
  eligibilityTiers: string[];
  displayOrder: number;
  featuredOrder: number;
  status: "ACTIVE" | "DRAFT" | "ARCHIVED" | null;
};

export const MOCK_PRODUCTS: MockProduct[] = [
  {
    shopifyProductId: "gid://shopify/Product/1",
    shopifyVariantId: "gid://shopify/ProductVariant/1",
    title: "Ceramic Mug",
    description: "Beautiful handcrafted ceramic mug perfect for your morning coffee or tea. Features a classic design with comfortable grip.",
    imageUrl: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=400&h=533&fit=crop&q=80",
    images: [],
    availableForSale: true,
    variants: [
      {
        id: "gid://shopify/ProductVariant/1",
        title: "Default",
        availableForSale: true,
        options: [],
      },
    ],
    mvpVisibility: true,
    eligibilityTiers: ["free", "contributing", "founding"],
    displayOrder: 1,
    featuredOrder: 999,
    status: "ACTIVE",
  },
  {
    shopifyProductId: "gid://shopify/Product/2",
    shopifyVariantId: "gid://shopify/ProductVariant/2",
    title: "Tote Bag",
    description: "Eco-friendly canvas tote bag with NFW branding. Perfect for shopping or everyday use. Made from sustainable materials.",
    imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&h=533&fit=crop&q=80",
    images: [],
    availableForSale: true,
    variants: [
      {
        id: "gid://shopify/ProductVariant/2",
        title: "Default",
        availableForSale: true,
        options: [],
      },
    ],
    mvpVisibility: true,
    eligibilityTiers: ["free", "contributing", "founding"],
    displayOrder: 2,
    featuredOrder: 999,
    status: "ACTIVE",
  },
  {
    shopifyProductId: "gid://shopify/Product/3",
    shopifyVariantId: "gid://shopify/ProductVariant/3",
    title: "Notebook Set",
    description: "Premium lined notebook with NFW cover design. Includes matching pen. Great for journaling or note-taking.",
    imageUrl: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&h=533&fit=crop&q=80",
    images: [],
    availableForSale: true,
    variants: [
      {
        id: "gid://shopify/ProductVariant/3",
        title: "Default",
        availableForSale: true,
        options: [],
      },
    ],
    mvpVisibility: true,
    eligibilityTiers: ["contributing", "founding"],
    displayOrder: 3,
    featuredOrder: 999,
    status: "ACTIVE",
  },
  {
    shopifyProductId: "gid://shopify/Product/4",
    shopifyVariantId: "gid://shopify/ProductVariant/4",
    title: "Water Bottle",
    description: "Insulated stainless steel water bottle. Keeps drinks cold for 24 hours or hot for 12 hours. BPA-free.",
    imageUrl: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=533&fit=crop&q=80",
    images: [],
    availableForSale: false,
    variants: [
      {
        id: "gid://shopify/ProductVariant/4",
        title: "Default",
        availableForSale: false,
        options: [],
      },
    ],
    mvpVisibility: true,
    eligibilityTiers: ["founding"],
    displayOrder: 4,
    featuredOrder: 999,
    status: "ACTIVE",
  },
  {
    shopifyProductId: "gid://shopify/Product/5",
    shopifyVariantId: "gid://shopify/ProductVariant/5",
    title: "Lip Balm Set",
    description: "Set of 3 organic lip balms in different flavors. Made with natural ingredients. Long-lasting moisture.",
    imageUrl: "https://images.unsplash.com/photo-1599305090598-fe179d501227?w=400&h=533&fit=crop&q=80",
    images: [],
    availableForSale: true,
    variants: [
      {
        id: "gid://shopify/ProductVariant/5",
        title: "Default",
        availableForSale: true,
        options: [],
      },
    ],
    mvpVisibility: true,
    eligibilityTiers: ["free", "contributing", "founding"],
    displayOrder: 5,
    featuredOrder: 999,
    status: "DRAFT",
  },
  {
    shopifyProductId: "gid://shopify/Product/6",
    shopifyVariantId: "gid://shopify/ProductVariant/6",
    title: "Stickers Pack",
    description: "Fun NFW sticker pack with various designs. Waterproof and durable. Perfect for laptops or water bottles.",
    imageUrl: "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=400&h=533&fit=crop&q=80",
    images: [],
    availableForSale: true,
    variants: [
      {
        id: "gid://shopify/ProductVariant/6",
        title: "Default",
        availableForSale: true,
        options: [],
      },
    ],
    mvpVisibility: true,
    eligibilityTiers: ["free", "contributing", "founding"],
    displayOrder: 6,
    featuredOrder: 999,
    status: "ACTIVE",
  },
];

export function transformShopifyProduct(shopifyProduct: ShopifyProduct, mockMapping?: MockProduct): MockProduct {
  const firstVariant = shopifyProduct.variants.edges[0]?.node;

  const hasRealVariants = shopifyProduct.variants.edges.length > 1 || 
    (shopifyProduct.variants.edges[0]?.node.selectedOptions?.some(
      (opt) => !(opt.name === "Title" && opt.value === "Default Title")
    ) ?? false);

  const allImages = shopifyProduct.images?.edges?.map(e => e.node.url) || [];

  return {
    shopifyProductId: shopifyProduct.id,
    shopifyVariantId: firstVariant?.id || "",
    title: shopifyProduct.title,
    description: shopifyProduct.descriptionHtml || shopifyProduct.description || "",
    imageUrl: shopifyProduct.featuredImage?.url || allImages[0] || "",
    images: allImages,
    availableForSale: firstVariant?.availableForSale || false,
    variants: hasRealVariants ? shopifyProduct.variants.edges.map(({ node }) => ({
      id: node.id,
      title: node.title,
      availableForSale: node.availableForSale,
      options: node.selectedOptions,
    })) : [],
    mvpVisibility: mockMapping?.mvpVisibility ?? false,
    eligibilityTiers: mockMapping?.eligibilityTiers ?? ["free", "contributing", "founding"],
    displayOrder: mockMapping?.displayOrder ?? 999,
    featuredOrder: mockMapping?.featuredOrder ?? 999,
    status: shopifyProduct.status ?? "ACTIVE",
  };
}
