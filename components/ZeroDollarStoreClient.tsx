"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  ZeroDollarItemWithClaim,
  ZeroDollarCategory,
} from "@/types/zero-dollar-store";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function ZeroDollarStoreClient({
  items,
  categories,
  userId,
}: {
  items: ZeroDollarItemWithClaim[];
  categories: ZeroDollarCategory[];
  userId: string;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [selectedItem, setSelectedItem] =
    useState<ZeroDollarItemWithClaim | null>(null);
  const [shippingInfo, setShippingInfo] = useState({
    full_name: "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
  });
  const [selectedVariant, setSelectedVariant] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Filter items based on category and search
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(
        (item) => item.category_id === selectedCategory,
      );
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [items, selectedCategory, searchQuery]);

  const handleClaimClick = (item: ZeroDollarItemWithClaim) => {
    setSelectedItem(item);
    setShowClaimModal(true);
    setError(null);
    setSelectedVariant({});
  };

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    // Validate variant selection if item has variants
    if (selectedItem.size_variants) {
      const variantKeys = Object.keys(selectedItem.size_variants);
      for (const key of variantKeys) {
        if (!selectedVariant[key]) {
          setError(`Please select a ${key}`);
          return;
        }
      }
    }

    setClaimingItemId(selectedItem.id);
    setError(null);

    try {
      // Check if item is still available
      const { data: currentItem } = await supabase
        .from("zero_dollar_items")
        .select("quantity_available")
        .eq("id", selectedItem.id)
        .single();

      if (!currentItem || currentItem.quantity_available <= 0) {
        throw new Error("This item is no longer available");
      }

      // Create the claim
      const { error: claimError } = await supabase
        .from("zero_dollar_claims")
        .insert({
          item_id: selectedItem.id,
          member_id: userId,
          shipping_address: shippingInfo,
          selected_variant:
            Object.keys(selectedVariant).length > 0 ? selectedVariant : null,
          status: "pending",
        });

      if (claimError) throw claimError;

      // Decrease quantity
      const { error: updateError } = await supabase
        .from("zero_dollar_items")
        .update({ quantity_available: currentItem.quantity_available - 1 })
        .eq("id", selectedItem.id);

      if (updateError) throw updateError;

      // Success - close modal and refresh
      setShowClaimModal(false);
      setSelectedItem(null);
      setShippingInfo({
        full_name: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        zip: "",
        phone: "",
      });
      setSelectedVariant({});
      router.refresh();
    } catch (error: any) {
      setError(error.message || "Failed to claim item");
    } finally {
      setClaimingItemId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 text-lg">
          No items available at the moment. Check back soon!
        </p>
      </div>
    );
  }

  return (
    <div>
        {/* Search and Filter Bar */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <input
          type="text"
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 border border-nfw-blackberry/20"
        />

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 whitespace-nowrap ${
              selectedCategory === null
                ? "bg-nfw-blackberry text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All Items ({items.length})
          </button>
          {categories.map((category) => {
            const count = items.filter(
              (item) => item.category_id === category.id,
            ).length;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 whitespace-nowrap ${
                  selectedCategory === category.id
                    ? "bg-nfw-blackberry text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">
            No items found matching your criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const isClaimed = !!item.user_claim;
            const isOutOfStock = item.quantity_available <= 0;
            const canClaim = !isClaimed && !isOutOfStock;

            return (
              <div
                key={item.id}
                className="bg-white border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Featured Badge */}
                {item.is_featured && (
                  <div className="bg-nfw-citrine text-nfw-blackberry text-xs font-bold px-3 py-1 text-center">
                    FEATURED
                  </div>
                )}

                {/* Image */}
                {item.image_url && (
                  <div className="relative h-48 bg-gray-100">
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="p-4">
                  {/* Category Badge */}
                  {item.category && (
                    <span className="inline-block bg-nfw-lilac/20 text-nfw-blackberry text-xs px-2 py-1 mb-2">
                      {item.category.name}
                    </span>
                  )}

                  <h3 className="text-lg font-semibold mb-2">{item.name}</h3>

                  {item.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {/* Tags */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-1"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-500">
                      {item.quantity_available} available
                    </span>
                    {item.total_claims && item.total_claims > 0 && (
                      <span className="text-sm text-gray-500">
                        {item.total_claims} claimed
                      </span>
                    )}
                  </div>

                  {isClaimed && (
                    <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 text-sm text-center">
                      Already Claimed
                    </div>
                  )}

                  {!isClaimed && isOutOfStock && (
                    <div className="bg-gray-100 border border-gray-300 text-gray-600 px-4 py-2 text-sm text-center">
                      Out of Stock
                    </div>
                  )}

                  {canClaim && (
                    <button
                      onClick={() => handleClaimClick(item)}
                      disabled={claimingItemId === item.id}
                      className="w-full bg-nfw-blackberry text-white py-2 hover:bg-nfw-blackberry/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      {claimingItemId === item.id
                        ? "Claiming..."
                        : "Claim Item"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Claim Modal */}
      {showClaimModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              Claim: {selectedItem.name}
            </h2>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleClaimSubmit} className="space-y-4">
              {/* Variant Selection */}
              {selectedItem.size_variants &&
                Object.entries(selectedItem.size_variants).map(
                  ([key, values]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-1 capitalize">
                        {key} <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={selectedVariant[key] || ""}
                        onChange={(e) =>
                          setSelectedVariant({
                            ...selectedVariant,
                            [key]: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border"
                      >
                        <option value="">Select {key}</option>
                        {values?.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </div>
                  ),
                )}

              {/* Shipping Information */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={shippingInfo.full_name}
                  onChange={(e) =>
                    setShippingInfo({
                      ...shippingInfo,
                      full_name: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  required
                  value={shippingInfo.address_line1}
                  onChange={(e) =>
                    setShippingInfo({
                      ...shippingInfo,
                      address_line1: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={shippingInfo.address_line2}
                  onChange={(e) =>
                    setShippingInfo({
                      ...shippingInfo,
                      address_line2: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingInfo.city}
                    onChange={(e) =>
                      setShippingInfo({ ...shippingInfo, city: e.target.value })
                    }
                    className="w-full px-3 py-2 border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingInfo.state}
                    onChange={(e) =>
                      setShippingInfo({
                        ...shippingInfo,
                        state: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={shippingInfo.zip}
                    onChange={(e) =>
                      setShippingInfo({ ...shippingInfo, zip: e.target.value })
                    }
                    className="w-full px-3 py-2 border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    value={shippingInfo.phone}
                    onChange={(e) =>
                      setShippingInfo({
                        ...shippingInfo,
                        phone: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowClaimModal(false);
                    setSelectedItem(null);
                    setError(null);
                    setSelectedVariant({});
                  }}
                  className="flex-1 px-4 py-2 border hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!!claimingItemId}
                  className="flex-1 bg-nfw-blackberry text-white py-2 hover:bg-nfw-blackberry/90 disabled:opacity-50"
                >
                  {claimingItemId ? "Claiming..." : "Confirm Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
