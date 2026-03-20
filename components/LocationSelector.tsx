"use client";

import { useState, useEffect } from "react";
import { MapPin, Search, X, Loader2 } from "lucide-react";

interface Location {
  physical_location: {
    location_key: number;
    location_name: string;
    street_address: string;
    extended_street_address?: string;
    city_locality: string;
    state_region: string;
    postal_code: string;
    country: string;
    phone_number?: string;
    web_address?: string;
    geolocation?: {
      lat: number;
      lon: number;
    };
  };
  search_distance?: number;
}

interface LocationSelectorProps {
  offerGroupKey: string;
  offerTitle: string;
  onSelectLocation: (locationKey: string, locationName: string) => void;
  onClose: () => void;
  userZip?: string;
}

export default function LocationSelector({
  offerGroupKey,
  offerTitle,
  onSelectLocation,
  onClose,
  userZip,
}: LocationSelectorProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchZip, setSearchZip] = useState(userZip || "");
  const [selectedLocationKey, setSelectedLocationKey] = useState<string | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, [offerGroupKey, page]);

  const fetchLocations = async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        offer_group: offerGroupKey,
        page: page.toString(),
        per_page: "20",
      });

      if (searchZip) {
        params.append("postal_code", searchZip);
      }

      const response = await fetch(
        `/api/access-perks/locations?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load locations");
      }

      const data = await response.json();

      setLocations(data.locations || []);
      setHasMore(data.meta?.total_count > page * 20);
    } catch (err: any) {
      setError(err.message || "Failed to load locations");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLocations();
  };

  const handleSelectLocation = () => {
    if (!selectedLocationKey) return;

    const selected = locations.find(
      (loc) =>
        loc.physical_location.location_key.toString() === selectedLocationKey,
    );

    if (selected) {
      onSelectLocation(
        selected.physical_location.location_key.toString(),
        selected.physical_location.location_name,
      );
    }
  };

  const formatDistance = (distance?: number) => {
    if (!distance) return "";
    return `${distance.toFixed(1)} mi`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-[#2d1239]/10">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-[#2d1239] mb-1">
                Select a Location
              </h2>
              <p className="text-sm text-[#2d1239]/60">{offerTitle}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#2d1239]/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[#2d1239]/60" />
            </button>
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 mt-4">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#2d1239]/40" />
              <input
                type="text"
                value={searchZip}
                onChange={(e) => setSearchZip(e.target.value)}
                placeholder="Enter ZIP code"
                className="w-full pl-10 pr-4 py-2 border border-[#2d1239]/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2d1239]/20"
                pattern="^\d{5}$"
                maxLength={5}
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#2d1239] text-white rounded-lg hover:bg-[#2d1239]/90 transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </form>
        </div>

        {/* Locations List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-[#BCAFCF] mx-auto mb-2" />
              <p className="text-[#2d1239]/60">Loading locations...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={fetchLocations}
                className="text-[#2d1239] hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && locations.length === 0 && (
            <div className="text-center py-8 text-[#2d1239]/60">
              No locations found. Try a different ZIP code.
            </div>
          )}

          {!loading && !error && locations.length > 0 && (
            <div className="space-y-3">
              {locations.map((location) => (
                <label
                  key={location.physical_location.location_key}
                  className={`block p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    selectedLocationKey ===
                    location.physical_location.location_key.toString()
                      ? "border-[#2d1239] bg-[#2d1239]/5"
                      : "border-[#2d1239]/10 hover:border-[#2d1239]/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="location"
                      value={location.physical_location.location_key.toString()}
                      checked={
                        selectedLocationKey ===
                        location.physical_location.location_key.toString()
                      }
                      onChange={(e) => setSelectedLocationKey(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-[#2d1239]">
                          {location.physical_location.location_name}
                        </h3>
                        {location.search_distance && (
                          <span className="text-sm text-[#2d1239]/60 whitespace-nowrap">
                            {formatDistance(location.search_distance)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#2d1239]/70">
                        {location.physical_location.street_address}
                        {location.physical_location.extended_street_address &&
                          `, ${location.physical_location.extended_street_address}`}
                      </p>
                      <p className="text-sm text-[#2d1239]/70">
                        {location.physical_location.city_locality},{" "}
                        {location.physical_location.state_region}{" "}
                        {location.physical_location.postal_code}
                      </p>
                      {location.physical_location.phone_number && (
                        <p className="text-sm text-[#2d1239]/60 mt-1">
                          📞 {location.physical_location.phone_number}
                        </p>
                      )}
                    </div>
                  </div>
                </label>
              ))}

              {hasMore && (
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="w-full py-3 text-[#2d1239] hover:bg-[#2d1239]/5 rounded-lg transition-colors font-medium"
                >
                  Load More Locations
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#2d1239]/10">
          <button
            onClick={handleSelectLocation}
            disabled={!selectedLocationKey}
            className="w-full py-3 bg-[#2d1239] text-white rounded-xl font-medium hover:bg-[#2d1239]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue with Selected Location
          </button>
        </div>
      </div>
    </div>
  );
}
