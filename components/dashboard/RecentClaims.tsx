"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, ExternalLink } from "lucide-react";

type Claim = {
  id: string;
  shopify_product_id: string;
  shopify_order_id: string | null;
  status: "pending" | "created" | "fulfilled" | "delivered";
  claimed_at: string;
  product?: {
    title: string;
    imageUrl: string;
  } | null;
};

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800" },
  created: { label: "Processing", color: "bg-blue-100 text-blue-800" },
  fulfilled: { label: "Shipped", color: "bg-purple-100 text-purple-800" },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800" },
};

export default function RecentClaims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/store/claims/my-claims-simple")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setClaims(data.slice(0, 3)); // Show only 3 most recent
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
        <div className="p-6 border-b border-nfw-blackberry/10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-nfw-aubergine">
              Zero Dollar Store Claims
            </h3>
          </div>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-nfw-stone/10 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
        <div className="p-6 border-b border-nfw-blackberry/10">
          <h3 className="text-lg font-semibold text-nfw-aubergine">
            Zero Dollar Store Claims
          </h3>
        </div>
        <div className="p-6">
          <p className="text-nfw-blackberry/60 text-sm mb-4">
            No claims yet
          </p>
          <Link
            href="/store"
            className="inline-flex items-center gap-2 text-sm text-nfw-aubergine hover:underline font-medium"
          >
            Visit the Store
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
      <div className="p-6 border-b border-nfw-blackberry/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-nfw-aubergine/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-nfw-aubergine" />
            </div>
            <h3 className="text-lg font-semibold text-nfw-aubergine">
              Zero Dollar Store Claims
            </h3>
          </div>
          <Link
            href="/store/my-claims"
            className="text-sm text-nfw-aubergine hover:underline font-medium"
          >
            View All
          </Link>
        </div>
      </div>
      <div className="divide-y divide-nfw-blackberry/5">
        {claims.map((claim) => {
          const info = STATUS_INFO[claim.status] || STATUS_INFO.pending;
          return (
            <div key={claim.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-nfw-blackberry truncate">
                    {claim.product?.title || "Unknown Item"}
                  </p>
                  <p className="text-sm text-nfw-blackberry/50">
                    Claimed {new Date(claim.claimed_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`inline-flex px-2 py-1 text-xs font-medium ${info.color}`}
                >
                  {info.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-4 bg-nfw-dove/30 border-t border-nfw-blackberry/5">
        <Link
          href="/store/my-claims"
          className="inline-flex items-center gap-2 text-sm text-nfw-aubergine hover:underline font-medium"
        >
          Track Your Orders
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
