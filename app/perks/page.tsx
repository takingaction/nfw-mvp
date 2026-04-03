"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, SlidersHorizontal, X } from "lucide-react";
import PerksSearch from "@/components/perks/PerksSearch";
import OfferCard from "@/components/perks/OfferCard";
import FilterSidebar from "@/components/perks/FilterSidebar";
import ViewToggle from "@/components/perks/ViewToggle";
import StoreCard from "@/components/perks/StoreCard";
import LocationCard from "@/components/perks/LocationCard";
import OfferDetailPanel from "@/components/perks/OfferDetailPanel";

type ViewType = "stores" | "offers" | "locations";

interface Facet {
  key: string;
  label: string;
  values: { key: string; label: string }[];
}

interface RollupGroup {
  key: string | number;
  name?: string;
  count: number;
  offers?: string[];
  logo_url?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  distance?: number;
  location?: any;
  store?: any;
}

export default function PerksPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [facets, setFacets] = useState<Facet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInfo, setSearchInfo] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentSearchParams, setCurrentSearchParams] = useState<any>({});
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedFacets, setSelectedFacets] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [selectedOfferTypes, setSelectedOfferTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchPostalCode, setSearchPostalCode] = useState<string>("");
  const [searchDistance, setSearchDistance] = useState<string>("25mi");
  const [selectedOfferKey, setSelectedOfferKey] = useState<string | null>(null);
  const [isOfferPanelOpen, setIsOfferPanelOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Check profile completion and membership for logged-in users
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("profile_completed, membership_level")
          .eq("id", user.id)
          .single();
        
        if (!profile?.profile_completed) {
          window.location.href = "/auth/sign-up?step=1";
        } else if (!profile?.membership_level) {
          window.location.href = "/auth/sign-up?step=3";
        }
      }
    };
    
    fetchUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedFacets([]);
    setSelectedOfferTypes([]);
    setSelectedStore(null);
    setSelectedLocation(null);
    setSearchQuery("");
    setSearchPostalCode("");
    setSearchDistance("25mi");
    setCurrentPage(1);
    setCurrentView("stores");
    fetchAllCounts();
  };
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>("stores");
  const [rollupGroups, setRollupGroups] = useState<RollupGroup[]>([]);
  const [viewCounts, setViewCounts] = useState({ stores: 0, offers: 0, locations: 0 });

  useEffect(() => {
    fetchCategories();
    fetchFacets();
    fetchAllCounts();
    fetchRollup();
  }, []);

  useEffect(() => {
    fetchRollup();
  }, [selectedCategories, selectedFacets, selectedStore, selectedLocation, selectedOfferTypes, searchQuery, searchPostalCode, searchDistance, currentView, currentPage]);

  const fetchAllCounts = async () => {
    try {
      const [storesRes, offersRes, locationsRes] = await Promise.all([
        fetch("/api/access-perks/rollup?rollup=stores"),
        fetch("/api/access-perks/offers/search?per_page=1"),
        fetch("/api/access-perks/rollup?rollup=locations"),
      ]);

      const [storesData, offersData, locationsData] = await Promise.all([
        storesRes.json().catch(() => ({ info: { total_results: 0 } })),
        offersRes.json().catch(() => ({ info: { total_results: 0 } })),
        locationsRes.json().catch(() => ({ info: { total_results: 0 } })),
      ]);

      setViewCounts({
        stores: storesData.info?.total_stores || 0,
        offers: offersData.info?.total_results || 0,
        locations: locationsData.info?.total_locations || 0,
      });
    } catch (err) {
      console.error("Failed to fetch view counts:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/access-perks/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const fetchFacets = async () => {
    try {
      const response = await fetch("/api/access-perks/facets");
      if (response.ok) {
        const data = await response.json();
        setFacets(data.facets || []);
      }
    } catch (err) {
      console.error("Failed to fetch facets:", err);
    }
  };

  const fetchRollup = async () => {
    setLoading(true);
    setError(null);

    try {
      const perPage = 100;
      const page = currentPage;

      if (currentView === "offers") {
        const params: any = {
          per_page: perPage.toString(),
          page: page.toString(),
        };

        if (searchQuery) {
          params.query = searchQuery;
        }

        if (searchPostalCode) {
          params.postal_code = searchPostalCode;
          params.distance = searchDistance;
        }

        if (selectedCategories.length > 0) {
          params.category_key = selectedCategories.join(",");
        }

        if (selectedFacets.length > 0) {
          params.facet = selectedFacets.join(",");
        }

        if (selectedStore) {
          params.store_key = selectedStore.toString();
        }

        if (selectedLocation) {
          params.location_key = selectedLocation.toString();
        }

        if (selectedOfferTypes.length > 0) {
          params.offer_type = selectedOfferTypes.join(",");
        }

        const queryParams = new URLSearchParams(params);
        const response = await fetch(
          `/api/access-perks/offers/search?${queryParams.toString()}`,
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 401) {
            setError("Please sign in to view offers.");
            setLoading(false);
            return;
          }
          throw new Error(errorData.error || "Failed to fetch results");
        }

        const data = await response.json();

        setRollupGroups((data.offers || []).map((offer: any) => ({ ...offer, key: offer.offer_key })));
        setSearchInfo({
          total_results: data.info?.total_results || 0,
          total_pages: data.info?.total_pages || Math.ceil((data.offers?.length || 0) / perPage),
          current_page: data.info?.current_page || page,
        });

        if (selectedStore) {
          setViewCounts(prev => ({ ...prev, offers: data.info?.total_results || 0 }));
        }
      } else {
        const params: any = {
          rollup: currentView,
          per_page: perPage.toString(),
          page: page.toString(),
        };

        if (searchQuery) {
          params.query = searchQuery;
        }

        if (searchPostalCode) {
          params.postal_code = searchPostalCode;
          params.distance = searchDistance;
        }

        if (selectedCategories.length > 0) {
          params.category_key = selectedCategories.join(",");
        }

        if (selectedFacets.length > 0) {
          params.facet = selectedFacets.join(",");
        }

        const queryParams = new URLSearchParams(params);
        const response = await fetch(
          `/api/access-perks/rollup?${queryParams.toString()}`,
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 401) {
            setError("Please sign in to view offers.");
            setLoading(false);
            return;
          }
          throw new Error(errorData.error || "Failed to fetch results");
        }

        const data = await response.json();

        const totalStores = data.info?.total_stores || searchInfo?.total_stores || 0;
        const totalLocations = data.info?.total_locations || searchInfo?.total_locations || 0;
        const totalItems = currentView === "stores" 
          ? totalStores
          : currentView === "locations"
          ? totalLocations
          : (data.info?.total_results || searchInfo?.total_results || 0);

        setRollupGroups(data.groups || []);
        setSearchInfo((prev: any) => ({
          total_results: data.info?.total_results || prev?.total_results || 0,
          total_stores: totalStores || prev?.total_stores || 0,
          total_locations: totalLocations || prev?.total_locations || 0,
          total_pages: Math.ceil(totalItems / perPage) || 1,
          current_page: data.info?.current_page || page,
        }));

        if (data.info?.total_stores && currentView === "stores") {
          setViewCounts(prev => ({ ...prev, stores: data.info.total_stores }));
        }
        if (data.info?.total_locations && currentView === "locations") {
          setViewCounts(prev => ({ ...prev, locations: data.info.total_locations }));
        }
      }
    } catch (err: any) {
      console.error("Fetch rollup error:", err);
      setError(err.message || "Failed to load results");
      setRollupGroups([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOffers = async (params: any) => {
    setLoading(true);
    setError(null);

    try {
      const isSearching = params.query || params.category_key;

      const queryParams = new URLSearchParams({
        ...params,
        per_page: isSearching ? "100" : "12",
        aggregations: "categories,stores",
      });

      const response = await fetch(
        `/api/access-perks/offers/search?${queryParams.toString()}`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 503 || errorData.error?.includes("503")) {
          throw new Error("SERVICE_UNAVAILABLE");
        }

        if (response.status === 401) {
          setError("Please sign in to view offers.");
          setLoading(false);
          return;
        }

        throw new Error(errorData.error || "Failed to fetch offers");
      }

      const data = await response.json();

      if (data.message === "No offers found.") {
        setOffers([]);
        setSearchInfo({ total_results: 0, total_pages: 0 });
      } else {
        const allOffers = data.offers || [];

        if (isSearching) {
          const totalResults = data.info?.total_results || allOffers.length;
          const displayOffers = allOffers.slice(0, 12);

          setOffers(displayOffers);

          const totalUnique = totalResults;
          const totalPages = Math.ceil(totalUnique / 12);

          setSearchInfo({
            total_results: totalUnique,
            current_page: params.page || 1,
            total_pages: totalPages,
            results_per_page: 12,
          });
        } else {
          setOffers(allOffers);
          setSearchInfo(data.info || {});
        }
      }
    } catch (err: any) {
      console.error("Fetch offers error:", err);
      setError(err.message || "Failed to load offers");
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryFilterChange = (categoryKeys: number[]) => {
    setSelectedCategories(categoryKeys);
  };

  const handleFacetsChange = (facetKeys: string[]) => {
    setSelectedFacets(facetKeys);
  };

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
  };

  const handleSearch = (params: any) => {
    if (params.query !== undefined) setSearchQuery(params.query);
    if (params.postal_code !== undefined) setSearchPostalCode(params.postal_code);
    if (params.distance !== undefined) setSearchDistance(params.distance);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStoreClick = (storeKey: number) => {
    setSelectedStore(storeKey);
    setSelectedCategories([]);
    setSelectedFacets([]);
    setSelectedOfferTypes([]);
    setSelectedLocation(null);
    setSearchQuery("");
    setSearchPostalCode("");
    setCurrentView("offers");
    setCurrentPage(1);
  };

  const handleLocationClick = (locationKey: number) => {
    setSelectedLocation(locationKey);
    setSelectedCategories([]);
    setSelectedFacets([]);
    setSelectedOfferTypes([]);
    setSelectedStore(null);
    setSearchQuery("");
    setSearchPostalCode("");
    setCurrentView("offers");
    setCurrentPage(1);
  };

  return (
    <main className="min-h-screen bg-nfw-dove">
      <div className="bg-white pt-8 pb-6 border-b border-nfw-blackberry/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl lg:text-6xl leading-[1.1] text-nfw-aubergine mb-2">
            Member Perks
          </h2>
          <p className="font-serif text-nfw-blackberry/60">
            Exclusive discounts and offers for NFW members.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white p-4 mb-6 border border-nfw-blackberry/10">
          <PerksSearch
            query={searchQuery}
            postalCode={searchPostalCode}
            distance={searchDistance}
            hasActiveFilters={selectedCategories.length > 0 || selectedFacets.length > 0 || selectedOfferTypes.length > 0 || selectedStore !== null || selectedLocation !== null}
            onQueryChange={setSearchQuery}
            onPostalCodeChange={setSearchPostalCode}
            onDistanceChange={setSearchDistance}
            onSearch={() => setCurrentPage(1)}
            onClear={clearAllFilters}
          />
        </div>

        <div className="flex gap-8">
          <FilterSidebar
            categories={categories}
            selectedCategories={selectedCategories}
            onCategoriesChange={handleCategoryFilterChange}
            facets={facets}
            selectedFacets={selectedFacets}
            onFacetsChange={handleFacetsChange}
            selectedOfferTypes={selectedOfferTypes}
            onOfferTypeChange={setSelectedOfferTypes}
            isMobileOpen={isFilterDrawerOpen}
            onMobileClose={() => setIsFilterDrawerOpen(false)}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4 lg:hidden">
              <button
                onClick={() => setIsFilterDrawerOpen(true)}
                className="flex items-center gap-2 px-4 py-2 border border-nfw-blackberry/20 text-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {(selectedCategories.length > 0 || selectedFacets.length > 0 || selectedOfferTypes.length > 0 || selectedStore || selectedLocation) && (
                  <span className="px-1.5 py-0.5 bg-nfw-aubergine text-white text-xs rounded">
                    {selectedCategories.length + selectedFacets.length + selectedOfferTypes.length + (selectedStore ? 1 : 0) + (selectedLocation ? 1 : 0)}
                  </span>
                )}
              </button>

              {(selectedCategories.length > 0 || selectedFacets.length > 0 || selectedOfferTypes.length > 0 || selectedStore || selectedLocation || searchQuery || searchPostalCode) && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-nfw-blackberry/60 hover:text-nfw-blackberry flex items-center gap-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              )}
            </div>

            <ViewToggle
              currentView={currentView}
              onViewChange={handleViewChange}
              counts={viewCounts}
            />

            {searchInfo && !loading && !error && (
              <div className="mb-4 font-serif text-sm text-nfw-blackberry/50 flex items-center justify-between">
                <span>
                  Showing {rollupGroups.length} of {(currentView === "stores" ? viewCounts.stores : currentView === "locations" ? viewCounts.locations : searchInfo.total_results)?.toLocaleString() || 0} {currentView}
                  {searchInfo.total_pages > 1 &&
                    ` - Page ${currentPage} of ${searchInfo.total_pages}`}
                </span>
                {searchInfo.total_pages > 1 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-nfw-blackberry/20 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-nfw-blackberry/5"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= searchInfo.total_pages}
                      className="px-3 py-1 border border-nfw-blackberry/20 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-nfw-blackberry/5"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-nfw-lilac border-t-transparent rounded-full animate-spin" />
                <span className="font-serif text-nfw-blackberry/60 ml-3">Loading...</span>
              </div>
            )}

            {error === "SERVICE_UNAVAILABLE" && !loading && (
              <div className="bg-nfw-citrine/20 border border-nfw-citrine p-6 mt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-nfw-blackberry flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-serif font-semibold text-nfw-blackberry mb-1">
                      Service Temporarily Unavailable
                    </h3>
                    <p className="font-serif text-sm text-nfw-blackberry/70 mb-4">
                      The Access Perks service is currently experiencing issues.
                      Please try again shortly.
                    </p>
                    <button
                      onClick={fetchRollup}
                      className="px-4 py-2 bg-nfw-aubergine text-white font-ui text-sm font-medium hover:bg-nfw-blackberry transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && error !== "SERVICE_UNAVAILABLE" && !loading && (
              <div className="bg-red-50 border border-red-200 p-6 mt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-serif font-semibold text-red-900 mb-1">
                      Unable to Load Results
                    </h3>
                    <p className="font-serif text-sm text-red-700 mb-4">{error}</p>
                    <button
                      onClick={fetchRollup}
                      className="px-4 py-2 bg-red-600 text-white font-ui text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!loading && !error && rollupGroups.length > 0 && (
              <>
                {currentView === "stores" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {rollupGroups.map((group) => (
                      <StoreCard
                        key={group.key}
                        store={{
                          key: typeof group.key === 'number' ? group.key : parseInt(String(group.key)) || 0,
                          name: group.name || "Unknown Store",
                          logo_url: group.logo_url,
                          description: group.description,
                          count: group.count,
                          offers: group.offers || [],
                          location: group.location,
                          distance: group.distance,
                        }}
                        onClick={() => handleStoreClick(typeof group.key === 'number' ? group.key : parseInt(String(group.key)) || 0)}
                      />
                    ))}
                  </div>
                )}

                {currentView === "locations" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {rollupGroups.map((group) => (
                      <LocationCard
                        key={group.key}
                        location={{
                          key: typeof group.key === 'number' ? group.key : parseInt(String(group.key)) || 0,
                          name: group.name || "Unknown Location",
                          address: group.address,
                          city: group.city,
                          state: group.state,
                          postal_code: group.postal_code,
                          distance: group.distance,
                          count: group.count,
                          offers: group.offers || [],
                          store: group.store,
                        }}
                        onClick={() => handleLocationClick(typeof group.key === 'number' ? group.key : parseInt(String(group.key)) || 0)}
                      />
                    ))}
                  </div>
                )}

                {currentView === "offers" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
                    {rollupGroups.map((item: any, index: number) => (
                      <OfferCard
                        key={item.offer_key || item.key || index}
                        offer={item}
                        onClick={() => {
                          setSelectedOfferKey(item.offer_key || item.key);
                          setIsOfferPanelOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {!loading && !error && rollupGroups.length === 0 && searchInfo?.total_results === 0 && (
              <div className="text-center py-16">
                <h3 className="font-serif text-lg font-semibold text-nfw-blackberry mb-2">
                  No results found
                </h3>
                <p className="font-serif text-nfw-blackberry/60 mb-6">
                  Try adjusting your filters or browse all offers.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-6 py-2.5 bg-nfw-aubergine text-white font-ui text-sm font-medium hover:bg-nfw-blackberry transition-colors"
                >
                  Browse All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <OfferDetailPanel
        offerKey={selectedOfferKey}
        isOpen={isOfferPanelOpen}
        onClose={() => setIsOfferPanelOpen(false)}
      />
    </main>
  );
}
