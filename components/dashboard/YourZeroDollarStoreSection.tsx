"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Gift, Clock, ArrowRight } from "lucide-react";

const SHOPIFY_STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "nationalfundforwomen.myshopify.com";

interface Claim {
  id: string;
  created_at: string;
  order_status_url?: string | null;
  shopify_order_id?: string | null;
  shopify_product_mappings: {
    title: string;
    image_url: string | null;
    price: number | null;
  } | null;
}

interface LatestProduct {
  shopifyProductId: string;
  title: string;
  imageUrl: string | null;
  price: number | null;
}

interface YourZeroDollarStoreSectionProps {
  claims: Claim[];
}

function getShopifyOrderUrl(claim: Claim): string | null {
  if (claim.order_status_url) {
    return claim.order_status_url;
  }
  if (!claim.shopify_order_id) return null;
  const cleanId = claim.shopify_order_id.replace('gid://shopify/Order/', '');
  return `https://${SHOPIFY_STORE_DOMAIN}/account/orders/${cleanId}`;
}

function OnlineHistoryItem({ claim }: { claim: Claim }) {
  const product = claim.shopify_product_mappings;
  const shopifyOrderUrl = getShopifyOrderUrl(claim);

  return (
    <div className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
      <div className="w-12 h-12 bg-white/10 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
        {product?.image_url ? (
          <img
            src={product.image_url}
            alt=""
            className="w-full h-full object-contain"
          />
        ) : (
          <Gift className="w-5 h-5 text-white/40" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">
          {product?.title || "Product"}
        </p>
        <p className="text-white/50 text-xs">
          {new Date(claim.created_at).toLocaleDateString()}
        </p>
        {shopifyOrderUrl && (
          <a
            href={shopifyOrderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-ui text-xs font-medium text-nfw-citrine hover:underline mt-1"
          >
            View on Shopify
            <ArrowRight className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function LatestOfferingCard({ product }: { product: LatestProduct }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-md w-48 flex-shrink-0">
      <div className="aspect-[3/4] relative bg-white">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.title}
            className="w-full h-full object-contain p-2"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-nfw-dove">
            <Gift className="w-8 h-8 text-white/30" />
          </div>
        )}
      </div>
      <div className="bg-nfw-citrine p-3">
        <p className="text-nfw-blackberry font-ui text-sm font-medium truncate">
          {product.title}
        </p>
      </div>
    </div>
  );
}

export default function YourZeroDollarStoreSection({ claims }: YourZeroDollarStoreSectionProps) {
  const [latestProducts, setLatestProducts] = useState<LatestProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestProducts = async () => {
      try {
        const response = await fetch("/api/shopify/products");
        if (response.ok) {
          const products = await response.json();
          const visibleProducts = products
            .filter((p: any) => p.mvpVisibility)
            .slice(0, 4);
          setLatestProducts(visibleProducts);
        }
      } catch (err) {
        console.error("Failed to fetch latest products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestProducts();
  }, []);

  return (
    <section className="bg-nfw-lilac py-12 px-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white font-serif">
          Your Zero Dollar Store
        </h2>
        <Link
          href="/store"
          className="px-4 py-2 bg-nfw-wisteria text-white font-ui text-sm font-medium rounded-lg hover:bg-nfw-wisteria/90 transition-colors"
        >
          Browse the Zero Dollar Store
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Left Column: Online History */}
        <div>
          <div className="bg-white/10 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-white/70" />
              <h3 className="text-lg font-bold text-white font-serif">
                Your Online History
              </h3>
            </div>
            {claims.length === 0 ? (
              <div className="text-center py-6">
                <Gift className="w-10 h-10 text-white/30 mx-auto mb-3" />
                <p className="text-white/60 text-sm mb-3">No items ordered yet</p>
                <Link
                  href="/store"
                  className="text-sm text-white hover:text-white/80 underline"
                >
                  Browse the Zero Dollar Store
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {claims.map((claim) => (
                  <OnlineHistoryItem key={claim.id} claim={claim} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Latest Offerings */}
        <div>
          <div className="bg-white/10 rounded-xl p-6">
            <h3 className="text-lg font-bold text-white font-serif mb-4">
              Latest Offerings
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            ) : latestProducts.length === 0 ? (
              <div className="text-center py-6">
                <Gift className="w-10 h-10 text-white/30 mx-auto mb-3" />
                <p className="text-white/60 text-sm">No products available</p>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {latestProducts.map((product) => (
                  <LatestOfferingCard key={product.shopifyProductId} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}