"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type ProductWithMapping = {
  shopify_product_id: string;
  shopify_variant_id: string;
  title: string;
  image_url?: string;
  mvp_visibility: boolean;
  eligibility_tiers: string[];
  display_order: number;
};

const TIERS = ["free", "contributing", "founding"];

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
    // Check for connected param from OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      setMessage({ type: "success", text: "Successfully connected to Shopify!" });
      setIsConnected(true);
      // Clean URL
      window.history.replaceState({}, "", "/admin/shopify");
    } else if (params.get("error")) {
      setMessage({ type: "error", text: `Connection failed: ${params.get("error")}` });
      window.history.replaceState({}, "", "/admin/shopify");
    }
    checkConnection();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/shopify/products");
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
    const supabase = createClient();
    const { error } = await supabase
      .from("shopify_product_mappings")
      .update({ mvp_visibility: !currentVisibility })
      .eq("shopify_product_id", productId);

    if (!error) {
      setProducts((prev) =>
        prev.map((p) =>
          p.shopify_product_id === productId ? { ...p, mvp_visibility: !currentVisibility } : p,
        ),
      );
    }
  };

  const toggleTier = async (productId: string, tier: string, currentTiers: string[]) => {
    const newTiers = (currentTiers ?? []).includes(tier)
      ? (currentTiers ?? []).filter((t) => t !== tier)
      : [...(currentTiers ?? []), tier];

    const supabase = createClient();
    const { error } = await supabase
      .from("shopify_product_mappings")
      .update({ eligibility_tiers: newTiers })
      .eq("shopify_product_id", productId);

    if (!error) {
      setProducts((prev) =>
        prev.map((p) =>
          p.shopify_product_id === productId ? { ...p, eligibility_tiers: newTiers } : p,
        ),
      );
    }
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

  return (
    <div className="p-8 bg-nfw-dove min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-nfw-blackberry mb-2 font-ui">Shopify Product Sync</h1>
          <p className="text-nfw-blackberry/60">
            Manage which products appear in the Zero Dollar Store MVP
          </p>
        </div>
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
        <table className="min-w-full divide-y divide-nfw-blackberry/5">
          <thead className="bg-nfw-dove">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider">
                Visibility
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider">
                Eligibility
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-nfw-blackberry/5">
            {products.map((product, index) => (
              <tr key={product.shopify_product_id ?? `product-${index}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-nfw-stone/20 flex-shrink-0 overflow-hidden relative">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-nfw-stone/20" />
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="font-medium text-nfw-blackberry">{product.title}</div>
                      <div className="text-sm text-nfw-blackberry/50">{product.shopify_product_id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleVisibility(product.shopify_product_id, product.mvp_visibility)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      product.mvp_visibility ? "bg-[#d4f1ad]" : "bg-nfw-stone/30"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        product.mvp_visibility ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="ml-3 text-sm text-nfw-blackberry/60">
                    {product.mvp_visibility ? "Visible" : "Hidden"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {TIERS.map((tier) => (
                      <button
                        key={tier}
                        onClick={() => toggleTier(product.shopify_product_id, tier, product.eligibility_tiers ?? [])}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${
                          product.eligibility_tiers?.includes(tier) ?? false
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
