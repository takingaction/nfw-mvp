"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Package, ArrowRight } from "lucide-react";

type Claim = {
  id: string;
  shopify_product_id: string;
  shopify_variant_id: string;
  shopify_checkout_id: string | null;
  shopify_order_id: string | null;
  status: "pending" | "created" | "fulfilled" | "delivered";
  shipping_address: Record<string, unknown> | null;
  tracking_number: string | null;
  tracking_url: string | null;
  order_status_url: string | null;
  claimed_at: string;
  product?: {
    title: string;
    imageUrl: string;
    description: string;
  } | null;
};

type OrderStatus = {
  status: string;
  trackingNumber: string | null;
  trackingUrl: string | null;
  orderId: string | null;
};

const STATUS_INFO: Record<string, { label: string; description: string }> = {
  pending: { label: "Pending", description: "Your claim is being processed" },
  created: { label: "Processing", description: "Your order is being prepared" },
  fulfilled: { label: "Shipped", description: "Your item is on its way" },
  delivered: { label: "Delivered", description: "Your item has been delivered" },
};

const SHOPIFY_STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || "nfw-checkout.myshopify.com";

export default function MyClaimsClient({
  claims,
}: {
  claims: Claim[];
  userName?: string;
}) {
  const [enrichedClaims, setEnrichedClaims] = useState<Claim[]>(claims);
  const [loadingClaimId, setLoadingClaimId] = useState<string | null>(null);

  const fetchOrderStatus = useCallback(async (claim: Claim): Promise<OrderStatus> => {
    // Skip API call if no checkout ID or if it's a draft_/checkout_ short format
    // These are stored in our DB but Shopify queries fail with "No such type Checkout"
    if (!claim.shopify_checkout_id ||
        claim.shopify_checkout_id.startsWith('checkout_') ||
        claim.shopify_checkout_id.startsWith('draft_')) {
      return {
        status: claim.status,
        trackingNumber: claim.tracking_number,
        trackingUrl: claim.tracking_url,
        orderId: claim.shopify_order_id
      };
    }

    try {
      const res = await fetch(`/api/shopify/orders/${encodeURIComponent(claim.shopify_checkout_id)}`);
      const data = await res.json();
      return {
        status: data.status || claim.status,
        trackingNumber: data.trackingNumber || claim.tracking_number,
        trackingUrl: data.trackingUrl || claim.tracking_url,
        orderId: data.orderId || claim.shopify_order_id,
      };
    } catch {
      return {
        status: claim.status,
        trackingNumber: claim.tracking_number,
        trackingUrl: claim.tracking_url,
        orderId: claim.shopify_order_id
      };
    }
  }, []);

  const enrichClaims = useCallback(async () => {
    if (claims.length === 0) return;

    setLoadingClaimId(claims[0]?.id || null);

    const enrichedPromises = claims.map(async (claim) => {
      const orderStatus = await fetchOrderStatus(claim);
      return {
        ...claim,
        status: orderStatus.status as Claim["status"],
        tracking_number: orderStatus.trackingNumber,
        tracking_url: orderStatus.trackingUrl,
        shopify_order_id: orderStatus.orderId,
      };
    });

    const enriched = await Promise.all(enrichedPromises);
    setEnrichedClaims(enriched);
    setLoadingClaimId(null);
  }, [claims, fetchOrderStatus]);

  useEffect(() => {
    enrichClaims();
  }, [enrichClaims]);

  const refreshClaim = async (claimId: string) => {
    const claim = enrichedClaims.find((c) => c.id === claimId);
    if (!claim) return;

    setLoadingClaimId(claimId);
    const orderStatus = await fetchOrderStatus(claim);
    setEnrichedClaims((prev) =>
      prev.map((c) =>
        c.id === claimId
          ? {
              ...c,
              status: orderStatus.status as Claim["status"],
              tracking_number: orderStatus.trackingNumber,
              tracking_url: orderStatus.trackingUrl,
              shopify_order_id: orderStatus.orderId,
            }
          : c,
      ),
    );
    setLoadingClaimId(null);
  };

  const getShopifyOrderUrl = (claim: Claim) => {
    // Use Shopify's order_status_url if available (doesn't require login)
    if (claim.order_status_url) {
      return claim.order_status_url;
    }
    // Fallback to constructing URL from order ID
    if (!claim.shopify_order_id) return null;
    const cleanId = claim.shopify_order_id.replace('gid://shopify/Order/', '');
    return `https://${SHOPIFY_STORE_DOMAIN}/account/orders/${cleanId}`;
  };

  if (enrichedClaims.length === 0) {
    return (
      <div className="text-center py-20 bg-white">
        <div className="text-6xl mb-6 opacity-30">📦</div>
        <h2 className="font-serif text-3xl text-nfw-aubergine mb-4">
          No Claims Yet
        </h2>
        <p className="font-sans text-nfw-blackberry/60 mb-8 max-w-md mx-auto">
          You haven&apos;t claimed any items from the Zero Dollar Store yet.
          Browse our selection of free products.
        </p>
        <Link
          href="/store"
          className="inline-block bg-nfw-citrine text-nfw-blackberry px-8 py-3 font-ui text-xs font-black tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors"
        >
          Browse Available Items
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-4">
        {enrichedClaims.map((claim) => {
          const info = STATUS_INFO[claim.status] || STATUS_INFO.pending;
          const shopifyOrderUrl = getShopifyOrderUrl(claim);

          return (
            <div
              key={claim.id}
              className="bg-white"
            >
              <div className="p-6">
                <div className="flex gap-6">
                  <div className="relative w-24 h-24 bg-nfw-stone/10 flex-shrink-0 overflow-hidden">
                    {loadingClaimId === claim.id ? (
                      <div className="w-full h-full animate-pulse bg-nfw-stone/20" />
                    ) : claim.product?.imageUrl ? (
                      <Image
                        src={claim.product.imageUrl}
                        alt={claim.product?.title || "Product"}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-nfw-stone/40" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry">
                          {claim.product?.title || "Product"}
                        </h3>
                        {claim.product?.description && (
                          <p className="font-sans text-sm text-nfw-blackberry/60 mt-1 line-clamp-1">
                            {claim.product.description}
                          </p>
                        )}
                      </div>
                      <span className="ml-4 flex-shrink-0 inline-flex items-center px-3 py-1 font-ui text-xs font-black tracking-[0.03em] uppercase bg-nfw-aubergine text-nfw-dove">
                        {info.label}
                      </span>
                    </div>

                    <p className="font-sans text-sm text-nfw-blackberry/70 mb-3">
                      {info.description}
                    </p>

                    {claim.shopify_order_id && (
                      <p className="font-ui text-xs text-nfw-blackberry/50 mb-3">
                        Order #{claim.shopify_order_id.split('/').pop()}
                      </p>
                    )}

                    {(claim.tracking_number || shopifyOrderUrl) && (
                      <div className="mb-3 space-y-2">
                        {claim.tracking_number && (
                          <div className="flex items-center gap-3">
                            {claim.tracking_url ? (
                              <a
                                href={claim.tracking_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 font-ui text-xs font-medium text-nfw-aubergine hover:underline"
                              >
                                Track Package
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="font-ui text-xs text-nfw-blackberry/50">
                                Tracking: {claim.tracking_number}
                              </span>
                            )}
                            <span className="text-nfw-blackberry/30">|</span>
                            <span className="font-ui text-xs text-nfw-blackberry/50">
                              {claim.tracking_number}
                            </span>
                          </div>
                        )}
                        {/* TODO: SECURITY - Temporarily hidden until ZDS order matching is fixed
                        {shopifyOrderUrl && (
                          <a
                            href={shopifyOrderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-ui text-xs font-medium text-nfw-aubergine hover:underline"
                          >
                            View on Shopify
                            <ArrowRight className="w-3 h-3" />
                          </a>
                        )}
                        */}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="font-sans text-xs text-nfw-blackberry/50">
                        Claimed {new Date(claim.claimed_at).toLocaleDateString()}
                      </span>
                        <div className="flex items-center gap-3">
                          {/* TODO: SECURITY - Temporarily hidden until ZDS order matching is fixed
                          <button
                            onClick={() => refreshClaim(claim.id)}
                            disabled={loadingClaimId === claim.id}
                            className="font-ui text-xs text-nfw-aubergine hover:underline disabled:opacity-50"
                          >
                            {loadingClaimId === claim.id ? "Refreshing..." : "Refresh Status"}
                          </button>
                          */}
                        {claim.shopify_order_id && !shopifyOrderUrl && (
                          <span className="font-ui text-xs text-nfw-blackberry/50">
                            Order ID: {claim.shopify_order_id.split('/').pop()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
