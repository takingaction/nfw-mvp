"use client";

import { Search, MapPin } from "lucide-react";

interface PerksSearchProps {
  query: string;
  postalCode: string;
  distance: string;
  hasActiveFilters: boolean;
  onQueryChange: (query: string) => void;
  onPostalCodeChange: (postalCode: string) => void;
  onDistanceChange: (distance: string) => void;
  onSearch: () => void;
  onClear: () => void;
}

export default function PerksSearch({
  query,
  postalCode,
  distance,
  hasActiveFilters,
  onQueryChange,
  onPostalCodeChange,
  onDistanceChange,
  onSearch,
  onClear,
}: PerksSearchProps) {
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch();
    }
  };

  const hasFilters = hasActiveFilters || query.trim() || postalCode.trim();

  return (
    <div className="flex gap-3">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-nfw-blackberry/40 w-5 h-5" />
        <input
          type="text"
          placeholder="Search for restaurants, activities, stores..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyPress={handleKeyPress}
          className="w-full pl-10 pr-4 py-2.5 border border-nfw-blackberry/20 text-nfw-blackberry placeholder-nfw-blackberry/40 bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent transition-all"
        />
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <MapPin className="w-4 h-4 text-nfw-blackberry/40" />
          <input
            type="text"
            placeholder="ZIP"
            value={postalCode}
            onChange={(e) => onPostalCodeChange(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-20 px-2 py-2 border border-nfw-blackberry/20 text-nfw-blackberry placeholder-nfw-blackberry/40 bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent transition-all text-sm"
            maxLength={5}
          />
        </div>
        <select
          value={distance}
          onChange={(e) => onDistanceChange(e.target.value)}
          className="px-2 py-2 border border-nfw-blackberry/20 text-nfw-blackberry bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent transition-all text-sm"
        >
          <option value="5mi">5 mi</option>
          <option value="10mi">10 mi</option>
          <option value="25mi">25 mi</option>
          <option value="50mi">50 mi</option>
          <option value="100mi">100 mi</option>
          <option value="2500mi">Nationwide</option>
        </select>
      </div>

        {hasFilters && (
          <button
            onClick={onClear}
            className="px-4 py-2.5 border border-nfw-blackberry/20 text-nfw-blackberry/70 hover:bg-nfw-blackberry/5 transition-colors font-medium text-sm"
          >
            RESET
          </button>
        )}
    </div>
  );
}