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
    const newTiers = currentTiers.includes(tier)
      ? currentTiers.filter((t) => t !== tier)
      : [...currentTiers, tier];

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
            <div key={i} className="h-20 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Shopify Product Sync</h1>
          <p className="text-gray-600">
            Manage which products appear in the Zero Dollar Store MVP
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync from Shopify"}
        </button>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Visibility
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Eligibility
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.shopify_product_id}>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-12 w-12 bg-gray-200 rounded flex-shrink-0 overflow-hidden relative">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.title}
                          fill
                          className="object-cover rounded"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-nfw-stone/20" />
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="font-medium text-gray-900">{product.title}</div>
                      <div className="text-sm text-gray-500">{product.shopify_product_id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => toggleVisibility(product.shopify_product_id, product.mvp_visibility)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      product.mvp_visibility ? "bg-green-600" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        product.mvp_visibility ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="ml-3 text-sm text-gray-600">
                    {product.mvp_visibility ? "Visible" : "Hidden"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {TIERS.map((tier) => (
                      <button
                        key={tier}
                        onClick={() => toggleTier(product.shopify_product_id, tier, product.eligibility_tiers)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          product.eligibility_tiers.includes(tier)
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
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
