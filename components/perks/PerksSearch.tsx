"use client";

import { useState } from "react";
import { Search, MapPin, Filter, X } from "lucide-react";

interface PerksSearchProps {
  onSearch: (params: any) => void;
  categories?: any[];
}

export default function PerksSearch({
  onSearch,
  categories = [],
}: PerksSearchProps) {
  const [query, setQuery] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [distance, setDistance] = useState("25mi");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [offerType, setOfferType] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = () => {
    const params: any = {};

    if (query && query.trim()) {
      params.query = query.trim();
    } else {
      if (offerType && offerType.trim()) {
        params.offer_type = offerType;
      }
    }

    if (postalCode && postalCode.trim()) {
      const cleanZip = postalCode.trim();
      if (/^\d{5}$/.test(cleanZip)) {
        params.postal_code = cleanZip;
        params.distance = distance;
      } else {
        alert("Please enter a valid 5-digit ZIP code");
        return;
      }
    }

    if (selectedCategory && selectedCategory.trim()) {
      params.category_key = selectedCategory;
    }

    onSearch(params);
  };

  const clearFilters = () => {
    setQuery("");
    setPostalCode("");
    setDistance("25mi");
    setSelectedCategory("");
    setOfferType("");
    onSearch({});
  };

  // Reusable input class
  const inputClass =
    "w-full px-3 py-2.5 border border-[#2d1239]/20 rounded-lg text-[#2d1239] placeholder-[#2d1239]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#BCAFCF] focus:border-transparent transition-all";

  return (
    <div>
      {/* Search Bar */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#2d1239]/40 w-5 h-5" />
          <input
            type="text"
            placeholder="Search for restaurants, activities, stores..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 border border-[#2d1239]/20 rounded-lg text-[#2d1239] placeholder-[#2d1239]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#BCAFCF] focus:border-transparent transition-all"
          />
        </div>

        <button
          onClick={handleSearch}
          className="px-5 py-2.5 bg-[#2d1239] text-white rounded-lg hover:bg-[#2d1239]/90 transition-colors font-medium"
        >
          Search
        </button>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2.5 border rounded-lg transition-colors flex items-center gap-2 font-medium ${
            showFilters
              ? "border-[#BCAFCF] bg-[#BCAFCF]/10 text-[#2d1239]"
              : "border-[#2d1239]/20 text-[#2d1239]/70 hover:bg-[#2d1239]/5"
          }`}
        >
          <Filter className="w-5 h-5" />
          Filters
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="border-t border-[#2d1239]/10 pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Location Filter */}
            <div>
              <label className="block text-sm font-medium text-[#2d1239] mb-2">
                <MapPin className="inline w-4 h-4 mr-1 text-[#BCAFCF]" />
                Near You
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="ZIP Code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="flex-1 px-3 py-2.5 border border-[#2d1239]/20 rounded-lg text-[#2d1239] placeholder-[#2d1239]/40 bg-white focus:outline-none focus:ring-2 focus:ring-[#BCAFCF] focus:border-transparent transition-all"
                  maxLength={5}
                />
                <select
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="px-3 py-2.5 border border-[#2d1239]/20 rounded-lg text-[#2d1239] bg-white focus:outline-none focus:ring-2 focus:ring-[#BCAFCF] focus:border-transparent transition-all"
                >
                  <option value="5mi">5 mi</option>
                  <option value="10mi">10 mi</option>
                  <option value="25mi">25 mi</option>
                  <option value="50mi">50 mi</option>
                  <option value="100mi">100 mi</option>
                </select>
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-[#2d1239] mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={inputClass}
              >
                <option value="">All Categories</option>
                {categories.map((cat: any) => (
                  <option key={cat.category_key} value={cat.category_key}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Offer Type Filter */}
            <div>
              <label className="block text-sm font-medium text-[#2d1239] mb-2">
                Offer Type
              </label>
              <select
                value={offerType}
                onChange={(e) => setOfferType(e.target.value)}
                className={inputClass}
              >
                <option value="">All Offers</option>
                <option value="new">New Offers</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="popular">Popular</option>
                <option value="50_off">50% Off or More</option>
                <option value="bogo">Buy One Get One</option>
                <option value="unlimited">Unlimited Use</option>
                <option value="promo_code">Has Promo Code</option>
              </select>
            </div>
          </div>

          {/* Note about search limitations */}
          {query && offerType && (
            <div className="bg-[#fdf493]/20 border border-[#fdf493] rounded-xl p-3 text-sm text-[#2d1239]">
              <strong>Note:</strong> When searching by keyword, offer type
              filter is automatically disabled. Clear your search to use offer
              type filtering.
            </div>
          )}

          {/* Clear Filters */}
          <div className="flex justify-end">
            <button
              onClick={clearFilters}
              className="text-sm text-[#2d1239]/60 hover:text-[#2d1239] flex items-center gap-1 transition-colors"
            >
              <X className="w-4 h-4" />
              Clear all filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
