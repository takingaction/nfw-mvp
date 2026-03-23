"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Star } from "lucide-react";

type ProductWithMapping = {
  shopifyProductId: string;
  shopifyVariantId: string;
  title: string;
  imageUrl: string;
  mvpVisibility: boolean;
  eligibilityTiers: string[];
  displayOrder: number;
};

const TIERS = ["free", "contributing", "founding"];
const MAX_FEATURED = 3;

export default function AdminShopifySync() {
  const [products, setProducts] = useState<ProductWithMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const SHOPIFY_AUTH_URL = `https://nfw-checkout.myshopify.com/admin/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID}&scope=read_products,write_checkouts,read_checkouts&redirect_uri=${typeof window !== 'undefined' ? window.location.origin : ''}/api/shopify-callback`;

  const checkConnection = async () => {
    try {
      const res = await fetch("/api/shopify/products?check_connection=true");
      const data = await res.json();
      setIsConnected(data.connected === true);
    } catch {
      setIsConnected(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      setMessage({ type: "success", text: "Successfully connected to Shopify!" });
      setIsConnected(true);
      window.history.replaceState({}, "", "/admin/shopify");
    } else if (params.get("error")) {
      setMessage({ type: "error", text: `Connection failed: ${params.get("error")}` });
      window.history.replaceState({}, "", "/admin/shopify");
    }
    checkConnection();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/shopify/products?admin_view=true");
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        console.warn("API returned non-array:", data);
        setProducts([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/shopify/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `Synced ${data.count} products from Shopify` });
        fetchProducts();
      } else {
        setMessage({ type: "error", text: data.error || "Sync failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  const toggleVisibility = async (productId: string, currentVisibility: boolean) => {
    const res = await fetch("/api/admin/shopify/update-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopify_product_id: productId,
        updates: { mvp_visibility: !currentVisibility },
      }),
    });

    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) =>
          p.shopifyProductId === productId ? { ...p, mvpVisibility: !currentVisibility } : p,
        ),
      );
    }
  };

  const toggleTier = async (productId: string, tier: string, currentTiers: string[]) => {
    const newTiers = currentTiers.includes(tier)
      ? currentTiers.filter((t) => t !== tier)
      : [...currentTiers, tier];

    const res = await fetch("/api/admin/shopify/update-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopify_product_id: productId,
        updates: { eligibility_tiers: newTiers },
      }),
    });

    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) =>
          p.shopifyProductId === productId ? { ...p, eligibilityTiers: newTiers } : p,
        ),
      );
    }
  };

  const toggleFeatured = async (productId: string) => {
    const product = products.find((p) => p.shopifyProductId === productId);
    if (!product) return;

    const currentlyFeatured = product.displayOrder < 999;

    if (currentlyFeatured) {
      const remainingFeatured = products
        .filter((p) => p.displayOrder < 999 && p.shopifyProductId !== productId)
        .sort((a, b) => a.displayOrder - b.displayOrder);

      const updates: Array<{ shopify_product_id: string; updates: { display_order: number } }> = [];

      remainingFeatured.forEach((p, index) => {
        if (p.displayOrder !== index) {
          updates.push({
            shopify_product_id: p.shopifyProductId,
            updates: { display_order: index },
          });
        }
      });

      updates.push({
        shopify_product_id: productId,
        updates: { display_order: 999 },
      });

      await Promise.all(
        updates.map((u) =>
          fetch("/api/admin/shopify/update-product", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(u),
          }),
        ),
      );

      setProducts((prev) => {
        let updated = prev.map((p) => {
          if (p.shopifyProductId === productId) {
            return { ...p, displayOrder: 999 };
          }
          const idx = remainingFeatured.findIndex((rp) => rp.shopifyProductId === p.shopifyProductId);
          if (idx >= 0 && p.displayOrder !== idx) {
            return { ...p, displayOrder: idx };
          }
          return p;
        });
        return updated;
      });
    } else {
      const featuredCount = products.filter((p) => p.displayOrder < 999).length;

      if (featuredCount >= MAX_FEATURED) {
        setMessage({ type: "error", text: `Maximum ${MAX_FEATURED} featured products allowed` });
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      const newOrder = featuredCount;
      const res = await fetch("/api/admin/shopify/update-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopify_product_id: productId,
          updates: { display_order: newOrder },
        }),
      });

      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) =>
            p.shopifyProductId === productId ? { ...p, displayOrder: newOrder } : p,
          ),
        );
      }
    }
  };

  const getFeaturedRank = (productId: string): number | null => {
    const featuredProducts = products
      .filter((p) => p.displayOrder < 999)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    const rankIndex = featuredProducts.findIndex((p) => p.shopifyProductId === productId);
    return rankIndex >= 0 ? rankIndex + 1 : null;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-nfw-stone/20" />
          ))}
        </div>
      </div>
    );
  }

  const featuredCount = products.filter((p) => p.displayOrder < 999).length;

  return (
    <div className="p-8 bg-nfw-dove min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-nfw-blackberry mb-2 font-ui">Manage Zero Dollar Store</h1>
          <p className="text-nfw-blackberry/60">
            Control which products appear in the Zero Dollar Store and who can access them
          </p>
        </div>
        <div className="flex gap-3">
          {!isConnected ? (
            <a
              href={SHOPIFY_AUTH_URL}
              className="bg-nfw-aubergine text-white px-6 py-3 font-medium hover:bg-nfw-aubergine/90 inline-block"
            >
              Connect to Shopify
            </a>
          ) : (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="bg-nfw-blackberry text-white px-6 py-3 font-medium hover:bg-nfw-blackberry/90 disabled:opacity-50"
            >
              {syncing ? "Syncing..." : "Sync from Shopify"}
            </button>
          )}
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 ${
            message.type === "success" ? "bg-[#d4f1ad] text-nfw-blackberry" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
        <div className="px-6 py-3 bg-nfw-dove border-b border-nfw-blackberry/10">
          <p className="text-nfw-blackberry/60 text-sm">
            <span className="font-medium">Featured on Homepage:</span> {featuredCount} of {MAX_FEATURED} selected. 
            Click the <Star className="inline w-4 h-4 text-nfw-aubergine" /> icon to toggle.
          </p>
        </div>
        <table className="min-w-full divide-y divide-nfw-blackberry/5">
          <thead className="bg-nfw-dove">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider">
                Visibility / Featured
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider">
                Eligibility
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-nfw-blackberry/5">
            {products.map((product, index) => {
              const isFeatured = product.displayOrder < 999;
              const featuredRank = getFeaturedRank(product.shopifyProductId);

              return (
                <tr key={product.shopifyProductId ?? `product-${index}`} className={isFeatured ? "bg-nfw-citrine/5" : ""}>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-12 w-12 bg-nfw-stone/10 flex-shrink-0 overflow-hidden relative rounded">
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.title}
                            fill
                            className="object-cover"
                            sizes="48px"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-nfw-stone/30 text-xs">
                            No Img
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="font-medium text-nfw-blackberry">{product.title}</div>
                        <div className="text-sm text-nfw-blackberry/50 truncate max-w-xs">{product.shopifyProductId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleVisibility(product.shopifyProductId, product.mvpVisibility)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            product.mvpVisibility ? "bg-[#d4f1ad]" : "bg-nfw-stone/30"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              product.mvpVisibility ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="ml-3 text-sm text-nfw-blackberry/60">
                          {product.mvpVisibility ? "Visible" : "Hidden"}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleFeatured(product.shopifyProductId)}
                        className={`p-2 rounded-full transition-colors ${
                          isFeatured
                            ? "text-nfw-aubergine hover:bg-nfw-aubergine/10"
                            : "text-nfw-blackberry/30 hover:text-nfw-blackberry/60 hover:bg-nfw-blackberry/5"
                        }`}
                        title={isFeatured ? "Remove from featured" : "Add to featured"}
                      >
                        <Star className={`w-5 h-5 ${isFeatured ? "fill-current" : ""}`} />
                      </button>
                      {isFeatured && (
                        <span className="text-xs text-nfw-aubergine font-black uppercase">
                          #{featuredRank}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {TIERS.map((tier) => (
                        <button
                          key={tier}
                          onClick={() => toggleTier(product.shopifyProductId, tier, product.eligibilityTiers ?? [])}
                          className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                            product.eligibilityTiers?.includes(tier)
                              ? "bg-nfw-blackberry text-white"
                              : "bg-nfw-stone/20 text-nfw-blackberry hover:bg-nfw-stone/30"
                          }`}
                        >
                          {tier}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
